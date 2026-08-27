import * as admin from "firebase-admin";

/**
 * Initialize the default Firebase Admin app once.
 * When FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL are set, uses explicit
 * credential so GOOGLE_APPLICATION_CREDENTIALS (e.g. production file path) is
 * never read — fixes local dev when that path does not exist.
 * Otherwise falls back to default credential chain (file or ADC).
 */
export function ensureFirebaseAdmin(): void {
  if (admin.apps.length > 0) {
    return;
  }
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (privateKey && clientEmail && projectId) {
    admin.initializeApp({
      projectId,
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    admin.initializeApp(projectId ? { projectId } : undefined);
  }
}
