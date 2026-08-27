import express from "express";
import {
    getMilestonesForPayment,
    requestMilestoneRelease,
} from "../controllers/payoutMilestoneController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get milestones for a payment (payer or payee)
router.get("/payment/:paymentId", getMilestonesForPayment);

// Request release of a milestone (payee only)
router.post("/:milestoneId/request", requestMilestoneRelease);

export default router;
