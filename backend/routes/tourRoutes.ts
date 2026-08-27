import express from "express";
import {
    createTour,
    getAllTours,
    getInfluencerTours,
    getMyTours,
    getCalendarWithMatchingCampaigns,
    getTourById,
    updateTour,
    deleteTour,
} from "../controllers/tourController";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

// Public routes (for brands to see tours)
router.get("/", getAllTours);
router.get("/influencer/:influencerId", getInfluencerTours);

// Protected routes (for influencers) - specific routes must come before dynamic routes
router.post("/", authenticate, authorize("influencer"), createTour);
router.get("/my-tours", authenticate, authorize("influencer"), getMyTours);
router.get("/calendar-with-campaigns", authenticate, authorize("influencer"), getCalendarWithMatchingCampaigns);
router.put("/:id", authenticate, authorize("influencer"), updateTour);
router.delete("/:id", authenticate, authorize("influencer"), deleteTour);

// Dynamic route must come last
router.get("/:id", getTourById);

export default router;

