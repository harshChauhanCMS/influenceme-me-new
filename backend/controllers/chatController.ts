import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  ChatRoom,
  Message,
  IChatRoomDocument,
  IMessageDocument,
} from "../models/chat";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "../utils/responseHelper";
import { validateContent } from "../utils/contentFilter";
import {
  ICreateChatRoomRequest,
  ISendMessageRequest,
  IMarkMessageReadRequest,
  IChatRoomListResponse,
  ChatType,
  UserRole,
} from "../../shared/types/chat";
import User from "../models/user";
import { createAndSend } from "../services/notificationService";

/**
 * Determine chat type based on two user roles
 */
const getChatType = (role1: string, role2: string): ChatType | null => {
  const roles = [role1, role2].sort().join("-");

  if (roles === "influencer-vendor") return "vendor-influencer";
  if (roles === "brand-influencer") return "influencer-brand";
  if (roles === "brand-vendor") return "brand-vendor";

  return null;
};

/**
 * @desc    Get or create a chat room with another user
 * @route   POST /api/chat/room
 * @access  Private (all authenticated users)
 */
export const getOrCreateChatRoom = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const { participantId, chatType } = req.body as ICreateChatRoomRequest;

    if (!participantId) {
      return errorResponse(res, "Participant ID is required", 400);
    }

    // Get current user and participant
    const currentUser = req.user!;
    const participant = await User.findById(participantId);

    if (!participant) {
      return errorResponse(res, "Participant not found", 404);
    }

    // Prevent self-chat
    if (userId === participantId) {
      return errorResponse(res, "Cannot create a chat room with yourself", 400);
    }

    // Determine chat type if not provided
    let finalChatType: ChatType | null = chatType;
    if (!finalChatType) {
      finalChatType = getChatType(currentUser.role, participant.role);
    }

    if (!finalChatType) {
      return errorResponse(
        res,
        "Invalid chat type. Users must have different roles.",
        400,
      );
    }

    // STRICT: Check if chat room already exists (multiple queries to ensure no duplicates)
    // Query 1: Check with $all operator (order-independent)
    let room = await ChatRoom.findOne({
      participants: { $all: [userId, participantId] },
      chatType: finalChatType,
      isActive: true,
    }).populate("participants", "name profilePictureUrl role");

    // Query 2: Double-check with exact size match (ensure exactly 2 participants)
    if (!room) {
      room = await ChatRoom.findOne({
        $and: [
          { participants: { $size: 2 } },
          { participants: { $all: [userId, participantId] } },
          { chatType: finalChatType },
          { isActive: true },
        ],
      }).populate("participants", "name profilePictureUrl role");
    }

    // Query 3: Final check - search all active rooms with these participants (regardless of chat type, as fallback)
    if (!room) {
      const allRooms = await ChatRoom.find({
        participants: { $all: [userId, participantId] },
        isActive: true,
      });

      // If any room exists with these participants, return it (don't create duplicate)
      if (allRooms && allRooms.length > 0) {
        room = allRooms[0];
        await room.populate("participants", "name profilePictureUrl role");
      }
    }

    // Only create if NO room exists
    if (!room) {
      // CRITICAL: Final check before creation (race condition prevention)
      const finalCheck = await ChatRoom.findOne({
        participants: { $all: [userId, participantId] },
        chatType: finalChatType,
        isActive: true,
      });

      if (finalCheck) {
        // Room was created between our last check and now
        room = finalCheck;
        await room.populate("participants", "name profilePictureUrl role");
      } else {
        // Safe to create - no room exists
        room = new ChatRoom({
          participants: [userId, participantId],
          participantRoles: [currentUser.role, participant.role] as UserRole[],
          chatType: finalChatType,
          unreadCount: new Map(),
          isActive: true,
        });

        try {
          await room.save();
          await room.populate(
            "participants",
            "name profilePictureUrl role businessInfo",
          );
        } catch (saveError: any) {
          // If save fails due to duplicate (unique index), find existing room
          if (
            saveError.code === 11000 ||
            saveError.message?.includes("duplicate")
          ) {
            room = await ChatRoom.findOne({
              participants: { $all: [userId, participantId] },
              chatType: finalChatType,
              isActive: true,
            }).populate(
              "participants",
              "name profilePictureUrl role businessInfo",
            );

            // Fallback: find by participants only (race / index edge case)
            if (!room) {
              room = await ChatRoom.findOne({
                participants: { $all: [userId, participantId] },
                isActive: true,
              }).populate(
                "participants",
                "name profilePictureUrl role businessInfo",
              );
            }

            if (!room) {
              return errorResponse(
                res,
                "Failed to create chat room due to duplicate",
                409,
              );
            }
          } else {
            throw saveError;
          }
        }
      }
    }

    // Get last message if exists
    if (room.lastMessage) {
      const lastMessage = await Message.findById(room.lastMessage);
      if (lastMessage) {
        await lastMessage.populate("senderId", "name profilePictureUrl role");
      }

      // Format participants with businessName for brands
      const formattedParticipants = room.participants.map((p: any) => {
        const participant: any = {
          _id: p._id,
          name: p.name,
          profilePictureUrl: p.profilePictureUrl,
          role: p.role,
        };
        // Add businessName for brands
        if (p.role === "brand" && p.businessInfo?.businessName) {
          participant.businessName = p.businessInfo.businessName;
        }
        return participant;
      });

      return successResponse(res, "Chat room retrieved successfully", {
        room: {
          _id: room._id,
          chatType: room.chatType,
          participants: formattedParticipants,
          participantRoles: room.participantRoles,
          lastMessage: lastMessage
            ? {
                _id: String(lastMessage._id),
                content: lastMessage.content,
                messageType: lastMessage.messageType,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          lastMessageAt: room.lastMessageAt,
          unreadCount: room.unreadCount
            ? Object.fromEntries(room.unreadCount)
            : {},
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        },
      });
    }

    // Format participants with businessName for brands
    const formattedParticipants = room.participants.map((p: any) => {
      const participant: any = {
        _id: p._id,
        name: p.name,
        profilePictureUrl: p.profilePictureUrl,
        role: p.role,
      };
      // Add businessName for brands
      if (p.role === "brand" && p.businessInfo?.businessName) {
        participant.businessName = p.businessInfo.businessName;
      }
      return participant;
    });

    return successResponse(res, "Chat room retrieved successfully", {
      room: {
        _id: room._id,
        chatType: room.chatType,
        participants: formattedParticipants,
        participantRoles: room.participantRoles,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: Object.fromEntries(room.unreadCount || new Map()),
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get or Create Chat Room Error:", error);
    return errorResponse(
      res,
      error.message || "Failed to get or create chat room",
      500,
    );
  }
};

/**
 * @desc    Get all chat rooms for the current user
 * @route   GET /api/chat/rooms
 * @access  Private (all authenticated users, admin sees all)
 */
export const getUserChatRooms = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Admin can see all chat rooms
    const isAdmin = req.user?.role === "admin";

    let query: any = { isActive: true };

    if (!isAdmin) {
      query.participants = userId;
    }

    // Get chat rooms with optimized populate (avoids N+1 queries)
    const rooms = await ChatRoom.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("participants", "name profilePictureUrl role businessInfo")
      .populate({
        path: "lastMessage",
        select: "_id content messageType createdAt isDeleted",
        match: { isDeleted: false },
      })
      .lean(); // Use lean() for better performance

    // Format response (no more async N+1 queries - lastMessage is already populated)
    const formattedRooms: IChatRoomListResponse[] = rooms.map((room: any) => {
      // Get the other participant (not current user)
      const otherParticipant = room.participants.find(
        (p: any) => p._id.toString() !== userId,
      ) as any;

      // Get unread count for current user
      const unreadCount =
        (room.unreadCount &&
          room.unreadCount.get &&
          room.unreadCount.get(userId)) ||
        (typeof room.unreadCount === "object" && room.unreadCount[userId]) ||
        0;

      // Format last message (already populated, no need for extra query)
      let lastMessageInfo = null;
      if (room.lastMessage && !room.lastMessage.isDeleted) {
        lastMessageInfo = {
          _id: String(room.lastMessage._id),
          content: room.lastMessage.content,
          messageType: room.lastMessage.messageType,
          createdAt: room.lastMessage.createdAt,
        };
      }

      // For admin, if no other participant found, show first participant
      const displayParticipant =
        otherParticipant || (room.participants[0] as any);

      // For brands, prefer businessName over name if available
      let displayName = displayParticipant
        ? String(displayParticipant.name)
        : "Unknown";
      if (
        displayParticipant &&
        displayParticipant.role === "brand" &&
        displayParticipant.businessInfo?.businessName
      ) {
        const businessName = String(
          displayParticipant.businessInfo.businessName,
        );
        if (businessName.trim().length > 0) {
          displayName = businessName;
        }
      }

      return {
        _id: String(room._id),
        chatType: room.chatType,
        participantInfo: displayParticipant
          ? {
              _id: String(displayParticipant._id),
              name: displayName,
              businessName: displayParticipant.businessInfo?.businessName,
              profilePictureUrl: displayParticipant.profilePictureUrl,
              role: displayParticipant.role as UserRole,
            }
          : {
              _id: "",
              name: "Unknown",
              role: "influencer" as UserRole,
            },
        lastMessage: lastMessageInfo,
        unreadCount,
        lastMessageAt: room.lastMessageAt || null,
      };
    });

    // Get total count
    const total = await ChatRoom.countDocuments(query);

    return paginatedResponse(
      res,
      "Chat rooms retrieved successfully",
      formattedRooms,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    );
  } catch (error: any) {
    console.error("Get User Chat Rooms Error:", error);
    return errorResponse(res, error.message || "Failed to get chat rooms", 500);
  }
};

