import { Request, Response } from "express";
import User from "../models/user";
import { generateToken } from "../utils/jwtService";
import { errorResponse, successResponse } from "../utils/responseHelper";
import { PipelineStage } from "mongoose";
import { fileStorageService } from "../services/fileStorageService";
import { sendAccountCreatedEmail } from "../services/emailService";
import { instagramService } from "../services/instagramService";
import {
  isProfessionalEmail,
  PROFESSIONAL_EMAIL_ERROR,
} from "../utils/professionalEmail";

const FCM_TOKEN_MAX = 10;

/** Persist FCM token for vendor/influencer only (call before user.save()). */
function addFcmTokenToUser(
  user: { role: string; fcmTokens?: string[] | string },
  fcmToken: string | undefined,
): void {
  if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) return;
  if (user.role !== "vendor" && user.role !== "influencer") return;
  const token = fcmToken.trim();
  const existing = (user as any).fcmTokens;
  const tokens = Array.isArray(existing)
    ? [...existing]
    : typeof existing === "string" && existing
      ? [existing]
      : [];
  if (!tokens.includes(token)) tokens.push(token);
  (user as any).fcmTokens = tokens.slice(-FCM_TOKEN_MAX);
}

/**
 * @desc    Register a new user (brand, vendor, or influencer)
 * @route   POST /api/user/register
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    // Debug: Log entire request body
    console.log(
      "📥 REGISTER USER - Full req.body:",
      JSON.stringify(req.body, null, 2),
    );

    let {
      role,
      name,
      email,
      emailVerified,
      phone,
      phoneCode,
      apple_user_id,
      google_user_id,
      fcmToken,
      fcm_token,
    } = req.body;
    const fcmTokenRegister = fcmToken ?? fcm_token;

    // Clean up empty strings for unique fields to avoid sparse index collisions
    if (email === "") email = undefined;
    if (phone === "") phone = undefined;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const profileImage = files?.profileImage?.[0];

    if (!role) {
      return errorResponse(res, "Role is required.");
    }
    if (!name) {
      return errorResponse(res, "Name is required", 400);
    }
    if (!email && !phone && !apple_user_id && !google_user_id) {
      return errorResponse(
        res,
        "Either email, phone, Apple ID, or Google ID is required",
        400,
      );
    }

    // Validate phoneCode is provided with phone number
    if (phone && !phoneCode) {
      return errorResponse(
        res,
        "Phone code is required when providing phone number",
        400,
      );
    }

    // --- Check for existing user ---
    const queryConditions = [];
    if (email) queryConditions.push({ email });
    if (phone) queryConditions.push({ phone });
    if (apple_user_id) queryConditions.push({ apple_user_id });
    if (google_user_id) queryConditions.push({ google_user_id });

    if (queryConditions.length > 0) {
      const userExists = await User.findOne({ $or: queryConditions });
      if (userExists) {
        // If existing user doesn't have apple_user_id but request provides it, save it for future check_user_exists
        if (apple_user_id && !userExists.apple_user_id) {
          await User.updateOne(
            { _id: userExists._id },
            { $set: { apple_user_id } },
          );
        }
        return errorResponse(
          res,
          "User already exists with this email, phone number, or Apple ID.",
          400,
        );
      }
    }

    // UPDATED: Logic for different roles
    let newUser;
    if (role === "influencer") {
      // --- Register new Influencer ---
      const {
        about,
        dateOfBirth,
        spokenLanguages,
        country,
        streetAddress,
        city,
        state,
        pinCode,
        latitude,
        longitude,
        influencerSince,
        influencerType,
        workType,
        maritalStatus,
        children,
        pets,
        genre,
        influencerTypeOrGenreOtherDescription,
      } = req.body;

      // Upload profile image to file storage microservice
      let profilePictureUrl: string | undefined;
      if (profileImage) {
        try {
          profilePictureUrl = await fileStorageService.uploadFile(
            profileImage,
            "profile_images",
          );
        } catch (error: any) {
          console.error("Profile image upload failed:", error.message);
          return errorResponse(
            res,
            `Profile image upload failed: ${error.message}`,
            500,
          );
        }
      }

      // Build addresses object from payload
      const addresses: Record<string, string> = {};
      if (streetAddress !== undefined)
        addresses.streetAddress = String(streetAddress);
      if (city !== undefined) addresses.city = String(city);
      if (state !== undefined) addresses.state = String(state);
      if (country !== undefined) addresses.country = String(country);
      if (pinCode !== undefined) addresses.pinCode = String(pinCode);
      if (latitude !== undefined) addresses.latitude = String(latitude);
      if (longitude !== undefined) addresses.longitude = String(longitude);

      // influencerSince may come as number (e.g. 2026) from frontend
      const influencerSinceStr =
        influencerSince !== undefined ? String(influencerSince) : undefined;

      newUser = new User({
        name,
        about,
        email,
        emailVerified: emailVerified === true || emailVerified === "true",
        phone,
        phoneCode,
        apple_user_id: apple_user_id || undefined,
        role: "influencer",
        dateOfBirth,
        spokenLanguages: Array.isArray(spokenLanguages)
          ? spokenLanguages
          : spokenLanguages
            ? [spokenLanguages]
            : undefined,
        country,
        addresses: Object.keys(addresses).length > 0 ? addresses : undefined,
        profilePictureUrl,
        status: "waiting_list",
        isActive: false,
        influencerInfo: {
          influencerSince: influencerSinceStr,
          influencerType,
          workType,
          maritalStatus,
          children,
          pets,
          genre: Array.isArray(genre) ? genre : genre ? [genre] : undefined,
          influencerTypeOrGenreOtherDescription,
        },
      });
    } else if (role === "vendor") {
      // --- Register new Vendor ---
      const {
        password,
        dateOfBirth,
        spokenLanguages,
        businessName,
        description,
        experience,
        availability,
        servicesOffered,
        serviceAreas,
        gstNumber,
        panNumber,
        businessRegistrationNumber,
        // Address fields
        streetAddress,
        city,
        state,
        pinCode,
        country,
        latitude,
        longitude,
      } = req.body;

      if (!password) {
        return errorResponse(res, "Password is required", 400);
      }

      // Upload profile image to file storage microservice
      let profilePictureUrl: string | undefined;
      if (profileImage) {
        try {
          profilePictureUrl = await fileStorageService.uploadFile(
            profileImage,
            "profile_images",
          );
        } catch (error: any) {
          console.error("Profile image upload failed:", error.message);
          return errorResponse(
            res,
            `Profile image upload failed: ${error.message}`,
            500,
          );
        }
      }

      // Build addresses object
      const addresses: any = {};
      if (streetAddress) addresses.streetAddress = streetAddress;
      if (city) addresses.city = city;
      if (state) addresses.state = state;
      if (pinCode) addresses.pinCode = pinCode;
      if (country) addresses.country = country;
      if (latitude) addresses.latitude = latitude;
      if (longitude) addresses.longitude = longitude;

      // Parse serviceAreas - handle both array and string formats
      let parsedServiceAreas: any[] = [];
      if (serviceAreas) {
        console.log("📥 Raw serviceAreas received:", serviceAreas);
        console.log("📥 serviceAreas type:", typeof serviceAreas);
        console.log("📥 serviceAreas isArray:", Array.isArray(serviceAreas));

        try {
          if (typeof serviceAreas === "string") {
            // Try to parse as JSON string
            console.log("📥 Parsing serviceAreas as JSON string...");
            parsedServiceAreas = JSON.parse(serviceAreas);
          } else if (Array.isArray(serviceAreas)) {
            // Already an array
            console.log("📥 serviceAreas is already an array");
            parsedServiceAreas = serviceAreas;
          } else {
            console.error(
              "❌ serviceAreas is neither string nor array:",
              typeof serviceAreas,
            );
          }

          // Validate that parsedServiceAreas is an array
          if (!Array.isArray(parsedServiceAreas)) {
            console.error(
              "❌ serviceAreas is not an array after parsing:",
              typeof parsedServiceAreas,
            );
            parsedServiceAreas = [];
          }

          // Validate and normalize each service area
          parsedServiceAreas = parsedServiceAreas
            .map((area: any) => {
              // Ensure all required fields are present and correct types
              return {
                city: String(area.city || ""),
                state: area.state ? String(area.state) : undefined,
                country: area.country ? String(area.country) : undefined,
                latitude:
                  typeof area.latitude === "number"
                    ? area.latitude
                    : parseFloat(area.latitude) || 0,
                longitude:
                  typeof area.longitude === "number"
                    ? area.longitude
                    : parseFloat(area.longitude) || 0,
                radius:
                  typeof area.radius === "number"
                    ? area.radius
                    : parseInt(area.radius) || 0,
              };
            })
            .filter((area: any) => {
              // Filter out invalid entries
              return (
                area.city &&
                area.latitude !== 0 &&
                area.longitude !== 0 &&
                area.radius > 0
              );
            });

          console.log(
            "✅ Parsed and validated serviceAreas:",
            JSON.stringify(parsedServiceAreas, null, 2),
          );
        } catch (e: any) {
          console.error("❌ Failed to parse serviceAreas:", e.message);
          console.error("❌ serviceAreas value:", serviceAreas);
          console.error("❌ serviceAreas type:", typeof serviceAreas);
          parsedServiceAreas = [];
        }
      }

      // Build vendorInfo object
      const vendorInfo: any = {
        businessName: businessName || undefined,
        description: description || undefined,
        experience: experience ? parseInt(experience) : undefined,
        availability: availability || undefined,
        servicesOffered: servicesOffered
          ? Array.isArray(servicesOffered)
            ? servicesOffered
            : JSON.parse(servicesOffered)
          : [],
        serviceAreas: parsedServiceAreas, // Array of {city, state, country, latitude, longitude, radius}
        vendorSince: new Date().getFullYear().toString(),
        rating: 0,
        totalReviews: 0,
        completedProjects: 0,
        isVerified: false,
      };

      // Add optional fields
      if (gstNumber) vendorInfo.gstNumber = gstNumber;
      if (panNumber) vendorInfo.panNumber = panNumber;
      if (businessRegistrationNumber)
        vendorInfo.businessRegistrationNumber = businessRegistrationNumber;

      newUser = new User({
        name,
        email,
        phone,
        phoneCode,
        apple_user_id: apple_user_id || undefined,
        password,
        role: "vendor",
        dateOfBirth,
        spokenLanguages: spokenLanguages
          ? Array.isArray(spokenLanguages)
            ? spokenLanguages
            : JSON.parse(spokenLanguages)
          : [],
        profilePictureUrl,
        status: "waiting_list",
        isActive: false,
        addresses: Object.keys(addresses).length > 0 ? addresses : undefined,
        vendorInfo: Object.keys(vendorInfo).length > 0 ? vendorInfo : undefined,
      });
    } else {
      // For Brand
      const { password, businessName, description, websiteUrl } = req.body;
      const logo = files?.logo?.[0];
      const banner = files?.banner?.[0];

      if (!email || !isProfessionalEmail(email)) {
        return errorResponse(res, PROFESSIONAL_EMAIL_ERROR, 400);
      }

      if (!password) {
        return errorResponse(res, "Password is required", 400);
      }

      // Upload images to file storage microservice
      let profilePictureUrl: string | undefined;
      let logoUrl: string | undefined;
      let bannerUrl: string | undefined;

      try {
        if (profileImage) {
          profilePictureUrl = await fileStorageService.uploadFile(
            profileImage,
            "profile_images",
          );
        }
        if (logo) {
          logoUrl = await fileStorageService.uploadFile(logo, "business_logos");
        }
        if (banner) {
          bannerUrl = await fileStorageService.uploadFile(
            banner,
            "business_banners",
          );
        }
      } catch (error: any) {
        console.error("File upload failed:", error.message);
        return errorResponse(res, `File upload failed: ${error.message}`, 500);
      }

      newUser = new User({
        name,
        email,
        phone,
        phoneCode,
        google_user_id: google_user_id || undefined,
        apple_user_id: apple_user_id || undefined,
        password,
        role: "brand",
        profilePictureUrl,
        status: "waiting_list",
        isActive: false,
        businessInfo: {
          businessName: businessName,
          description: description,
          websiteUrl: websiteUrl,
          businessEmail: email,
          logoUrl,
          bannerUrl,
        },
      });
    }

    addFcmTokenToUser(newUser as any, fcmTokenRegister);
    await newUser.save();

    // Send account created email
    if (newUser.email) {
      sendAccountCreatedEmail(newUser.email, newUser.name).catch((err) =>
        console.error("Failed to send welcome email:", err),
      );
    }

    const token = generateToken(newUser._id.toString(), newUser.role, {
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
    });

    return successResponse(res, "Registration successful!", {
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error("Registration Error:", error);
    return errorResponse(
      res,
      error.message || "Server error during registration.",
      500,
    );
  }
};

/**
 * @desc    Check if user exists by email or phone
 * @route   POST /api/user/check_user_exists (also available at /api/auth/check_user_exists)
 * @access  Public
 */
