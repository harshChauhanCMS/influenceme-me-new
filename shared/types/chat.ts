// Chat System Types
// Shared types for chat room and message models

export type ChatType = 'vendor-influencer' | 'influencer-brand' | 'brand-vendor';

export type UserRole = 'influencer' | 'brand' | 'vendor' | 'admin';

export type MessageType = 'text' | 'image' | 'video' | 'file';

/**
 * Chat Room Interface
 */
export interface IChatRoom<T = string> {
    _id?: T;
    participants: T[]; // Array of User IDs
    participantRoles: UserRole[]; // ['vendor', 'influencer'] etc. for easy filtering
    chatType: ChatType;
    lastMessage?: T | null;
    lastMessageAt?: Date | null;
    unreadCount?: Record<string, number>; // Map of userId -> unread count
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;

    // Populated fields for frontend display
    participantsInfo?: Array<{
        _id: T;
        name: string;
        profilePictureUrl?: string;
        role: UserRole;
    }>;
    lastMessageInfo?: {
        _id: T;
        content: string;
        senderId: T;
        senderRole: UserRole;
        messageType: MessageType;
        createdAt: Date;
    } | null;
}

/**
 * Message Interface
 */
export interface IMessage<T = string> {
    _id?: T;
    roomId: T;
    senderId: T;
    senderRole: UserRole;
    content: string;
    messageType: MessageType;
    attachments?: string[]; // URLs to files
    isRead: boolean;
    readBy?: T[]; // Array of user IDs who read the message
    isDeleted: boolean;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;

    // Populated fields for frontend display
    senderInfo?: {
        _id: T;
        name: string;
        profilePictureUrl?: string;
        role: UserRole;
    };
    roomInfo?: {
        _id: T;
        chatType: ChatType;
        participants: T[];
    };
}

/**
 * Create Chat Room Request
 */
export interface ICreateChatRoomRequest {
    participantId: string; // The other user ID to chat with
    chatType: ChatType;
}

/**
 * Send Message Request
 */
export interface ISendMessageRequest {
    roomId: string;
    content: string;
    messageType?: MessageType;
    attachments?: string[];
}

/**
 * Mark Message Read Request
 */
export interface IMarkMessageReadRequest {
    roomId: string;
    messageId: string;
}

/**
 * Chat Room List Response (for listing user's chat rooms)
 */
export interface IChatRoomListResponse {
    _id: string;
    chatType: ChatType;
    participantInfo: {
        _id: string;
        name: string;
        profilePictureUrl?: string;
        role: UserRole;
    };
    lastMessage?: {
        _id: string;
        content: string;
        messageType: MessageType;
        createdAt: Date;
    } | null;
    unreadCount: number;
    lastMessageAt?: Date | null;
}



