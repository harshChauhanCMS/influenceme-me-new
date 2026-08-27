import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/notification";
import { authenticate } from "../middleware/auth";
import { successResponse, errorResponse } from "../utils/responseHelper";
import { AuthenticatedRequest } from "../middleware/auth";

/** Query: notifications for current user (single userId or userIds contains me). */
function notificationQueryForUser(userId: string) {
  return {
    $or: [
      { userId: userId },
      { userIds: userId },
    ],
  };
}

/** For a doc, whether the given user has read it. */
function isReadByUser(doc: any, userId: string): boolean {
  if (doc.userId) return doc.isRead === true;
  if (Array.isArray(doc.userIds) && doc.userIds.length > 0) {
    const readBy = doc.readBy || [];
    return readBy.some((id: any) => id.toString() === userId);
  }
  return false;
}

/**
 * Get notifications for current user
 * GET /api/notifications
 * Supports both single-recipient (userId) and multi-recipient (userIds) notifications.
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "Authentication required", 401);

    const { page = "1", limit = "20" } = req.query as any;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const query = notificationQueryForUser(userId);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Notification.countDocuments(query);

    // For multi-recipient docs, compute isRead for current user and normalize for API
    const list = notifications.map((doc: any) => {
      const isRead = doc.userId ? doc.isRead : isReadByUser(doc, userId);
      return {
        ...doc,
        isRead,
      };
    });

    const singleUnread = await Notification.countDocuments({
      userId,
      isRead: false,
    });
    const multiUnreadResult = await Notification.aggregate([
      { $match: { userIds: new mongoose.Types.ObjectId(userId) } },
      { $addFields: { hasRead: { $in: [new mongoose.Types.ObjectId(userId), { $ifNull: ["$readBy", []] }] } } },
      { $match: { hasRead: false } },
      { $count: "total" },
    ]);
    const multiUnread = multiUnreadResult[0]?.total ?? 0;
    const totalUnread = singleUnread + multiUnread;

    return successResponse(res, "Notifications fetched", list, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      unreadCount: totalUnread,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return errorResponse(res, error.message || "Failed to fetch notifications", 500);
  }
};

/**
 * Mark a notification as read
 * PUT /api/notifications/:id/read
 * Works for both single-recipient (userId) and multi-recipient (userIds) notifications.
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "Authentication required", 401);

    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) return errorResponse(res, "Notification not found", 404);

    const doc = notification as any;
    const isForMe = doc.userId
      ? doc.userId.toString() === userId
      : Array.isArray(doc.userIds) && doc.userIds.some((id: any) => id.toString() === userId);
    if (!isForMe) return errorResponse(res, "Access denied", 403);

    if (doc.userId) {
      doc.isRead = true;
    } else {
      const readBy = doc.readBy || [];
      const idStr = userId.toString();
      if (!readBy.some((oid: any) => oid.toString() === idStr)) {
        readBy.push(userId);
        doc.readBy = readBy;
      }
    }
    await notification.save();

    const out = notification.toObject ? notification.toObject() : notification;
    const isRead = doc.userId ? true : isReadByUser(out, userId);
    return successResponse(res, "Notification marked as read", { ...out, isRead }, 200);
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return errorResponse(res, error.message || "Failed to mark as read", 500);
  }
};

/**
 * Delete all notifications for current user
 * DELETE /api/notifications/all
 * Removes single-recipient docs (userId) and removes user from multi-recipient docs (userIds).
 */
export const deleteAllForUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "Authentication required", 401);

    const userObjId = new mongoose.Types.ObjectId(userId);

    const deletedSingle = await Notification.deleteMany({ userId: userObjId });

    const multiDocs = await Notification.find({ userIds: userObjId }).lean();
    let deletedMulti = 0;
    for (const doc of multiDocs) {
      const docUserIds = (doc as any).userIds || [];
      const remaining = docUserIds.filter((id: any) => id.toString() !== userId);
      if (remaining.length === 0) {
        await Notification.findByIdAndDelete(doc._id);
        deletedMulti += 1;
      } else {
        await Notification.findByIdAndUpdate(doc._id, {
          $pull: { userIds: userObjId, readBy: userObjId },
        });
      }
    }

    return successResponse(
      res,
      "All notifications deleted",
      { deleted: (deletedSingle?.deletedCount ?? 0) + deletedMulti },
      200,
    );
  } catch (error: any) {
    console.error("Error deleting all notifications:", error);
    return errorResponse(res, error.message || "Failed to delete notifications", 500);
  }
};

/**
 * Mark all notifications as read for current user
 * PUT /api/notifications/read-all
 * Updates both single-recipient and multi-recipient notifications for this user.
 */
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "Authentication required", 401);

    await Notification.updateMany({ userId }, { isRead: true });
    await Notification.updateMany(
      { userIds: userId },
      { $addToSet: { readBy: userId } },
    );
    return successResponse(res, "All notifications marked as read", null, 200);
  } catch (error: any) {
    console.error("Error marking all as read:", error);
    return errorResponse(res, error.message || "Failed to mark all as read", 500);
  }
};

/**
 * Create a notification (admin/system)
 * POST /api/notifications
 * Body: { userId, type, title, message, data } for single recipient
 *   or: { userIds, type, title, message, data } for multiple recipients
 */
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, userIds, type = "info", title, message, data } = req.body;
    if (!title || !message) return errorResponse(res, "title and message are required", 400);
    const single = userId != null;
    const multi = Array.isArray(userIds) && userIds.length > 0;
    if (!single && !multi) return errorResponse(res, "userId or userIds (non-empty array) is required", 400);

    const payload: any = {
      type,
      title,
      message,
      data: data ?? undefined,
    };
    if (single) {
      payload.userId = userId;
      payload.isRead = false;
    } else {
      payload.userIds = userIds;
      payload.readBy = [];
    }

    const notification = await Notification.create(payload);
    return successResponse(res, "Notification created", notification, 201);
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return errorResponse(res, error.message || "Failed to create notification", 500);
  }
};

