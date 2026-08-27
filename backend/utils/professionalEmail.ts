const BLOCKED_FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "rediffmail.com",
]);

export const getEmailDomain = (email?: string | null): string => {
  if (!email || typeof email !== "string") return "";
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex < 0) return "";
  return normalized.slice(atIndex + 1);
};

export const isProfessionalEmail = (email?: string | null): boolean => {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return !BLOCKED_FREE_EMAIL_DOMAINS.has(domain);
};

export const PROFESSIONAL_EMAIL_ERROR =
  "Please use a professional business email (company domain). Gmail/Hotmail and other personal email providers are not allowed for brand accounts.";
