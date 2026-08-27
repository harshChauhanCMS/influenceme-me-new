import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    submitBid,
    getVendorBids,
    getVendorBidForRequirement,
    getBidsByRequirement,
    acceptBid,
    declineBid,
    getBidDetails,
} from '../controllers/vendorBidController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Submit a bid
router.post('/submit', submitBid);

// Get vendor's bids (bids sent by vendor)
router.get('/vendor/bids', getVendorBids);

// Get vendor's bid for a specific requirement
router.get('/vendor/requirement/:requirementId', getVendorBidForRequirement);

// Get bids for a requirement (for brand/influencer)
router.get('/requirement/:requirementId', getBidsByRequirement);

// Get bid details
router.get('/:bidId', getBidDetails);

// Accept bid (brand/influencer accepts vendor bid)
router.post('/accept/:bidId', acceptBid);

// Decline bid (brand/influencer declines vendor bid)
router.post('/decline/:bidId', declineBid);

export default router;

