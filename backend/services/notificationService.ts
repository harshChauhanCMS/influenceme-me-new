import * as admin from "firebase-admin";
import mongoose from "mongoose";
import Notification from "../models/notification";
import User from "../models/user";

/** Named app for FCM so we always use cert from env, not GOOGLE_APPLICATION_CREDENTIALS file. */
const FCM_APP_NAME = "[FCM]";

function getFcmApp(): admin.app.App | null {
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!privateKey || !clientEmail || !projectId) return null;
  try {
    if (admin.apps.find((a) => a?.name === FCM_APP_NAME)) {
      return admin.app(FCM_APP_NAME);
    }
    return admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      FCM_APP_NAME,
    );
  } catch {
    return null;
  }
}

function isFcmAvailable(): boolean {
  return getFcmApp() !== null;
}

/** Error codes that mean the token is permanently invalid and should be removed. */
const PERMANENT_FCM_ERROR_CODES = [
  "invalid-registration-token",
  "registration-token-not-registered",
  "invalid-argument",
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
];

function isPermanentFcmError(error: any): boolean {
  const code = error?.code || error?.message || "";
  const codeStr = String(code).toLowerCase();
  return PERMANENT_FCM_ERROR_CODES.some((c) => codeStr.includes(c));
}

/**
 * Remove invalid FCM tokens from a user document.
 */
export async function removeInvalidFcmTokens(
  userId: mongoose.Types.ObjectId,
  invalidTokens: string[],
): Promise<void> {
  if (invalidTokens.length === 0) return;
  await User.findByIdAndUpdate(userId, {
    $pullAll: { fcmTokens: invalidTokens },
  });
}

export type CreateAndSendOptions = {
  /** When true, send FCM to this user even if role is not vendor/influencer. */
  sendFcmRegardlessOfRole?: boolean;
};

/**
 * Create an in-app notification and optionally send FCM to vendor/influencer.
 * For brand, only in-app notification is created (no FCM).
 * Use options.sendFcmRegardlessOfRole to send FCM to any role (e.g. broadcast).
 */
export async function createAndSend(
  userId: mongoose.Types.ObjectId,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
  options?: CreateAndSendOptions,
): Promise<void> {
  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      data: data || undefined,
      isRead: false,
    });
  } catch (err) {
    console.error(
      "notificationService.createAndSend: failed to create in-app notification",
      err,
    );
    throw err;
  }

  const user = await User.findById(userId).select("role fcmTokens name").lean();
  if (!user) return;

  const role = (user as any).role;
  const tokens = (user as any).fcmTokens;
  const userName = (user as any).name || "(no name)";
  const tokenList = Array.isArray(tokens)
    ? tokens.filter((t: any) => t && String(t).trim())
    : typeof tokens === "string" && tokens
      ? [String(tokens).trim()]
      : [];

  const allowFcm =
    options?.sendFcmRegardlessOfRole ||
    role === "vendor" ||
    role === "influencer";
  if (!allowFcm) return;
  if (tokenList.length === 0) {
    console.log(
      "[FCM] Skip: no fcmTokens for user",
      userId.toString(),
      userName,
      "(" + role + ")",
    );
    return;
  }
  const fcmApp = getFcmApp();
  if (!fcmApp) {
    console.log("[FCM] Skip: Firebase not configured (set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID)");
    return;
  }

  try {
    const messaging = fcmApp.messaging();
    console.log(
      "[FCM] Sending push to",
      tokenList.length,
      "device(s) for",
      role,
      userName,
      "(" + userId.toString() + ")",
    );
    const invalidTokens: string[] = [];

    // FCM allows up to 500 tokens per multicast; we send in batches of 100
    const batchSize = 100;
    for (let i = 0; i < tokenList.length; i += batchSize) {
      const batch = tokenList.slice(i, i + batchSize);
        const dataPayload: Record<string, string> = {
          type,
          ...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}),
        };
      const multicast = {
        tokens: batch,
        notification: {
          title,
          body: message,
        },
        data: dataPayload,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "default",
            priority: "high" as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
              alert: { title, body: message },
            },
          },
        },
      };

      try {
        const response = await messaging.sendEachForMulticast(multicast);
        const successCount = response.responses.filter((r) => r.success).length;
        const failCount = response.responses.filter((r) => !r.success).length;
        if (successCount > 0) {
          console.log("[FCM] Sent successfully to", successCount, "device(s)");
        }
        if (failCount > 0) {
          const firstError = response.responses.find((r) => r.error)?.error;
          console.error(
            "[FCM] Failed for",
            failCount,
            "device(s):",
            firstError?.message ?? firstError,
          );
        }
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error && isPermanentFcmError(resp.error)) {
            invalidTokens.push(batch[idx]);
          }
        });
      } catch (batchErr: any) {
        console.error(
          "notificationService.createAndSend: FCM batch error",
          batchErr?.message || batchErr,
        );
      }
    }

    if (invalidTokens.length > 0) {
      await removeInvalidFcmTokens(userId, invalidTokens);
    }
  } catch (err) {
    console.error("notificationService.createAndSend: FCM send failed", err);
    // Do not throw; in-app notification was already created
  }
}