export const checkUserExists = async (req: Request, res: Response) => {
  try {
    console.log("📥 checkUserExists - Request body:", req.body);
    console.log(
      "📥 checkUserExists - Content-Type:",
      req.headers["content-type"],
    );

    // Handle both JSON and FormData (multipart/form-data sends undefined req.body)
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("❌ checkUserExists - req.body is empty or undefined");
      console.error(
        "❌ This usually means multipart/form-data was sent but not parsed",
      );
      return errorResponse(
        res,
        "Request body is empty. Please send data as JSON with Content-Type: application/json",
        400,
      );
    }

    const { email, phone, phoneCode, apple_user_id, google_user_id } = req.body;

    console.log("📥 checkUserExists - Parsed values:", {
      email,
      phone,
      phoneCode,
      apple_user_id,
      google_user_id,
    });

    if (!email && !phone && !apple_user_id && !google_user_id) {
      return errorResponse(
        res,
        "Please provide email, phone number, Apple ID, or Google ID.",
        400,
      );
    }

    const queryConditions = [];
    if (email) {
      queryConditions.push({ email: email });
    }
    if (apple_user_id) {
      queryConditions.push({ apple_user_id: apple_user_id });
    }
    if (google_user_id) {
      queryConditions.push({ google_user_id: google_user_id });
    }
    if (phone) {
      // Normalize phoneCode to handle both string and number
      let normalizedPhoneCode: string | number | undefined = phoneCode;
      if (phoneCode !== undefined && phoneCode !== null) {
        // Convert to string for consistent matching
        normalizedPhoneCode = String(phoneCode).trim();
      }

      // Build full international number: DB may store "+919024653155" while request sends phone "9024653155" + phoneCode "+91"
      const normalizedPhone = String(phone).trim();
      const fullPhoneWithCode =
        normalizedPhoneCode && String(normalizedPhoneCode).trim()
          ? (String(normalizedPhoneCode).trim().startsWith("+")
              ? String(normalizedPhoneCode).trim()
              : "+" + String(normalizedPhoneCode).trim()) + normalizedPhone
          : null;

      if (normalizedPhoneCode) {
        // Match by full international number (e.g. "+919024653155") — how many DB records store it
        if (fullPhoneWithCode) {
          queryConditions.push({ phone: fullPhoneWithCode });
        }
        // Use $and to properly combine phone with phoneCode conditions (for records that store local number + phoneCode)
        queryConditions.push({
          $and: [
            { phone: normalizedPhone },
            {
              $or: [
                { phoneCode: normalizedPhoneCode }, // String match
                { phoneCode: Number(normalizedPhoneCode) }, // Number match (in case DB has it as number)
                { phoneCode: { $exists: false } }, // Legacy users without phoneCode
                { phoneCode: null }, // Legacy users with null phoneCode
              ],
            },
          ],
        });
      } else {
        // If no phoneCode provided, match phone (local or full)
        queryConditions.push({ phone: normalizedPhone });
        if (fullPhoneWithCode)
          queryConditions.push({ phone: fullPhoneWithCode });
      }
    }

    console.log(
      "🔍 checkUserExists - Query conditions:",
      JSON.stringify(queryConditions, null, 2),
    );

    // Execute the query
    let user = await User.findOne({ $or: queryConditions });

    // Additional fallback: If phoneCode was provided and no user found,
    // try matching phone first (local or full international), then verify phoneCode manually
    if (!user && phone && phoneCode) {
      const normalizedPhoneCode = String(phoneCode).trim();
      const fallbackFullPhone =
        (normalizedPhoneCode.startsWith("+")
          ? normalizedPhoneCode
          : "+" + normalizedPhoneCode) + String(phone).trim();
      console.log(
        "🔍 checkUserExists - Fallback: Trying phone match first, then verifying phoneCode...",
      );

      // Find user by phone (local number or full international)
      user = await User.findOne({
        $or: [{ phone: String(phone).trim() }, { phone: fallbackFullPhone }],
      });

      if (user) {
        const matchedByFullInternational =
          user.phone === fallbackFullPhone ||
          (user.phone && user.phone.replace(/\s/g, "") === fallbackFullPhone);
        // If we found by full international number, request phoneCode is already encoded in the match — accept (handles legacy users without phoneCode)
        if (matchedByFullInternational && !user.phoneCode) {
          console.log(
            `✅ checkUserExists - Matched by full international phone; no phoneCode in DB (legacy), accepting`,
          );
        } else if (!matchedByFullInternational) {
          console.log(
            `🔍 checkUserExists - Found user with phone match. User phoneCode: ${user.phoneCode} (type: ${typeof user.phoneCode}), Request phoneCode: ${phoneCode} (type: ${typeof phoneCode})`,
          );

          // Normalize both values for comparison
          const userPhoneCode = user.phoneCode
            ? String(user.phoneCode).trim()
            : null;
          const requestPhoneCode = normalizedPhoneCode;

          // Check if phoneCode matches (with type normalization)
          if (userPhoneCode !== requestPhoneCode) {
            // Try number comparison as well
            const userPhoneCodeNum = user.phoneCode
              ? Number(user.phoneCode)
              : null;
            const requestPhoneCodeNum = Number(requestPhoneCode);

            if (userPhoneCodeNum !== requestPhoneCodeNum) {
              console.log(
                `⚠️ checkUserExists - Phone matches but phoneCode doesn't: DB has "${userPhoneCode}" but request has "${requestPhoneCode}"`,
              );
              user = null; // Don't return user if phoneCode doesn't match
            } else {
              console.log(
                `✅ checkUserExists - PhoneCode matches after number conversion`,
              );
            }
          } else {
            console.log(`✅ checkUserExists - PhoneCode matches`);
          }
        }
      }
    }

    console.log(
      "🔍 checkUserExists - User found:",
      user ? `Yes (${user.name}, ${user.phone}, ${user.phoneCode})` : "No",
    );

    // If user found without phoneCode, update it with the provided phoneCode
    if (user && phoneCode && !user.phoneCode) {
      console.log("📝 Updating legacy user with phoneCode:", phoneCode);
      // Use updateOne to bypass validation and only update phoneCode field
      await User.updateOne(
        { _id: user._id },
        { $set: { phoneCode: phoneCode } },
      );
      console.log("✅ User phoneCode updated successfully");
    }

    return successResponse(res, "User check completed", {
      exists: !!user,
      user: user
        ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            phoneCode: user.phoneCode,
            apple_user_id: user.apple_user_id,
            role: user.role,
            profilePictureUrl: user.profilePictureUrl,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Check User Exists Error:", error);
    return errorResponse(
      res,
      error.message || "Server error during user check.",
      500,
    );
  }
};

/**
 * @desc    Authenticate a user and get token
 * @route   POST /api/user/login (also available at /api/auth/login)
 * @access  Public
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    console.log("📥 loginUser - Request body:", req.body);
    console.log("📥 loginUser - Content-Type:", req.headers["content-type"]);
    console.log(
      "📥 loginUser - Request headers:",
      JSON.stringify(req.headers, null, 2),
    );

    // Handle both JSON and FormData
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("❌ loginUser - req.body is empty or undefined");
      console.error("❌ loginUser - req.body type:", typeof req.body);
      console.error(
        "❌ loginUser - req.body keys:",
        Object.keys(req.body || {}),
      );
      return errorResponse(
        res,
        "Request body is empty. Please send data as JSON with Content-Type: application/json",
        400,
      );
    }

    const {
      email,
      phone,
      phoneCode,
      password,
      apple_user_id,
      google_user_id,
      fcmToken,
      fcm_token,
    } = req.body;
    const fcmTokenLogin = fcmToken ?? fcm_token;

    console.log("📥 loginUser - Parsed values:", {
      email,
      phone,
      phoneCode,
      apple_user_id,
      google_user_id,
      password: password,
    });

    if (!email && !phone && !apple_user_id && !google_user_id) {
      return errorResponse(
        res,
        "Please provide email, phone number, Apple ID, or Google ID.",
        400,
      );
    }

    // Apple Sign-In: if only apple_user_id is provided, find user and log in without password
    if (apple_user_id && !email && !phone) {
      const userByAppleId = await User.findOne({ apple_user_id });
      if (userByAppleId) {
        if (!userByAppleId.isActive) {
          return errorResponse(res, "Your account is deactivated.", 403);
        }
        const token = generateToken(
          userByAppleId._id.toString(),
          userByAppleId.role,
          {
            email: userByAppleId.email,
            name: userByAppleId.name,
            phone: userByAppleId.phone,
          },
        );
        const deviceInfo = req.headers["user-agent"] || "Unknown Device";
        const ipAddress =
          req.ip ||
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          "Unknown";
        const newSession = {
          token,
          deviceInfo: String(deviceInfo).substring(0, 200),
          ipAddress: String(ipAddress),
          userAgent: String(deviceInfo),
          lastActivity: new Date(),
          createdAt: new Date(),
        };
        if (!(userByAppleId as any).activeSessions)
          (userByAppleId as any).activeSessions = [];
        (userByAppleId as any).activeSessions = (
          userByAppleId as any
        ).activeSessions.filter((s: any) => s.token !== token);
        (userByAppleId as any).activeSessions.push(newSession);
        if ((userByAppleId as any).activeSessions.length > 10) {
          (userByAppleId as any).activeSessions = (
            userByAppleId as any
          ).activeSessions
            .sort(
              (a: any, b: any) =>
                new Date(b.lastActivity).getTime() -
                new Date(a.lastActivity).getTime(),
            )
            .slice(0, 10);
        }
        addFcmTokenToUser(userByAppleId as any, fcmTokenLogin);
        await userByAppleId.save();
        return successResponse(res, "Login successful!", {
          token,
          user: userByAppleId,
        });
      }
      return errorResponse(res, "User not found with this Apple ID.", 404);
    }

    // Google Sign-In: if only google_user_id is provided, find user and log in without password
    if (google_user_id && !email && !phone) {
      const userByGoogleId = await User.findOne({ google_user_id });
      if (userByGoogleId) {
        if (!userByGoogleId.isActive) {
          return errorResponse(res, "Your account is deactivated.", 403);
        }
        const token = generateToken(
          userByGoogleId._id.toString(),
          userByGoogleId.role,
          {
            email: userByGoogleId.email,
            name: userByGoogleId.name,
            phone: userByGoogleId.phone,
          },
        );
        const deviceInfo = req.headers["user-agent"] || "Unknown Device";
        const ipAddress =
          req.ip ||
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          "Unknown";
        const newSession = {
          token,
          deviceInfo: String(deviceInfo).substring(0, 200),
          ipAddress: String(ipAddress),
          userAgent: String(deviceInfo),
          lastActivity: new Date(),
          createdAt: new Date(),
        };
        if (!(userByGoogleId as any).activeSessions)
          (userByGoogleId as any).activeSessions = [];
        (userByGoogleId as any).activeSessions = (
          userByGoogleId as any
        ).activeSessions.filter((s: any) => s.token !== token);
        (userByGoogleId as any).activeSessions.push(newSession);
        if ((userByGoogleId as any).activeSessions.length > 10) {
          (userByGoogleId as any).activeSessions = (
            userByGoogleId as any
          ).activeSessions
            .sort(
              (a: any, b: any) =>
                new Date(b.lastActivity).getTime() -
                new Date(a.lastActivity).getTime(),
            )
            .slice(0, 10);
        }
        addFcmTokenToUser(userByGoogleId as any, fcmTokenLogin);
        await userByGoogleId.save();
        return successResponse(res, "Login successful!", {
          token,
          user: userByGoogleId,
        });
      }
      return errorResponse(res, "User not found with this Google ID.", 404);
    }

    // Password validation:
    // - Influencers: Password optional (OTP / OAuth)
    // - Vendors: Password optional (OTP / OAuth, including Google OAuth with email only)
    // - Brands: Password always required (web app)

    // Validate phoneCode is provided with phone number
    // If phoneCode is missing, default to "+91" (India) for backward compatibility
    let normalizedPhoneCode = phoneCode;
    if (
      phone &&
      (!phoneCode || (typeof phoneCode === "string" && phoneCode.trim() === ""))
    ) {
      console.warn(
        '⚠️ loginUser - Phone provided but phoneCode is missing or empty. Defaulting to "+91"',
      );
      normalizedPhoneCode = "+91";
    }

    const queryConditions = [];
    if (email) {
      queryConditions.push({ email: email });
    }
    if (apple_user_id) {
      queryConditions.push({ apple_user_id });
    }
    if (google_user_id) {
      queryConditions.push({ google_user_id });
    }
    if (phone) {
      // Normalize phoneCode for query - remove + prefix and handle both string and number
      let normalizedPhoneCodeForQuery: string;
      if (normalizedPhoneCode !== undefined && normalizedPhoneCode !== null) {
        // Convert to string, remove + prefix if present
        normalizedPhoneCodeForQuery = String(normalizedPhoneCode)
          .trim()
          .replace(/^\+/, "");
      } else {
        normalizedPhoneCodeForQuery = "91"; // Default to India
      }

      // Build full international number: DB may store "+919024653155" while request sends phone "9024653155" + phoneCode "+91"
      const normalizedPhone = String(phone).trim();
      const fullPhoneWithCode =
        (normalizedPhoneCodeForQuery
          ? String(normalizedPhoneCode).trim().startsWith("+")
            ? String(normalizedPhoneCode).trim()
            : "+" + normalizedPhoneCodeForQuery
          : "+91") + normalizedPhone;

      // Match by full international number (how many DB records store it)
      queryConditions.push({ phone: fullPhoneWithCode });

      // Use $and to properly combine phone with phoneCode conditions (for records that store local number + phoneCode)
      queryConditions.push({
        $and: [
          { phone: normalizedPhone },
          {
            $or: [
              { phoneCode: normalizedPhoneCodeForQuery }, // String match (without +)
              { phoneCode: `+${normalizedPhoneCodeForQuery}` }, // String match (with +)
              { phoneCode: Number(normalizedPhoneCodeForQuery) }, // Number match (in case DB has it as number)
              { phoneCode: { $exists: false } }, // Legacy users without phoneCode
              { phoneCode: null }, // Legacy users with null phoneCode
            ],
          },
        ],
      });
    }

    console.log(
      "🔍 loginUser - Query conditions:",
      JSON.stringify(queryConditions, null, 2),
    );

    // Execute the query
    let user = await User.findOne({ $or: queryConditions });

    // Additional fallback: If phoneCode was provided and no user found,
    // try matching phone first (local or full international), then verify phoneCode manually
    if (!user && phone && normalizedPhoneCode) {
      const fallbackPhoneCodeStr = String(normalizedPhoneCode).trim();
      const fallbackFullPhone =
        (fallbackPhoneCodeStr.startsWith("+")
          ? fallbackPhoneCodeStr
          : "+" + fallbackPhoneCodeStr) + String(phone).trim();
      console.log(
        "🔍 loginUser - Fallback: Trying phone match first, then verifying phoneCode...",
      );

      // Find user by phone (local number or full international)
      user = await User.findOne({
        $or: [{ phone: String(phone).trim() }, { phone: fallbackFullPhone }],
      });

      if (user) {
        const matchedByFullInternational =
          user.phone === fallbackFullPhone ||
          (user.phone && user.phone.replace(/\s/g, "") === fallbackFullPhone);
        if (matchedByFullInternational && !user.phoneCode) {
          console.log(
            `✅ loginUser - Matched by full international phone; no phoneCode in DB (legacy), accepting`,
          );
        } else if (!matchedByFullInternational) {
          console.log(
            `🔍 loginUser - Found user with phone match. User phoneCode: ${user.phoneCode} (type: ${typeof user.phoneCode}), Request phoneCode: ${phoneCode} (type: ${typeof phoneCode})`,
          );

          const userPhoneCode = user.phoneCode
            ? String(user.phoneCode).trim()
            : null;
          const requestPhoneCode = fallbackPhoneCodeStr;

          if (userPhoneCode !== requestPhoneCode) {
            const userPhoneCodeNum = user.phoneCode
              ? Number(user.phoneCode)
              : null;
            const requestPhoneCodeNum = Number(requestPhoneCode);

            if (userPhoneCodeNum !== requestPhoneCodeNum) {
              console.log(
                `⚠️ loginUser - Phone matches but phoneCode doesn't: DB has "${userPhoneCode}" but request has "${requestPhoneCode}"`,
              );
              user = null;
            } else {
              console.log(
                `✅ loginUser - PhoneCode matches after number conversion`,
              );
            }
          } else {
            console.log(`✅ loginUser - PhoneCode matches`);
          }
        }
      }
    }

    if (!user) {
      console.log("❌ loginUser - User not found with provided credentials");
      return errorResponse(
        res,
        "User not found with this email or phone number.",
        404,
      );
    }

    console.log(
      "✅ loginUser - User found:",
      user.name,
      user.phone,
      user.phoneCode,
    );

    // If user found without phoneCode, update it
    if (user && phoneCode && !user.phoneCode) {
      console.log(
        "📝 loginUser - Updating legacy user with phoneCode:",
        phoneCode,
      );
      // Use updateOne to bypass validation and only update phoneCode field
      await User.updateOne(
        { _id: user._id },
        { $set: { phoneCode: phoneCode } },
      );
      console.log("✅ loginUser - User phoneCode updated successfully");
    }

    // Password validation: if provided, verify it; otherwise allow login (no password required for any role)
    if (password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return errorResponse(res, "Invalid credentials.", 401);
      }
    }

    if (!user.isActive) {
      return errorResponse(res, "Your account is deactivated.", 403);
    }

    const token = generateToken(user._id.toString(), user.role, {
      email: user.email,
      name: user.name,
      phone: user.phone,
    });

    // Create and save session
    const deviceInfo = req.headers["user-agent"] || "Unknown Device";
    const ipAddress =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "Unknown";

    const newSession = {
      token: token,
      deviceInfo: String(deviceInfo).substring(0, 200), // Limit length
      ipAddress: String(ipAddress),
      userAgent: String(deviceInfo),
      lastActivity: new Date(),
      createdAt: new Date(),
    };

    // Initialize activeSessions if it doesn't exist
    if (!(user as any).activeSessions) {
      (user as any).activeSessions = [];
    }

    // Remove old sessions with the same token (if any) and add new one
    (user as any).activeSessions = (user as any).activeSessions.filter(
      (s: any) => s.token !== token,
    );
    (user as any).activeSessions.push(newSession);

    // Keep only last 10 sessions to prevent array from growing too large
    if ((user as any).activeSessions.length > 10) {
      (user as any).activeSessions = (user as any).activeSessions
        .sort(
          (a: any, b: any) =>
            new Date(b.lastActivity).getTime() -
            new Date(a.lastActivity).getTime(),
        )
        .slice(0, 10);
    }

    addFcmTokenToUser(user as any, fcmTokenLogin);
    await user.save();

    return successResponse(res, "Login successful!", {
      token: token,
      user: user,
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return errorResponse(
      res,
      error.message || "Server error during login.",
      500,
    );
  }
};

/**
 * @desc    Get current user's profile
 * @route   GET /api/user/profile
 * @access  Private
 */
export const getProfile = async (req: Request, res: Response) => {
  // The user object is attached to req by the `authenticate` middleware
  if (req.user) {
    return successResponse(res, "Profile fetched successfully!", req.user);
  } else {
    return errorResponse(res, "User not found.", 404);
  }
};

/**
 * @desc    Get user profile by ID
 * @route   GET /api/user/:id
 * @access  Public (or authenticated if needed)
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "User ID is required", 400);
    }

    const user = await User.findById(id)
      .select("-password") // Exclude password
      .lean();

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "User profile fetched successfully", user);
  } catch (error: unknown) {
    console.error("Get user by ID error:", error);
    if (error instanceof Error) {
      return errorResponse(res, error.message, 500);
    }
    return errorResponse(res, "Failed to fetch user profile", 500);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return errorResponse(res, "User not found", 404);

    if (
      user.role === "brand" &&
      req.body.email !== undefined &&
      !isProfessionalEmail(req.body.email)
    ) {
      return errorResponse(res, PROFESSIONAL_EMAIL_ERROR, 400);
    }

    console.log("=== UPDATE PROFILE REQUEST ===");
    console.log("User ID:", req.user?._id);
    console.log("User Role:", user.role);
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const logo = files?.logo?.[0];
    const banner = files?.banner?.[0];
    const profileImage = files?.profileImage?.[0];

    // 🧩 Update general fields
    applyAllowedUpdates(user, req.body, [
      "name",
      "email",
      "phone",
      "phoneCode",
      "dateOfBirth",
      "spokenLanguages",
      "country",
    ]);

    // Validate phoneCode is provided with phone number on update
    if (
      req.body.phone !== undefined &&
      !req.body.phoneCode &&
      !user.phoneCode
    ) {
      return errorResponse(
        res,
        "Phone code is required when updating phone number",
        400,
      );
    }

    // Update address fields from flat structure
    if (!user.addresses) user.addresses = {} as any;
    if (req.body.streetAddress !== undefined)
      user.addresses!.streetAddress = req.body.streetAddress;
    if (req.body.city !== undefined) user.addresses!.city = req.body.city;
    if (req.body.state !== undefined) user.addresses!.state = req.body.state;
    if (req.body.country !== undefined)
      user.addresses!.country = req.body.country;
    if (req.body.pinCode !== undefined)
      user.addresses!.pinCode = req.body.pinCode;
    if (req.body.latitude !== undefined)
      user.addresses!.latitude = req.body.latitude;
    if (req.body.longitude !== undefined)
      user.addresses!.longitude = req.body.longitude;

    // Showcase replace (optional) - supports both new `showcase` and legacy `media` fields
    if (Array.isArray(req.body.showcase)) {
      (user as any).showcase = req.body.showcase;
    }

    // Legacy `media` field support - convert simple string array to showcase format
    if (Array.isArray(req.body.media)) {
      console.log("📸 MEDIA UPDATE DETECTED");
      console.log("📸 Received media array:", JSON.stringify(req.body.media));
      console.log("📸 Current user showcase:", JSON.stringify(user.showcase));
      console.log(
        "📸 Current user media:",
        JSON.stringify((user as any).media),
      );

      (user as any).media = req.body.media; // Keep legacy field updated
      user.markModified("media"); // CRITICAL: Mark field as modified for Mongoose
      console.log(
        "📸 Updated user.media to:",
        JSON.stringify((user as any).media),
      );

      // Always convert to showcase format (don't check if empty, always sync)
      (user as any).showcase = req.body.media.map((url: string) => ({
        mediaType: url.match(/\.(mp4|mov|avi|webm)$/i) ? "video" : "image",
        url: url,
        source: "upload",
        addedAt: new Date(),
      }));
      user.markModified("showcase"); // CRITICAL: Mark field as modified for Mongoose
      console.log(
        "📸 Converted to showcase format:",
        JSON.stringify((user as any).showcase),
      );
    }

    // Profile picture: use URL from body (e.g. from /api/file/upload) or upload file
    if (
      req.body.profilePictureUrl &&
      typeof req.body.profilePictureUrl === "string"
    ) {
      user.profilePictureUrl = req.body.profilePictureUrl.trim();
    } else if (profileImage) {
      try {
        user.profilePictureUrl = await fileStorageService.uploadFile(
          profileImage,
          "profile_images",
        );
      } catch (error: any) {
        console.error("Profile image upload failed:", error.message);
        return errorResponse(
          res,
          `Profile image upload failed: ${error.message}`,
          500,
        );
      }
    }

    // 🧠 Role-specific logic
    if (user.role === "influencer") {
      if (!user.influencerInfo) user.influencerInfo = {};
      applyAllowedUpdates(user.influencerInfo, req.body, [
        "influencerSince",
        "influencerType",
        "workType",
        "maritalStatus",
        "children",
        "pets",
        "genre",
        "showOnTop",
        "influencerDescription",
      ]);
      if (req.body.socialMedia) {
        console.log("📱 SOCIAL MEDIA UPDATE RECEIVED");
        console.log(
          "📱 Received socialMedia data:",
          JSON.stringify(req.body.socialMedia, null, 2),
        );
        console.log(
          "📱 Previous socialMedia:",
          JSON.stringify(user.influencerInfo.socialMedia, null, 2),
        );

        // 🛡️ Preserve tokens logic: Merge new data with existing tokens
        const currentSocialMedia = user.influencerInfo.socialMedia || [];
        const newSocialMedia = req.body.socialMedia;

        // Use Promise.all to handle async token exchange for all accounts parallelly
        const mergedSocialMedia = await Promise.all(
          newSocialMedia.map(async (newAccount: any) => {
            const existingAccount = currentSocialMedia.find(
              (acc: any) => acc.platform === newAccount.platform,
            );

            const isInstagram = newAccount.platform === "instagram";
            const isPlaceholderInstagramUsername =
              typeof newAccount.username === "string" &&
              ["instagram_user", "instagram", "user"].includes(
                newAccount.username.trim().toLowerCase(),
              );

            let resolvedInstagramProfile: {
              instagramId?: string | null;
              instagramHandle?: string | null;
              instagramName?: string | null;
              followersCount?: number | null;
              followsCount?: number | null;
              pageAccessToken?: string | null;
            } | null = null;

            // If it's a new Instagram connection (or token changed), try to exchange for long-lived token
            if (isInstagram && newAccount.accessToken) {
              // If token is different from what we have (or we didn't have one)
              const isNewToken =
                !existingAccount ||
                existingAccount.accessToken !== newAccount.accessToken;

              if (isNewToken) {
                console.log(
                  "🔄 New Instagram token detected. Attempting exchange for long-lived token (Facebook)...",
                );
                // Our OAuth is Facebook Login; use Facebook exchange for 60-day token
                const exchangeResult =
                  (await instagramService.exchangeFacebookTokenForLongLived(
                    newAccount.accessToken,
                  )) ||
                  (await instagramService.exchangeForLongLivedToken(
                    newAccount.accessToken,
                  ));

                if (exchangeResult) {
                  console.log(
                    "✅ Token exchanged successfully! Expires:",
                    exchangeResult.expiresAt,
                  );
                  newAccount.accessToken = exchangeResult.accessToken;
                  newAccount.tokenExpiresAt = exchangeResult.expiresAt;
                  newAccount.isValid = true; // Mark as valid
                } else {
                  console.log(
                    "⚠️ Token exchange failed or skipped. Using provided token (likely short-lived).",
                  );
                }
              }

              // Always resolve latest Instagram profile/stats from Meta instead of trusting frontend placeholders.
              try {
                const linkedAccounts =
                  await instagramService.getPagesWithLinkedInstagramDetails(
                    newAccount.accessToken,
                  );
                const firstLinked = linkedAccounts[0] as
                  | {
                      instagramId?: string | null;
                      instagramHandle?: string | null;
                      instagramName?: string | null;
                      followers?: number | null;
                      pageAccessToken?: string | null;
                    }
                  | undefined;

                if (firstLinked?.instagramId) {
                  let liveStats: {
                    username?: string | null;
                    followersCount?: number | null;
                    followsCount?: number | null;
                  } | null = null;

                  if (firstLinked.pageAccessToken) {
                    try {
                      liveStats = await instagramService.getInstagramStats(
                        firstLinked.instagramId,
                        firstLinked.pageAccessToken,
                      );
                    } catch (statsErr: unknown) {
                      console.warn(
                        "⚠️ Could not fetch live Instagram stats from Graph API:",
                        statsErr,
                      );
                    }
                  }

                  resolvedInstagramProfile = {
                    instagramId: firstLinked.instagramId,
                    instagramHandle:
                      liveStats?.username ||
                      firstLinked.instagramHandle ||
                      null,
                    instagramName: firstLinked.instagramName || null,
                    followersCount:
                      liveStats?.followersCount ??
                      firstLinked.followers ??
                      null,
                    followsCount: liveStats?.followsCount ?? null,
                    pageAccessToken: firstLinked.pageAccessToken || null,
                  };
                }
              } catch (profileResolveErr: unknown) {
                console.warn(
                  "⚠️ Failed to resolve Instagram profile from Meta; keeping fallback values:",
                  profileResolveErr,
                );
              }
            }

            const existingBoughtFollowers =
              existingAccount?.followers &&
              typeof existingAccount.followers === "object" &&
              typeof existingAccount.followers.bought === "number"
                ? existingAccount.followers.bought
                : 0;

            const normalizedInstagramFollowers =
              resolvedInstagramProfile?.followersCount != null
                ? {
                    actual: resolvedInstagramProfile.followersCount,
                    bought: existingBoughtFollowers,
                  }
                : undefined;

            const normalizedInstagramAccount = isInstagram
              ? {
                  ...newAccount,
                  instagramId:
                    resolvedInstagramProfile?.instagramId ||
                    newAccount.instagramId ||
                    (existingAccount as any)?.instagramId,
                  username:
                    resolvedInstagramProfile?.instagramHandle ||
                    (!isPlaceholderInstagramUsername
                      ? newAccount.username
                      : existingAccount?.username),
                  url: resolvedInstagramProfile?.instagramHandle
                    ? `https://www.instagram.com/${resolvedInstagramProfile.instagramHandle}`
                    : newAccount.url || existingAccount?.url,
                  followers:
                    normalizedInstagramFollowers ||
                    existingAccount?.followers ||
                    newAccount.followers,
                  following:
                    resolvedInstagramProfile?.followsCount ??
                    newAccount.following ??
                    existingAccount?.following,
                }
              : newAccount;

            // If we have an existing account for this platform, preserve its sensitive token data
            // unless the new data explicitly provides NEW tokens
            if (existingAccount) {
              return {
                ...normalizedInstagramAccount,
                // Preserve these fields if not present (or if we didn't just update them above)
                accessToken:
                  normalizedInstagramAccount.accessToken ||
                  existingAccount.accessToken,
                refreshToken:
                  normalizedInstagramAccount.refreshToken ||
                  existingAccount.refreshToken,
                tokenExpiresAt:
                  normalizedInstagramAccount.tokenExpiresAt ||
                  existingAccount.tokenExpiresAt,
                tokenScopes:
                  normalizedInstagramAccount.tokenScopes ||
                  existingAccount.tokenScopes,
                // Preserve metrics/insights
                insights:
                  normalizedInstagramAccount.insights ||
                  existingAccount.insights,
                posts:
                  normalizedInstagramAccount.posts || existingAccount.posts,
              };
            }
            return normalizedInstagramAccount;
          }),
        );

        user.influencerInfo.socialMedia = mergedSocialMedia;
        user.markModified("influencerInfo.socialMedia"); // Ensure Mongoose handles the subdocument array update

        console.log(
          "📱 New socialMedia (Merged & Exchanged):",
          JSON.stringify(user.influencerInfo.socialMedia, null, 2),
        );
      }
    }

    // 🏢 Brand-specific business info (NOT for vendors - vendors use vendorInfo)
    if (user.role === "brand") {
      if (!user.businessInfo) user.businessInfo = {};
      console.log("=== UPDATING BUSINESS INFO (BRAND) ===");
      console.log(
        "Before business info update:",
        JSON.stringify(user.businessInfo, null, 2),
      );

      // Direct assignment for Mongoose subdocument fields
      if (req.body.businessName !== undefined)
        user.businessInfo.businessName = req.body.businessName;
      if (req.body.businessEmail !== undefined) {
        if (!isProfessionalEmail(req.body.businessEmail)) {
          return errorResponse(res, PROFESSIONAL_EMAIL_ERROR, 400);
        }
        user.businessInfo.businessEmail = req.body.businessEmail;
      }
      if (req.body.websiteUrl !== undefined)
        user.businessInfo.websiteUrl = req.body.websiteUrl;
      if (req.body.businessType !== undefined)
        user.businessInfo.businessType = req.body.businessType;
      if (req.body.industry !== undefined)
        user.businessInfo.industry = req.body.industry;
      if (req.body.businessSize !== undefined)
        user.businessInfo.businessSize = req.body.businessSize;
      if (req.body.businessDescription !== undefined)
        user.businessInfo.businessDescription = req.body.businessDescription;

      console.log(
        "After business info update:",
        JSON.stringify(user.businessInfo, null, 2),
      );

      // Mark businessInfo as modified for Mongoose
      user.markModified("businessInfo");

      // Upload logo and banner to file storage microservice
      try {
        if (logo) {
          user.businessInfo.logoUrl = await fileStorageService.uploadFile(
            logo,
            "business_logos",
          );
        }
        if (banner) {
          user.businessInfo.bannerUrl = await fileStorageService.uploadFile(
            banner,
            "business_banners",
          );
        }
      } catch (error: any) {
        console.error("Business file upload failed:", error.message);
        return errorResponse(res, `File upload failed: ${error.message}`, 500);
      }
    }

    // 🏪 Vendor-specific logic
    if (user.role === "vendor") {
      if (!user.vendorInfo) user.vendorInfo = {};
      console.log("=== UPDATING VENDOR INFO ===");
      console.log(
        "Before vendor info update:",
        JSON.stringify(user.vendorInfo, null, 2),
      );

      // Direct assignment for Mongoose subdocument fields
      // Handle empty strings as null/undefined
      if (req.body.vendorSince !== undefined) {
        const vendorSinceValue =
          typeof req.body.vendorSince === "string"
            ? req.body.vendorSince.trim()
            : req.body.vendorSince;
        user.vendorInfo.vendorSince =
          vendorSinceValue && vendorSinceValue !== ""
            ? vendorSinceValue
            : undefined;
        console.log(
          `📝 Setting vendorInfo.vendorSince: "${user.vendorInfo.vendorSince}"`,
        );
      }
      if (req.body.vendorType !== undefined) {
        const vendorTypeValue =
          typeof req.body.vendorType === "string"
            ? req.body.vendorType.trim()
            : req.body.vendorType;
        user.vendorInfo.vendorType =
          vendorTypeValue && vendorTypeValue !== ""
            ? vendorTypeValue
            : undefined;
        console.log(
          `📝 Setting vendorInfo.vendorType: "${user.vendorInfo.vendorType}"`,
        );
      }
      if (req.body.businessName !== undefined) {
        const businessNameValue =
          typeof req.body.businessName === "string"
            ? req.body.businessName.trim()
            : req.body.businessName;
        user.vendorInfo.businessName =
          businessNameValue && businessNameValue !== ""
            ? businessNameValue
            : undefined;
        console.log(
          `📝 Setting vendorInfo.businessName: "${user.vendorInfo.businessName}"`,
        );
      }
      if (req.body.businessRegistrationNumber !== undefined) {
        const registrationValue =
          typeof req.body.businessRegistrationNumber === "string"
            ? req.body.businessRegistrationNumber.trim()
            : req.body.businessRegistrationNumber;
        user.vendorInfo.businessRegistrationNumber =
          registrationValue && registrationValue !== ""
            ? registrationValue
            : undefined;
        console.log(
          `📝 Setting vendorInfo.businessRegistrationNumber: "${user.vendorInfo.businessRegistrationNumber}"`,
        );
      }
      if (req.body.description !== undefined) {
        const descriptionValue =
          typeof req.body.description === "string"
            ? req.body.description.trim()
            : req.body.description;
        user.vendorInfo.description =
          descriptionValue && descriptionValue !== ""
            ? descriptionValue
            : undefined;
        console.log(
          `📝 Setting vendorInfo.description: "${user.vendorInfo.description}"`,
        );
      }
      if (
        req.body.experience !== undefined &&
        req.body.experience !== null &&
        req.body.experience !== ""
      ) {
        const experienceValue =
          typeof req.body.experience === "string"
            ? req.body.experience.trim() !== ""
              ? parseInt(req.body.experience.trim(), 10)
              : undefined
            : req.body.experience;
        user.vendorInfo.experience =
          experienceValue !== undefined && !isNaN(experienceValue)
            ? experienceValue
            : undefined;
        console.log(
          `📝 Setting vendorInfo.experience: ${user.vendorInfo.experience}`,
        );
      }
      if (req.body.servicesOffered !== undefined)
        user.vendorInfo.servicesOffered = Array.isArray(
          req.body.servicesOffered,
        )
          ? req.body.servicesOffered
          : JSON.parse(req.body.servicesOffered);
      if (req.body.serviceAreas !== undefined)
        user.vendorInfo.serviceAreas = Array.isArray(req.body.serviceAreas)
          ? req.body.serviceAreas
          : JSON.parse(req.body.serviceAreas);
      if (req.body.availability !== undefined)
        user.vendorInfo.availability = req.body.availability;
      if (req.body.portfolio !== undefined)
        user.vendorInfo.portfolio = Array.isArray(req.body.portfolio)
          ? req.body.portfolio
          : JSON.parse(req.body.portfolio);
      if (req.body.certifications !== undefined)
        user.vendorInfo.certifications = Array.isArray(req.body.certifications)
          ? req.body.certifications
          : JSON.parse(req.body.certifications);

      // Mark vendorInfo as modified for Mongoose
      user.markModified("vendorInfo");
      console.log(
        "After vendor info update:",
        JSON.stringify(user.vendorInfo, null, 2),
      );
      console.log("✅ vendorInfo marked as modified");
    }

    console.log(
      "Before save - addresses:",
      JSON.stringify(user.addresses, null, 2),
    );

    // Special handling for socialMedia-only updates to bypass full validation
    const isSocialMediaOnlyUpdate =
      req.body.socialMedia && Object.keys(req.body).length === 1;

    let updatedUser;
    if (isSocialMediaOnlyUpdate && user.role === "influencer") {
      console.log(
        "📱 Detected socialMedia-only update, using updateOne to bypass validation",
      );
      // Use updateOne to avoid full document validation (user might be missing required fields like 'name')
      await User.updateOne(
        { _id: user._id },
        { $set: { "influencerInfo.socialMedia": req.body.socialMedia } },
        { runValidators: false }, // Skip validation to avoid "name required" error
      );
      // Fetch the updated user
      updatedUser = await User.findById(user._id);
    } else {
      // Normal save with full validation
      if (user.role === "vendor") {
        console.log("💾 Saving vendor user...");
        console.log(
          "   vendorInfo before save:",
          JSON.stringify(user.vendorInfo, null, 2),
        );
        console.log(
          "   vendorInfo.isModified:",
          (user.vendorInfo as any)?.isModified?.(),
        );
        console.log(
          "   Is vendorInfo marked modified?",
          user.isModified("vendorInfo"),
        );
      } else if (user.role === "brand") {
        console.log(
          "💾 Saving brand user with businessInfo:",
          JSON.stringify(user.businessInfo, null, 2),
        );
      }

      try {
        updatedUser = await user.save();
        console.log("✅ User saved successfully");
      } catch (saveError: any) {
        console.error("❌ Error saving user:", saveError);
        console.error(
          "❌ Save error details:",
          JSON.stringify(saveError, null, 2),
        );
        throw saveError;
      }
    }

    console.log(
      "After save - updated user addresses:",
      JSON.stringify(updatedUser!.addresses, null, 2),
    );
    if (updatedUser!.role === "vendor") {
      console.log(
        "🏪 After save - updated user vendorInfo:",
        JSON.stringify(updatedUser!.vendorInfo, null, 2),
      );
      // Verify the data was actually saved
      const savedVendorInfo = updatedUser!.vendorInfo;
      if (savedVendorInfo) {
        console.log("✅ Verification - vendorInfo fields saved:");
        console.log(`   - businessName: "${savedVendorInfo.businessName}"`);
        console.log(`   - vendorType: "${savedVendorInfo.vendorType}"`);
        console.log(`   - vendorSince: "${savedVendorInfo.vendorSince}"`);
        console.log(
          `   - businessRegistrationNumber: "${savedVendorInfo.businessRegistrationNumber}"`,
        );
        console.log(`   - experience: ${savedVendorInfo.experience}`);
      }
    } else if (updatedUser!.role === "brand") {
      console.log(
        "🏢 After save - updated user businessInfo:",
        JSON.stringify(updatedUser!.businessInfo, null, 2),
      );
    }

    // Log socialMedia after save for influencers
    if (updatedUser!.role === "influencer") {
      console.log(
        "📱 After save - influencerInfo.socialMedia:",
        JSON.stringify(updatedUser!.influencerInfo?.socialMedia, null, 2),
      );
    }

    // Log showcase and media after save
    console.log(
      "📸 After save - showcase:",
      JSON.stringify((updatedUser as any).showcase, null, 2),
    );
    console.log(
      "📸 After save - media:",
      JSON.stringify((updatedUser as any).media, null, 2),
    );

    return successResponse(res, "Profile updated successfully", updatedUser);
  } catch (error: any) {
    console.error("Profile Update Error:", error);
    return errorResponse(
      res,
      error.message || "Server error during profile update.",
      500,
    );
  }
};

/** Recursively updates only whitelisted fields */
function applyAllowedUpdates<T extends object>(
  target: T,
  source: any,
  allowed: string[],
) {
  console.log("applyAllowedUpdates called with allowed fields:", allowed);
  for (const key of allowed) {
    console.log(
      `Checking field '${key}':`,
      source[key],
      `(type: ${typeof source[key]})`,
    );
    if (source[key] !== undefined && source[key] !== null) {
      console.log(`  ✅ Updating ${key} to:`, source[key]);

      // For Mongoose subdocuments, we need to use .set() method or direct assignment
      if (typeof source[key] === "object" && !Array.isArray(source[key])) {
        // Handle nested objects
        if (!(target as any)[key]) {
          (target as any)[key] = {};
        }
        Object.assign((target as any)[key], source[key]);
      } else {
        // Direct assignment for primitive values
        // This works for both plain objects and Mongoose documents
        (target as any)[key] = source[key];
      }

      console.log(`  After assignment, ${key} is now:`, (target as any)[key]);
    } else {
      console.log(`  ❌ Skipping ${key} - value is undefined or null`);
    }
  }
  console.log("applyAllowedUpdates result:", JSON.stringify(target, null, 2));
}

/**
 * @desc    Get top 10 influencers
 * @route   GET /api/user/top-influencers
 * @access  Public
 */
export const getTopInfluencers = async (req: Request, res: Response) => {
  try {
    // ✅ Explicitly type the pipeline array to fix the TS error
    const pipeline: PipelineStage[] = [
      // 1. Filter for active influencers
      {
        $match: { role: "influencer", isActive: true },
      },

      // 2. Add temporary fields for total followers and average engagement
      {
        $addFields: {
          totalFollowers: { $sum: "$influencerInfo.socialMedia.followers" },
          averageEngagement: {
            $avg: "$influencerInfo.socialMedia.engagement.averagePerPost",
          },
        },
      },

      // 3. ✅ UPDATED SORT LOGIC:
      // This sort first puts all influencers with 'showOnTop: true' at the very top.
      // For all other influencers, it sorts them by followers and then by engagement.
      {
        $sort: {
          "influencerInfo.showOnTop": -1, // Sorts by true (1) vs false/null (0), descending
          totalFollowers: -1, // Then, sort by the most followers
          averageEngagement: -1, // Finally, sort by the best engagement
        },
      },

      // 4. Limit to the top 10 results overall
      { $limit: 10 },

      // 5. Exclude the password field and the temporary fields from the final result
      {
        $project: {
          password: 0,
          totalFollowers: 0,
          averageEngagement: 0,
        },
      },
    ];

    const topInfluencers = await User.aggregate(pipeline);

    return successResponse(
      res,
      "Top influencers fetched successfully",
      topInfluencers,
    );
  } catch (error: any) {
    console.error("Get Top Influencers Error:", error);
    return errorResponse(
      res,
      error.message || "Server error while fetching top influencers.",
      500,
    );
  }
};

/**
 * @desc    Get all influencers for the marketplace
 * @route   GET /api/influencers
 * @access  Public
 */
export const getAllInfluencers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filters: any = { role: "influencer", isActive: true };

    // Search by name
    if (req.query.name || req.query.search) {
      const searchTerm = req.query.name || req.query.search;
      filters.name = { $regex: searchTerm, $options: "i" };
    }

    // Filter by influencer type
    if (req.query.influencerType) {
      filters["influencerInfo.influencerType"] = {
        $regex: req.query.influencerType,
        $options: "i",
      };
    }

    // Filter by genre
    if (req.query.genre) {
      filters["influencerInfo.genre"] = { $in: [req.query.genre] };
    }

    // Filter by work type
    if (req.query.workType) {
      filters["influencerInfo.workType"] = {
        $regex: req.query.workType,
        $options: "i",
      };
    }

    // Filter by location
    if (req.query.location) {
      filters.$or = [
        { "addresses.city": { $regex: req.query.location, $options: "i" } },
        { "addresses.state": { $regex: req.query.location, $options: "i" } },
        { "addresses.country": { $regex: req.query.location, $options: "i" } },
      ];
    }

    // Filter by Instagram followers range
    if (req.query.minFollowers || req.query.maxFollowers) {
      filters["influencerInfo.socialMedia"] = {
        $elemMatch: {
          platform: "instagram",
          followers: {
            ...(req.query.minFollowers
              ? { $gte: parseInt(req.query.minFollowers as string) }
              : {}),
            ...(req.query.maxFollowers
              ? { $lte: parseInt(req.query.maxFollowers as string) }
              : {}),
          },
        },
      };
    }

    // Filter by YouTube subscribers range
    if (req.query.minSubscribers || req.query.maxSubscribers) {
      filters["influencerInfo.socialMedia"] = {
        $elemMatch: {
          platform: "youtube",
          "metrics.subscribers": {
            ...(req.query.minSubscribers
              ? { $gte: parseInt(req.query.minSubscribers as string) }
              : {}),
            ...(req.query.maxSubscribers
              ? { $lte: parseInt(req.query.maxSubscribers as string) }
              : {}),
          },
        },
      };
    }

    // Filter by marital status
    if (req.query.maritalStatus) {
      filters["influencerInfo.maritalStatus"] = {
        $regex: req.query.maritalStatus,
        $options: "i",
      };
    }

    // Filter by children count
    if (req.query.children) {
      filters["influencerInfo.children"] = parseInt(
        req.query.children as string,
      );
    }

    // Filter by pets count
    if (req.query.pets) {
      filters["influencerInfo.pets"] = parseInt(req.query.pets as string);
    }

    // Filter by country
    if (req.query.country) {
      filters["addresses.country"] = {
        $regex: req.query.country,
        $options: "i",
      };
    }

    // Filter by language
    if (req.query.language) {
      filters.spokenLanguages = { $in: [req.query.language] };
    }

    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limit);

    const influencers = await User.find(filters)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, "Influencers fetched successfully!", {
      influencers,
      pagination: {
        page,
        totalPages,
        totalUsers,
      },
    });
  } catch (error: any) {
    console.error("Get All Influencers Error:", error);
    return errorResponse(
      res,
      error.message || "Server error while fetching influencers.",
      500,
    );
  }
};

