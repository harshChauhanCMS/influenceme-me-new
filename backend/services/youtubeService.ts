import * as admin from 'firebase-admin';
import {
  getByUserId,
  setTokens,
  updateTokens,
} from './youtubeTokenService';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  profileImageUrl: string;
  bannerImageUrl?: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country?: string;
  publishedAt: string;
}

export interface RecentVideoItem {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string;
  viewCount?: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  itemCount?: number;
}

export interface YouTubeSocialMediaData {
  channel: ChannelInfo;
  recentVideos: RecentVideoItem[];
  playlists: PlaylistItem[];
  analytics: {
    totalViews: number;
    totalSubscribers: number;
    totalVideos: number;
  };
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('YouTube OAuth not configured');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = (await res.json()) as GoogleTokenResponse;
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  if (!data.refresh_token) {
    throw new Error('No refresh_token in response (ensure prompt=consent and access_type=offline)');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

/**
 * Refresh access token and update Firestore. Returns new access token.
 */
export async function refreshAndStoreToken(userId: string): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('YouTube OAuth not configured');
  }

  const record = await getByUserId(userId);
  if (!record?.refreshToken) {
    throw new Error('YouTube not connected');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: record.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = (await res.json()) as GoogleTokenResponse;
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await updateTokens(userId, { accessToken: data.access_token, expiresAt });
  return data.access_token;
}

/**
 * Fetch channel info (mine=true) using access token. Used in callback to store channelId/channelTitle.
 */
export async function fetchChannelMine(accessToken: string): Promise<{
  id?: string;
  title?: string;
} | null> {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { items?: Array<{ id: string; snippet?: { title?: string } }> };
  const channel = json.items?.[0];
  if (!channel) return null;
  return {
    id: channel.id,
    title: channel.snippet?.title,
  };
}

/**
 * Get valid access token for user: from Firestore, refresh if expired.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const record = await getByUserId(userId);
  if (!record) {
    throw new Error('YouTube not connected');
  }
  if (!record.refreshToken) {
    throw new Error('YouTube not connected');
  }

  const expiresAt = record.expiresAt;
  const expiryDate = expiresAt instanceof admin.firestore.Timestamp ? expiresAt.toDate() : new Date(expiresAt as unknown as string);
  const now = new Date();
  // Refresh if expired or within 1 minute
  if (expiryDate.getTime() - 60 * 1000 <= now.getTime()) {
    return refreshAndStoreToken(userId);
  }
  return record.accessToken;
}

/**
 * Fetch full channel data for YouTubeSocialMediaData: channel, recentVideos, playlists, analytics.
 */
export async function fetchChannelData(accessToken: string): Promise<YouTubeSocialMediaData> {
  const channel = await fetchChannelDetails(accessToken);
  if (!channel) {
    throw new Error('No YouTube channel found for this account');
  }

  const [recentVideos, playlists] = await Promise.all([
    fetchRecentVideos(accessToken, channel.id),
    fetchPlaylists(accessToken),
  ]);

  const analytics = {
    totalViews: channel.viewCount,
    totalSubscribers: channel.subscriberCount,
    totalVideos: channel.videoCount,
  };

  return {
    channel,
    recentVideos,
    playlists,
    analytics,
  };
}

async function fetchChannelDetails(accessToken: string): Promise<ChannelInfo | null> {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,brandingSettings&mine=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        customUrl?: string;
        thumbnails?: { default?: { url?: string }; high?: { url?: string } };
        publishedAt?: string;
        country?: string;
      };
      statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string };
      brandingSettings?: { image?: { bannerExternalUrl?: string } };
    }>;
  };
  const item = json.items?.[0];
  if (!item) return null;

  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};
  const thumb = snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '';
  const banner = item.brandingSettings?.image?.bannerExternalUrl;

  return {
    id: item.id,
    title: snippet.title ?? '',
    description: snippet.description ?? '',
    customUrl: snippet.customUrl,
    profileImageUrl: thumb,
    bannerImageUrl: banner,
    subscriberCount: parseInt(stats.subscriberCount ?? '0', 10),
    videoCount: parseInt(stats.videoCount ?? '0', 10),
    viewCount: parseInt(stats.viewCount ?? '0', 10),
    country: snippet.country,
    publishedAt: snippet.publishedAt ?? '',
  };
}

async function fetchRecentVideos(accessToken: string, channelId: string): Promise<RecentVideoItem[]> {
  const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=25`;
  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
      };
    }>;
  };

  const items = json.items ?? [];
  const videoIds = items
    .map((i) => i.id?.videoId)
    .filter(Boolean) as string[];
  if (videoIds.length === 0) return [];

  const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoIds.join(',')}`;
  const statsRes = await fetch(statsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const statsJson = (await statsRes.json()) as {
    items?: Array<{ id: string; statistics?: { viewCount?: string } }>;
  };
  const statsMap = new Map(
    (statsJson.items ?? []).map((v) => [v.id, parseInt(v.statistics?.viewCount ?? '0', 10)])
  );

  return items.map((i) => {
    const id = i.id?.videoId ?? '';
    const thumb = i.snippet?.thumbnails?.medium?.url ?? i.snippet?.thumbnails?.default?.url;
    return {
      id,
      title: i.snippet?.title ?? '',
      description: i.snippet?.description,
      thumbnailUrl: thumb,
      publishedAt: i.snippet?.publishedAt ?? '',
      viewCount: statsMap.get(id),
    };
  });
}

async function fetchPlaylists(accessToken: string): Promise<PlaylistItem[]> {
  const url = `${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&mine=true&maxResults=25`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; description?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } };
      contentDetails?: { itemCount?: number };
    }>;
  };

  return (json.items ?? []).map((p) => {
    const thumb = p.snippet?.thumbnails?.medium?.url ?? p.snippet?.thumbnails?.default?.url;
    return {
      id: p.id,
      title: p.snippet?.title ?? '',
      description: p.snippet?.description,
      thumbnailUrl: thumb,
      itemCount: p.contentDetails?.itemCount,
    };
  });
}
