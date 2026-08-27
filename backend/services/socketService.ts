import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user";
import {
  ChatRoom,
  Message,
  IChatRoomDocument,
  IMessageDocument,
} from "../models/chat";
import { filterContent, validateContent } from "../utils/contentFilter";
import { ChatType, UserRole, MessageType } from "../../shared/types/chat";
import { createAndSend } from "./notificationService";

interface AuthenticatedSocket extends Socket {
  user?: IUser | null;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  // STRICT: Track processing messages to prevent duplicates
  private processingMessages: Map<string, number> = new Map(); // messageKey -> timestamp

  /**
   * Initialize Socket.IO server
   */
  public initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: ["https://influence-me.in", "https://www.influence-me.in"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.split(" ")[1];

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return next(new Error("Server configuration error"));
        }

        const decoded = jwt.verify(token, secret) as { id: string };
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
          return next(new Error("User not found"));
        }

        socket.user = user;
        next();
      } catch (error: any) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });

    // Connection handler
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    console.log("✅ Socket.IO service initialized");
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const userId = socket.user._id.toString();
    this.connectedUsers.set(userId, socket.id);

    console.log(
      `✅ User connected: ${socket.user.name} (${socket.user.role}) - User ID: ${userId} - Socket ID: ${socket.id}`,
    );
    console.log(`📊 Total connected users: ${this.connectedUsers.size}`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // ENTERPRISE: Automatically join all active chat rooms when user connects
    // This ensures users receive messages even if they haven't explicitly joined a room
    const userName = socket.user.name; // Store name before async operation
    ChatRoom.find({ participants: userId, isActive: true })
      .then((rooms) => {
        console.log(
          `🔄 Auto-joining ${rooms.length} active rooms for user ${userName} (${userId})`,
        );
        rooms.forEach((room) => {
          socket.join(`room:${room._id}`);
          console.log(`✅ Auto-joined room: ${room._id}`);
        });
      })
      .catch((err) => {
        console.error("Error auto-joining rooms:", err);
      });

    // Emit connection status to user
    socket.emit("connected", {
      message: "Connected to chat server",
      userId,
    });

    // Notify all users about this user coming online
    if (this.io) {
      // Get all chat rooms this user is part of
      ChatRoom.find({ participants: userId, isActive: true })
        .then((rooms) => {
          rooms.forEach((room) => {
            // Notify other participants in this room
            room.participants.forEach((participantId: any) => {
              const participantIdStr = participantId.toString();
              if (participantIdStr !== userId) {
                const participantSocketId =
                  this.connectedUsers.get(participantIdStr);
                if (participantSocketId && this.io) {
                  this.io.to(participantSocketId).emit("user_online", {
                    userId,
                    roomId: String(room._id),
                  });
                }
              }
            });
          });
        })
        .catch((err) => {
          console.error("Error notifying users of online status:", err);
        });
    }

    // Handle joining chat room (support both underscore and camelCase for mobile compatibility)
    socket.on("join_room", async (roomId: string) => {
      await this.handleJoinRoom(socket, roomId);
    });

    socket.on("joinRoom", async (data: any) => {
      const roomId = typeof data === "string" ? data : data?.roomId || data;
      if (roomId) {
        await this.handleJoinRoom(socket, roomId);
      }
    });

    // Handle leaving chat room (support both underscore and camelCase)
    socket.on("leave_room", (roomId: string) => {
      socket.leave(`room:${roomId}`);
      console.log(`User ${userId} left room ${roomId}`);
    });

    socket.on("leaveRoom", (data: any) => {
      const roomId = typeof data === "string" ? data : data?.roomId || data;
      if (roomId) {
        socket.leave(`room:${roomId}`);
        console.log(`User ${userId} left room ${roomId}`);
      }
    });

    // STRICT: Handle sending message - prevent duplicate processing
    socket.on(
      "send_message",
      async (data: {
        roomId: string;
        content: string;
        messageType?: string;
        attachments?: string[];
      }) => {
        // Create unique key for this message (using socket ID, room ID, and content hash)
        const contentHash = data.content.substring(0, 50); // First 50 chars for deduplication
        const messageKey = `${socket.id}_${data.roomId}_${contentHash}`;
        const now = Date.now();

        // Check if already processing this message (within last 2 seconds - prevent race conditions)
        const lastProcessed = this.processingMessages.get(messageKey);
        if (lastProcessed && now - lastProcessed < 2000) {
          console.log(
            "⚠️ Duplicate send_message event ignored (processed",
            now - lastProcessed,
            "ms ago):",
            messageKey,
          );
          return;
        }

        // Mark as processing
        this.processingMessages.set(messageKey, now);
        await this.handleSendMessage(socket, data);

        // Clean up old entries (prevent memory leak) - keep for 5 seconds
        setTimeout(() => {
          const currentTime = this.processingMessages.get(messageKey);
          if (currentTime && Date.now() - currentTime > 5000) {
            this.processingMessages.delete(messageKey);
          }
        }, 5000);
      },
    );

    // DEPRECATED: chatMessage event - ignore to prevent duplicates
    // Mobile should only use send_message event
    socket.on("chatMessage", async (data: any) => {
      console.log(
        "⚠️ DEPRECATED: chatMessage event received, ignoring (use send_message instead)",
      );
      // Ignore to prevent duplicate processing
      return;
    });

    // Handle message read
    socket.on(
      "mark_read",
      async (data: { roomId: string; messageId: string }) => {
        await this.handleMarkRead(socket, data);
      },
    );

    // Handle typing indicator (support both underscore and camelCase)
    socket.on("typing", (data: { roomId: string; isTyping: boolean }) => {
      this.handleTyping(socket, data);
    });

    socket.on("startTyping", (data: any) => {
      if (data && data.roomId) {
        this.handleTyping(socket, { roomId: data.roomId, isTyping: true });
      }
    });

    socket.on("stopTyping", (data: any) => {
      if (data && data.roomId) {
        this.handleTyping(socket, { roomId: data.roomId, isTyping: false });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      this.connectedUsers.delete(userId);
      console.log(
        `❌ User disconnected: ${socket.user?.name} (Socket ID: ${socket.id})`,
      );

      // Notify all users about this user going offline
      if (this.io && socket.user) {
        // Get all chat rooms this user is part of
        ChatRoom.find({ participants: userId, isActive: true })
          .then((rooms) => {
            rooms.forEach((room) => {
              // Notify other participants in this room
              room.participants.forEach((participantId: any) => {
                const participantIdStr = participantId.toString();
                if (participantIdStr !== userId) {
                  const participantSocketId =
                    this.connectedUsers.get(participantIdStr);
                  if (participantSocketId && this.io) {
                    this.io.to(participantSocketId).emit("user_offline", {
                      userId,
                      roomId: String(room._id),
                    });
                  }
                }
              });
            });
          })
          .catch((err) => {
            console.error("Error notifying users of offline status:", err);
          });
      }
    });
  }

  /**
   * Handle joining a chat room
   */
  private async handleJoinRoom(
    socket: AuthenticatedSocket,
    roomId: string,
  ): Promise<void> {
    if (!socket.user) return;

    try {
      const room = await ChatRoom.findById(roomId);
      if (!room) {
        socket.emit("error", { message: "Chat room not found" });
        return;
      }

      // Check if user is a participant or admin
      const userId = socket.user._id.toString();
      const isParticipant = room.participants.some(
        (p) => p.toString() === userId,
      );
      const isAdmin = socket.user.role === "admin";

      if (!isParticipant && !isAdmin) {
        socket.emit("error", { message: "Access denied to this chat room" });
        return;
      }

      // Join the room
      socket.join(`room:${roomId}`);
      console.log(
        `🏠 User ${socket.user.name} (${socket.user.role}) joining room ${roomId} - Socket ID: ${socket.id}`,
      );

      // Reset unread count
      if (isParticipant) {
        room.resetUnreadCount(userId);
      }

      // Emit to both event names for compatibility (web and mobile)
      socket.emit("room_joined", { roomId });
      socket.emit("roomJoined", { roomId });
      console.log(
        `✅ User ${socket.user.name} (${socket.user.role}) joined room ${roomId} - Socket ID: ${socket.id}`,
      );

      // ENTERPRISE: Log room participants for debugging and verification
      if (this.io) {
        const roomSocket = await this.io.in(`room:${roomId}`).fetchSockets();
        const participantNames = roomSocket
          .map((s: any) => s.user?.name || "unknown")
          .join(", ");
        console.log(
          `📊 Room ${roomId} now has ${roomSocket.length} connected participants: [${participantNames}]`,
        );

        // Verify user is actually in the room
        const isInRoom = roomSocket.some((s: any) => s.id === socket.id);
        if (!isInRoom) {
          console.error(
            `⚠️ WARNING: User ${socket.user.name} (${socket.id}) not found in room ${roomId} participants!`,
          );
        } else {
          console.log(
            `✅ Verified: User ${socket.user.name} (${socket.id}) is in room ${roomId}`,
          );
        }
      }
    } catch (error: any) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(
    socket: AuthenticatedSocket,
    data: {
      roomId: string;
      content: string;
      messageType?: string;
      attachments?: string[];
    },
  ): Promise<void> {
    if (!socket.user || !this.io) return;

    try {
      const { roomId, content, messageType = "text", attachments = [] } = data;

      // Validate content
      const validation = validateContent(content);
      if (!validation.isValid) {
        socket.emit("message_error", { message: validation.message });
        return;
      }

      // Filter content (double check)
      const { content: filteredContent } = filterContent(content);

      // Verify room exists and user has access
      const room = await ChatRoom.findById(roomId);
      if (!room) {
        socket.emit("message_error", { message: "Chat room not found" });
        return;
      }

      const userId = socket.user._id.toString();
      const isParticipant = room.participants.some(
        (p) => p.toString() === userId,
      );
      const isAdmin = socket.user.role === "admin";

      if (!isParticipant && !isAdmin) {
        socket.emit("message_error", { message: "Access denied" });
        return;
      }

      // Create message
      const message = new Message({
        roomId,
        senderId: userId,
        senderRole: socket.user.role as UserRole,
        content: filteredContent,
        messageType: messageType as MessageType,
        attachments,
        isRead: false,
        readBy: [userId], // Sender has read their own message
      });

      await message.save();

      // Update room's last message
      await room.updateLastMessage(message._id as any);

      // Increment unread count for other participants
      for (const participantId of room.participants) {
        const participantIdStr = participantId.toString();
        if (participantIdStr !== userId) {
          await room.incrementUnreadCount(participantIdStr);
        }
      }

      await room.save();

      // First message in room: notify the other participant (brand, vendor, or influencer)
      const messageCount = await Message.countDocuments({ roomId });
      if (messageCount === 1) {
        const otherParticipantId = room.participants.find(
          (p) => p.toString() !== userId,
        );
        if (otherParticipantId) {
          const senderName = socket.user?.name || "Someone";
          const otherUser = await User.findById(otherParticipantId)
            .select("name role")
            .lean();
          const otherName = (otherUser as any)?.name || "(unknown)";
          const otherRole = (otherUser as any)?.role || "(unknown)";
          console.log(
            `[Socket] First message | room=${roomId} | sender="${senderName}" → notifying "${otherName}" (${otherRole}, ${otherParticipantId})`,
          );
          createAndSend(
            otherParticipantId as any,
            "first_conversation",
            "New conversation",
            `New conversation started with ${senderName}.`,
            { roomId, chatType: room.chatType },
          ).catch((err) =>
            console.error(
              "Failed to send first conversation notification:",
              err,
            ),
          );
        }
      }

      // Populate sender info for response
      await message.populate("senderId", "name profilePictureUrl role");

      // ENTERPRISE: Get all participants in the room for debugging and verification
      const roomSocketBeforeEmit = await this.io
        .in(`room:${roomId}`)
        .fetchSockets();
      const participantIds = roomSocketBeforeEmit
        .map((s: any) => s.user?._id?.toString() || "unknown")
        .join(", ");
      console.log(
        `📤 Room ${roomId} has ${roomSocketBeforeEmit.length} connected participants: [${participantIds}]`,
      );

      // CRITICAL: Verify sender is in the room
      const senderInRoomBeforeEmit = roomSocketBeforeEmit.some(
        (s: any) => s.id === socket.id,
      );
      if (!senderInRoomBeforeEmit) {
        console.error(
          `⚠️ WARNING: Sender ${socket.user.name} (${socket.id}) not found in room ${roomId} participants!`,
        );
      }

      // Emit message to all room participants
      const messagePayload = {
        message: {
          _id: String(message._id),
          roomId: String(message.roomId),
          senderId: {
            _id: String(message.senderId),
            name: socket.user.name,
            profilePictureUrl: socket.user.profilePictureUrl,
            role: socket.user.role,
          },
          senderRole: message.senderRole,
          content: message.content,
          messageType: message.messageType,
          attachments: message.attachments || [],
          isRead: message.isRead,
          createdAt:
            message.createdAt instanceof Date
              ? message.createdAt.toISOString()
              : message.createdAt,
          updatedAt:
            message.updatedAt instanceof Date
              ? message.updatedAt.toISOString()
              : message.updatedAt,
        },
      };

      // ENTERPRISE: Single-emission strategy to prevent duplicates
      // CRITICAL: Only emit ONCE per client to prevent duplicate messages

      // Track which sockets have already received this message
      const sentSockets = new Set<string>();

      // STEP 1: Emit to sender directly (only once) - sender sees their message immediately
      socket.emit("new_message", messagePayload);
      socket.emit("message_sent", {
        messageId: String(message._id),
        roomId: String(message.roomId),
        success: true,
      });
      sentSockets.add(socket.id);
      console.log(
        `📤 CHANNEL 0: Emitted to sender (Socket: ${socket.id}, User: ${socket.user.name})`,
      );

      // STEP 2: Emit to other participants in room ONLY (socket.to excludes sender)
      // CRITICAL: socket.to() excludes the sender, so sender won't receive this
      socket.to(`room:${roomId}`).emit("new_message", messagePayload);

      // Verify sender is NOT in room socket list (double-check)
      const roomSockets = await this.io.in(`room:${roomId}`).fetchSockets();
      const senderInRoom = roomSockets.some((s: any) => s.id === socket.id);
      if (senderInRoom) {
        console.warn(
          `⚠️ WARNING: Sender ${socket.user.name} (${socket.id}) is in room ${roomId}, but socket.to() should exclude them`,
        );
      }

      console.log(
        `📤 CHANNEL 1: Emitted to room namespace room:${roomId} (excluding sender) - ${roomSockets.length} sockets in room`,
      );

      // STEP 3: Direct emit to participants who might not be in room
      // Only emit to participants who are NOT in the room namespace (avoid duplicates)
      // Use the roomSockets list we already fetched in STEP 2
      for (const participantId of room.participants) {
        const participantIdStr = participantId.toString();
        if (participantIdStr !== userId) {
          // Don't emit to sender (already done in STEP 1)
          const participantSocketId = this.connectedUsers.get(participantIdStr);
          if (
            participantSocketId &&
            this.io &&
            !sentSockets.has(participantSocketId)
          ) {
            const participantSocket =
              this.io.sockets.sockets.get(participantSocketId);
            if (participantSocket) {
              // Check if participant is already in room (use roomSockets from STEP 2)
              const isInRoom = roomSockets.some(
                (s: any) => s.id === participantSocketId,
              );

              if (!isInRoom) {
                // Only emit if NOT in room (to avoid duplicate)
                participantSocket.emit("new_message", messagePayload);
                sentSockets.add(participantSocketId);
                console.log(
                  `📤 CHANNEL 2: Direct emit to participant ${participantIdStr} (Socket: ${participantSocketId}) - not in room`,
                );
              } else {
                console.log(
                  `📤 SKIPPED: Participant ${participantIdStr} already in room, will receive via room namespace`,
                );
              }
            }
          }
        }
      }

      console.log(`📤 Emitted new_message to room:${roomId}`, {
        messageId: String(message._id),
        senderId: String(message.senderId),
        participants: room.participants.map((p: any) => p.toString()),
        connectedParticipants: roomSockets.length,
        createdAt:
          message.createdAt instanceof Date
            ? message.createdAt.toISOString()
            : message.createdAt,
      });

      console.log(`Message sent in room ${roomId} by ${socket.user.name}`);
    } catch (error: any) {
      console.error("Error sending message:", error);
      socket.emit("message_error", { message: "Failed to send message" });
    }
  }

  /**
   * Handle marking message as read
   */
  private async handleMarkRead(
    socket: AuthenticatedSocket,
    data: { roomId: string; messageId: string },
  ): Promise<void> {
    if (!socket.user) return;

    try {
      const { roomId, messageId } = data;
      const userId = socket.user._id.toString();

      const message = await Message.findById(messageId);
      if (!message || message.roomId.toString() !== roomId) {
        return;
      }

      // Add user to readBy array if not already present
      if (!message.readBy?.some((id) => id.toString() === userId)) {
        message.readBy = message.readBy || [];
        message.readBy.push(userId as any);
        message.isRead = message.readBy.length > 0;
        await message.save();
      }

      // Update room unread count
      const room = await ChatRoom.findById(roomId);
      if (room) {
        await room.resetUnreadCount(userId);
      }

      // Emit read receipt
      if (this.io) {
        this.io.to(`room:${roomId}`).emit("message_read", {
          messageId,
          readBy: userId,
        });
      }
    } catch (error: any) {
      console.error("Error marking message as read:", error);
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(
    socket: AuthenticatedSocket,
    data: { roomId: string; isTyping: boolean },
  ): void {
    if (!socket.user || !this.io) return;

    const { roomId, isTyping } = data;
    const userId = socket.user._id.toString();

    // Emit typing status to other participants
    socket.to(`room:${roomId}`).emit("typing", {
      roomId,
      userId,
      userName: socket.user.name,
      isTyping,
    });
  }

  /**
   * Get Socket.IO instance
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Get connected users
   */
  public getConnectedUsers(): Map<string, string> {
    return this.connectedUsers;
  }

  /**
   * Emit event to specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Emit event to all users in a room
   */
  public emitToRoom(roomId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`room:${roomId}`).emit(event, data);
  }
}

// Export singleton instance
export default new SocketService();
