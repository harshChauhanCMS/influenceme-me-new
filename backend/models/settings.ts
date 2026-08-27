import mongoose, { Document, Schema, Model } from "mongoose";

// Settings Interface
export interface ISettings extends Document {
  // General Settings
  siteName: string;
  siteUrl: string;
  adminEmail: string;
  supportEmail: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;

  // Security Settings
  passwordMinLength: number;
  sessionTimeout: number; // minutes
  twoFactorAuth: boolean;
  ipWhitelist: string;
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes

  // Email Settings
  emailSettings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
    emailNotifications: boolean;
  };

  // Payment Settings
  paymentSettings: {
    platformFeePercentage: number;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    paymentMethods: string[];
    currency: string;
    minWithdrawalAmount: number;
  };

  // Tax Settings
  taxSettings: {
    gst: number; // GST percentage (for India)
    cgst: number; // CGST percentage (for intra-state)
    sgst: number; // SGST percentage (for intra-state)
    igst: number; // IGST percentage (for inter-state)
    isInterState: boolean; // Default to inter-state or intra-state
  };

  // Notification Settings
  notificationSettings: {
    emailCampaignUpdates: boolean;
    emailOfferNotifications: boolean;
    emailDealNotifications: boolean;
    emailPaymentNotifications: boolean;
    emailSystemAlerts: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Settings Schema
const settingsSchema = new Schema<ISettings>(
  {
    siteName: {
      type: String,
      default: "InfluenceMe",
    },
    siteUrl: {
      type: String,
      default: "https://influence-me.in",
    },
    adminEmail: {
      type: String,
      default: "contact-us@influence-me.in",
    },
    supportEmail: {
      type: String,
      default: "support@influence-me.in",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    registrationEnabled: {
      type: Boolean,
      default: true,
    },
    emailVerificationRequired: {
      type: Boolean,
      default: true,
    },
    passwordMinLength: {
      type: Number,
      default: 8,
    },
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
    },
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    ipWhitelist: {
      type: String,
      default: "",
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
    },
    lockoutDuration: {
      type: Number,
      default: 15, // minutes
    },
    emailSettings: {
      smtpHost: { type: String, default: "" },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: "" },
      smtpPassword: { type: String, default: "" },
      smtpSecure: { type: Boolean, default: true },
      fromEmail: { type: String, default: "noreply@influence-me.in" },
      fromName: { type: String, default: "InfluenceMe" },
      emailNotifications: { type: Boolean, default: true },
    },
    paymentSettings: {
      platformFeePercentage: { type: Number, default: 5 },
      razorpayKeyId: { type: String, default: "" },
      razorpayKeySecret: { type: String, default: "" },
      paymentMethods: { type: [String], default: ["razorpay", "bank_transfer"] },
      currency: { type: String, default: "INR" },
      minWithdrawalAmount: { type: Number, default: 1000 },
    },
    taxSettings: {
      gst: { type: Number, default: 18 }, // 18% GST (9% CGST + 9% SGST for intra-state)
      cgst: { type: Number, default: 9 }, // CGST percentage (for intra-state)
      sgst: { type: Number, default: 9 }, // SGST percentage (for intra-state)
      igst: { type: Number, default: 18 }, // IGST percentage (for inter-state)
      isInterState: { type: Boolean, default: false }, // Default to intra-state
    },
    notificationSettings: {
      emailCampaignUpdates: { type: Boolean, default: true },
      emailOfferNotifications: { type: Boolean, default: true },
      emailDealNotifications: { type: Boolean, default: true },
      emailPaymentNotifications: { type: Boolean, default: true },
      emailSystemAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function (updates: Partial<ISettings>) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

interface ISettingsModel extends Model<ISettings> {
  getSettings(): Promise<ISettings>;
  updateSettings(updates: Partial<ISettings>): Promise<ISettings>;
}

const Settings: ISettingsModel = mongoose.model<ISettings, ISettingsModel>("Settings", settingsSchema);

export default Settings;