/**
 * @desc    Get messages for a chat room
 * @route   GET /api/chat/room/:roomId/messages
 * @access  Private (participants and admin)
 */
export const getChatMessages = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const roomId = req.params.roomId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verify room exists and user has access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return errorResponse(res, "Chat room not found", 404);
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === userId,
    );
    const isAdmin = req.user?.role === "admin";

    if (!isParticipant && !isAdmin) {
      return errorResponse(res, "Access denied to this chat room", 403);
    }

    // Get messages
    const messages = await Message.find({
      roomId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "name profilePictureUrl role");

    // Reverse to show oldest first
    messages.reverse();

    // Mark messages as read for current user
    const messageIds = messages.map((m) => m._id);
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        senderId: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
        $set: { isRead: true },
      },
    );

    // Reset unread count for this room
    if (isParticipant) {
      await room.resetUnreadCount(userId);
    }

    // Get total count
    const total = await Message.countDocuments({
      roomId,
      isDeleted: false,
    });

    return paginatedResponse(
      res,
      "Messages retrieved successfully",
      messages.map((msg) => ({
        _id: msg._id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderRole: msg.senderRole,
        content: msg.content,
        messageType: msg.messageType,
        attachments: msg.attachments || [],
        isRead: msg.isRead,
        readBy: msg.readBy || [],
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      })),
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    );
  } catch (error: any) {
    console.error("Get Chat Messages Error:", error);
    return errorResponse(res, error.message || "Failed to get messages", 500);
  }
};