/**
 * @desc    Get all vendors for the marketplace
 * @route   GET /api/vendors
 * @access  Public
 */
export const getAllVendors = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filters: any = { role: "vendor", isActive: true };

    // Search by name
    if (req.query.name || req.query.search) {
      const searchTerm = req.query.name || req.query.search;
      filters.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { "vendorInfo.businessName": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Filter by service category (e.g., photography, videography, etc.)
    if (req.query.category) {
      filters["vendorInfo.servicesOffered"] = {
        $regex: req.query.category,
        $options: "i",
      };
    }

    // Filter by vendor type
    if (req.query.vendorType) {
      filters["vendorInfo.vendorType"] = {
        $regex: req.query.vendorType,
        $options: "i",
      };
    }

    // Filter by location/service areas
    if (req.query.location) {
      filters["vendorInfo.serviceAreas"] = {
        $regex: req.query.location,
        $options: "i",
      };
    }

    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limit);

    const vendors = await User.find(filters)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ "vendorInfo.rating": -1, createdAt: -1 });

    return successResponse(
      res,
      "Vendors fetched successfully!",
      {
        vendors,
        pagination: {
          page,
          totalPages,
          total: totalUsers,
        },
      },
      200,
    );
  } catch (error: any) {
    console.error("Get All Vendors Error:", error);
    return errorResponse(
      res,
      error.message || "Server error while fetching vendors.",
      500,
    );
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/user/change-password
 * @access  Private
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(
        res,
        "Current password and new password are required",
        400,
      );
    }

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        "New password must be at least 6 characters long",
        400,
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!user.password) {
      return errorResponse(
        res,
        "Password change not available for this account",
        400,
      );
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return errorResponse(res, "Current password is incorrect", 401);
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    return successResponse(res, "Password changed successfully", null);
  } catch (error: any) {
    console.error("Change password error:", error);
    return errorResponse(
      res,
      error.message || "Failed to change password",
      500,
    );
  }
};

