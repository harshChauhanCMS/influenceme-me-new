export interface IAddress {
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  latitude?: string;
  longitude?: string;
}

export interface IBusinessInfo {
  businessName?: string;
  businessSince?: string;
  businessEmail?: string;
  businessType?: string;
  industry?: string;
  businessSize?: string;
  businessLocation?: IAddress;
  businessDescription?: string;
  businessLogoUrl?: string;
  businessBannerUrl?: string;
  socialMedia?: ISocialMedia[];
  websiteUrl?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

/** Instagram connect (Flutter): one linked FB Page + IG Business account from /api/auth/instagram/connect */
export interface IInstagramLinkedAccount {
  facebookPageId: string;
  facebookPageName: string;
  pageAccessToken: string;
  instagramId: string;
  instagramHandle: string | null;
  instagramName: string | null;
  profilePic: string | null;
  followers: number | null;
}

/** Full Instagram fetched data stored under influencerInfo.instagramData */
export interface IInstagramData {
  linkedAccounts: IInstagramLinkedAccount[];
  profile?: Record<string, unknown>; // IG business profile from Graph API
  posts?: IInstagramPost[];
  insights?: IAccountInsights;
  lastFetchedAt?: Date;
}

/** Facebook Page post with engagement (reactions, comments, shares) */
export interface IFacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time?: string;
  full_picture?: string;
  link?: string;
  type?: string;
  reaction_count?: number;
  comment_count?: number;
  share_count?: number;
  permalink?: string;
  status_type?: string;
  updated_time?: string;
  picture?: string;
}

/** One Facebook Page with stats, posts, and insights */
export interface IFacebookPageData {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  fanCount?: number;
  followersCount?: number;
  posts?: IFacebookPost[];
  insights?: unknown[]; // Raw insights from Graph API
  lastFetchedAt?: Date;
}

/** All Facebook data stored under influencerInfo.facebookData */
export interface IFacebookData {
  pages: IFacebookPageData[];
  lastFetchedAt?: Date;
}

export interface IInfluencerInfo {
  influencerSince?: string;
  influencerType?: string;
  influencerDescription?: string;
  influencerTypeOrGenreOtherDescription?: string;
  workType?: string;
  genre?: string[];
  children?: number;
  pets?: number;
  maritalStatus?: string;
  socialMedia?: ISocialMedia[];
  showOnTop?: boolean;
  /** Long-lived Meta token (60 days) from Instagram connect flow */
  metaLongLivedToken?: string;
  /** Expiry timestamp for long-lived Meta token */
  metaLongLivedTokenExpiresAt?: Date;
  /** Linked FB Pages + IG Business accounts for selection in app */
  instagramLinkedAccounts?: IInstagramLinkedAccount[];
  /** Full Instagram fetched data (profile, posts, insights) – source of truth for IG */
  instagramData?: IInstagramData;
  /** Full Facebook fetched data (pages, posts, insights) – source of truth for FB */
  facebookData?: IFacebookData;
  /** Long-lived token from Facebook-only connect (no Instagram scopes) */
  facebookLongLivedToken?: string;
  /** Expiry for Facebook-only long-lived token */
  facebookLongLivedTokenExpiresAt?: Date;
}

export interface IInstagramPost {
  id: string;
  caption?: string;
  mediaType: string; // IMAGE, VIDEO, CAROUSEL_ALBUM
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: Date;
  likesCount?: number;
  commentsCount?: number;
  // Insights (if available)
  impressions?: number;
  reach?: number;
  engagement?: number;
  saves?: number;
}

/** Followers breakdown (e.g. actual vs bought) */
export interface ISocialFollowers {
  actual?: number;
  bought?: number;
}

/** YouTube channel info from YouTube Data API */
export interface IYouTubeChannel {
  id?: string;
  title?: string;
  description?: string;
  customUrl?: string;
  profileImageUrl?: string;
  bannerImageUrl?: string | null;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  country?: string;
  publishedAt?: string;
}

/** YouTube playlist (summary) */
export interface IYouTubePlaylist {
  id?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  itemCount?: number;
  publishedAt?: string;
  videos?: unknown[] | null;
}

