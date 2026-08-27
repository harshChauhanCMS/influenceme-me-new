import { apiClient } from '@/config/api';
import { API_ENDPOINTS } from '@/utils/network_utils';

// Chat Types
export type ChatType = 'vendor-influencer' | 'influencer-brand' | 'brand-vendor';
export type UserRole = 'influencer' | 'brand' | 'vendor' | 'admin';
export type MessageType = 'text' | 'image' | 'video' | 'file';

export interface ChatRoom {
    _id: string;
    chatType: ChatType;
    participantInfo: {
        _id: string;
        name: string;
        businessName?: string;
        profilePictureUrl?: string;
        role: UserRole;
    };
    lastMessage?: {
        _id: string;
        content: string;
        messageType: MessageType;
        createdAt: string;
    } | null;
    unreadCount: number;
    lastMessageAt?: string | null;
}

export interface ChatMessage {
    _id: string;
    roomId: string;
    senderId: string | {
        _id: string;
        name: string;
        profilePictureUrl?: string;
        role: UserRole;
    };
    senderRole: UserRole;
    content: string;
    messageType: MessageType;
    attachments?: string[];
    isRead: boolean;
    readBy?: string[];
    createdAt: string;
    updatedAt?: string;
}

export interface CreateChatRoomRequest {
    participantId: string;
    chatType: ChatType;
}

export interface SendMessageRequest {
    roomId: string;
    content: string;
    messageType?: MessageType;
    attachments?: string[];
}

// Chat Service
class ChatService {
    private baseUrl = '/api/chat';

    /**
     * Get all chat rooms for the current user
     */
    async getChatRooms(page: number = 1, limit: number = 50): Promise<{ data: ChatRoom[]; pagination?: any }> {
        try {
            const response = await apiClient.get(`${this.baseUrl}/rooms`, {
                params: { page, limit },
            });

            if (response.data.status && response.data.data) {
                return {
                    data: response.data.data,
                    pagination: response.data.pagination,
                };
            }

            return { data: [] };
        } catch (error: any) {
            console.error('Failed to get chat rooms:', error);
            throw new Error(error.response?.data?.message || 'Failed to get chat rooms');
        }
    }

    /**
     * Create or get a chat room
     */
    async createOrGetChatRoom(request: CreateChatRoomRequest): Promise<ChatRoom> {
        try {
            const response = await apiClient.post(`${this.baseUrl}/room`, request);

            if (response.data.status && response.data.data) {
                return response.data.data.room || response.data.data;
            }

            throw new Error(response.data.message || 'Failed to create chat room');
        } catch (error: any) {
            console.error('Failed to create/get chat room:', error);
            // Rethrow so callers can detect status (e.g. 409 for duplicate room)
            if (error.response !== undefined) throw error;
            throw new Error(error.response?.data?.message || 'Failed to create/get chat room');
        }
    }

    /**
     * Get messages for a chat room
     */
    async getMessages(roomId: string, page: number = 1, limit: number = 50): Promise<{ data: ChatMessage[]; pagination?: any }> {
        try {
            const response = await apiClient.get(`${this.baseUrl}/room/${roomId}/messages`, {
                params: { page, limit },
            });

            if (response.data.status && response.data.data) {
                // Backend returns data as array directly (paginatedResponse)
                const messages = Array.isArray(response.data.data) 
                    ? response.data.data 
                    : (response.data.data.messages || []);
                
                return {
                    data: messages,
                    pagination: response.data.pagination,
                };
            }

            return { data: [] };
        } catch (error: any) {
            console.error('Failed to get messages:', error);
            throw new Error(error.response?.data?.message || 'Failed to get messages');
        }
    }

    /**
     * Send a message
     */
    async sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
        try {
            const response = await apiClient.post(`${this.baseUrl}/message`, {
                roomId: request.roomId,
                content: request.content,
                messageType: request.messageType || 'text',
                attachments: request.attachments || [],
            });

            if (response.data.status && response.data.data) {
                return response.data.data.message || response.data.data;
            }

            throw new Error(response.data.message || 'Failed to send message');
        } catch (error: any) {
            console.error('Failed to send message:', error);
            throw new Error(error.response?.data?.message || 'Failed to send message');
        }
    }

    /**
     * Mark messages as read
     */
    async markMessagesAsRead(roomId: string, messageIds?: string[]): Promise<void> {
        try {
            await apiClient.post(`${this.baseUrl}/message/read`, {
                roomId,
                messageIds: messageIds || [],
            });
        } catch (error: any) {
            console.error('Failed to mark messages as read:', error);
            throw new Error(error.response?.data?.message || 'Failed to mark messages as read');
        }
    }

    /**
     * Delete a message (soft delete)
     */
    async deleteMessage(messageId: string): Promise<void> {
        try {
            await apiClient.delete(`${this.baseUrl}/message/${messageId}`);
        } catch (error: any) {
            console.error('Failed to delete message:', error);
            throw new Error(error.response?.data?.message || 'Failed to delete message');
        }
    }
}

export const chatService = new ChatService();



