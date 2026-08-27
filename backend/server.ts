import express = require("express");
import dotenv = require("dotenv");
import cors = require("cors");
import path = require("path");
import http = require("http");

import connectDB from "./config/db";
import { initializeFirestore } from "./config/firestore";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import campaignRoutes from "./routes/campaignRoutes";
import influencerOfferRoutes from "./routes/influencerOfferRoutes";
import mapRoutes from "./routes/mapRoutes";
import influencerBrandDealRoutes from "./routes/influencerBrandDealRoutes";
import fileRoutes from "./routes/fileRoutes";
import { uploadToFirebaseStorage } from "./controllers/fileController";
import { uploadMemorySingle } from "./middleware/fileUpload";
import serviceRoutes from "./routes/serviceRoutes";
import vendorRequirementRoutes from "./routes/vendorRequirementRoutes";
import vendorReviewRoutes from "./routes/vendorReviewRoutes";
import vendorOfferRoutes from "./routes/vendorOfferRoutes";
import vendorBrandDealRoutes from "./routes/vendorBrandDealRoutes";
import vendorBidRoutes from "./routes/vendorBidRoutes";
import instagramWebhookRoutes from "./routes/instagramWebhookRoutes";
import influencerBidRoutes from "./routes/influencerBidRoutes";
import chatRoutes from "./routes/chatRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import payoutMilestoneRoutes from "./routes/payoutMilestoneRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import paymentWebhookRoutes from "./routes/paymentWebhookRoutes";
import versionRoutes from "./routes/versionRoutes";
import tourRoutes from "./routes/tourRoutes";
import agreementRoutes from "./routes/agreementRoutes";
import adminRoutes from "./routes/adminRoutes";
import showcaseVideoRoutes from "./routes/showcaseVideoRoutes";
import videoPurposeRoutes from "./routes/videoPurposeRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import contactRoutes from "./routes/contactRoutes";
import cmsRoutes from "./routes/cmsRoutes";
import blogRoutes from "./routes/blogRoutes";
import adminBlogRoutes from "./routes/adminBlogRoutes";
import youtubeRoutes, { youtubeCallbackRouter } from "./routes/youtubeRoutes";
import instagramAuthRoutes, {
  instagramAuthCallbackRouter,
} from "./routes/instagramAuthRoutes";
import { linkedinCallbackRouter } from "./routes/linkedinAuthRoutes";
import {
  loginRedirect as linkedinLoginRedirect,
  callback as linkedinCallback,
} from "./controllers/linkedinAuthController";
import socketService from "./services/socketService";
import { startCampaignExpiryScheduler } from "./services/campaignExpiryService";
import notificationRoutes from "./routes/notificationRoutes";
import vendorRecommendationRoutes from "./routes/vendorRecommendationRoutes";

// Load environment variables
dotenv.config();

const app: express.Express = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3005;

// --- Middlewares ---

// CORS: allow frontend origins (required when API is on a different domain, e.g. api.influence-me.in)
const allowedOrigins = [
  "https://influence-me.in",
  "https://www.influence-me.in",
  "http://localhost:3000",
  "http://localhost:8081",
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean) as string[];

// 1) Explicit preflight handler so OPTIONS always gets CORS headers (fixes proxy/load balancer issues)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Max-Age", "86400");
      return res.status(204).end();
    }
  }
  next();
});

// 2) CORS for actual requests (array form = set Allow-Origin when origin is in list)
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Body parsers for JSON and URL-encoded data
// `verify` stashes the raw bytes on req.rawBody so webhook handlers (Razorpay)
// can validate the HMAC signature against the exact payload received.
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// --- Static File Serving ---
// This should come BEFORE your API routes.
// Any file in 'public/uploads' can be accessed via http://<your-domain>/uploads/<filename>
app.use(express.static(path.join(__dirname, "../public")));

// --- API Routes ---
app.use("/api/user", userRoutes); // Web app user routes (login, register, profile)
app.use("/api/auth", authRoutes); // Mobile app auth routes (check_user_exists, login, register)
app.use("/api/campaign", campaignRoutes);
app.use("/api/influencer-offer", influencerOfferRoutes);
app.use("/api/influencer_brand_deal", influencerBrandDealRoutes);
app.use("/api/map", mapRoutes);
// POST /api/upload — alias for showcase/app uploads (same as /api/file/upload)
app.post(
  "/api/upload",
  uploadMemorySingle.single("file"),
  uploadToFirebaseStorage,
);
app.use("/api/file", fileRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/vendor-requirement", vendorRequirementRoutes);
app.use("/api/vendor-review", vendorReviewRoutes);
app.use("/api/vendor-recommendation", vendorRecommendationRoutes);
app.use("/api/vendor-offer", vendorOfferRoutes);
app.use("/api/vendor-brand-deal", vendorBrandDealRoutes);
app.use("/api/vendor-bid", vendorBidRoutes);
app.use("/api/influencer-bid", influencerBidRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payment/milestones", payoutMilestoneRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/version", versionRoutes);
app.use("/api/tour", tourRoutes);
app.use("/api/agreement", agreementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/showcase-videos", showcaseVideoRoutes);
app.use("/api/admin/video-purposes", videoPurposeRoutes);
// Public route for videos by purpose (must be before admin routes to avoid auth requirement)
app.use("/api/videos", showcaseVideoRoutes);
app.use("/api", settingsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/blogs", blogRoutes); // Public blog routes
app.use("/api/admin/blogs", adminBlogRoutes); // Admin blog routes
app.use("/api/notifications", notificationRoutes);

// --- OAuth callbacks (no /api prefix; redirect URIs must match provider dashboards) ---
app.use("/auth", youtubeCallbackRouter);
app.use("/auth", instagramAuthCallbackRouter);
app.use("/auth", linkedinCallbackRouter);
// Explicit LinkedIn routes so GET /auth/linkedin and GET /auth/linkedin/callback are always handled
app.get("/auth/linkedin", linkedinLoginRedirect);
app.get("/auth/linkedin/callback", linkedinCallback);

// --- YouTube API (channel, disconnect) ---
app.use("/api/youtube", youtubeRoutes);

// --- Instagram API (account, profile) ---
app.use("/api/instagram", instagramAuthRoutes);

// --- Webhook Routes (No Auth Required) ---
app.use("/api/webhooks/instagram", instagramWebhookRoutes);
app.use("/api/webhooks/payment", paymentWebhookRoutes);

// --- Root Endpoint ---
app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Influence-Me API is running...1.0.12!");
});

// --- Error Handling Middleware ---
// This MUST be the LAST middleware.
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).send({ message: "Something broke!", error: err.message });
  },
);

// --- Start Server Function ---
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Firestore (for YouTube tokens)
    initializeFirestore();

    // Initialize Socket.IO
    socketService.initialize(httpServer);

    // Start campaign expiry scheduler (after DB is ready)
    startCampaignExpiryScheduler();

    // Start listening for requests
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO is ready for connections`);
    });
  } catch (error) {
    console.error(
      "🚨 Failed to start server due to database connection error:",
      error,
    );
    process.exit(1);
  }
};

// --- Execute Server Start ---
startServer();
