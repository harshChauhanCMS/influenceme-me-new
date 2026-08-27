import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead, deleteAllForUser, createNotification } from "../controllers/notificationController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Get notifications for current authenticated user
router.get("/", authenticate, getNotifications);

// Mark all notifications as read (must be before /:id/read to avoid "read-all" as id)
router.put("/read-all", authenticate, markAllAsRead);

// Delete all notifications for current user (must be before /:id/read)
router.delete("/all", authenticate, deleteAllForUser);

// Mark notification as read
router.put("/:id/read", authenticate, markAsRead);

// Create notification (admin/system)
router.post("/", authenticate, authorize("admin"), createNotification);

export default router;

