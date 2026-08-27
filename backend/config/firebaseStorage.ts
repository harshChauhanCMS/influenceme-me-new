import * as admin from "firebase-admin";
import { ensureFirebaseAdmin } from "./firebaseAdmin";

type StorageBucket = ReturnType<ReturnType<typeof admin.storage>["bucket"]>;
let bucket: StorageBucket | null = null;

const DEFAULT_STORAGE_FOLDER = "influenceme/file-uploads";

/**
 * Initialize Firebase Admin if needed (same as Firestore), then return Storage bucket.
 * Uses FIREBASE_* cert env vars when set (avoids GOOGLE_APPLICATION_CREDENTIALS file).
 */
function ensureFirebase(): void {
  ensureFirebaseAdmin();
}

/**
 * Get the default Firebase Storage bucket (project default or from env).
 */
export function getStorageBucket(): StorageBucket {
  if (bucket) {
    return bucket;
  }
  ensureFirebase();
  const storage = admin.storage();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  return bucket;
}

export function isFirebaseStorageConfigured(): boolean {
  try {
    ensureFirebase();
    return !!(
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT
    );
  } catch {
    return false;
  }
}

export interface UploadResult {
  url: string;
  secure_url: string;
  public_id: string;
}

/**
 * Upload a buffer to Firebase Storage and return the public URL.
 * Uses predefinedAcl: "publicRead" so the URL is publicly readable.
 */
export async function uploadBufferToFirebase(
  buffer: Buffer,
  mimeType: string,
  folder: string = DEFAULT_STORAGE_FOLDER,
  originalName?: string
): Promise<UploadResult> {
  const b = getStorageBucket();
  const ext = originalName
    ? (originalName.match(/\.[^.]+$/) || [".bin"])[0]
    : ".bin";
  const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = `${folder}/${safeName}`;
  const file = b.file(filePath);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    predefinedAcl: "publicRead",
  });

  const encodedPath = encodeURIComponent(filePath);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${b.name}/o/${encodedPath}?alt=media`;
  return {
    url: publicUrl,
    secure_url: publicUrl,
    public_id: filePath,
  };
}