/**
 * @desc    Get active sessions for user
 * @route   GET /api/user/sessions
 * @access  Private
 */
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    // Get current token from request
    const currentToken = req.headers.authorization?.split(" ")[1] || "";

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Get activeSessions from user (handle both old and new schema)
    const activeSessions = (user as any).activeSessions || [];

    // Filter out expired sessions (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredSessions = activeSessions
      .filter((session: any) => {
        if (!session || !session.lastActivity) return false;
        try {
          const lastActivity = new Date(session.lastActivity);
          return lastActivity > thirtyDaysAgo;
        } catch (e) {
          return false;
        }
      })
      .map((session: any) => ({
        ...session,
        isCurrent: session.token === currentToken, // Mark current session
      }))
      .sort((a: any, b: any) => {
        // Sort: current session first, then by lastActivity (newest first)
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return (
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime()
        );
      });

    // If no sessions exist, return empty array
    return successResponse(
      res,
      "Active sessions fetched successfully",
      filteredSessions,
    );
  } catch (error: any) {
    console.error("Get active sessions error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch active sessions",
      500,
    );
  }
};

/**
 * @desc    Revoke a session
 * @route   DELETE /api/user/sessions/:sessionToken
 * @access  Private
 */
export const revokeSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { sessionToken } = req.params;

    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    if (!sessionToken) {
      return errorResponse(res, "Session token is required", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Remove the session
    if ((user as any).activeSessions) {
      (user as any).activeSessions = (user as any).activeSessions.filter(
        (session: any) => session.token !== sessionToken,
      );
      await user.save();
    }

    return successResponse(res, "Session revoked successfully", null);
  } catch (error: any) {
    console.error("Revoke session error:", error);
    return errorResponse(res, error.message || "Failed to revoke session", 500);
  }
};

