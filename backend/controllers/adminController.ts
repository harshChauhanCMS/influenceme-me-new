import { Request, Response } from "express";
import User from "../models/user";
import { successResponse, errorResponse } from "../utils/responseHelper";
import { PipelineStage } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth";
import { ChatRoom, Message } from "../models/chat";
import Campaign from "../models/campaign";
import Payment, { PaymentStatus } from "../models/payment";
import Transaction, { TransactionType } from "../models/transaction";
import InfluencerOffer from "../models/influencerOffer";
import InfluencerBrandDeal from "../models/influencerBrandDeal";
import InfluencerBid from "../models/influencerBid";
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from "../services/emailService";
import { instagramService } from "../services/instagramService";
import { createAndSend } from "../services/notificationService";
import * as youtubeService from "../services/youtubeService";
import {
  isProfessionalEmail,
  PROFESSIONAL_EMAIL_ERROR,
} from "../utils/professionalEmail";

const getNumericValue = (value: any): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const objectCandidates = [
      value.actual,
      value.total,
      value.totalCount,
      value.subscriberCount,
      value.followers,
    ];
    for (const candidate of objectCandidates) {
      const numberCandidate = getNumericValue(candidate);
      if (numberCandidate > 0) return numberCandidate;
    }
  }
  return 0;
};

const buildBotDetection = ({
  followers,
  following,
  postsCount,
  engagementRate,
}: {
  followers: number;
  following: number;
  postsCount: number;
  engagementRate?: number;
}) => {
  let riskScore = 0;
  const signals: string[] = [];

  const hasEngagement =
    typeof engagementRate === "number" && Number.isFinite(engagementRate);

  if (followers >= 5000 && hasEngagement && (engagementRate as number) < 1) {
    riskScore += 25;
    signals.push("Low engagement for follower size");
  }

  if (followers >= 10000 && hasEngagement && (engagementRate as number) < 0.5) {
    riskScore += 25;
    signals.push("Very low engagement ratio");
  }

  if (followers >= 500 && following > followers * 1.5) {
    riskScore += 20;
    signals.push("Unusually high following-to-follower ratio");
  }

  if (followers >= 2000 && postsCount <= 3) {
    riskScore += 20;
    signals.push("Follower count is high compared to content volume");
  }

  if (followers >= 10000 && postsCount < 10) {
    riskScore += 15;
    signals.push("Large audience with very limited posting history");
  }

  if (!hasEngagement && followers >= 1000) {
    riskScore += 10;
    signals.push("Engagement data unavailable for risk verification");
  }

  riskScore = Math.min(riskScore, 95);

  const riskLevel =
    riskScore >= 70
      ? "high"
      : riskScore >= 40
        ? "medium"
        : "low";

  return {
    riskScore,
    riskLevel,
    isLikelyBot: riskScore >= 70,
    isLikelyFakeFollowers: riskScore >= 50,
    signals,
  };
};

/**
 * @desc    Get admin dashboard overview
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const influencers = await User.countDocuments({ role: "influencer" });
    const brands = await User.countDocuments({ role: "brand" });
    const vendors = await User.countDocuments({ role: "vendor" });
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get growth data (monthly)
    const growthPipeline: PipelineStage[] = [
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      {
        $limit: 12, // Last 12 months
      },
    ];

    const growth = await User.aggregate(growthPipeline);

    return successResponse(
      res,
      "Dashboard data fetched successfully",
      {
        stats: {
          users: {
            total: totalUsers,
            influencers,
            brands,
            vendors,
            active: activeUsers,
            inactive: inactiveUsers,
            recent: recentUsers,
          },
          growth,
        },
        user: {
          id: req.user?._id,
          name: req.user?.name,
          role: req.user?.role,
        },
      },
      200,
    );
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch dashboard data",
      500,
    );
  }
};

/**
 * @desc    Get all users with filters
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filters: any = {};

    // Exclude role filter
    if (req.query.excludeRole) {
      filters.role = { $ne: req.query.excludeRole };
    }

    // Role filter
    if (req.query.role && req.query.role !== "all") {
      filters.role = req.query.role;
    }

    // Status filter
    if (req.query.isActive && req.query.isActive !== "all") {
      filters.isActive = req.query.isActive === "true";
    }

    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      filters.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Get users
    const users = await User.find(filters)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await User.countDocuments(filters);

    return successResponse(res, "Users fetched successfully", users, 200, {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    });
  } catch (error: any) {
    console.error("Get users error:", error);
    return errorResponse(res, error.message || "Failed to fetch users", 500);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin only)
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "User fetched successfully", user, 200);
  } catch (error: any) {
    console.error("Get user by ID error:", error);
    return errorResponse(res, error.message || "Failed to fetch user", 500);
  }
};

/**
 * @desc    Update user status
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin only)
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    if (typeof isActive !== "boolean") {
      return errorResponse(res, "isActive must be a boolean", 400);
    }

    const user = await User.findById(id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    user.isActive = isActive;
    if (reason) {
      // You can add a statusHistory field to track changes
      // For now, just update the status
    }

    await user.save();

    if (!isActive) {
      createAndSend(
        user._id,
        "account_deactivated",
        "Account deactivated",
        "Your account has been deactivated.",
        { userId: user._id.toString() },
      ).catch((err) =>
        console.error("Failed to send deactivation notification:", err),
      );
    }

    return successResponse(
      res,
      `User ${isActive ? "activated" : "deactivated"} successfully`,
      { isActive: user.isActive },
      200,
    );
  } catch (error: any) {
    console.error("Update user status error:", error);
    return errorResponse(
      res,
      error.message || "Failed to update user status",
      500,
    );
  }
};

/**
 * @desc    Get influencer Instagram analytics (Admin only)
 * @route   GET /api/admin/users/:id/instagram-analytics
 * @access  Private (Admin only)
 */
