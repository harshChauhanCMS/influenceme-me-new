import { Router } from 'express';
import {
    getCMSPage,
    getAllCMSPages,
    getCMSPageAdmin,
    updateCMSPage,
} from '../controllers/cmsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public route - anyone can view active CMS pages
router.get('/:pageType', getCMSPage);

// Admin routes - require authentication and admin role
router.get('/', authenticate, authorize('admin'), getAllCMSPages);
router.get('/admin/:pageType', authenticate, authorize('admin'), getCMSPageAdmin);
router.put('/:pageType', authenticate, authorize('admin'), updateCMSPage);

export default router;

