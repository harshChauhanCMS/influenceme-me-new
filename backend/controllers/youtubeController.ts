import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseHelper';
import {
  exchangeCodeForTokens,
  fetchChannelMine,
  fetchChannelData,
  getValidAccessToken,
  YOUTUBE_SCOPES,
} from '../services/youtubeService';
import { setTokens, saveChannelData, YouTubeChannelDataPayload } from '../services/youtubeTokenService';

/** gRPC codes: NOT_FOUND=5, PERMISSION_DENIED=7, FAILED_PRECONDITION=9, UNAVAILABLE=14 */
const FIRESTORE_GRPC_CODES = [5, 7, 9, 14];

/** Detect Firestore / gRPC errors (database missing, permissions, wrong project, etc.). */
function isFirestoreStorageError(err: unknown): boolean {
  const e = err as { code?: number; message?: string; details?: string };
  const code = e?.code;
  const msg = (e?.message ?? e?.details ?? '') as string;
  if (code !== undefined && FIRESTORE_GRPC_CODES.includes(Number(code))) return true;
  const lower = msg.toLowerCase();
  return (
    lower.includes('not_found') ||
    lower.includes('permission_denied') ||
    lower.includes('failed_precondition') ||
    lower.includes('unavailable') ||
    lower.includes('project id')
  );
}

const FIRESTORE_ERROR_MESSAGE =
  'YouTube storage is not configured. Create a Firestore database (Native mode) in your GCP project and ensure the service account has Firestore permissions.';

/**
 * Build deep link URL for app redirect after OAuth.
 */
function getAppRedirectUrl(success: boolean, error?: string): string {
  const scheme = process.env.YOUTUBE_APP_REDIRECT_SCHEME || 'influenceme';
  const host = process.env.YOUTUBE_APP_REDIRECT_HOST || 'youtube';
  const path = process.env.YOUTUBE_APP_REDIRECT_PATH || 'connected';
  const base = `${scheme}://${host}/${path}`;
  const params = new URLSearchParams({ success: String(success) });
  if (error) params.set('error', error);
  return `${base}?${params.toString()}`;
}

/**
 * GET /api/auth/youtube/authorize
 * Returns Google OAuth URL for the Flutter app to launch.
 * Auth: JWT required.
 */
export async function getAuthorizeUrl(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      errorResponse(res, 'Not authorized', 401);
      return;
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      errorResponse(res, 'YouTube OAuth not configured', 500);
      return;
    }

    const state = Buffer.from(JSON.stringify({ userId }), 'utf-8').toString('base64');
    const oauthUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(YOUTUBE_SCOPES)}` +
      '&response_type=code' +
      '&access_type=offline' +
      '&prompt=consent' +
      `&state=${encodeURIComponent(state)}`;

    successResponse(res, 'OK', { oauthUrl });
  } catch (err) {
    console.error('YouTube authorize error:', err);
    errorResponse(res, 'Failed to generate authorize URL', 500);
  }
}

/**
 * GET /auth/youtube/callback
 * Handles redirect from Google. Exchanges code for tokens, stores in Firestore, redirects to app.
 * Auth: None (public redirect from Google).
 */
export async function youtubeCallback(req: Request, res: Response): Promise<void> {
  const redirectUrl = getAppRedirectUrl(false);
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

  if (error) {
    res.redirect(getAppRedirectUrl(false, error));
    return;
  }
  if (!code || !state) {
    res.redirect(getAppRedirectUrl(false, 'missing_params'));
    return;
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8')) as { userId?: string };
    userId = decoded.userId ?? '';
    if (!userId) {
      res.redirect(getAppRedirectUrl(false, 'invalid_state'));
      return;
    }
  } catch {
    res.redirect(getAppRedirectUrl(false, 'invalid_state'));
    return;
  }

  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!redirectUri) {
    res.redirect(getAppRedirectUrl(false, 'server_config'));
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    const channelInfo = await fetchChannelMine(tokens.accessToken);

    await setTokens(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      channelId: channelInfo?.id,
      channelTitle: channelInfo?.title,
    });

    res.redirect(getAppRedirectUrl(true));
  } catch (err) {
    console.error('YouTube callback error:', err);
    const message = err instanceof Error ? err.message : 'unknown_error';
    res.redirect(getAppRedirectUrl(false, encodeURIComponent(message)));
  }
}

/**
 * GET /api/youtube/channel
 * Returns YouTube channel data for the authenticated user. Refreshes token if expired.
 * Auth: JWT required.
 */
export async function getChannel(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      errorResponse(res, 'Not authorized', 401);
      return;
    }

    const accessToken = await getValidAccessToken(userId);
    const data = await fetchChannelData(accessToken);
    successResponse(res, 'Channel data fetched successfully', data);
  } catch (err) {
    if (err instanceof Error && (err.message === 'YouTube not connected' || err.message === 'No YouTube channel found for this account')) {
      errorResponse(res, err.message, 401);
      return;
    }
    if (isFirestoreStorageError(err)) {
      console.error('YouTube channel error (Firestore/storage):', err);
      errorResponse(res, FIRESTORE_ERROR_MESSAGE, 503);
      return;
    }
    console.error('YouTube channel error:', err);
    errorResponse(res, 'Failed to fetch YouTube channel data', 500);
  }
}

/**
 * POST /api/youtube/disconnect
 * Removes stored YouTube tokens for the user.
 * Auth: JWT required.
 */
export async function disconnect(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      errorResponse(res, 'Not authorized', 401);
      return;
    }

    const { deleteByUserId } = await import('../services/youtubeTokenService');
    await deleteByUserId(userId);
    successResponse(res, 'YouTube disconnected successfully', null);
  } catch (err) {
    if (isFirestoreStorageError(err)) {
      console.error('YouTube disconnect error (Firestore/storage):', err);
      errorResponse(res, FIRESTORE_ERROR_MESSAGE, 503);
      return;
    }
    console.error('YouTube disconnect error:', err);
    errorResponse(res, 'Failed to disconnect YouTube', 500);
  }
}

/**
 * POST /api/youtube/data
 * Save YouTube channel data sent from the frontend (e.g. from YouTube Data API) to the DB.
 * Auth: JWT required.
 */
export async function saveYouTubeData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      errorResponse(res, 'Not authorized', 401);
      return;
    }

    const body = req.body as YouTubeChannelDataPayload;
    if (!body || typeof body !== 'object') {
      errorResponse(res, 'Request body must be a JSON object with YouTube channel data', 400);
      return;
    }

    await saveChannelData(userId, body);
    successResponse(res, 'YouTube data saved successfully', null);
  } catch (err) {
    if (isFirestoreStorageError(err)) {
      console.error('YouTube save data error (Firestore/storage):', err);
      errorResponse(res, FIRESTORE_ERROR_MESSAGE, 503);
      return;
    }
    console.error('YouTube save data error:', err);
    errorResponse(res, 'Failed to save YouTube data', 500);
  }
}
