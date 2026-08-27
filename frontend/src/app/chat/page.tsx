'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Avatar,
    Badge,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    InputAdornment,
    Chip,
    Stack,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Send as SendIcon,
    Search as SearchIcon,
    AttachFile as AttachFileIcon,
    MoreVert as MoreVertIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useSearchParams, useRouter } from 'next/navigation';
import { chatService, ChatRoom, ChatMessage } from '@/services/chatService';
import { useAuth } from '@/context/authContext';
import { useSocket } from '@/context/socketContext';
import NegotiationMessage from '@/components/chat/NegotiationMessage';
import { apiClient } from '@/config/api';

interface ChatUser {
    id: string;
    name: string;
    businessName?: string;
    avatar?: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
    online: boolean;
    role?: 'influencer' | 'brand' | 'vendor';
}

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    isMine: boolean;
    messageData?: ChatMessage; // Store full message data for negotiation detection
}

export default function ChatPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { socket, isConnected, typingUsers, isUserOnline: checkUserOnline } = useSocket();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [showMobileChat, setShowMobileChat] = useState(false);

    // State for chat data
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingIndicator, setTypingIndicator] = useState<string | null>(null);
    const [processingNegotiation, setProcessingNegotiation] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // STRICT: Track received message IDs to prevent duplicates (component-level)
    const receivedMessageIdsRef = useRef<Set<string>>(new Set());

    // Load chat rooms on mount
    useEffect(() => {
        loadChatRooms();
    }, []);

    // When roomId is in URL, select that room after rooms are loaded
    useEffect(() => {
        const roomId = searchParams.get('roomId');
        if (!roomId || loading || chatRooms.length === 0) return;
        const room = chatRooms.find((r) => String(r._id) === String(roomId));
        if (room) {
            const participantId = room.participantInfo._id;
            setSelectedChat({
                id: room._id,
                name: room.participantInfo.businessName || room.participantInfo.name,
                businessName: room.participantInfo.businessName,
                avatar: room.participantInfo.profilePictureUrl,
                lastMessage: room.lastMessage?.content || 'No messages yet',
                timestamp: formatTimestamp(room.lastMessageAt || room.lastMessage?.createdAt || ''),
                unreadCount: room.unreadCount,
                online: checkUserOnline(participantId),
                role: (room.participantInfo.role === 'admin' ? undefined : room.participantInfo.role) as 'influencer' | 'brand' | 'vendor' | undefined,
            });
            setSelectedRoomId(room._id);
            setShowMobileChat(true);
            router.replace('/chat', { scroll: false });
        }
    }, [chatRooms, loading, searchParams, router, checkUserOnline]);

    // Load messages when a chat room is selected
    useEffect(() => {
        if (selectedRoomId) {
            loadMessages(selectedRoomId);
        } else {
            setMessages([]);
        }
    }, [selectedRoomId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Socket.io event handlers
    useEffect(() => {
        if (!socket || !isConnected) {
            console.log('📡 Socket not ready:', { socket: !!socket, isConnected });
            return;
        }
        
        console.log('📡 Setting up socket event listeners for room:', selectedRoomId);

        // ENTERPRISE: Join room when selected - emit both event names for compatibility
        const joinRoom = () => {
            if (selectedRoomId && socket && isConnected) {
                console.log('📡 Joining room via socket:', selectedRoomId, '- Socket ID:', socket.id);
                // Emit both event names to ensure backend receives it
                socket.emit('join_room', selectedRoomId);
                socket.emit('joinRoom', { roomId: selectedRoomId });
                console.log('📡 ✅ Room join request sent (both join_room and joinRoom)');
            } else {
                console.warn('⚠️ Cannot join room:', { 
                    selectedRoomId, 
                    socket: !!socket, 
                    isConnected,
                    socketId: socket?.id 
                });
            }
        };

        // Leave room when changed
        const leaveRoom = (roomId: string) => {
            if (roomId) {
                socket.emit('leave_room', roomId);
            }
        };

        // Handle new messages
        const handleNewMessage = (data: { message: any }) => {
            console.log('📨 Received new_message event:', data);
            if (!data || !data.message) {
                console.warn('Invalid message data:', data);
                return;
            }
            
            const newMessage = data.message;
            const messageId = String(newMessage._id || '');
            
            // STRICT: Prevent duplicate processing
            if (!messageId || receivedMessageIdsRef.current.has(messageId)) {
                console.log('📨 ⚠️ Duplicate message ignored (ID already processed):', messageId);
                return;
            }
            
            // Mark as received immediately to prevent race conditions
            receivedMessageIdsRef.current.add(messageId);
            
            // Ensure roomId is string for comparison
            const messageRoomId = String(newMessage.roomId || '');
            const currentRoomId = selectedRoomId ? String(selectedRoomId) : null;
            
            console.log('📨 New message details:', {
                messageId,
                messageRoomId,
                currentRoomId,
                content: newMessage.content,
                createdAt: newMessage.createdAt,
            });
            
            // Check if message is for current room or any room (for updating chat list)
            if (!currentRoomId || messageRoomId === currentRoomId) {
                // STRICT: Parse senderId robustly - handle both string and object formats
                let senderIdString: string = '';
                if (typeof newMessage.senderId === 'string') {
                    senderIdString = newMessage.senderId.trim();
                } else if (newMessage.senderId && typeof newMessage.senderId === 'object') {
                    // Handle populated object format - may have nested ObjectId structure
                    const senderIdObj = newMessage.senderId as any;
                    
                    // Handle nested _id structure: senderId._id might also be an object (ObjectId)
                    if (senderIdObj._id) {
                        if (typeof senderIdObj._id === 'string') {
                            senderIdString = senderIdObj._id.trim();
                        } else if (typeof senderIdObj._id === 'object') {
                            // Nested object - might be ObjectId representation
                            const idValue = senderIdObj._id._id || senderIdObj._id.id || senderIdObj._id;
                            senderIdString = String(idValue).trim();
                        } else {
                            senderIdString = String(senderIdObj._id).trim();
                        }
                    } else {
                        senderIdString = String(senderIdObj.id || '').trim();
                    }
                } else {
                    console.warn('Invalid senderId format:', newMessage.senderId);
                    receivedMessageIdsRef.current.delete(messageId); // Allow retry
                    return;
                }
                
                // CRITICAL: Extract hex ID from ObjectId string representation if needed
                // Backend might send: "new ObjectId('69044482aa298f0fc163a60a')" instead of just the hex
                if (senderIdString.includes('ObjectId(') || senderIdString.includes('new ObjectId')) {
                    // Extract 24-character hex string using regex
                    const hexMatch = senderIdString.match(/([a-fA-F0-9]{24})/);
                    if (hexMatch && hexMatch[1]) {
                        senderIdString = hexMatch[1];
                        console.log('🔧 Extracted senderId from ObjectId string:', senderIdString);
                    }
                }
                
                // STRICT: Normalize for comparison
                const normalizedSenderId = senderIdString.trim();
                const normalizedUserId = (user?._id || '').trim();
                const isMine = normalizedSenderId !== '' && normalizedSenderId === normalizedUserId;
                
                console.log('📨 Processing message:', {
                    messageId,
                    senderIdString: normalizedSenderId,
                    userId: normalizedUserId,
                    isMine,
                    selectedRoomId,
                    senderIdType: typeof newMessage.senderId,
                    senderIdRaw: newMessage.senderId,
                });
                
                // STRICT: Check if message already exists in state (prevent duplicates)
                setMessages((prev) => {
                    // CRITICAL: Check if message with this ID already exists FIRST
                    const exists = prev.some((msg) => msg.id === messageId);
                    if (exists) {
                        console.log('📨 ⚠️ Message already in state, skipping:', messageId);
                        return prev; // Don't modify state
                    }
                    
                    // ENTERPRISE: Handle messages from self - replace optimistic message with real one
                    if (isMine) {
                        console.log('📨 🔍 Message from self - replacing optimistic with real');
                        
                        // CRITICAL: Double-check message doesn't exist (prevent duplicate on left side)
                        const alreadyExists = prev.some((msg) => msg.id === messageId);
                        if (alreadyExists) {
                            console.log('📨 ⚠️ Message from self already exists, preventing duplicate:', messageId);
                            // Just remove optimistic and return existing messages
                            const filtered = prev.filter((msg) => 
                                !(msg.id.startsWith('temp_') && msg.text === newMessage.content && msg.isMine)
                            );
                            return filtered; // Don't add duplicate
                        }
                        
                        // Remove temp messages with matching content (optimistic updates)
                        const filtered = prev.filter((msg) => 
                            !(msg.id.startsWith('temp_') && msg.text === newMessage.content && msg.isMine)
                        );
                        
                        // CRITICAL: Final check before adding - ensure message doesn't exist
                        if (filtered.some((msg) => msg.id === messageId)) {
                            console.log('📨 ⚠️ Message already in filtered list, skipping:', messageId);
                            return filtered;
                        }
                        
                        console.log('📨 ✅ Adding real message from self to right side:', messageId);
                        // Add real message (will appear on right side with isMine: true)
                        return [
                            ...filtered,
                            {
                                id: messageId,
                                senderId: normalizedSenderId, // Use normalized ID
                                text: newMessage.content,
                                timestamp: newMessage.createdAt instanceof Date 
                                    ? newMessage.createdAt.toISOString() 
                                    : (typeof newMessage.createdAt === 'string' 
                                        ? newMessage.createdAt 
                                        : (newMessage.createdAt ? new Date(newMessage.createdAt).toISOString() : new Date().toISOString())),
                                isMine: true, // CRITICAL: This ensures message appears on right side
                            },
                        ];
                    }
                    
                    // CRITICAL: Double-check this is NOT from self (prevent self-message on left)
                    if (normalizedSenderId === normalizedUserId) {
                        console.log('📨 ⚠️ CRITICAL: Message detected as from self in "other users" branch! Skipping:', messageId);
                        return prev; // Don't add message from self - prevents duplicate on left side
                    }
                    
                    // Handle messages from other users (should be on left side)
                    return [
                        ...prev,
                        {
                            id: messageId,
                            senderId: senderIdString,
                            text: newMessage.content,
                            timestamp: newMessage.createdAt instanceof Date 
                                ? newMessage.createdAt.toISOString() 
                                : (typeof newMessage.createdAt === 'string' 
                                    ? newMessage.createdAt 
                                    : (newMessage.createdAt ? new Date(newMessage.createdAt).toISOString() : new Date().toISOString())),
                            isMine: false, // This is from other user (should be on left side)
                        },
                    ];
                });
                
                // Refresh chat rooms to update last message
                loadChatRooms();
                scrollToBottom();
            }
            
            // Always refresh chat rooms list when any message arrives
            loadChatRooms();
        };

        // Handle typing indicator
        const handleTyping = (data: { roomId: string; userId: string; userName: string; isTyping: boolean }) => {
            if (data.roomId === selectedRoomId && data.userId !== user?._id) {
                if (data.isTyping) {
                    setTypingIndicator(`${data.userName} is typing...`);
                } else {
                    setTypingIndicator(null);
                }
            }
        };

        // Handle read receipts
        const handleMessageRead = (data: { messageId: string; readBy: string }) => {
            // Update message read status if needed
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === data.messageId ? { ...msg } : msg
                )
            );
        };

        // Handle user online/offline
        const handleUserOnline = (data: { userId: string; roomId?: string }) => {
            if (!data.roomId || data.roomId === selectedRoomId) {
                // Refresh chat rooms to update online status
                loadChatRooms();
            }
        };

        const handleUserOffline = (data: { userId: string; roomId?: string }) => {
            if (!data.roomId || data.roomId === selectedRoomId) {
                // Refresh chat rooms to update online status
                loadChatRooms();
            }
        };

        // Handle room joined
        const handleRoomJoined = (data: { roomId: string }) => {
            console.log('✅ Joined room:', data.roomId);
            // Optionally reload messages after joining
            if (data.roomId === selectedRoomId) {
                loadMessages(selectedRoomId);
            }
        };

        // Handle errors
        const handleError = (data: { message: string }) => {
            setError(data.message);
        };

        // Register event listeners with enhanced error handling
        console.log('📡 Registering socket event listeners...');
        
        socket.on('room_joined', handleRoomJoined);
        socket.on('roomJoined', handleRoomJoined); // Also listen for camelCase
        
        socket.on('new_message', handleNewMessage);
        socket.on('newMessage', handleNewMessage); // Also listen for camelCase
        
        socket.on('typing', handleTyping);
        socket.on('message_read', handleMessageRead);
        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);
        socket.on('error', handleError);
        socket.on('message_error', handleError);

        // ENTERPRISE: Join room on mount or when selectedRoomId changes
        // CRITICAL: Ensure socket is connected before joining
        if (selectedRoomId && socket && isConnected) {
            console.log('📡 Joining room:', selectedRoomId, '- Socket connected:', isConnected);
            // Small delay to ensure connection is fully established
            setTimeout(() => {
                if (socket && isConnected) {
                    joinRoom();
                } else {
                    console.warn('⚠️ Socket disconnected before room join');
                }
            }, 200);
        } else if (selectedRoomId && !isConnected) {
            console.warn('⚠️ Cannot join room - socket not connected. Waiting for connection...');
            // Wait for connection then join
            const connectTimeout = setTimeout(() => {
                if (socket && isConnected && selectedRoomId) {
                    joinRoom();
                }
            }, 2000);
            return () => clearTimeout(connectTimeout);
        }

        // Cleanup
        return () => {
            console.log('📡 Cleaning up socket event listeners for room:', selectedRoomId);
            if (selectedRoomId) {
                leaveRoom(selectedRoomId);
            }
            socket.off('room_joined', handleRoomJoined);
            socket.off('roomJoined', handleRoomJoined);
            socket.off('new_message', handleNewMessage);
            socket.off('newMessage', handleNewMessage);
            socket.off('typing', handleTyping);
            socket.off('message_read', handleMessageRead);
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
            socket.off('error', handleError);
            socket.off('message_error', handleError);
        };
    }, [socket, isConnected, selectedRoomId, user]);

    const loadChatRooms = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await chatService.getChatRooms(1, 50);
            setChatRooms(result.data || []);
        } catch (err: any) {
            console.error('Failed to load chat rooms:', err);
            setError(err.message || 'Failed to load chat rooms');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (roomId: string) => {
        try {
            setLoadingMessages(true);
            setError(null);
            const result = await chatService.getMessages(roomId, 1, 50);
            const formattedMessages = result.data.map((msg: ChatMessage) => {
                // Check if senderId is populated (object) or just string
                const senderIdString = typeof msg.senderId === 'string' 
                    ? msg.senderId 
                    : msg.senderId._id;
                const isMine = senderIdString === user?._id;
                
                // Format timestamp - store ISO string for formatMessageTimestamp
                const timestampISO = (msg.createdAt && typeof msg.createdAt === 'object' && 'toISOString' in msg.createdAt)
                    ? (msg.createdAt as Date).toISOString() 
                    : (typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt as string).toISOString());
                
                return {
                    id: msg._id,
                    senderId: senderIdString,
                    text: msg.content,
                    timestamp: timestampISO, // Store ISO string, format when displaying
                    isMine,
                    messageData: msg, // Store full message data for negotiation detection
                };
            });
            setMessages(formattedMessages);
            
            // Mark messages as read
            // Note: getChatMessages already marks messages as read automatically
            // But we'll also mark via Socket.io for real-time updates
            if (formattedMessages.length > 0 && socket && isConnected) {
                // Mark each message as read via Socket.io (only messages from others)
                formattedMessages.forEach((msg: any) => {
                    if (!msg.isMine) {
                        // Only mark messages from others as read
                        socket.emit('mark_read', {
                            roomId,
                            messageId: msg.id,
                        });
                    }
                });
                // Refresh chat rooms to update unread count
                loadChatRooms();
            } else if (formattedMessages.length > 0) {
                // If socket not connected, messages are already marked as read by getChatMessages
                // Just refresh chat rooms to update unread count
                loadChatRooms();
            }
        } catch (err: any) {
            console.error('Failed to load messages:', err);
            setError(err.message || 'Failed to load messages');
        } finally {
            setLoadingMessages(false);
        }
    };

    // Handle accepting negotiation
    const handleAcceptNegotiation = async (offerId: string, negotiationDetails: any) => {
        if (processingNegotiation) return;

        setProcessingNegotiation(offerId);
        try {
            const response = await apiClient.post('/api/influencer-offer/negotiation/accept', {
                offerId,
                negotiationDetails,
                message: 'Negotiation accepted',
            });

            if (response.data.status) {
                // Reload messages to show acceptance message and update negotiation status
                if (selectedRoomId) {
                    await loadMessages(selectedRoomId);
                }
                // Force re-render to update negotiation buttons
                setMessages((prev) => [...prev]);
            } else {
                setError(response.data.message || 'Failed to accept negotiation');
            }
        } catch (err: any) {
            console.error('Failed to accept negotiation:', err);
            setError(err.response?.data?.message || 'Failed to accept negotiation');
        } finally {
            setProcessingNegotiation(null);
        }
    };

    // Handle declining negotiation
    const handleDeclineNegotiation = async (offerId: string) => {
        if (processingNegotiation) return;

        setProcessingNegotiation(offerId);
        try {
            // Send decline message to chat
            const declineMessage = 'I have declined the negotiation request.';
            if (selectedRoomId) {
                await chatService.sendMessage({
                    roomId: selectedRoomId,
                    content: declineMessage,
                    messageType: 'text',
                });
            }
        } catch (err: any) {
            console.error('Failed to decline negotiation:', err);
            setError(err.response?.data?.message || 'Failed to decline negotiation');
        } finally {
            setProcessingNegotiation(null);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedRoomId || sending) return;
        
        const content = messageInput.trim();
        const tempMessageId = `temp_${Date.now()}`;
        
        // Optimistically add message to UI if sending via Socket.io
        if (socket && isConnected) {
            setMessages((prev) => [
                ...prev,
                {
                    id: tempMessageId,
                    senderId: user?._id || '',
                    text: content,
                    timestamp: formatTimestamp(new Date().toISOString()),
                  isMine: true,
              },
            ]);
            scrollToBottom();
        }
        
        try {
            setSending(true);
            setError(null);
            
            // Stop typing indicator
            if (socket && isConnected) {
                socket.emit('typing', { roomId: selectedRoomId, isTyping: false });
                setIsTyping(false);
            }
            
                // Send via Socket.io for real-time delivery
            if (socket && isConnected) {
                socket.emit('send_message', {
                    roomId: selectedRoomId,
                    content,
                    messageType: 'text',
                    attachments: [],
                });
                // Message will be added via 'new_message' event from server
                // The temp message will be automatically replaced when the real message arrives
            } else {
                // Fallback to HTTP API if socket is not connected
                await chatService.sendMessage({
                    roomId: selectedRoomId,
                    content,
                    messageType: 'text',
                });
                
                // Reload messages to show the new one
                await loadMessages(selectedRoomId);
                
                // Refresh chat rooms to update last message
                await loadChatRooms();
            }
            
            setMessageInput('');
        } catch (err: any) {
            console.error('Failed to send message:', err);
            setError(err.message || 'Failed to send message');
            // Remove temp message on error
            if (socket && isConnected) {
                setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
            }
        } finally {
            setSending(false);
        }
    };

    // Handle typing indicator
    const handleTypingChange = (value: string) => {
        setMessageInput(value);
        
        if (!socket || !isConnected || !selectedRoomId) return;
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // Send typing indicator
        if (value.trim().length > 0 && !isTyping) {
            socket.emit('typing', { roomId: selectedRoomId, isTyping: true });
            setIsTyping(true);
        }
        
        // Stop typing indicator after 2 seconds of no typing
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && isConnected) {
                socket.emit('typing', { roomId: selectedRoomId, isTyping: false });
                setIsTyping(false);
            }
        }, 2000);
    };

    const handleSelectChat = async (room: ChatRoom) => {
        // Convert ChatRoom to ChatUser format
        const chatUser: ChatUser = {
            id: room._id,
            name: room.participantInfo.businessName || room.participantInfo.name,
            businessName: room.participantInfo.businessName,
            avatar: room.participantInfo.profilePictureUrl,
            lastMessage: room.lastMessage?.content || '',
            timestamp: formatTimestamp(room.lastMessageAt || room.lastMessage?.createdAt || ''),
            unreadCount: room.unreadCount,
            online: false, // TODO: Implement online status
            role: (room.participantInfo.role === 'admin' ? undefined : room.participantInfo.role) as 'influencer' | 'brand' | 'vendor' | undefined,
        };
        
        setSelectedChat(chatUser);
        setSelectedRoomId(room._id);
        setShowMobileChat(true);
    };

    const handleBackToList = () => {
        setShowMobileChat(false);
        setSelectedChat(null);
        setSelectedRoomId(null);
        setMessages([]);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
        if (!timestamp) return '';
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    const formatMessageTimestamp = (timestamp: string | Date): string => {
        if (!timestamp) return '';
        try {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            if (isNaN(date.getTime())) {
                console.warn('Invalid timestamp:', timestamp);
                return '';
            }
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            console.error('Error formatting timestamp:', error, timestamp);
            return '';
        }
    };

    // Use the socket context's isUserOnline function

    // Convert ChatRoom to ChatUser for display
    const chatUsers: ChatUser[] = chatRooms.map((room) => {
        const participantId = room.participantInfo._id;
        return {
            id: room._id,
            name: room.participantInfo.businessName || room.participantInfo.name,
            businessName: room.participantInfo.businessName,
            avatar: room.participantInfo.profilePictureUrl,
            lastMessage: room.lastMessage?.content || 'No messages yet',
            timestamp: formatTimestamp(room.lastMessageAt || room.lastMessage?.createdAt || ''),
            unreadCount: room.unreadCount,
            online: checkUserOnline(participantId),
            role: (room.participantInfo.role === 'admin' ? undefined : room.participantInfo.role) as 'influencer' | 'brand' | 'vendor' | undefined,
        };
    });

    const filteredChats = chatUsers.filter(
        (chat) =>
            chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadgeColor = (role?: string) => {
        switch (role) {
            case 'influencer':
                return '#8CC342';
            case 'brand':
                return '#3b82f6';
            case 'vendor':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    };

    return (
        <Box sx={{ flexGrow: 1, height: 'calc(100vh - 64px)', p: 3, bgcolor: 'background.default' }}>
                <Paper
                    elevation={2}
                    sx={{
                        height: '100%',
                        display: 'flex',
                        overflow: 'hidden',
                        borderRadius: 3,
                    }}
                >
                    {/* Left Sidebar - Chat List */}
                    <Box
                        sx={{
                            width: { xs: '100%', md: 360 },
                            borderRight: { md: '1px solid #e5e7eb' },
                            display: { xs: showMobileChat ? 'none' : 'flex', md: 'flex' },
                            flexDirection: 'column',
                            bgcolor: 'white',
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #e5e7eb' }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                                Messages
                            </Typography>
                            {/* Search */}
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6',
                                        '& fieldset': {
                                            border: 'none',
                                        },
                                    },
                                }}
                            />
                        </Box>

                        {/* Chat List */}
                        <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : error ? (
                                <Box sx={{ p: 2 }}>
                                    <Alert severity="error" onClose={() => setError(null)}>
                                        {error}
                                    </Alert>
                                </Box>
                            ) : filteredChats.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No conversations yet
                                    </Typography>
                                </Box>
                            ) : (
                                filteredChats.map((chat) => {
                                    const room = chatRooms.find(r => r._id === chat.id);
                                    return (
                                <ListItem key={chat.id} disablePadding>
                                    <ListItemButton
                                        selected={selectedChat?.id === chat.id}
                                        onClick={() => {
                                            if (room) handleSelectChat(room);
                                        }}
                                        sx={{
                                            py: 2,
                                            px: 2.5,
                                            borderLeft: '3px solid transparent',
                                            '&.Mui-selected': {
                                                bgcolor: 'primary.light',
                                                borderLeftColor: 'primary.main',
                                                '&:hover': {
                                                    bgcolor: 'primary.light',
                                                },
                                            },
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                            },
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Badge
                                                overlap="circular"
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                variant="dot"
                                                sx={{
                                                    '& .MuiBadge-badge': {
                                                        backgroundColor: chat.online ? '#10b981' : '#9ca3af',
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        border: '2px solid white',
                                                    },
                                                }}
                                            >
                                                <Avatar sx={{ bgcolor: getRoleBadgeColor(chat.role) }}>
                                                    {(chat.businessName || chat.name).charAt(0).toUpperCase()}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        {chat.businessName || chat.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {chat.timestamp}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                    <Typography
                                                    component="div"
                                                        variant="body2"
                                                        color="text.secondary"
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                    }}
                                                >
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '200px',
                                                            fontWeight: chat.unreadCount > 0 ? 600 : 400,
                                                        }}
                                                    >
                                                        {chat.lastMessage}
                                                    </Box>
                                                    {chat.unreadCount > 0 && (
                                                        <Chip
                                                            label={chat.unreadCount}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: 'primary.main',
                                                                color: 'white',
                                                                height: 20,
                                                                minWidth: 20,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 'bold',
                                                            }}
                                                        />
                                                    )}
                                                </Typography>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                                    );
                                })
                            )}
                        </List>
                    </Box>

                    {/* Right Side - Chat Window */}
                    <Box
                        sx={{
                            flex: 1,
                            display: { xs: showMobileChat ? 'flex' : 'none', md: 'flex' },
                            flexDirection: 'column',
                            bgcolor: '#f9fafb',
                        }}
                    >
                        {selectedChat ? (
                            <>
                                {/* Chat Header */}
                                <Box
                                    sx={{
                                        p: 2.5,
                                        bgcolor: 'white',
                                        borderBottom: '1px solid #e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <IconButton
                                            sx={{ display: { xs: 'block', md: 'none' } }}
                                            onClick={handleBackToList}
                                        >
                                            <ArrowBackIcon />
                                        </IconButton>
                                        <Badge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    backgroundColor: selectedChat.online ? '#10b981' : '#9ca3af',
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    border: '2px solid white',
                                                },
                                            }}
                                        >
                                            <Avatar sx={{ bgcolor: getRoleBadgeColor(selectedChat.role), width: 48, height: 48 }}>
                                                {selectedChat.name.charAt(0)}
                                            </Avatar>
                                        </Badge>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                {selectedChat.businessName || selectedChat.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {selectedChat.online ? 'Active now' : selectedChat.role ? `Last seen ${selectedChat.timestamp}` : ''}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </Box>
                                </Box>

                                {/* Messages Area */}
                                <Box
                                    sx={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        p: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                    }}
                                >
                                    {loadingMessages ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                                            <CircularProgress />
                                        </Box>
                                    ) : error ? (
                                        <Box sx={{ p: 2 }}>
                                            <Alert severity="error" onClose={() => setError(null)}>
                                                {error}
                                            </Alert>
                                        </Box>
                                    ) : messages.length === 0 ? (
                                        <Box sx={{ p: 4, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No messages yet. Start the conversation!
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <>
                                    {messages.map((message) => {
                                        // Check if this is a negotiation message
                                        const isNegotiationMessage = message.messageData?.attachments?.some(
                                            (att: string) => {
                                                try {
                                                    if (att.startsWith('{')) {
                                                        const data = JSON.parse(att);
                                                        return data.type === 'negotiation' && data.offerId;
                                                    }
                                                } catch (e) {
                                                    // Not JSON, skip
                                                }
                                                return false;
                                            }
                                        );

                                        return (
                                            <Box
                                                key={message.id}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: message.isMine ? 'flex-end' : 'flex-start',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        maxWidth: '70%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: message.isMine ? 'flex-end' : 'flex-start',
                                                    }}
                                                >
                                                    {isNegotiationMessage && message.messageData ? (
                                                        <NegotiationMessage
                                                            message={message.messageData}
                                                            isOwnMessage={message.isMine}
                                                            onAccept={handleAcceptNegotiation}
                                                            onDecline={handleDeclineNegotiation}
                                                            isProcessing={processingNegotiation === message.id}
                                                        />
                                                    ) : (
                                                        <>
                                                            <Paper
                                                                sx={{
                                                                    p: 2,
                                                                    bgcolor: message.isMine ? 'primary.main' : 'white',
                                                                    color: message.isMine ? 'white' : 'text.primary',
                                                                    borderRadius: 2,
                                                                    boxShadow: 1,
                                                                }}
                                                            >
                                                                <Typography variant="body1">{message.text}</Typography>
                                                            </Paper>
                                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 1 }}>
                                                                {formatMessageTimestamp(message.timestamp)}
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                            {typingIndicator && (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'flex-start',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            maxWidth: '70%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'flex-start',
                                                        }}
                                                    >
                                                        <Paper
                                                            sx={{
                                                                p: 1.5,
                                                                bgcolor: '#f3f4f6',
                                                                borderRadius: 2,
                                                                boxShadow: 1,
                                                            }}
                                                        >
                                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                                {typingIndicator}
                                                            </Typography>
                                                        </Paper>
                                                    </Box>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                    <div ref={messagesEndRef} />
                                </Box>

                                {/* Message Input */}
                                <Box
                                    sx={{
                                        p: 2.5,
                                        bgcolor: 'white',
                                        borderTop: '1px solid #e5e7eb',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <IconButton size="small">
                                            <AttachFileIcon />
                                        </IconButton>
                                        <TextField
                                            fullWidth
                                            multiline
                                            maxRows={3}
                                            placeholder="Type a message..."
                                            value={messageInput}
                                            onChange={(e) => handleTypingChange(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            onBlur={() => {
                                                if (socket && isConnected && selectedRoomId) {
                                                    socket.emit('typing', { roomId: selectedRoomId, isTyping: false });
                                                    setIsTyping(false);
                                                }
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    bgcolor: '#f3f4f6',
                                                    borderRadius: 3,
                                                    '& fieldset': {
                                                        border: 'none',
                                                    },
                                                },
                                            }}
                                        />
                                        <IconButton
                                            onClick={handleSendMessage}
                                            disabled={!messageInput.trim() || sending}
                                            sx={{
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'primary.dark',
                                                },
                                                '&:disabled': {
                                                    bgcolor: '#e5e7eb',
                                                    color: '#9ca3af',
                                                },
                                            }}
                                        >
                                            {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                        </IconButton>
                                    </Box>
                                </Box>
                            </>
                        ) : (
                            // Empty State
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    p: 4,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        borderRadius: '50%',
                                        bgcolor: 'primary.light',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 3,
                                    }}
                                >
                                    <SendIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    Your Messages
                                </Typography>
                                <Typography variant="body1" color="text.secondary" textAlign="center">
                                    Select a conversation from the list to start chatting
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>
    );
}

