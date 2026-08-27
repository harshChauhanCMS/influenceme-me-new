// 📁 backend/src/models/user.ts

import { Schema, model, Document, Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";

import {
  IUser as ISharedUser,
  IInfluencerInfo,
  IVendorInfo,
  ISocialMedia,
  IEngagement,
  IMetrics,
  IAccountInsights,
  IInstagramPost,
  IInstagramData,
  IFacebookPageData,
  IFacebookData,
  IFacebookPost,
  IYouTubeChannel,
  IYouTubePlaylist,
  IYouTubeAnalytics,
} from "../../shared/types/user";

export type IUser = ISharedUser<Types.ObjectId> &
  Document & {
    password?: string;
    comparePassword(password: string): Promise<boolean>;
  };

export interface IUserModel extends Model<IUser> {}

const engagementSchema = new Schema<IEngagement>(
  {
    averagePerPost: Number,
    topEngagementPerPost: Number,
    maximumLikes: Number,
  },
  { _id: false },
);

const metricsSchema = new Schema<IMetrics>(
  {
    videosPosted: Number,
    postsCount: Number,
    averageViews: Number,
    subscribers: Number,
  },
  { _id: false },
);

const accountInsightsSchema = new Schema<IAccountInsights>(
  {
    period: Date,
    periodType: String,
    // Audience metrics
    impressions: Number,
    reach: Number,
    profileViews: Number,
    // Action metrics
    websiteClicks: Number,
    emailContacts: Number,
    phoneCallClicks: Number,
    textMessageClicks: Number,
    getDirectionsClicks: Number,
    // Follower metrics
    followerCount: Number,
    onlineFollowers: Number,
    // Engagement metrics
    totalEngagement: Number,
    engagementRate: Number,
    // Time-based data (stored as JSON)
    dailyImpressions: Schema.Types.Mixed,
    dailyReach: Schema.Types.Mixed,
    dailyProfileViews: Schema.Types.Mixed,
    // Audience demographics (stored as JSON)
    followersByCity: Schema.Types.Mixed,
    followersByCountry: Schema.Types.Mixed,
    followersByAge: Schema.Types.Mixed,
    followersByGender: Schema.Types.Mixed,
    // Last updated
    updatedAt: Date,
  },
  { _id: false },
);

const instagramPostSchema = new Schema<IInstagramPost>(
  {
    id: { type: String, required: true },
    caption: String,
    mediaType: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    thumbnailUrl: String,
    permalink: { type: String, required: true },
    timestamp: { type: Date, required: true },
    likesCount: Number,
    commentsCount: Number,
    // Insights (if available)
    impressions: Number,
    reach: Number,
    engagement: Number,
    saves: Number,
  },
  { _id: false },
);

// Showcase media (images or videos from device or instagram)
const showcaseMediaSchema = new Schema(
  {
    mediaType: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
    thumbnailUrl: String, // optional for videos
    source: { type: String, enum: ["upload", "instagram"], default: "upload" },
    caption: String,
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// YouTube nested structures for socialMedia (from frontend / YouTube Data API)
const youtubeChannelSchema = new Schema<IYouTubeChannel>(
  {
    id: String,
    title: String,
    description: String,
    customUrl: String,
    profileImageUrl: String,
    bannerImageUrl: Schema.Types.Mixed,
    subscriberCount: Number,
    videoCount: Number,
    viewCount: Number,
    country: String,
    publishedAt: String,
  },
  { _id: false },
);

const youtubePlaylistSchema = new Schema<IYouTubePlaylist>(
  {
    id: String,
    title: String,
    description: String,
    thumbnailUrl: String,
    itemCount: Number,
    publishedAt: String,
    videos: Schema.Types.Mixed,
  },
  { _id: false },
);

const youtubeAnalyticsSchema = new Schema<IYouTubeAnalytics>(
  {
    totalViews: Number,
    totalSubscribers: Number,
    totalVideos: Number,
    totalWatchTime: Schema.Types.Mixed,
    averageViewDuration: Schema.Types.Mixed,
    viewsByCountry: Schema.Types.Mixed,
    viewsByDevice: Schema.Types.Mixed,
    topVideos: Schema.Types.Mixed,
  },
  { _id: false },
);

const socialMediaSchema = new Schema<ISocialMedia>({
  platform: String,
  url: String,
  username: String,
  // Support both legacy number and { actual, bought }
  followers: Schema.Types.Mixed,
  following: Number,
  engagement: engagementSchema,
  metrics: metricsSchema,
  insights: accountInsightsSchema, // Account insights data
  posts: [instagramPostSchema], // Cached posts (first 30)
  profilePictureUrl: String,
  isVerified: Boolean,
  isActive: Boolean,
  addedAt: { type: Schema.Types.Mixed, default: Date.now },
  updatedAt: Date,
  // OAuth token fields for persistent sessions
  accessToken: String, // Instagram access token
  refreshToken: String, // Refresh token (if available)
  tokenExpiresAt: Date, // When the token expires
  tokenScopes: [String], // Granted permissions/scopes
  // YouTube-specific (from frontend)
  youtubeChannel: youtubeChannelSchema,
  recentVideos: [Schema.Types.Mixed],
  playlists: [youtubePlaylistSchema],
  analytics: youtubeAnalyticsSchema,
});

// Facebook post with engagement (for facebookData.pages[].posts)
const facebookPostSchema = new Schema<IFacebookPost>(
  {
    id: { type: String, required: true },
    message: String,
    story: String,
    created_time: String,
    full_picture: String,
    link: String,
    type: String,
    reaction_count: Number,
    comment_count: Number,
    share_count: Number,
    permalink: String,
    status_type: String,
    updated_time: String,
    picture: String,
  },
  { _id: false },
);

const facebookPageDataSchema = new Schema<IFacebookPageData>(
  {
    pageId: { type: String, required: true },
    pageName: { type: String, required: true },
    pageAccessToken: { type: String, required: true },
    fanCount: Number,
    followersCount: Number,
    posts: [facebookPostSchema],
    insights: [Schema.Types.Mixed],
    lastFetchedAt: Date,
  },
  { _id: false },
);

const facebookDataSchema = new Schema<IFacebookData>(
  {
    pages: [facebookPageDataSchema],
    lastFetchedAt: Date,
  },
  { _id: false },
);

// Instagram data: linkedAccounts + profile, posts, insights
const instagramDataSchema = new Schema<IInstagramData>(
  {
    linkedAccounts: [Schema.Types.Mixed], // IInstagramLinkedAccount[]
    profile: Schema.Types.Mixed,
    posts: [instagramPostSchema],
    insights: accountInsightsSchema,
    lastFetchedAt: Date,
  },
  { _id: false },
);

const influencerInfoSchema = new Schema<IInfluencerInfo>(
  {
    influencerSince: String,
    influencerType: String,
    influencerTypeOrGenreOtherDescription: String,
    workType: String,
    genre: [String],
    children: Number,
    pets: Number,
    maritalStatus: String,
    showOnTop: Boolean,
    socialMedia: [socialMediaSchema], // An array of social media accounts
    // Instagram connect (Flutter): long-lived token & linked FB Pages + IG Business accounts
    metaLongLivedToken: String,
    metaLongLivedTokenExpiresAt: Date,
    instagramLinkedAccounts: [Schema.Types.Mixed],
    // Full Instagram fetched data (source of truth for IG)
    instagramData: instagramDataSchema,
    // Full Facebook fetched data (source of truth for FB)
    facebookData: facebookDataSchema,
    // Facebook-only connect token (no Instagram scopes)
    facebookLongLivedToken: String,
    facebookLongLivedTokenExpiresAt: Date,
  },
  { _id: false },
);

const serviceAreaSchema = new Schema(
  {
    city: { type: String, required: true },
    state: String,
    country: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, required: true }, // Radius in KM
  },
  { _id: false },
);

const vendorInfoSchema = new Schema<IVendorInfo>(
  {
    vendorSince: String,
    vendorType: String,
    businessName: String,
    businessRegistrationNumber: String,
    gstNumber: String,
    panNumber: String,
    description: String,
    experience: Number,
    servicesOffered: [String],
    serviceAreas: [serviceAreaSchema], // Changed from [String] to [serviceAreaSchema]
    availability: {
      type: String,
      enum: ["full-time", "part-time", "on-demand"],
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    portfolio: [String],
    certifications: [String],
    isVerified: { type: Boolean, default: false },
  },
  { _id: false },
);

// Business Info Schema for Brand users
const businessInfoSchema = new Schema(
  {
    businessName: String,
    businessEmail: String,
    websiteUrl: String,
    businessType: String,
    industry: String,
    businessSize: String,
    businessDescription: String,
    description: String,
    logoUrl: String,
    bannerUrl: String,
  },
  { _id: false },
);

// Addresses Schema
const addressesSchema = new Schema(
  {
    streetAddress: String,
    city: String,
    state: String,
    country: String,
    pinCode: String,
    latitude: String,
    longitude: String,
  },
  { _id: false },
);

const userSchema = new Schema<IUser, IUserModel>(
  {
    name: { type: String, required: true },
    about: String,
    phone: { type: String, unique: true, sparse: true, default: undefined },
    phoneCode: { type: String },
    email: { type: String, unique: true, sparse: true, default: undefined },
    emailVerified: { type: Boolean, default: false },
    apple_user_id: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    google_user_id: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    profilePictureUrl: String,
    password: {
      type: String,
      required: function (this: IUser): boolean {
        return this.role !== "influencer";
      },
    },
    businessInfo: businessInfoSchema,
    // ✨ NEW: Add the influencerInfo object to the main schema
    influencerInfo: influencerInfoSchema,
    // ✨ NEW: Add the vendorInfo object to the main schema
    vendorInfo: vendorInfoSchema,

    dateOfBirth: String,
    spokenLanguages: [String],
    country: String,
    addresses: addressesSchema,
    role: {
      type: String,
      enum: ["influencer", "brand", "vendor", "admin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting_list", "approved", "rejected"],
      default: "waiting_list",
    },
    isActive: { type: Boolean, default: false },

    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String,
    website: String,
    youtube: String,

    fcmTokens: { type: [String], default: [] },

    // Showcase gallery for influencer profile (images and videos)
    showcase: [showcaseMediaSchema],

    // Legacy media field for backward compatibility (simple string array)
    media: [String],

    // Bank account information for withdrawals
    bankAccount: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountType: {
        type: String,
        enum: ["savings", "current"],
        default: "savings",
      },
      isVerified: { type: Boolean, default: false },
      linkedAt: Date,
    },

    // Active sessions tracking
    activeSessions: [
      {
        token: String,
        deviceInfo: String,
        ipAddress: String,
        userAgent: String,
        lastActivity: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

userSchema.pre<IUser>("validate", function (next) {
  if (!this.email && !this.phone && !this.apple_user_id) {
    next(
      new Error(
        "Either an email, phone number, or Apple user ID is required for registration.",
      ),
    );
  } else {
    next();
  }
});

userSchema.pre<IUser>("save", async function (next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

const User = model<IUser, IUserModel>("User", userSchema);

export default User;