/**
 * @desc    Send a message (REST API fallback, prefer Socket.IO)
 * @route   POST /api/chat/message
 * @access  Private (participants and admin)
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const {
      roomId,
      content,
      messageType = "text",
      attachments = [],
    } = req.body as ISendMessageRequest;

    if (!roomId || !content) {
      return errorResponse(res, "Room ID and content are required", 400);
    }

    // Validate content
    const validation = validateContent(content);
    if (!validation.isValid) {
      return errorResponse(
        res,
        validation.message || "Invalid message content",
        400,
      );
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return errorResponse(res, "Chat room not found", 404);
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === userId,
    );
    const isAdmin = req.user?.role === "admin";

    if (!isParticipant && !isAdmin) {
      return errorResponse(res, "Access denied to this chat room", 403);
    }

    // Create message
    const message = new Message({
      roomId,
      senderId: userId,
      senderRole: req.user!.role as UserRole,
      content,
      messageType,
      attachments,
      isRead: false,
      readBy: [userId], // Sender has read their own message
    });

    await message.save();

    // Update room's last message
    await room.updateLastMessage(message._id as any);

    // Increment unread count for other participants
    for (const participantId of room.participants) {
      const participantIdStr = String(participantId);
      if (participantIdStr !== userId) {
        await room.incrementUnreadCount(participantIdStr);
      }
    }

    // First message in room: notify the other participant (brand, vendor, or influencer)
    const messageCount = await Message.countDocuments({ roomId });
    if (messageCount === 1) {
      const otherParticipantId = room.participants.find(
        (p) => p.toString() !== userId,
      );
      if (otherParticipantId) {
        const senderName = (req.user as any)?.name || "Someone";
        const otherUser = await User.findById(otherParticipantId).select("name role").lean();
        const otherName = (otherUser as any)?.name || "(unknown)";
        const otherRole = (otherUser as any)?.role || "(unknown)";
        console.log(
          `[Chat] First message | room=${roomId} | sender="${senderName}" → notifying "${otherName}" (${otherRole}, ${otherParticipantId})`,
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

    await message.populate("senderId", "name profilePictureUrl role");

    return successResponse(res, "Message sent successfully", {
      message: {
        _id: message._id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        messageType: message.messageType,
        attachments: message.attachments || [],
        isRead: message.isRead,
        readBy: message.readBy || [],
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Send Message Error:", error);
    return errorResponse(res, error.message || "Failed to send message", 500);
  }
};

/**
 * @desc    Mark message as read
 * @route   POST /api/chat/message/read
 * @access  Private (participants and admin)
 */
