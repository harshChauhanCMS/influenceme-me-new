import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/responseHelper";
import User from "../models/user";

/**
 * Instagram Webhook Controller
 *
 * Handles webhooks from Meta/Instagram for:
 * - User deauthorization
 * - Data deletion requests
 * - Permission changes
 */

// Verify token - MUST match what you set in Meta Developer Console
const WEBHOOK_VERIFY_TOKEN =
  "IGAAK3tBsZCjchBZAFlsYmo3VFdIeEduaEVjcnJNTS03eElQWVZAWb1FvcmJKajhUX0lDZATNHLW9FMElNOU53aVVHclA5RG8xZAVlqRGpVZAUdETEloRWJrWDQ4Y1U2NkhzWjM1YkFrWFZAIY2hGNHBvS1hET2QxNGRfM0NxLUp0eWdqbwZDZD";

/**
 * @desc    Verify webhook endpoint (GET request from Meta)
 * @route   GET /api/webhooks/instagram
 * @access  Public (Meta calls this)
 */
export const verifyWebhook = (req: Request, res: Response) => {
  try {
    // Meta sends these query parameters to verify your endpoint
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("Webhook verification request:", { mode, token, challenge });

    // Check if mode and token are correct
    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      // Respond with challenge token from Meta
      console.log("Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      // Token doesn't match or wrong mode
      console.error("Webhook verification failed");
      res.status(403).send("Forbidden");
    }
  } catch (error: unknown) {
    console.error("Webhook verification error:", error);
    res.status(500).send("Internal Server Error");
  }
};

/**
 * @desc    Handle Instagram webhook events (POST request from Meta)
 * @route   POST /api/webhooks/instagram
 * @access  Public (Meta calls this)
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    console.log(
      "Instagram webhook received:",
      JSON.stringify(req.body, null, 2),
    );

    // Meta sends webhook data in this format
    const { object, entry } = req.body;

    // Verify this is an Instagram webhook
    if (object !== "instagram") {
      console.log("Not an Instagram webhook, ignoring");
      return res.status(200).send("OK");
    }

    // Process each entry in the webhook
    for (const item of entry || []) {
      const { id, time, changes } = item;

      console.log(`Processing webhook for Instagram account: ${id}`);

      // Process each change
      for (const change of changes || []) {
        const { field, value } = change;

        console.log(`Change detected - Field: ${field}, Value:`, value);

        // Handle different types of changes
        switch (field) {
          case "deauthorize":
            // User removed app authorization
            await handleDeauthorization(value.user_id);
            break;

          case "delete":
            // User requested data deletion
            await handleDataDeletion(value.user_id);
            break;

          case "permissions":
            // User changed permissions
            await handlePermissionChange(value.user_id, value.permissions);
            break;

          default:
            console.log(`Unknown webhook field: ${field}`);
        }
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).send("EVENT_RECEIVED");
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    // Still send 200 to prevent Meta from retrying
    res.status(200).send("OK");
  }
};

/**
 * Handle user deauthorization
 */
async function handleDeauthorization(instagramUserId: string) {
  try {
    console.log(
      `Handling deauthorization for Instagram user: ${instagramUserId}`,
    );

    // Find user by Instagram username in their social media links
    const user = await User.findOne({
      $or: [
        { instagram: { $regex: instagramUserId, $options: "i" } },
        {
          "influencerInfo.socialMedia": {
            $elemMatch: {
              platform: "instagram",
              username: { $regex: instagramUserId, $options: "i" },
            },
          },
        },
      ],
    });

    if (!user) {
      console.log("User not found for Instagram ID:", instagramUserId);
      return;
    }

    // Remove Instagram connection from influencerInfo.socialMedia
    if (user.influencerInfo?.socialMedia) {
      user.influencerInfo.socialMedia = user.influencerInfo.socialMedia.filter(
        (social: any) => social.platform !== "instagram",
      );
    }

    // Clear direct instagram field
    (user as any).instagram = undefined;

    await user.save();
    console.log(`Instagram disconnected for user: ${user._id}`);
  } catch (error: unknown) {
    console.error("Error handling deauthorization:", error);
  }
}

/**
 * Handle data deletion request
 */
async function handleDataDeletion(instagramUserId: string) {
  try {
    console.log(
      `Handling data deletion for Instagram user: ${instagramUserId}`,
    );

    // Find user by Instagram username in their social media links
    const user = await User.findOne({
      $or: [
        { instagram: { $regex: instagramUserId, $options: "i" } },
        {
          "influencerInfo.socialMedia": {
            $elemMatch: {
              platform: "instagram",
              username: { $regex: instagramUserId, $options: "i" },
            },
          },
        },
      ],
    });

    if (!user) {
      console.log("User not found for Instagram ID:", instagramUserId);
      return;
    }

    // Delete all Instagram-related data
    if (user.influencerInfo?.socialMedia) {
      user.influencerInfo.socialMedia = user.influencerInfo.socialMedia.filter(
        (social: any) => social.platform !== "instagram",
      );
    }

    // Clear direct instagram field
    (user as any).instagram = undefined;

    // You might want to delete cached analytics, media, etc.
    // Add additional cleanup here as needed

    await user.save();
    console.log(`Instagram data deleted for user: ${user._id}`);
  } catch (error: unknown) {
    console.error("Error handling data deletion:", error);
  }
}

/**
 * Handle permission changes
 */
async function handlePermissionChange(
  instagramUserId: string,
  permissions: any,
) {
  try {
    console.log(
      `Handling permission change for Instagram user: ${instagramUserId}`,
    );
    console.log("New permissions:", permissions);

    // Find user by Instagram username in their social media links
    const user = await User.findOne({
      $or: [
        { instagram: { $regex: instagramUserId, $options: "i" } },
        {
          "influencerInfo.socialMedia": {
            $elemMatch: {
              platform: "instagram",
              username: { $regex: instagramUserId, $options: "i" },
            },
          },
        },
      ],
    });

    if (!user) {
      console.log("User not found for Instagram ID:", instagramUserId);
      return;
    }

    // Log permission changes for monitoring
    console.log(`Permissions changed for user: ${user._id}`);

    // You can update user's permission status in your database
    // or trigger re-authentication if needed
  } catch (error: unknown) {
    console.error("Error handling permission change:", error);
  }
}

/**
 * @desc    Get webhook verification token (for reference)
 * @route   GET /api/webhooks/instagram/verify-token
 * @access  Private (admin only - for testing)
 */
export const getVerifyToken = (req: Request, res: Response) => {
  // Only show this in development or to admins
  if (process.env.NODE_ENV === "production") {
    return errorResponse(res, "Not available in production", 403);
  }

  return successResponse(res, "Webhook verify token", {
    verify_token: WEBHOOK_VERIFY_TOKEN,
    callback_url: `${process.env.API_URL || "https://api.influence-me.in"}/api/webhooks/instagram`,
  });
};
