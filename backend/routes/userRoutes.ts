// CORRECTED: userRoutes.ts

import { Router } from "express";
import {
  registerUser,
  loginUser,
  checkUserExists,
  getAllInfluencers,
  getAllVendors,
  getProfile,
  updateProfile,
  getTopInfluencers,
  getUserById,
  changePassword,
  getActiveSessions,
  revokeSession,
  linkBankAccount,
  getBankAccount,
  updateBankAccount,
  getInstagramAnalytics,
} from "../controllers/userController";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/fileUpload";

const router = Router();

// --- Public Routes ---
// These routes do NOT have the 'authenticate' middleware and are accessible to everyone.

// @route   POST /api/user/register
router.post(
  "/register",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  registerUser,
);

// @route   POST /api/user/check_user_exists
router.post("/check_user_exists", checkUserExists);

// @route   POST /api/user/login
router.post("/login", loginUser);

// @route   GET /api/user/influencers/get
// @desc    Get all influencers for the marketplace (Public)
router.get("/influencers/get", authenticate, getAllInfluencers);

// @route   GET /api/user/influencers/top
router.get("/influencers/top", getTopInfluencers);

// @route   GET /api/user/vendors/get
// @desc    Get all vendors for the marketplace (Public)
router.get("/vendors/get", getAllVendors);

// --- Private Routes ---
// These routes come AFTER the 'authenticate' middleware is applied selectively
// and are accessible only to logged-in users.

// @route   GET /api/user/profile
// @desc    Get the logged-in user's profile
router.get("/profile", authenticate, getProfile); // ✅ Middleware applied to this specific route

// @route   PUT /api/user/profile
// @desc    Update the logged-in user's profile
router.put(
  "/profile",
  authenticate,
  upload.fields([
    // ✅ Middleware applied here too
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  updateProfile,
);

// @route   PUT /api/user/change-password
// @desc    Change user password
router.put("/change-password", authenticate, changePassword);

// @route   GET /api/user/sessions
// @desc    Get active sessions
// IMPORTANT: Must be before /:id route to avoid route conflicts
router.get("/sessions", authenticate, getActiveSessions);

// @route   DELETE /api/user/sessions/:sessionToken
// @desc    Revoke a session
router.delete("/sessions/:sessionToken", authenticate, revokeSession);

// @route   POST /api/user/bank-account
// @desc    Link bank account
// IMPORTANT: Must be before /:id route to avoid route conflicts
router.post("/bank-account", authenticate, linkBankAccount);

// @route   GET /api/user/bank-account
// @desc    Get bank account details
// IMPORTANT: Must be before /:id route to avoid route conflicts
router.get("/bank-account", authenticate, getBankAccount);

// @route   PUT /api/user/bank-account
// @desc    Update bank account
// IMPORTANT: Must be before /:id route to avoid route conflicts
router.put("/bank-account", authenticate, updateBankAccount);

// @route   GET /api/user/:id/instagram-analytics
// @desc    Get Instagram Analytics for a user
router.get("/:id/instagram-analytics", authenticate, getInstagramAnalytics);

// @route   GET /api/user/:id
// @desc    Get user profile by ID (Public) - MUST be LAST to avoid conflicts with specific routes
router.get("/:id", getUserById);

// Future showcase routes (upload/replace) can be added here if needed
// router.post('/showcase/upload', authenticate, upload.array('files', 10), uploadShowcase);
// router.put('/showcase', authenticate, replaceShowcase);

export default router;