/**
 * @desc    Link bank account
 * @route   POST /api/user/bank-account
 * @access  Private
 */
export const linkBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      accountType,
    } = req.body;

    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return errorResponse(
        res,
        "Account holder name, account number, IFSC code, and bank name are required",
        400,
      );
    }

    // Validate IFSC code format (11 characters, alphanumeric)
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      return errorResponse(res, "Invalid IFSC code format", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Update or create bank account
    if (!user.bankAccount) {
      (user as any).bankAccount = {};
    }

    (user as any).bankAccount.accountHolderName = accountHolderName;
    (user as any).bankAccount.accountNumber = accountNumber;
    (user as any).bankAccount.ifscCode = ifscCode.toUpperCase();
    (user as any).bankAccount.bankName = bankName;
    (user as any).bankAccount.branchName = branchName || "";
    (user as any).bankAccount.accountType = accountType || "savings";
    (user as any).bankAccount.isVerified = false; // Admin will verify
    (user as any).bankAccount.linkedAt = new Date();

    await user.save();

    return successResponse(
      res,
      "Bank account linked successfully. It will be verified by admin.",
      {
        bankAccount: (user as any).bankAccount,
      },
    );
  } catch (error: any) {
    console.error("Link bank account error:", error);
    return errorResponse(
      res,
      error.message || "Failed to link bank account",
      500,
    );
  }
};

