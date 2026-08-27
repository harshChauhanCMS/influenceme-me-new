import {Router} from "express";
import {
    getDealDetails,
    getUserDeals,
    updateDeal,
    requestDealCompletion,
    approveDealCompletion,
    markDealCompleted,
    cancelDeal
} from "../controllers/influencerBrandDealController";
import {authenticate} from "../middleware/auth";
import { upload } from "../middleware/fileUpload";

const router = Router();

// Apply authentication middleware to all deal routes
router.use(authenticate);

// GET all deals for the authenticated user (brand or influencer)
router.get('/deals', getUserDeals);

// POST routes for deal status changes (must come before /deal/:id route to avoid conflicts)
router.post('/deal/:id/request-completion', requestDealCompletion); // Influencer requests completion
router.post('/deal/:id/approve-completion', approveDealCompletion); // Brand approves completion
router.post('/deal/:id/complete', markDealCompleted); // Legacy: Mark a running deal as completed
router.post('/deal/:id/cancel', cancelDeal); // Cancel a running deal

// GET, UPDATE single deal (must come after specific POST routes)
router
    .route('/deal/:id')
    .get(getDealDetails)
    .put(upload.single("agreementFile"), updateDeal);

export default router;
