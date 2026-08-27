'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './authContext';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connectedUsers: Set<string>;
    typingUsers: Map<string, { userName: string; isTyping: boolean }>;
    isUserOnline: (userId: string) => boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Map<string, { userName: string; isTyping: boolean }>>(new Map());
    const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    useEffect(() => {
        if (!token || !user) {
            // Disconnect if no token or user
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Get API URL from environment or use default
        // ENTERPRISE: Use production API URL for Socket.IO
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.influence-me.in';
        
        console.log('📡 Connecting to Socket.IO at:', apiUrl);
        
        // Create socket connection
        const newSocket = io(apiUrl, {
            auth: {
                token,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            // ENTERPRISE: Enable auto-reconnection
            autoConnect: true,
        });

        // Connection events
        newSocket.on('connect', () => {
            console.log('✅ Socket.IO connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Socket.IO disconnected');
            setIsConnected(false);
            setConnectedUsers(new Set());
        });

        newSocket.on('connected', (data: { message: string; userId: string }) => {
            console.log('📡 Socket.IO connection confirmed:', data);
            setConnectedUsers((prev) => {
                const newSet = new Set(prev);
                newSet.add(data.userId);
                return newSet;
            });
        });

        // Handle user online/offline events
        newSocket.on('user_online', (data: { userId: string; roomId?: string }) => {
            console.log('👤 User online:', data.userId);
            setConnectedUsers((prev) => {
                const newSet = new Set(prev);
                newSet.add(data.userId);
                return newSet;
            });
        });

        newSocket.on('user_offline', (data: { userId: string; roomId?: string }) => {
            console.log('👤 User offline:', data.userId);
            setConnectedUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(data.userId);
                return newSet;
            });
        });

        newSocket.on('connect_error', (error) => {
            // Only log non-critical errors (user not found is expected when not logged in)
            if (error.message && error.message.includes('User not found')) {
                // Silently handle - user might not be logged in
                console.log('Socket.IO: User not authenticated, skipping connection');
            } else {
                console.error('Socket.IO connection error:', error);
            }
            setIsConnected(false);
        });

        // Typing indicator handler
        newSocket.on('typing', (data: { roomId: string; userId: string; userName: string; isTyping: boolean }) => {
            const key = `${data.roomId}:${data.userId}`;
            setTypingUsers((prev) => {
                const newMap = new Map(prev);
                if (data.isTyping) {
                    newMap.set(key, { userName: data.userName, isTyping: true });
                    // Auto-clear typing after 3 seconds
                    const timeout = setTimeout(() => {
                        setTypingUsers((prev) => {
                            const updated = new Map(prev);
                            updated.delete(key);
                            return updated;
                        });
                    }, 3000);
                    typingTimeoutRef.current.set(key, timeout);
                } else {
                    newMap.delete(key);
                    const timeout = typingTimeoutRef.current.get(key);
                    if (timeout) {
                        clearTimeout(timeout);
                        typingTimeoutRef.current.delete(key);
                    }
                }
                return newMap;
            });
        });

        setSocket(newSocket);

        // Cleanup on unmount or token change
        return () => {
            // Clear all typing timeouts
            typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
            typingTimeoutRef.current.clear();
            
            newSocket.close();
            setSocket(null);
            setIsConnected(false);
        };
    }, [token, user]);

    // Helper function to check if a user is online
    const isUserOnline = (userId: string): boolean => {
        return connectedUsers.has(userId);
    };

    return (
        <SocketContext.Provider
            value={{
                socket,
                isConnected,
                connectedUsers,
                typingUsers,
                isUserOnline,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

