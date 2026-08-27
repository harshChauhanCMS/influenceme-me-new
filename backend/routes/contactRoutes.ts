import { Router } from 'express';
import {
    submitContactQuery,
    getAllContactQueries,
    getContactQueryById,
    updateContactQueryStatus,
    respondToContactQuery,
    deleteContactQuery,
} from '../controllers/contactQueryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public route - anyone can submit a contact query
router.post('/submit', submitContactQuery);

// Admin routes - require authentication and admin role
router.get('/queries', authenticate, authorize('admin'), getAllContactQueries);
router.get('/queries/:id', authenticate, authorize('admin'), getContactQueryById);
router.patch('/queries/:id/status', authenticate, authorize('admin'), updateContactQueryStatus);
router.post('/queries/:id/respond', authenticate, authorize('admin'), respondToContactQuery);
router.delete('/queries/:id', authenticate, authorize('admin'), deleteContactQuery);

export default router;