/**
 * Create one in-app notification for multiple users (single document with userIds).
 * Then send FCM to each user that has tokens. Use when the same notification
 * goes to many users (e.g. new campaign to all influencers).
 */
export async function createAndSendToMany(
  userIds: mongoose.Types.ObjectId[],
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
  options?: CreateAndSendOptions,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await Notification.create({
      userIds,
      type,
      title,
      message,
      data: data || undefined,
      readBy: [],
    });
  } catch (err) {
    console.error(
      "notificationService.createAndSendToMany: failed to create in-app notification",
      err,
    );
    throw err;
  }
  for (const userId of userIds) {
    const user = await User.findById(userId).select("role fcmTokens name").lean();
    if (!user) continue;
    const role = (user as any).role;
    const tokens = (user as any).fcmTokens;
    const tokenList = Array.isArray(tokens)
      ? tokens.filter((t: any) => t && String(t).trim())
      : typeof tokens === "string" && tokens
        ? [String(tokens).trim()]
        : [];
    const allowFcm =
      options?.sendFcmRegardlessOfRole ||
      role === "vendor" ||
      role === "influencer";
    if (!allowFcm || tokenList.length === 0) continue;
    const fcmApp = getFcmApp();
    if (!fcmApp) break;
    try {
      const messaging = fcmApp.messaging();
      const batchSize = 100;
      for (let i = 0; i < tokenList.length; i += batchSize) {
        const batch = tokenList.slice(i, i + batchSize);
        const dataPayload: Record<string, string> = {
          type,
          ...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}),
        };
        const multicast = {
          tokens: batch,
          notification: { title, body: message },
          data: dataPayload,
          android: {
            priority: "high" as const,
            notification: {
              channelId: "default",
              priority: "high" as const,
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                contentAvailable: true,
                alert: { title, body: message },
              },
            },
          },
        };
        const response = await messaging.sendEachForMulticast(multicast);
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error && isPermanentFcmError(resp.error)) {
            removeInvalidFcmTokens(userId, [batch[idx]]).catch(() => {});
          }
        });
      }
    } catch (err) {
      console.error("notificationService.createAndSendToMany: FCM send failed for user", userId.toString(), err);
    }
  }
}

/**
 * Notify all users who have at least one FCM token (in-app + push).
 * Used e.g. when a new campaign is created.
 */
export async function notifyAllUsersWithFcmTokens(
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
): Promise<void> {
  const users = await User.find(
    { "fcmTokens.0": { $exists: true } },
    { _id: 1 },
  ).lean();
  if (users.length === 0) {
    console.log("[FCM] notifyAllUsersWithFcmTokens: no users with fcmTokens");
    return;
  }
  console.log("[FCM] Notifying", users.length, "user(s) with fcmTokens");
  const userIds = users.map((u: any) => u._id);
  createAndSendToMany(userIds, type, title, message, data, {
    sendFcmRegardlessOfRole: true,
  }).catch((err) =>
    console.error("notificationService.notifyAllUsersWithFcmTokens: failed", err),
  );
}

/**
 * Notify every admin user (in-app only — admins aren't in the FCM-eligible
 * role list). Used for things admins need to action, e.g. a payout
 * milestone release request.
 */
export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
): Promise<void> {
  const admins = await User.find({ role: "admin" }, { _id: 1 }).lean();
  if (admins.length === 0) return;
  const adminIds = admins.map((a: any) => a._id);
  await createAndSendToMany(adminIds, type, title, message, data);
}