/**
 * @desc    Get influencer Instagram analytics (Admin only)
 * @route   GET /api/admin/users/:id/instagram-analytics
 * @access  Private (Admin only)
 */
export const getInfluencerInstagramAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("role influencerInfo");

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.role !== "influencer") {
      return errorResponse(res, "User is not an influencer", 400);
    }

    // Construct Response Object for all platforms
    const socialMediaResponse: any = {};
    const socialMediaAccounts = user.influencerInfo?.socialMedia || [];
    const facebookSocialAccount = socialMediaAccounts.find(
      (account: any) => account?.platform === "facebook",
    );

    for (const account of socialMediaAccounts) {
      if (!account?.platform) continue;
      if (account.platform === "facebook") continue;
      if (!account.isActive && account.platform !== "youtube") continue;

      if (account.platform === "instagram") {
        // --- Try to fetch fresh Instagram data ---
        let profileData: any = null;
        let postsData: any[] = [];
        let isFresh = false;

        if (account.accessToken) {
          try {
            const [profile, media] = await Promise.all([
              instagramService.getInstagramProfile(account.accessToken),
              instagramService.getRecentMedia(account.accessToken, 30),
            ]);
            profileData = profile;
            postsData = media;
            isFresh = true;
          } catch (err) {
            console.error("⚠️ Failed to fetch fresh Instagram data:", err);
          }
        }

        if (isFresh) {
          const followers = profileData.followers_count || 0;
          const following = profileData.follows_count || 0;
          const mediaCount = profileData.media_count || 0;

          // Calculate Engagement
          let totalLikes = 0;
          let totalComments = 0;
          let maxLikes = 0;
          let topEngagement = 0;

          postsData.forEach((post: any) => {
            const likes = post.like_count || 0;
            const comments = post.comments_count || 0;
            const engagement = likes + comments;

            totalLikes += likes;
            totalComments += comments;
            if (likes > maxLikes) maxLikes = likes;
            if (engagement > topEngagement) topEngagement = engagement;
          });

          const avgEngagementPerPost =
            postsData.length > 0
              ? Math.round((totalLikes + totalComments) / postsData.length)
              : 0;

          const engagementRate =
            followers > 0
              ? ((totalLikes + totalComments) / followers) * 100
              : 0;

          // Metric Calculations
          let activityScore = 0;
          if (postsData.length > 0) {
            const lastPostDate = new Date(postsData[0].timestamp);
            const daysSince =
              (new Date().getTime() - lastPostDate.getTime()) /
              (1000 * 3600 * 24);
            if (daysSince < 3) activityScore = 100;
            else if (daysSince < 7) activityScore = 80;
            else if (daysSince < 14) activityScore = 60;
            else if (daysSince < 30) activityScore = 40;
            else activityScore = 20;
          }

          const botDetection = buildBotDetection({
            followers,
            following,
            postsCount: mediaCount,
            engagementRate,
          });

          socialMediaResponse.instagram = {
            username: profileData.username,
            url: `https://instagram.com/${profileData.username}`,
            profilePictureUrl:
              profileData.profile_picture_url || account.profilePictureUrl,
            followers: followers,
            following: following,
            isVerified: false,
            isActive: true,
            connectedAt: account.addedAt,
            lastUpdated: new Date(),
            postsCount: mediaCount,
            engagement: {
              averagePerPost: avgEngagementPerPost,
              topEngagementPerPost: topEngagement,
              maximumLikes: maxLikes,
            },
            metrics: {
              authenticityScore: 100 - botDetection.riskScore,
              activityScore: activityScore,
              fakeFollowersPercentage: botDetection.riskScore,
            },
            botDetection,
            insights: {
              followerCount: followers,
              engagementRate: engagementRate,
              totalEngagement: totalLikes + totalComments,
              updatedAt: new Date(),
            },
            posts: postsData.map((p: any) => ({
              id: p.id,
              mediaUrl: p.media_url,
              thumbnailUrl: p.thumbnail_url,
              caption: p.caption,
              likesCount: p.like_count,
              commentsCount: p.comments_count,
              timestamp: p.timestamp,
              permalink: p.permalink,
              mediaType: p.media_type,
            })),
          };
        } else {
          const accountAny = account as any;
          const followers = getNumericValue(account.followers);
          const following = getNumericValue(account.following);
          const postsCount =
            getNumericValue(accountAny.postsCount) ||
            (Array.isArray(account.posts) ? account.posts.length : 0);
          const engagementRate =
            typeof account?.insights?.engagementRate === "number"
              ? account.insights.engagementRate
              : undefined;

          const botDetection = buildBotDetection({
            followers,
            following,
            postsCount,
            engagementRate,
          });

          socialMediaResponse.instagram = {
            ...account,
            metrics: {
              ...(account.metrics || {}),
              authenticityScore: getNumericValue(accountAny?.metrics?.authenticityScore)
                ? getNumericValue(accountAny?.metrics?.authenticityScore)
                : 100 - botDetection.riskScore,
              fakeFollowersPercentage: getNumericValue(
                accountAny?.metrics?.fakeFollowersPercentage,
              )
                ? getNumericValue(accountAny?.metrics?.fakeFollowersPercentage)
                : botDetection.riskScore,
            },
            botDetection,
          };
        }
      } else if (account.platform === "youtube") {
        const accountAny = account as any;
        const baseYoutubeAccount =
          typeof accountAny?.toObject === "function"
            ? accountAny.toObject()
            : accountAny;
        const followers =
          getNumericValue(baseYoutubeAccount.analytics?.totalSubscribers) ||
          getNumericValue(baseYoutubeAccount.youtubeChannel?.subscriberCount) ||
          getNumericValue(accountAny.subscriberCount) ||
          getNumericValue(baseYoutubeAccount.followers);
        const postsCount =
          getNumericValue(baseYoutubeAccount.analytics?.totalVideos) ||
          getNumericValue(baseYoutubeAccount.youtubeChannel?.videoCount) ||
          getNumericValue(accountAny.videoCount) ||
          getNumericValue(accountAny.postsCount);

        const botDetection = buildBotDetection({
          followers,
          following: 0,
          postsCount,
          engagementRate: undefined,
        });

        socialMediaResponse.youtube = {
          ...baseYoutubeAccount,
          botDetection,
        };
      } else if (account.platform === "facebook") {
        // --- Try to fetch fresh Facebook data ---
        let pageData: any = null;
        let isFresh = false;

        if (account.accessToken && account.url) {
          try {
            // Extract page ID from URL or use a stored ID if available
            // Assuming the URL might be something like facebook.com/page-id
            const pageIdMatch = account.url.match(/facebook\.com\/([^/?#]+)/);
            const pageId = pageIdMatch ? pageIdMatch[1] : null;

            if (pageId) {
              pageData = await instagramService.getFacebookPageDetails(
                pageId,
                account.accessToken,
              );
              isFresh = true;
            }
          } catch (err) {
            console.error("⚠️ Failed to fetch fresh Facebook data:", err);
          }
        }

        if (isFresh) {
          const accountAny = account as any;
          const followers =
            pageData.followers_count || pageData.fan_count || account.followers || 0;
          const postsCount =
            getNumericValue(accountAny.postsCount) ||
            (Array.isArray(account.posts) ? account.posts.length : 0);
          const engagementRate =
            typeof account?.insights?.engagementRate === "number"
              ? account.insights.engagementRate
              : undefined;
          const botDetection = buildBotDetection({
            followers: getNumericValue(followers),
            following: 0,
            postsCount,
            engagementRate,
          });

          socialMediaResponse.facebook = {
            ...account,
            name: pageData.name,
            username: pageData.username,
            followers,
            profilePictureUrl:
              pageData.picture?.data?.url || account.profilePictureUrl,
            url: pageData.link || account.url,
            lastUpdated: new Date(),
            botDetection,
          };
        } else {
          const accountAny = account as any;
          const followers = getNumericValue(account.followers);
          const postsCount =
            getNumericValue(accountAny.postsCount) ||
            (Array.isArray(account.posts) ? account.posts.length : 0);
          const engagementRate =
            typeof account?.insights?.engagementRate === "number"
              ? account.insights.engagementRate
              : undefined;
          const botDetection = buildBotDetection({
            followers,
            following: 0,
            postsCount,
            engagementRate,
          });

          socialMediaResponse.facebook = {
            ...account,
            botDetection,
          };
        }
      } else if (account.platform) {
        socialMediaResponse[account.platform] = account;
      }
    }

    if (!socialMediaResponse.facebook) {
      const pages = user.influencerInfo?.facebookData?.pages || [];
      const primaryPage = pages[0];

      if (primaryPage) {
        const followers =
          getNumericValue(primaryPage.followersCount) ||
          getNumericValue(primaryPage.fanCount);
        const postsCount = Array.isArray(primaryPage.posts)
          ? primaryPage.posts.length
          : 0;

        const totalPostEngagement = Array.isArray(primaryPage.posts)
          ? primaryPage.posts.reduce((sum: number, post: any) => {
              return (
                sum +
                getNumericValue(post?.reaction_count) +
                getNumericValue(post?.comment_count) +
                getNumericValue(post?.share_count)
              );
            }, 0)
          : 0;

        const engagementRate =
          followers > 0 ? (totalPostEngagement / followers) * 100 : 0;

        const botDetection = buildBotDetection({
          followers,
          following: 0,
          postsCount,
          engagementRate,
        });

        socialMediaResponse.facebook = {
          username: primaryPage.pageName,
          name: primaryPage.pageName,
          url: `https://facebook.com/${primaryPage.pageId}`,
          followers,
          following: 0,
          isVerified: false,
          isActive: true,
          postsCount,
          botDetection,
          insights: {
            engagementRate,
            totalEngagement: totalPostEngagement,
          },
          lastUpdated:
            primaryPage.lastFetchedAt ||
            user.influencerInfo?.facebookData?.lastFetchedAt ||
            null,
        };
      } else if (facebookSocialAccount) {
        const accountAny = facebookSocialAccount as any;
        const followers = getNumericValue(facebookSocialAccount.followers);
        const postsCount =
          getNumericValue(accountAny.postsCount) ||
          (Array.isArray(facebookSocialAccount.posts)
            ? facebookSocialAccount.posts.length
            : 0);
        const engagementRate =
          typeof facebookSocialAccount?.insights?.engagementRate === "number"
            ? facebookSocialAccount.insights.engagementRate
            : undefined;

        const botDetection = buildBotDetection({
          followers,
          following: 0,
          postsCount,
          engagementRate,
        });

        socialMediaResponse.facebook = {
          ...facebookSocialAccount,
          botDetection,
        };
      }
    }

    // Return all fetched social media analytics data
    return successResponse(
      res,
      "Social media analytics fetched successfully",
      socialMediaResponse,
      200,
    );
  } catch (error: any) {
    console.error("Get Instagram analytics error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch Instagram analytics",
      500,
    );
  }
};

/**
 * @desc    Update any user information (Admin only)
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin only)
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findById(id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const effectiveRole = updateData.role !== undefined ? updateData.role : user.role;
    if (effectiveRole === "brand") {
      if (
        updateData.email !== undefined &&
        !isProfessionalEmail(updateData.email)
      ) {
        return errorResponse(res, PROFESSIONAL_EMAIL_ERROR, 400);
      }

      if (
        updateData.businessInfo?.businessEmail !== undefined &&
        !isProfessionalEmail(updateData.businessInfo.businessEmail)
      ) {
        return errorResponse(res, PROFESSIONAL_EMAIL_ERROR, 400);
      }
    }

    // Update basic fields
    if (updateData.name !== undefined) user.name = updateData.name;
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.phoneCode !== undefined)
      user.phoneCode = updateData.phoneCode;
    if (updateData.dateOfBirth !== undefined)
      user.dateOfBirth = updateData.dateOfBirth;
    if (updateData.spokenLanguages !== undefined)
      user.spokenLanguages = updateData.spokenLanguages;
    if (updateData.country !== undefined) user.country = updateData.country;
    if (updateData.profilePictureUrl !== undefined)
      user.profilePictureUrl = updateData.profilePictureUrl;
    if (updateData.role !== undefined) user.role = updateData.role;
    const wasDeactivated =
      user.isActive === true && updateData.isActive === false;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

    // Update social media links
    if (updateData.instagram !== undefined)
      user.instagram = updateData.instagram;
    if (updateData.facebook !== undefined) user.facebook = updateData.facebook;
    if (updateData.twitter !== undefined) user.twitter = updateData.twitter;
    if (updateData.linkedin !== undefined) user.linkedin = updateData.linkedin;
    if (updateData.website !== undefined) user.website = updateData.website;
    if (updateData.youtube !== undefined) user.youtube = updateData.youtube;

    // Update address
    if (updateData.addresses) {
      if (!user.addresses) {
        user.addresses = {} as any;
      }
      const addresses = user.addresses!; // Non-null assertion since we just created it
      if (updateData.addresses.streetAddress !== undefined)
        addresses.streetAddress = updateData.addresses.streetAddress;
      if (updateData.addresses.city !== undefined)
        addresses.city = updateData.addresses.city;
      if (updateData.addresses.state !== undefined)
        addresses.state = updateData.addresses.state;
      if (updateData.addresses.country !== undefined)
        addresses.country = updateData.addresses.country;
      if (updateData.addresses.pinCode !== undefined)
        addresses.pinCode = updateData.addresses.pinCode;
      if (updateData.addresses.latitude !== undefined)
        addresses.latitude = updateData.addresses.latitude;
      if (updateData.addresses.longitude !== undefined)
        addresses.longitude = updateData.addresses.longitude;
    }

    // Update influencer info
    if (updateData.influencerInfo) {
      if (!user.influencerInfo) {
        user.influencerInfo = {} as any;
      }
      const influencerInfo = user.influencerInfo!; // Non-null assertion since we just created it
      if (updateData.influencerInfo.influencerSince !== undefined)
        influencerInfo.influencerSince =
          updateData.influencerInfo.influencerSince;
      if (updateData.influencerInfo.influencerType !== undefined)
        influencerInfo.influencerType =
          updateData.influencerInfo.influencerType;
      if (updateData.influencerInfo.workType !== undefined)
        influencerInfo.workType = updateData.influencerInfo.workType;
      if (updateData.influencerInfo.genre !== undefined)
        influencerInfo.genre = updateData.influencerInfo.genre;
      if (updateData.influencerInfo.children !== undefined)
        influencerInfo.children = updateData.influencerInfo.children;
      if (updateData.influencerInfo.pets !== undefined)
        influencerInfo.pets = updateData.influencerInfo.pets;
      if (updateData.influencerInfo.maritalStatus !== undefined)
        influencerInfo.maritalStatus = updateData.influencerInfo.maritalStatus;
      if (updateData.influencerInfo.showOnTop !== undefined)
        influencerInfo.showOnTop = updateData.influencerInfo.showOnTop;
      if (updateData.influencerInfo.socialMedia !== undefined) {
        influencerInfo.socialMedia = updateData.influencerInfo.socialMedia;
        user.markModified("influencerInfo.socialMedia");
      }
    }

    // Update vendor info
    if (updateData.vendorInfo) {
      if (!user.vendorInfo) {
        user.vendorInfo = {} as any;
      }
      const vendorInfo = user.vendorInfo!; // Non-null assertion since we just created it
      if (updateData.vendorInfo.vendorSince !== undefined)
        vendorInfo.vendorSince = updateData.vendorInfo.vendorSince;
      if (updateData.vendorInfo.vendorType !== undefined)
        vendorInfo.vendorType = updateData.vendorInfo.vendorType;
      if (updateData.vendorInfo.businessName !== undefined)
        vendorInfo.businessName = updateData.vendorInfo.businessName;
      if (updateData.vendorInfo.businessRegistrationNumber !== undefined)
        vendorInfo.businessRegistrationNumber =
          updateData.vendorInfo.businessRegistrationNumber;
      if (updateData.vendorInfo.description !== undefined)
        vendorInfo.description = updateData.vendorInfo.description;
      if (updateData.vendorInfo.experience !== undefined)
        vendorInfo.experience = updateData.vendorInfo.experience;
      if (updateData.vendorInfo.servicesOffered !== undefined)
        vendorInfo.servicesOffered = updateData.vendorInfo.servicesOffered;
      if (updateData.vendorInfo.serviceAreas !== undefined) {
        const raw = updateData.vendorInfo.serviceAreas;
        // Schema expects [{ city, state?, country?, latitude, longitude, radius }]
        if (Array.isArray(raw) && raw.length > 0) {
          const first = raw[0];
          if (typeof first === "string") {
            vendorInfo.serviceAreas = raw.map((s: string) => ({
              city: s,
              state: "",
              country: "",
              latitude: 0,
              longitude: 0,
              radius: 0,
            }));
          } else if (first && typeof first === "object" && "city" in first) {
            vendorInfo.serviceAreas = raw;
          } else {
            vendorInfo.serviceAreas = raw.map((s: string) => ({
              city: s,
              state: "",
              country: "",
              latitude: 0,
              longitude: 0,
              radius: 0,
            }));
          }
        } else if (typeof raw === "string") {
          vendorInfo.serviceAreas = [
            {
              city: raw,
              state: "",
              country: "",
              latitude: 0,
              longitude: 0,
              radius: 0,
            },
          ];
        } else {
          vendorInfo.serviceAreas = [];
        }
      }
      if (updateData.vendorInfo.availability !== undefined)
        vendorInfo.availability = updateData.vendorInfo.availability;
      if (updateData.vendorInfo.rating !== undefined)
        vendorInfo.rating = updateData.vendorInfo.rating;
      if (updateData.vendorInfo.totalReviews !== undefined)
        vendorInfo.totalReviews = updateData.vendorInfo.totalReviews;
      if (updateData.vendorInfo.completedProjects !== undefined)
        vendorInfo.completedProjects = updateData.vendorInfo.completedProjects;
      if (updateData.vendorInfo.portfolio !== undefined)
        vendorInfo.portfolio = updateData.vendorInfo.portfolio;
      if (updateData.vendorInfo.certifications !== undefined)
        vendorInfo.certifications = updateData.vendorInfo.certifications;
      if (updateData.vendorInfo.isVerified !== undefined)
        vendorInfo.isVerified = updateData.vendorInfo.isVerified;
    }

    // Update business info (for brands)
    if (updateData.businessInfo) {
      if (!user.businessInfo) {
        user.businessInfo = {} as any;
      }
      const businessInfo = user.businessInfo!; // Non-null assertion since we just created it
      if (updateData.businessInfo.businessName !== undefined)
        businessInfo.businessName = updateData.businessInfo.businessName;
      if (updateData.businessInfo.businessEmail !== undefined)
        businessInfo.businessEmail = updateData.businessInfo.businessEmail;
      if (updateData.businessInfo.websiteUrl !== undefined)
        businessInfo.websiteUrl = updateData.businessInfo.websiteUrl;
      if (updateData.businessInfo.businessType !== undefined)
        businessInfo.businessType = updateData.businessInfo.businessType;
      if (updateData.businessInfo.industry !== undefined)
        businessInfo.industry = updateData.businessInfo.industry;
      if (updateData.businessInfo.businessSize !== undefined)
        businessInfo.businessSize = updateData.businessInfo.businessSize;
      if (updateData.businessInfo.businessDescription !== undefined)
        businessInfo.businessDescription =
          updateData.businessInfo.businessDescription;
      if (updateData.businessInfo.description !== undefined)
        businessInfo.description = updateData.businessInfo.description;
      if (updateData.businessInfo.logoUrl !== undefined)
        businessInfo.logoUrl = updateData.businessInfo.logoUrl;
      if (updateData.businessInfo.bannerUrl !== undefined)
        businessInfo.bannerUrl = updateData.businessInfo.bannerUrl;
    }

    // Update password if provided
    if (updateData.password) {
      user.password = updateData.password; // Will be hashed by pre-save hook
    }

    await user.save();

    if (wasDeactivated) {
      createAndSend(
        user._id,
        "account_deactivated",
        "Account deactivated",
        "Your account has been deactivated.",
        { userId: user._id.toString() },
      ).catch((err) =>
        console.error("Failed to send deactivation notification:", err),
      );
    }

    const updatedUser = await User.findById(id).select("-password").lean();

    return successResponse(res, "User updated successfully", updatedUser, 200);
  } catch (error: any) {
    console.error("Update user error:", error);
    return errorResponse(res, error.message || "Failed to update user", 500);
  }
};

/**
 * @desc    Get chat rooms for admin
 * @route   GET /api/admin/chat/rooms
 * @access  Private (Admin only)
 */
export const getChatRooms = async (req: Request, res: Response) => {
  try {
    const { chatType, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    const filters: any = { isActive: true };
    if (chatType) {
      filters.chatType = chatType;
    }

    // Get chat rooms with populated participants
    let rooms = await ChatRoom.find(filters)
      .populate("participants", "name email profilePictureUrl role")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Search filter (search in participant names)
    if (search) {
      const searchRegex = new RegExp(search as string, "i");
      const userIds = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("_id")
        .lean();

      const userIdArray = userIds.map((u) => u._id.toString());
      rooms = rooms.filter((room: any) => {
        return room.participants.some(
          (p: any) =>
            userIdArray.includes(p._id.toString()) ||
            p.name?.match(searchRegex) ||
            p.email?.match(searchRegex),
        );
      });
    }

    // Format response with last message info
    const formattedRooms = rooms.map((room: any) => {
      const lastMessage = room.lastMessage;
      return {
        _id: room._id,
        participants: room.participants.map((p: any) => p._id),
        participantRoles: room.participantRoles,
        chatType: room.chatType,
        isActive: room.isActive,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        participantsInfo: room.participants,
      };
    });

    const total = await ChatRoom.countDocuments(filters);

    return successResponse(
      res,
      "Chat rooms fetched successfully",
      formattedRooms,
      200,
      {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    );
  } catch (error: any) {
    console.error("Get chat rooms error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch chat rooms",
      500,
    );
  }
};

/**
 * @desc    Get messages for a chat room
 * @route   GET /api/admin/chat/rooms/:roomId/messages
 * @access  Private (Admin only)
 */
export const getChatRoomMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;

    // Verify room exists
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return errorResponse(res, "Chat room not found", 404);
    }

    // Get messages
    const messages = await Message.find({ roomId, isDeleted: false })
      .populate("senderId", "name profilePictureUrl role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({ roomId, isDeleted: false });

    // Format messages (senderId may be null if sender user was deleted)
    const formattedMessages = messages
      .map((msg: any) => ({
        _id: msg._id,
        senderId: msg.senderId ? msg.senderId._id || msg.senderId : null,
        senderRole: msg.senderRole,
        content: msg.content,
        messageType: msg.messageType,
        attachments: msg.attachments || [],
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        senderInfo: msg.senderId || null,
      }))
      .reverse(); // Reverse to show oldest first

    return successResponse(
      res,
      "Messages fetched successfully",
      formattedMessages,
      200,
      {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
    );
  } catch (error: any) {
    console.error("Get messages error:", error);
    return errorResponse(res, error.message || "Failed to fetch messages", 500);
  }
};

/**
 * @desc    Get comprehensive analytics data
 * @route   GET /api/admin/analytics
 * @access  Private (Admin only)
 */
export const getAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { period = "30" } = req.query; // days
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User Analytics
    const totalUsers = await User.countDocuments();
    const influencers = await User.countDocuments({ role: "influencer" });
    const brands = await User.countDocuments({ role: "brand" });
    const vendors = await User.countDocuments({ role: "vendor" });
    const activeUsers = await User.countDocuments({ isActive: true });

    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });

    // User Growth Over Time (daily for selected period)
    const userGrowthPipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ];
    const userGrowth = await User.aggregate(userGrowthPipeline);

    // User Growth by Role
    const userGrowthByRole = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Campaign Analytics
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: "active" });
    const completedCampaigns = await Campaign.countDocuments({
      status: "completed",
    });
    const draftCampaigns = await Campaign.countDocuments({ status: "draft" });

    const newCampaigns = await Campaign.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Campaign Growth Over Time
    const campaignGrowth = await Campaign.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Campaigns by Status
    const campaignsByStatus = await Campaign.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Campaigns by Type
    const campaignsByType = await Campaign.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Offers & Bids Analytics
    const totalOffers = await InfluencerOffer.countDocuments();
    const pendingOffers = await InfluencerOffer.countDocuments({
      status: "pending",
    });
    const acceptedOffers = await InfluencerOffer.countDocuments({
      status: "accepted",
    });
    const completedOffers = await InfluencerOffer.countDocuments({
      status: "completed",
    });

    const totalBids = await InfluencerBid.countDocuments();
    const pendingBids = await InfluencerBid.countDocuments({
      status: "pending",
    });
    const acceptedBids = await InfluencerBid.countDocuments({
      status: "accepted",
    });

    // Deals Analytics
    const totalDeals = await InfluencerBrandDeal.countDocuments();
    const runningDeals = await InfluencerBrandDeal.countDocuments({
      status: "running",
    });
    const completedDeals = await InfluencerBrandDeal.countDocuments({
      status: "completed",
    });
    const cancelledDeals = await InfluencerBrandDeal.countDocuments({
      status: "cancelled",
    });

    // Payment & Transaction Analytics
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({
      status: PaymentStatus.COMPLETED,
    });
    const pendingPayments = await Payment.countDocuments({
      status: PaymentStatus.PENDING,
    });
    const failedPayments = await Payment.countDocuments({
      status: PaymentStatus.FAILED,
    });

    // Revenue Analytics
    const revenuePipeline: PipelineStage[] = [
      {
        $match: {
          status: PaymentStatus.COMPLETED,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalRevenue: { $sum: "$totalAmount" },
          platformFees: { $sum: "$platformFee" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ];
    const revenueData = await Payment.aggregate(revenuePipeline);

    // Total Revenue
    const totalRevenueResult = await Payment.aggregate([
      {
        $match: {
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalPlatformFees: { $sum: "$platformFee" },
        },
      },
    ]);
    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
    const totalPlatformFees = totalRevenueResult[0]?.totalPlatformFees || 0;

    // Revenue by Payment Type
    const revenueByType = await Payment.aggregate([
      {
        $match: {
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: "$paymentType",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Transaction Analytics
    const totalTransactions = await Transaction.countDocuments();
    const creditTransactions = await Transaction.countDocuments({
      type: TransactionType.CREDIT,
    });
    const debitTransactions = await Transaction.countDocuments({
      type: TransactionType.DEBIT,
    });

    const recentTransactions = await Transaction.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Chat Analytics
    const totalChatRooms = await ChatRoom.countDocuments();
    const totalMessages = await Message.countDocuments({ isDeleted: false });
    const recentMessages = await Message.countDocuments({
      createdAt: { $gte: startDate },
      isDeleted: false,
    });

    // Top Performing Brands (by campaign count)
    const topBrands = await Campaign.aggregate([
      {
        $group: {
          _id: "$createdBy",
          campaignCount: { $sum: 1 },
        },
      },
      {
        $sort: { campaignCount: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      {
        $unwind: {
          path: "$brandInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          brandId: "$_id",
          brandName: "$brandInfo.name",
          campaignCount: 1,
        },
      },
    ]);

    // Top Performing Influencers (by deals count)
    const topInfluencers = await InfluencerBrandDeal.aggregate([
      {
        $group: {
          _id: "$influencerId",
          dealCount: { $sum: 1 },
        },
      },
      {
        $sort: { dealCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return successResponse(
      res,
      "Analytics data fetched successfully",
      {
        period: days,
        users: {
          total: totalUsers,
          influencers,
          brands,
          vendors,
          active: activeUsers,
          new: newUsers,
          growth: userGrowth,
          growthByRole: userGrowthByRole,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          completed: completedCampaigns,
          draft: draftCampaigns,
          new: newCampaigns,
          growth: campaignGrowth,
          byStatus: campaignsByStatus,
          byType: campaignsByType,
        },
        offers: {
          total: totalOffers,
          pending: pendingOffers,
          accepted: acceptedOffers,
          completed: completedOffers,
        },
        bids: {
          total: totalBids,
          pending: pendingBids,
          accepted: acceptedBids,
        },
        deals: {
          total: totalDeals,
          running: runningDeals,
          completed: completedDeals,
          cancelled: cancelledDeals,
        },
        payments: {
          total: totalPayments,
          completed: completedPayments,
          pending: pendingPayments,
          failed: failedPayments,
        },
        revenue: {
          total: totalRevenue,
          platformFees: totalPlatformFees,
          data: revenueData,
          byType: revenueByType,
        },
        transactions: {
          total: totalTransactions,
          credit: creditTransactions,
          debit: debitTransactions,
          recent: recentTransactions,
        },
        chat: {
          totalRooms: totalChatRooms,
          totalMessages,
          recentMessages,
        },
        topPerformers: {
          brands: topBrands,
          influencers: topInfluencers,
        },
      },
      200,
    );
  } catch (error: any) {
    console.error("Analytics error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch analytics data",
      500,
    );
  }
};

/**
 * @desc    Get waiting list users
 * @route   GET /api/admin/waiting-list
 * @access  Private (Admin only)
 */
export const getWaitingList = async (req: Request, res: Response) => {
  try {
    const { role, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filters: any = {
      status: "waiting_list",
      role: { $ne: "admin" }, // Exclude admins
    };

    if (role && role !== "all") {
      filters.role = role;
    }

    const users = await User.find(filters)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await User.countDocuments(filters);

    return successResponse(
      res,
      "Waiting list users fetched successfully",
      users,
      200,
      {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total,
        limit: limitNum,
      },
    );
  } catch (error: any) {
    console.error("Get waiting list error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch waiting list",
      500,
    );
  }
};

/**
 * @desc    Approve or reject user
 * @route   PUT /api/admin/waiting-list/:id
 * @access  Private (Admin only)
 */
export const updateWaitingListStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return errorResponse(
        res,
        'Invalid action. Must be "approve" or "reject"',
        400,
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.status !== "waiting_list") {
      return errorResponse(res, "User is not on waiting list", 400);
    }

    if (action === "approve") {
      user.status = "approved";
      user.isActive = true;
      if (user.email) {
        sendAccountApprovedEmail(user.email, user.name).catch((err) =>
          console.error("Failed to send approval email:", err),
        );
      }
    } else {
      user.status = "rejected";
      user.isActive = false;
      if (user.email) {
        sendAccountRejectedEmail(user.email, user.name, reason).catch((err) =>
          console.error("Failed to send rejection email:", err),
        );
      }
    }

    await user.save();

    if (action === "approve") {
      createAndSend(
        user._id,
        "account_approved",
        "Account approved",
        "Your account has been approved. You can now log in and use the app.",
        { userId: user._id.toString() },
      ).catch((err) =>
        console.error("Failed to send approval notification:", err),
      );
    }

    return successResponse(
      res,
      `User ${action === "approve" ? "approved" : "rejected"} successfully`,
      {
        userId: user._id,
        status: user.status,
        isActive: user.isActive,
      },
      200,
    );
  } catch (error: any) {
    console.error("Update waiting list status error:", error);
    return errorResponse(
      res,
      error.message || "Failed to update user status",
      500,
    );
  }
};

// --- Helper Functions for Analytics ---

function calculateAuthenticityScore(account: any): number {
  // Simple heuristic:
  // High engagement relative to followers = High Authenticity
  // Very low engagement with high followers = Low Authenticity (buying followers?)
  if (!account.followers || account.followers === 0) return 0;

  const engagementRate =
    (account.engagement?.averagePerPost || 0) / account.followers;
  let score = 0;

  // Industry standard: 1% - 3.5% is average/good. > 6% is high. < 1% is low.
  if (engagementRate > 0.05)
    score = 95; // Excellent
  else if (engagementRate > 0.03)
    score = 85; // Good
  else if (engagementRate > 0.01)
    score = 70; // Average
  else score = 40; // Low

  // Penalize if following > followers (unless absolute numbers are small)
  if (account.following > account.followers && account.followers > 1000) {
    score -= 20;
  }

  // Return within 0-100 range
  return Math.max(0, Math.min(100, score));
}

function calculateActivityScore(account: any): number {
  // Check recency of last post
  const posts = account.posts || [];
  if (posts.length === 0) return 0;

  const lastPostDate = new Date(posts[0].timestamp); // Assuming sorted or picking latest
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - lastPostDate.getTime()) / (1000 * 3600 * 24),
  );

  if (diffDays <= 2) return 100; // Very Active
  if (diffDays <= 7) return 80; // Active
  if (diffDays <= 30) return 50; // Moderate
  return 20; // Inactive
}

function extractBrandCapabilityTags(account: any): string[] {
  const posts = account.posts || [];
  const allCaptions = posts
    .map((p: any) => p.caption || "")
    .join(" ")
    .toLowerCase();

  // Simple extraction of popular niche hashtags
  const hashtags = allCaptions.match(/#[a-z0-9_]+/g) || [];

  // Count frequency
  const frequency: Record<string, number> = {};
  hashtags.forEach((tag: string) => {
    frequency[tag] = (frequency[tag] || 0) + 1;
  });

  // Sort by frequency
  const sortedTags = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5
    .map(([tag]) => tag);

  return sortedTags.length > 0 ? sortedTags : ["#general", "#lifestyle"];
}

function calculateFakeFollowersPercentage(account: any): number {
  // Use an inverse of authenticity score for now as a proxy
  const authScore = calculateAuthenticityScore(account);
  // If authenticity is 100, fake is 0. If 0, fake is ~50-80% (never 100% usually)
  return Math.round((100 - authScore) * 0.4); // Rough estimate
}
