import { Schema, model, Model, Document, Types } from 'mongoose';
import { IChatRoom, IMessage, ChatType, UserRole, MessageType } from '../../shared/types/chat';

// Chat Room Document Interface
export interface IChatRoomDocument extends Document {
    participants: Types.ObjectId[];
    participantRoles: UserRole[];
    chatType: ChatType;
    lastMessage?: Types.ObjectId | null;
    lastMessageAt?: Date | null;
    unreadCount?: Map<string, number>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    updateLastMessage(messageId: Types.ObjectId): Promise<void>;
    incrementUnreadCount(userId: string): Promise<void>;
    resetUnreadCount(userId: string): Promise<void>;
}

// Message Document Interface
export interface IMessageDocument extends Document {
    roomId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderRole: UserRole;
    content: string;
    messageType: MessageType;
    attachments?: string[];
    isRead: boolean;
    readBy?: Types.ObjectId[];
    isDeleted: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// Chat Room Schema
const chatRoomSchema = new Schema<IChatRoomDocument>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],
        participantRoles: [
            {
                type: String,
                enum: ['influencer', 'brand', 'vendor', 'admin'] as UserRole[],
                required: true,
            },
        ],
        chatType: {
            type: String,
            enum: ['vendor-influencer', 'influencer-brand', 'brand-vendor'] as ChatType[],
            required: true,
            index: true,
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastMessageAt: {
            type: Date,
        },
        unreadCount: {
            type: Map,
            of: Number,
            default: new Map(),
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Message Schema
const messageSchema = new Schema<IMessageDocument>(
    {
        roomId: {
            type: Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        senderRole: {
            type: String,
            enum: ['influencer', 'brand', 'vendor', 'admin'] as UserRole[],
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'video', 'file'] as MessageType[],
            default: 'text',
        },
        attachments: [
            {
                type: String,
            },
        ],
        isRead: {
            type: Boolean,
            default: false,
        },
        readBy: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
chatRoomSchema.index({ participants: 1, isActive: 1 });
chatRoomSchema.index({ chatType: 1, isActive: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

// CRITICAL: Unique compound index to prevent duplicate rooms
// This ensures that no two rooms can have the same participants and chat type
chatRoomSchema.index(
    { participants: 1, chatType: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
        name: 'unique_active_chat_room',
    }
);

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, isDeleted: 1 });

// Methods
chatRoomSchema.methods.updateLastMessage = async function (messageId: Types.ObjectId) {
    this.lastMessage = messageId;
    this.lastMessageAt = new Date();
    await this.save();
};

chatRoomSchema.methods.incrementUnreadCount = async function (userId: string) {
    const currentCount = this.unreadCount.get(userId) || 0;
    this.unreadCount.set(userId, currentCount + 1);
    await this.save();
};

chatRoomSchema.methods.resetUnreadCount = async function (userId: string) {
    this.unreadCount.set(userId, 0);
    await this.save();
};

// Export models
export const ChatRoom = model<IChatRoomDocument, Model<IChatRoomDocument>>('ChatRoom', chatRoomSchema);
export const Message = model<IMessageDocument, Model<IMessageDocument>>('Message', messageSchema);