export const markMessageRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const { roomId, messageId } = req.body as IMarkMessageReadRequest;

    if (!roomId || !messageId) {
      return errorResponse(res, "Room ID and message ID are required", 400);
    }

    // Verify room exists and user has access
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return errorResponse(res, "Chat room not found", 404);
    }

    const isParticipant = room.participants.some(
      (p) => p.toString() === userId,
    );
    const isAdmin = req.user?.role === "admin";

    if (!isParticipant && !isAdmin) {
      return errorResponse(res, "Access denied to this chat room", 403);
    }

    // Update message
    const message = await Message.findById(messageId);
    if (!message || String(message.roomId) !== roomId) {
      return errorResponse(res, "Message not found", 404);
    }

    if (!message.readBy?.some((id) => String(id) === userId)) {
      message.readBy = message.readBy || [];
      message.readBy.push(userId as any);
      message.isRead = message.readBy.length > 0;
      await message.save();
    }

    // Reset unread count for this room
    if (isParticipant) {
      await room.resetUnreadCount(userId);
    }

    return successResponse(res, "Message marked as read", {
      messageId,
      readBy: message.readBy || [],
    });
  } catch (error: any) {
    console.error("Mark Message Read Error:", error);
    return errorResponse(
      res,
      error.message || "Failed to mark message as read",
      500,
    );
  }
};

/**
 * @desc    Delete a message (soft delete)
 * @route   DELETE /api/chat/message/:messageId
 * @access  Private (only sender)
 */
export const deleteMessage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return errorResponse(res, "Message not found", 404);
    }

    // Only sender can delete their message
    if (String(message.senderId) !== userId && req.user!.role !== "admin") {
      return errorResponse(
        res,
        "Only the message sender can delete this message",
        403,
      );
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return successResponse(res, "Message deleted successfully", {
      messageId: message._id,
    });
  } catch (error: any) {
    console.error("Delete Message Error:", error);
    return errorResponse(res, error.message || "Failed to delete message", 500);
  }
};
