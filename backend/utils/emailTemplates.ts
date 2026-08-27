const BRAND_COLOR = "#636B2F";
const TEXT_COLOR = "#1A1A1A";
const LIGHT_TEXT = "#666666";
const BG_COLOR = "#F8F9FA";

const baseLayout = (content: string, previewText: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InfluenceMe</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: ${BG_COLOR};
      color: ${TEXT_COLOR};
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 30px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .footer {
      text-align: center;
      padding-top: 30px;
      color: ${LIGHT_TEXT};
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${BRAND_COLOR};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin-top: 25px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: ${BRAND_COLOR};
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    h1 {
      margin-top: 0;
      font-size: 24px;
      font-weight: 700;
    }
    p {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${previewText}
  </div>
  <div class="container">
    <div class="header">
      <a href="https://influence-me.in" class="logo">InfluenceMe</a>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} InfluenceMe. All rights reserved.</p>
      <p>If you have any questions, contact us at support@influence-me.in</p>
    </div>
  </div>
</body>
</html>
`;

export const getWelcomeEmailTemplate = (name: string) => {
  const content = `
    <h1>Welcome, ${name}! ✨</h1>
    <p>Thank you for joining the InfluenceMe community. We're excited to have you on board!</p>
    <p>Your account is currently <strong>under review</strong> by our moderation team. We manually verify every profile to ensure the highest quality network for our brands and influencers.</p>
    <p>This process typically takes <strong>24-48 hours</strong>. We'll send you an update as soon as your profile is approved.</p>
    <p>In the meantime, feel free to prepare your media kit or portfolio!</p>
  `;
  return baseLayout(
    content,
    "Welcome to InfluenceMe - Your account is being verified.",
  );
};

export const getApprovalEmailTemplate = (name: string, loginUrl: string) => {
  const content = `
    <h1>Good News! 🎉</h1>
    <p>Hi ${name}, your InfluenceMe account has been <strong>approved</strong>!</p>
    <p>Our team has verified your details, and you're now ready to start exploring opportunities, connecting with brands, and managing your collaborations.</p>
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Log In to Your Dashboard</a>
    </div>
    <p style="margin-top: 30px; font-size: 14px; color: ${LIGHT_TEXT};">If the button above doesn't work, copy and paste this link: ${loginUrl}</p>
  `;
  return baseLayout(
    content,
    "Congratulations! Your account has been approved.",
  );
};

export const getRejectionEmailTemplate = (name: string, reason?: string) => {
  const content = `
    <h1>Account Update</h1>
    <p>Hi ${name},</p>
    <p>Thank you for your interest in InfluenceMe. After carefully reviewing your profile application, we regret to inform you that we cannot approve your account at this time.</p>
    ${
      reason
        ? `<div style="background: #FFF5F5; border-left: 4px solid #E53E3E; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #C53030;"><strong>Reason:</strong> ${reason}</p>
    </div>`
        : ""
    }
    <p>Our verification process is designed to maintain a specific balance in our marketplace. This decision is not necessarily a reflection of your content quality, but rather our current network needs.</p>
    <p>If you would like to appeal this decision or have questions, please reply to this email.</p>
  `;
  return baseLayout(content, "Update regarding your account application.");
};
