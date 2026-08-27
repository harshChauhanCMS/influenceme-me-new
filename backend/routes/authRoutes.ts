import { Router } from "express";
import {
  checkUserExists,
  loginUser,
  registerUser,
} from "../controllers/userController";
import { getAuthorizeUrl } from "../controllers/youtubeController";
import {
  connectInstagram,
  checkMetaToken,
  connectFacebook,
  fetchInstagramData,
  fetchFacebookData,
  getMyInstagramMedia,
  userDisconnectInstagram,
  userDisconnectFacebook,
} from "../controllers/instagramAuthController";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { upload } from "../middleware/fileUpload";

const router = Router();

/**
 * Mobile App Auth Routes (Alias for /api/user/* routes)
 * These are aliases to maintain backward compatibility with mobile app
 * The actual implementation is in userController
 */

// @route   POST /api/auth/check_user_exists
// @desc    Check if user exists by email or phone
// @access  Public
router.post("/check_user_exists", checkUserExists);

// @route   POST /api/auth/login
// @desc    Login user (mobile app - no password required for influencers)
// @access  Public
router.post("/login", loginUser);

// @route   POST /api/auth/register
// @desc    Register new user (mobile app)
// @access  Public
router.post(
  "/register",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  registerUser,
);

// @route   GET /api/auth/youtube/authorize
// @desc    Returns Google OAuth URL for YouTube connection (Flutter app opens this URL)
// @access  Private (JWT)
router.get("/youtube/authorize", authenticate, getAuthorizeUrl);

// @route   GET /api/auth/meta/token/check
// @desc    Check if long-lived Meta token is alive (optional query: platform=instagram|facebook)
// @access  Private (JWT)
router.get("/meta/token/check", authenticate, checkMetaToken);

// @route   POST /api/auth/instagram/connect
// @desc    Flutter: send Meta accessToken in body (or reuse saved valid token for logged-in user);
//          returns linked FB Pages/IG Business accounts and stores long-lived token + expiry.
//          With optional Bearer JWT, saves token/token expiry/linked accounts to user profile.
// @access  Public (optional JWT to save to user)
router.post("/instagram/connect", optionalAuthenticate, connectInstagram);

// @route   POST /api/auth/instagram/fetch
// @desc    Fetch Instagram data from Meta and save to influencerInfo.instagramData
// @access  Private (JWT)
router.post("/instagram/fetch", authenticate, fetchInstagramData);

// @route   GET /api/auth/instagram/media
// @desc    Instagram media using server-stored long-lived token (no token in query)
// @access  Private (JWT)
router.get("/instagram/media", authenticate, getMyInstagramMedia);

// @route   POST /api/auth/facebook/connect
// @desc    Connect Facebook: accept token from deep link or reuse existing Meta token (no redirect when reusing)
// @access  Public (optional JWT to save to user)
router.post("/facebook/connect", optionalAuthenticate, connectFacebook);

// @route   POST /api/auth/facebook/fetch
// @desc    Fetch Facebook data from Meta and save to influencerInfo.facebookData
// @access  Private (JWT)
router.post("/facebook/fetch", authenticate, fetchFacebookData);

// @route   POST /api/auth/instagram/disconnect
// @desc    Remove metaLongLivedToken + Instagram cached data for the user
// @access  Private (JWT)
router.post("/instagram/disconnect", authenticate, userDisconnectInstagram);

// @route   POST /api/auth/facebook/disconnect
// @desc    Remove facebookLongLivedToken + Facebook cached data for the user
// @access  Private (JWT)
router.post("/facebook/disconnect", authenticate, userDisconnectFacebook);

export default router;
