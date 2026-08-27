import express from 'express';
import {
    getOrCreateChatRoom,
    getUserChatRooms,
    getChatMessages,
    sendMessage,
    markMessageRead,
    deleteMessage,
} from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/chat/room
 * @desc    Get or create a chat room with another user
 * @access  Private (all authenticated users)
 */
router.post('/room', getOrCreateChatRoom);

/**
 * @route   GET /api/chat/rooms
 * @desc    Get all chat rooms for the current user (admin sees all)
 * @access  Private (all authenticated users, admin sees all)
 */
router.get('/rooms', getUserChatRooms);

/**
 * @route   GET /api/chat/room/:roomId/messages
 * @desc    Get messages for a chat room
 * @access  Private (participants and admin)
 */
router.get('/room/:roomId/messages', getChatMessages);

/**
 * @route   POST /api/chat/message
 * @desc    Send a message (REST API fallback, prefer Socket.IO)
 * @access  Private (participants and admin)
 */
router.post('/message', sendMessage);

/**
 * @route   POST /api/chat/message/read
 * @desc    Mark message as read
 * @access  Private (participants and admin)
 */
router.post('/message/read', markMessageRead);

/**
 * @route   DELETE /api/chat/message/:messageId
 * @desc    Delete a message (soft delete, only sender or admin)
 * @access  Private (only sender or admin)
 */
router.delete('/message/:messageId', deleteMessage);

export default router;



