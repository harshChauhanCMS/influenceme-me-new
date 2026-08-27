import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
    getAgreement,
    agreeToAgreement,
    generateAgreement,
} from "../controllers/agreementController";

const router = Router();

// Get agreement for a deal
router.get("/:dealId", authenticate, getAgreement);

// Agree to agreement
router.post("/:dealId/agree", authenticate, agreeToAgreement);

// Generate agreement for existing deal
router.post("/:dealId/generate", authenticate, generateAgreement);

export default router;

