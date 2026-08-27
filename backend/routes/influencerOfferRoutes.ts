import {Router} from "express";
import {
    createOffer,
    getUserOffers,
    deleteOffer,
    getOfferDetails,
    influencerOfferResponse,
    acceptNegotiation
} from '../controllers/influencerOfferController';
import {authenticate} from '../middleware/auth';
import { upload } from "../middleware/fileUpload"; // Import file upload middleware

const router = Router();

// Create offer
router.post('/create', authenticate, createOffer);

// Get user's offers (brand or influencer)
router.get('/offers', authenticate, getUserOffers);

// Get, update, or delete specific offer
router
    .route('/offer/:id')
    .get(authenticate, getOfferDetails)
    .delete(authenticate, deleteOffer);

// Influencer responds to offer (accept, decline, negotiate)
router.post('/offer/:id/response', authenticate, upload.single("agreementFile"), influencerOfferResponse);

// Brand accepts negotiation from chat
router.post('/negotiation/accept', authenticate, acceptNegotiation);

export default router;