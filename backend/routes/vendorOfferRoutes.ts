import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    createOffer,
    getOffersByRequirement,
    getVendorSentOffers,
    getUserReceivedOffers,
    getVendorReceivedOffers,
    vendorAcceptOffer,
    vendorDeclineOffer,
    acceptOffer,
    declineOffer,
    negotiateOffer,
    withdrawOffer,
    shortlistOffer,
    getVendorOfferForRequirement,
} from '../controllers/vendorOfferController';

const router = express.Router();

// All routes require authentication
router.post('/create', authenticate, createOffer);
router.get('/requirement/:requirementId', authenticate, getOffersByRequirement);
router.get('/vendor/requirement/:requirementId', authenticate, getVendorOfferForRequirement);
router.get('/vendor/sent', authenticate, getVendorSentOffers);
router.get('/vendor/received', authenticate, getVendorReceivedOffers);
router.get('/user/received', authenticate, getUserReceivedOffers);
router.post('/vendor/accept/:offerId', authenticate, vendorAcceptOffer);
router.post('/vendor/decline/:offerId', authenticate, vendorDeclineOffer);
router.post('/accept/:offerId', authenticate, acceptOffer); // Brand accepts vendor offer
router.post('/decline/:offerId', authenticate, declineOffer); // Brand declines vendor offer
router.post('/negotiate/:offerId', authenticate, negotiateOffer);
router.post('/withdraw/:offerId', authenticate, withdrawOffer);
router.post('/shortlist/:offerId', authenticate, shortlistOffer);

export default router;

