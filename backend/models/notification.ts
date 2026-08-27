import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  /** Single recipient (legacy / one user). Use with isRead. */
  userId?: mongoose.Types.ObjectId;
  /** Multiple recipients. Use with readBy for per-user read state. */
  userIds?: mongoose.Types.ObjectId[];
  type: string;
  title: string;
  message: string;
  data?: any;
  /** For single-recipient (userId) notifications. */
  isRead: boolean;
  /** For multi-recipient (userIds) notifications: users who have read it. */
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    userIds: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: undefined },
    type: { type: String, default: "info" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
  },
  { timestamps: true },
);

NotificationSchema.pre("validate", function (next) {
  const hasUserId = this.userId != null;
  const hasUserIds = Array.isArray(this.userIds) && this.userIds.length > 0;
  if (!hasUserId && !hasUserIds) {
    next(new Error("Either userId or userIds (non-empty) is required"));
  } else {
    next();
  }
});

export default mongoose.model<INotification>("Notification", NotificationSchema);

