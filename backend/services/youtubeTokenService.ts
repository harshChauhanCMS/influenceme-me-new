import * as admin from 'firebase-admin';
import { getFirestore } from '../config/firestore';

const COLLECTION = 'youtube_tokens';
const CHANNEL_DATA_COLLECTION = 'youtube_channel_data';

export interface YouTubeTokenRecord {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: admin.firestore.Timestamp;
  channelId?: string;
  channelTitle?: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  updatedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
}

export async function getByUserId(userId: string): Promise<(YouTubeTokenRecord & { id: string }) | null> {
  const db = getFirestore();
  const doc = await db.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return null;
  const data = doc.data() as YouTubeTokenRecord;
  return { ...data, id: doc.id };
}

export async function setTokens(
  userId: string,
  data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    channelId?: string;
    channelTitle?: string;
  }
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(userId);
  await ref.set(
    {
      userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: admin.firestore.Timestamp.fromDate(data.expiresAt),
      channelId: data.channelId ?? null,
      channelTitle: data.channelTitle ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateTokens(
  userId: string,
  data: {
    accessToken: string;
    expiresAt: Date;
  }
): Promise<void> {
  const db = getFirestore();
  await db
    .collection(COLLECTION)
    .doc(userId)
    .update({
      accessToken: data.accessToken,
      expiresAt: admin.firestore.Timestamp.fromDate(data.expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

export async function deleteByUserId(userId: string): Promise<void> {
  const db = getFirestore();
  await db.collection(COLLECTION).doc(userId).delete();
}

/** YouTube channel data as sent from frontend (e.g. from YouTube Data API) */
export interface YouTubeChannelDataPayload {
  channelId?: string;
  channelTitle?: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  publishedAt?: string;
  country?: string;
  [key: string]: unknown;
}

/**
 * Save or merge YouTube channel data from frontend into Firestore.
 * Uses collection youtube_channel_data, one doc per userId.
 */
export async function saveChannelData(
  userId: string,
  data: YouTubeChannelDataPayload
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(CHANNEL_DATA_COLLECTION).doc(userId);
  const sanitized: Record<string, unknown> = {
    userId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const allowedKeys = [
    'channelId', 'channelTitle', 'description', 'thumbnail',
    'subscriberCount', 'videoCount', 'viewCount', 'publishedAt', 'country',
  ];
  for (const key of allowedKeys) {
    if (data[key] !== undefined && data[key] !== null) {
      sanitized[key] = data[key];
    }
  }
  const doc = await ref.get();
  if (!doc.exists) {
    sanitized.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await ref.set(sanitized, { merge: true });
}
