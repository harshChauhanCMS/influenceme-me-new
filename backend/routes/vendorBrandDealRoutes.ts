import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    getUserDeals,
    getDealDetails,
    updateDeal,
    updateDealStatus,
    updatePaymentStatus,
    updateServiceStatus,
    verifyServiceCompletion,
    markDealCompleted,
    cancelDeal,
    getVendorDealForRequirement,
} from '../controllers/vendorBrandDealController';
import { upload } from '../middleware/fileUpload';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET all deals for the authenticated user (vendor or brand/influencer)
router.get('/', getUserDeals);

// GET vendor's deal for a specific requirement
router.get('/requirement/:requirementId', getVendorDealForRequirement);

// GET deal details
router.get('/:dealId', getDealDetails);

// UPDATE deal (general update, can include agreement file upload)
router.put('/:dealId', upload.single('agreementFile'), updateDeal);

// UPDATE deal status only
router.patch('/:dealId/status', updateDealStatus);

// UPDATE payment status (brand/influencer only)
router.patch('/:dealId/payment-status', updatePaymentStatus);

// UPDATE service status (vendor only)
router.patch('/:dealId/service-status', updateServiceStatus);

// VERIFY service completion (client only) - Approves vendor's completion request
router.patch('/:dealId/verify-completion', verifyServiceCompletion);

// MARK deal as completed
router.patch('/:dealId/complete', markDealCompleted);

// CANCEL deal
router.patch('/:dealId/cancel', cancelDeal);

export default router;

