import { Router } from 'express';
import {
  getDashboard,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUser,
  getChatRooms,
  getChatRoomMessages,
  getAnalytics,
  getWaitingList,
  updateWaitingListStatus,
  getInfluencerInstagramAnalytics,
} from '../controllers/adminController';
import {
  getPendingMilestoneRequests,
  approveMilestone,
  rejectMilestone,
} from '../controllers/payoutMilestoneController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.get('/users/:id/instagram-analytics', getInfluencerInstagramAnalytics);
router.put('/users/:id', updateUser);
router.put('/users/:id/status', updateUserStatus);

// Chat management
router.get('/chat/rooms', getChatRooms);
router.get('/chat/rooms/:roomId/messages', getChatRoomMessages);

// Analytics
router.get('/analytics', getAnalytics);

// Waiting List
router.get('/waiting-list', getWaitingList);
router.put('/waiting-list/:id', updateWaitingListStatus);

// Payout milestones (30/30/40 release approval)
router.get('/payouts/milestones', getPendingMilestoneRequests);
router.put('/payouts/milestones/:milestoneId/approve', approveMilestone);
router.put('/payouts/milestones/:milestoneId/reject', rejectMilestone);

export default router;