/**
 * @desc    Get bank account details
 * @route   GET /api/user/bank-account
 * @access  Private
 */
export const getBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const user = await User.findById(userId).select("bankAccount");
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Return account number without masking for the account owner
    // (Security: Only the account owner can see their own account number)
    const bankAccount = (user as any).bankAccount;
    // Don't mask - user needs to see their own account number for editing

    return successResponse(
      res,
      "Bank account fetched successfully",
      bankAccount || null,
    );
  } catch (error: any) {
    console.error("Get bank account error:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch bank account",
      500,
    );
  }
};

/**
 * @desc    Update bank account
 * @route   PUT /api/user/bank-account
 * @access  Private
 */
export const updateBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return errorResponse(res, "User not authenticated", 401);
    }

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      accountType,
    } = req.body;

    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return errorResponse(
        res,
        "Account holder name, account number, IFSC code, and bank name are required",
        400,
      );
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      return errorResponse(res, "Invalid IFSC code format", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!(user as any).bankAccount) {
      return errorResponse(
        res,
        "Bank account not found. Please link a bank account first.",
        404,
      );
    }

    // Update bank account
    (user as any).bankAccount.accountHolderName = accountHolderName;
    (user as any).bankAccount.accountNumber = accountNumber;
    (user as any).bankAccount.ifscCode = ifscCode.toUpperCase();
    (user as any).bankAccount.bankName = bankName;
    (user as any).bankAccount.branchName = branchName || "";
    (user as any).bankAccount.accountType = accountType || "savings";
    (user as any).bankAccount.isVerified = false; // Reset verification on update
    (user as any).bankAccount.linkedAt = new Date();

    await user.save();

    return successResponse(
      res,
      "Bank account updated successfully. It will be verified by admin.",
      {
        bankAccount: (user as any).bankAccount,
      },
    );
  } catch (error: any) {
    console.error("Update bank account error:", error);
    return errorResponse(
      res,
      error.message || "Failed to update bank account",
      500,
    );
  }
};

