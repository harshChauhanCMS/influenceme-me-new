import Campaign from "../models/campaign";
import { CampaignStatus } from "../../shared/enums/enums";

/**
 * Marks campaigns as expired when their endDate has passed
 * and they are still effectively active/upcoming.
 *
 * This is safe to call periodically or on-demand.
 */
export const expireStaleCampaigns = async (): Promise<number> => {
    const now = new Date();

    try {
        const result = await Campaign.updateMany(
            {
                endDate: { $lt: now },
                status: { $in: [CampaignStatus.ACTIVE, CampaignStatus.UPCOMING] },
            },
            {
                $set: { status: CampaignStatus.EXPIRED },
            }
        );

        const modifiedCount =
            // Mongoose 6 uses modifiedCount, older versions use nModified
            // @ts-ignore
            typeof result.modifiedCount === "number"
                ? // @ts-ignore
                  result.modifiedCount
                : // @ts-ignore
                  (result.nModified ?? 0);

        if (modifiedCount > 0) {
            console.log(
                `🕒 Campaign expiry job: marked ${modifiedCount} campaign(s) as expired.`,
            );
        }

        return modifiedCount;
    } catch (error) {
        console.error("❌ Error running campaign expiry job:", error);
        return 0;
    }
};

/**
 * Starts a simple interval-based scheduler for campaign expiry.
 * Should be called once after the server and database are ready.
 */
export const startCampaignExpiryScheduler = () => {
    const intervalMinutes = Number(process.env.CAMPAIGN_EXPIRY_INTERVAL_MINUTES || 15);
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(
        `⏱️  Initializing campaign expiry scheduler to run every ${intervalMinutes} minute(s).`,
    );

    // Run once on startup (fire-and-forget)
    expireStaleCampaigns().catch((err) =>
        console.error("❌ Initial campaign expiry run failed:", err),
    );

    // Schedule periodic runs
    setInterval(() => {
        expireStaleCampaigns().catch((err) =>
            console.error("❌ Scheduled campaign expiry run failed:", err),
        );
    }, intervalMs);
};

export default {
    expireStaleCampaigns,
    startCampaignExpiryScheduler,
};

