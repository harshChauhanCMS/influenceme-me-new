import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    createRequirement,
    getAllRequirements,
    getRequirementById,
    updateRequirement,
    deleteRequirement,
    getUserRequirements,
    submitBid,
} from '../controllers/vendorRequirementController';

const router = express.Router();

// Public routes
router.get('/requirements', getAllRequirements);
router.get('/requirement/:id', getRequirementById);

// Protected routes
router.post('/create', authenticate, createRequirement);
router.put('/requirement/:id', authenticate, updateRequirement);
router.delete('/requirement/:id', authenticate, deleteRequirement);
router.get('/user/requirements', authenticate, getUserRequirements);
router.post('/requirement/:id/bid', authenticate, submitBid);

export default router;
