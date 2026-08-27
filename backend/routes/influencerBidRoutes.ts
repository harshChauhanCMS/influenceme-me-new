import express from "express";
import {
    submitBid,
    getMyBids,
    getBidDetails,
    withdrawBid,
    getCampaignBids,
    respondToBid,
    checkUserBid,
    createDealFromBid,
} from "../controllers/influencerBidController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Influencer routes
router.post("/submit", authenticate, submitBid);
router.get("/my-bids", authenticate, getMyBids);
router.get("/details/:bidId", authenticate, getBidDetails);
router.post("/withdraw/:bidId", authenticate, withdrawBid);
router.get("/check/:campaignId", authenticate, checkUserBid);

// Brand routes
router.get("/campaign/:campaignId/bids", authenticate, getCampaignBids);
router.post("/respond/:bidId", authenticate, respondToBid);
router.post("/:bidId/create-deal", authenticate, createDealFromBid);

export default router;
















