import {Router} from "express";
import {
    createCampaign,
    updateCampaign,
    getUserCampaigns,
    getAllCampaigns,
    getCampaignDetails,
} from "../controllers/campaignController";
import { upload } from "../middleware/fileUpload";
import {authenticate, authorize} from "../middleware/auth";
const router = Router();

router
    .route("/campaigns")
    .get(authenticate, authorize('brand', 'vendor', 'admin'), getUserCampaigns)
    .post(authenticate, authorize('brand', 'vendor', 'admin'), upload.single("image"), createCampaign);

// Route for influencers to browse all available campaigns
router
    .route("/campaigns/browse")
    .get(authenticate, getAllCampaigns);

// Public route to get campaign details by ID (for offers and mobile app)
router
    .route("/campaigns/details")
    .post(authenticate, getCampaignDetails);

router
    .route("/campaigns/:id")
    .put(authenticate, authorize('brand', 'vendor', 'admin'), upload.single("image"), updateCampaign);

export default router;