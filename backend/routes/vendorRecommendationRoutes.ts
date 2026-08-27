import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createRecommendation,
  getRecommendation,
  getMyRecommendations,
  getMyServicesForRecommendation,
} from '../controllers/vendorRecommendationController';

const router = Router();

// Vendor only: list my recommendations (must be before /:id)
router.get('/', authenticate, getMyRecommendations);

// Vendor only: list my services (for "share on WhatsApp" – pick from DB)
router.get('/services', authenticate, getMyServicesForRecommendation);

// Public: get recommendation by ID (for share page / preview)
router.get('/:id', getRecommendation);

// Vendor only: create recommendation (returns WhatsApp share URL)
router.post('/', authenticate, createRecommendation);

export default router;
