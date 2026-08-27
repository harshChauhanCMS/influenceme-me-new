import nodemailer from "nodemailer";
import dotenv from "dotenv";
import {
  getWelcomeEmailTemplate,
  getApprovalEmailTemplate,
  getRejectionEmailTemplate,
} from "../utils/emailTemplates";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "InfluenceMe"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email: ", error);
    // We don't throw here to avoid blocking the main flow, just log it.
  }
};

export const sendAccountCreatedEmail = async (to: string, name: string) => {
  const subject = "Welcome to InfluenceMe - Account Under Review";
  const html = getWelcomeEmailTemplate(name);
  return sendEmail(to, subject, html);
};

export const sendAccountApprovedEmail = async (to: string, name: string) => {
  const subject = "Congratulations! Your InfluenceMe Account is Approved";
  const loginUrl = `${process.env.FRONTEND_URL || "https://influence-me.in"}/login`;
  const html = getApprovalEmailTemplate(name, loginUrl);
  return sendEmail(to, subject, html);
};

export const sendAccountRejectedEmail = async (
  to: string,
  name: string,
  reason?: string,
) => {
  const subject = "Update regarding your InfluenceMe Account";
  const html = getRejectionEmailTemplate(name, reason);
  return sendEmail(to, subject, html);
};