/** YouTube analytics summary */
export interface IYouTubeAnalytics {
  totalViews?: number;
  totalSubscribers?: number;
  totalVideos?: number;
  totalWatchTime?: number | null;
  averageViewDuration?: number | null;
  viewsByCountry?: Record<string, number> | null;
  viewsByDevice?: Record<string, number> | null;
  topVideos?: unknown[] | null;
}

export interface ISocialMedia {
  platform?: string;
  url?: string;
  username?: string;
  /** Legacy: single number. New: { actual, bought } */
  followers?: number | ISocialFollowers;
  following?: number;
  engagement?: IEngagement;
  metrics?: IMetrics;
  insights?: IAccountInsights; // Account-level insights data
  posts?: IInstagramPost[]; // Cached posts (first 30)
  profilePictureUrl?: string;
  isVerified?: boolean;
  isActive?: boolean;
  addedAt?: Date | string;
  updatedAt?: Date;
  // OAuth token fields for persistent sessions
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  tokenScopes?: string[];
  // YouTube-specific (from frontend / YouTube Data API)
  youtubeChannel?: IYouTubeChannel;
  recentVideos?: unknown[];
  playlists?: IYouTubePlaylist[];
  analytics?: IYouTubeAnalytics;
}

export interface IEngagement {
  averagePerPost?: number;
  topEngagementPerPost?: number;
  maximumLikes?: number;
}

export interface IMetrics {
  videosPosted: number;
  postsCount: number;
  averageViews: number;
  subscribers: number;
}

export interface IAccountInsights {
  // Period information
  period?: Date;
  periodType?: string; // 'day', 'week', 'days_28', 'lifetime'

  // Audience metrics
  impressions?: number;
  reach?: number;
  profileViews?: number;

  // Action metrics
  websiteClicks?: number;
  emailContacts?: number;
  phoneCallClicks?: number;
  textMessageClicks?: number;
  getDirectionsClicks?: number;

  // Follower metrics
  followerCount?: number;
  onlineFollowers?: number;

  // Engagement metrics
  totalEngagement?: number;
  engagementRate?: number;

  // Time-based data
  dailyImpressions?: Record<string, number>;
  dailyReach?: Record<string, number>;
  dailyProfileViews?: Record<string, number>;

  // Audience demographics
  followersByCity?: Record<string, number>;
  followersByCountry?: Record<string, number>;
  followersByAge?: Record<string, number>;
  followersByGender?: Record<string, number>;

  // Last updated
  updatedAt?: Date;
}

export interface IServiceArea {
  city: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  radius: number; // Radius in KM
}

export interface IBankAccount {
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
  accountType?: "savings" | "current";
  isVerified?: boolean;
  linkedAt?: Date;
}

export interface IActiveSession {
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity?: Date;
  createdAt?: Date;
}

export interface IVendorInfo {
  vendorSince?: string;
  vendorType?: string;
  businessName?: string;
  businessRegistrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  description?: string;
  experience?: number;
  servicesOffered?: string[];
  serviceAreas?: IServiceArea[]; // Changed from string[] to IServiceArea[]
  availability?: "full-time" | "part-time" | "on-demand";
  rating?: number;
  totalReviews?: number;
  completedProjects?: number;
  portfolio?: string[];
  certifications?: string[];
  isVerified?: boolean;
}

export interface IShowcaseMedia {
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  source: "upload" | "instagram";
  caption?: string;
  addedAt?: Date;
}

export interface IUser<T = string> {
  _id: T;
  name: string;
  about?: string;
  phone?: string;
  phoneCode?: string;
  email?: string;
  emailVerified?: boolean;
  apple_user_id?: string;
  google_user_id?: string;
  dateOfBirth?: string;
  profilePictureUrl: string;
  spokenLanguages?: string[];
  country?: string;
  addresses?: IAddress;
  role: "influencer" | "brand" | "vendor" | "admin";
  businessInfo?: IBusinessInfo;
  influencerInfo?: IInfluencerInfo;
  vendorInfo?: IVendorInfo;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  youtube?: string;
  fcmTokens?: string[];
  status?: "waiting_list" | "approved" | "rejected";
  isActive?: boolean;
  showcase?: IShowcaseMedia[];
  media?: string[]; // Legacy field for backward compatibility
  bankAccount?: IBankAccount;
  activeSessions?: IActiveSession[];
  createdAt: Date;
  updatedAt: Date;
}
