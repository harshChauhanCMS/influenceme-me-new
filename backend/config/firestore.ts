import * as admin from 'firebase-admin';
import { ensureFirebaseAdmin } from './firebaseAdmin';

let firestore: admin.firestore.Firestore | null = null;

/**
 * Initialize Firebase Admin.
 * - Uses FIREBASE_* cert env vars when set (avoids GOOGLE_APPLICATION_CREDENTIALS file).
 * - Project ID from GCLOUD_PROJECT or FIREBASE_PROJECT_ID (required if not in credentials/GCP).
 * Safe to call multiple times; only initializes once.
 */
export function initializeFirestore(): admin.firestore.Firestore {
  if (firestore) {
    return firestore;
  }
  ensureFirebaseAdmin();
  firestore = admin.firestore();
  return firestore;
}

/**
 * Get Firestore instance. Call initializeFirestore() before using (e.g. in server startup).
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!firestore) {
    return initializeFirestore();
  }
  return firestore;
}