/**
 * @desc    Get Instagram Analytics for a user
 * @route   GET /api/user/:id/instagram-analytics
 * @access  Private (Admin or Owner)
 */
export const getInstagramAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (user.role !== "influencer") {
      return errorResponse(res, "User is not an influencer", 400);
    }

    const instagramAccount = user.influencerInfo?.socialMedia?.find(
      (acc: any) =>
        acc.platform === "instagram" &&
        acc.accessToken &&
        acc.isValid !== false,
    );

    if (!instagramAccount || !instagramAccount.accessToken) {
      return errorResponse(
        res,
        "Instagram account not connected or token invalid",
        404,
      );
    }

    // 1. Fetch Profile Data
    const profile = await instagramService.getInstagramProfile(
      instagramAccount.accessToken,
    );

    // 2. Fetch Recent Media
    const recentMedia = await instagramService.getRecentMedia(
      instagramAccount.accessToken,
      30, // Get last 30 posts for decent sample size
    );

    // --- CALCULATIONS ---

    const followers = profile.followers_count || 0;
    const following = profile.follows_count || 0;
    const postCount = profile.media_count || 0;

    // Engagement Rate Calculation
    let totalLikes = 0;
    let totalComments = 0;
    const mediaCountForCalc = recentMedia.length;

    recentMedia.forEach((media: any) => {
      totalLikes += media.like_count || 0;
      totalComments += media.comments_count || 0;
    });

    const avgLikes = mediaCountForCalc > 0 ? totalLikes / mediaCountForCalc : 0;
    const avgComments =
      mediaCountForCalc > 0 ? totalComments / mediaCountForCalc : 0;
    const avgEngagement = avgLikes + avgComments;

    // Classic formula: (Likes + Comments) / Followers * 100
    // If multiple posts, we average the engagement per post then divide, OR (Total Engagement / (Followers * PostCount))
    // Using average engagement per post / followers
    const engagementRate =
      followers > 0 ? (avgEngagement / followers) * 100 : 0;

    // Fake Follower Score (Heuristic 0-100%)
    // Factors increasing 'fake' probability:
    // 1. Extremely low engagement (< 1%) despite high followers
    // 2. High Follower/Following ratio (suspicious if Following > Followers in some cases, but typically "Bot" accounts follow many)
    // "Fake Influencers" usually buy followers, so they have High Followers, Low Engagement.

    let fakeFollowerScore = 0;

    // Rule 1: High Followers, Low Engagement
    if (followers > 5000 && engagementRate < 1.0) fakeFollowerScore += 30;
    if (followers > 10000 && engagementRate < 0.5) fakeFollowerScore += 20;

    // Rule 2: Following vs Followers
    // If they follow MORE than they have followers (and have decent size), it's often a "follow back" growth strategy (low quality)
    if (followers > 1000 && following > followers) fakeFollowerScore += 20;

    // Rule 3: No Posts but high followers
    if (postCount < 5 && followers > 1000) fakeFollowerScore += 40;

    // Cap at 90% (we can never be 100% sure without deep audit)
    fakeFollowerScore = Math.min(fakeFollowerScore, 90);

    // Authenticity Score (Inverse of Fake)
    const authenticityScore = 100 - fakeFollowerScore;

    // Brand Capability Score (0-100)
    // how "ready" are they for a brand deal?
    // Factors:
    // - Engagement Rate (Weighted high)
    // - Follower Count (Weighted medium)
    // - Content consistency (Activity)
    let brandCapabilityScore = 0;

    if (engagementRate > 1.5) brandCapabilityScore += 30;
    if (engagementRate > 3.0) brandCapabilityScore += 20; // Bonus for high engagement

    if (followers > 1000) brandCapabilityScore += 10;
    if (followers > 10000) brandCapabilityScore += 20;

    if (postCount > 20) brandCapabilityScore += 10; // Proven track record

    // Activity Score
    // Based on recency of posts
    let activityScore = 0;
    if (recentMedia.length > 0) {
      const lastPostDate = new Date(recentMedia[0].timestamp);
      const daysSinceLastPost =
        (new Date().getTime() - lastPostDate.getTime()) / (1000 * 3600 * 24);

      if (daysSinceLastPost < 3) activityScore = 100;
      else if (daysSinceLastPost < 7) activityScore = 80;
      else if (daysSinceLastPost < 14) activityScore = 60;
      else if (daysSinceLastPost < 30) activityScore = 40;
      else activityScore = 20;
    }

    // Hashtag Extraction
    const hashtagCounts: Record<string, number> = {};
    recentMedia.forEach((media: any) => {
      const caption = media.caption || "";
      const matches = caption.match(/#[a-z0-9_]+/gi);
      if (matches) {
        matches.forEach((tag: string) => {
          const normalizedTag = tag.toLowerCase();
          hashtagCounts[normalizedTag] =
            (hashtagCounts[normalizedTag] || 0) + 1;
        });
      }
    });

    // Sort and get top 20
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    const analyticsData = {
      profile: {
        username: profile.username,
        followers: followers,
        following: following,
        mediaCount: postCount,
        profilePictureUrl: profile.profile_picture_url,
      },
      metrics: {
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
      },
      scores: {
        authenticity: authenticityScore, // 0-100
        fakeFollowerPercentage: fakeFollowerScore, // 0-100
        brandCapability: Math.min(brandCapabilityScore, 100), // 0-100
        activity: activityScore, // 0-100
      },
      content: {
        topHashtags: topHashtags,
        recentPosts: recentMedia.slice(0, 6).map((m: any) => ({
          id: m.id,
          media_url: m.media_url,
          thumbnail_url: m.thumbnail_url,
          caption: m.caption,
          likes: m.like_count,
          comments: m.comments_count,
          timestamp: m.timestamp,
          permalink: m.permalink,
          media_type: m.media_type,
        })),
      },
    };

    return successResponse(
      res,
      "Instagram analytics fetched successfully",
      analyticsData,
    );
  } catch (error: any) {
    console.error("Instagram Analytics Error:", error);
    // Even if it fails, meaningful error message
    return errorResponse(
      res,
      error.message || "Failed to fetch Instagram analytics",
      500,
    );
  }
};
