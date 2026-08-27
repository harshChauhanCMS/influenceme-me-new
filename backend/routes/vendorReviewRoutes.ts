import { Router } from 'express';
import {
    createReview,
    getVendorReviews,
    getReviewStats,
    updateReview,
    deleteReview,
    markHelpful,
    replyToReview,
    updateReply,
    deleteReply,
} from '../controllers/vendorReviewController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/vendor/:vendorId', getVendorReviews);
router.get('/vendor/:vendorId/stats', getReviewStats);

// Protected routes
router.post('/create', authenticate, createReview);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);
router.post('/:id/helpful', authenticate, markHelpful);

// Reply routes (Vendor only)
router.post('/:id/reply', authenticate, replyToReview);
router.put('/:id/reply', authenticate, updateReply);
router.delete('/:id/reply', authenticate, deleteReply);

export default router;

