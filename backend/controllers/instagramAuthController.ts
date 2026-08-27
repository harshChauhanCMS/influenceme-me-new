import { Request, Response } from "express";
import axios from "axios";
import { createHash } from "crypto";
import { instagramService } from "../services/instagramService";
import User from "../models/user";
import type { AuthenticatedRequest } from "../middleware/auth";

const META_GRAPH_VERSION = "v23.0";
const META_OAUTH_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
type AuthType = "instagram" | "facebook";

const AUTH_TYPE_VALUES: AuthType[] = ["instagram", "facebook"];

// Instagram connect scopes: keep this aligned with Meta Business Login supported scopes.
// business_management is required for Pages under a Business Manager / Meta Business Suite.
const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

// Facebook-only connect (GET /auth/facebook, getOAuthUrl("facebook")): Page-related scopes only.
// Do not add `instagram_*` scopes here — Instagram uses the separate Business Login / IG routes.
const FACEBOOK_ONLY_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

// Validated via debug_token for `connectFacebook`, `fetchFacebookData`, and `checkMetaToken` (platform=facebook).
// Must match what the Facebook OAuth flow grants (`FACEBOOK_ONLY_SCOPES`), not the legacy `INSTAGRAM_SCOPES` list.
const FACEBOOK_REQUIRED_SCOPES: string[] = [...FACEBOOK_ONLY_SCOPES];

const getAuthTypeFromState = (state?: string): AuthType => {
  if (!state) return "instagram";
  return AUTH_TYPE_VALUES.includes(state as AuthType)
    ? (state as AuthType)
    : "instagram";
};

const getAuthTypeFromBody = (value: unknown): AuthType => {
  if (typeof value !== "string") return "instagram";
  const normalized = value.trim().toLowerCase();
  return AUTH_TYPE_VALUES.includes(normalized as AuthType)
    ? (normalized as AuthType)
    : "instagram";
};

const getFallbackAuthType = (type: AuthType): AuthType =>
  type === "instagram" ? "facebook" : "instagram";

const MIN_LONG_LIVED_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;
const CONNECT_DUPLICATE_WINDOW_MS = 2500;
const inFlightLongLivedExchange = new Map<
  string,
  Promise<{
    result: {
      accessToken: string;
      expiresIn: number;
      expiresAt: Date;
    } | null;
    usedType: AuthType;
    error: { code?: number; subcode?: number; type?: string; message?: string } | null;
  }>
>();
const recentConnectRequests = new Map<string, number>();

const tokenFingerprint = (token?: string | null): string => {
  if (!token) return "none";
  const hash = createHash("sha256").update(token).digest("hex").slice(0, 12);
  const suffix = token.slice(-6);
  return `${hash}:${suffix}`;
};

const isMetaSessionInvalidated = (error: {
  code?: number;
  subcode?: number;
} | null): boolean => error?.code === 190 && error?.subcode === 460;

const exchangeForLongLivedWithFallback = async (
  shortLivedToken: string,
  preferredType: AuthType,
) => {
  const cacheKey = `${preferredType}:${shortLivedToken}`;
  const existing = inFlightLongLivedExchange.get(cacheKey);
  if (existing) {
    return existing;
  }

  const operation = (async () => {
    const firstAttempt =
      await instagramService.exchangeFacebookTokenForLongLivedDetailed(
        shortLivedToken,
        preferredType,
      );
    if (firstAttempt.result?.accessToken) {
      return {
        result: firstAttempt.result,
        usedType: preferredType,
        error: null,
      };
    }

    // 190/460 means the Meta session is invalidated; fallback app credentials won't recover it.
    if (isMetaSessionInvalidated(firstAttempt.error)) {
      return {
        result: null,
        usedType: preferredType,
        error: firstAttempt.error,
      };
    }

    const fallbackType = getFallbackAuthType(preferredType);
    const secondAttempt =
      await instagramService.exchangeFacebookTokenForLongLivedDetailed(
        shortLivedToken,
        fallbackType,
      );
    if (secondAttempt.result?.accessToken) {
      return {
        result: secondAttempt.result,
        usedType: fallbackType,
        error: null,
      };
    }

    return {
      result: null,
      usedType: preferredType,
      error: secondAttempt.error || firstAttempt.error || null,
    };
  })();

  inFlightLongLivedExchange.set(cacheKey, operation);
  try {
    return await operation;
  } finally {
    inFlightLongLivedExchange.delete(cacheKey);
  }
};

const getAuthConfig = (type: AuthType) => {
  if (type === "facebook") {
    return {
      clientId: process.env.FACEBOOK_APP_ID || process.env.META_APP_ID,
      clientSecret:
        process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET,
      redirectUri:
        process.env.FACEBOOK_REDIRECT_URI || process.env.REDIRECT_URI,
      scopes: FACEBOOK_ONLY_SCOPES,
    };
  }

  return {
    clientId: process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID,
    clientSecret:
      process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI || process.env.REDIRECT_URI,
    scopes: INSTAGRAM_SCOPES,
  };
};

/**
 * Build deep link URL for app redirect after OAuth callback.
 * Default: influenceme://auth/success?token=ACCESS_TOKEN&type=facebook|instagram
 */
function getAppRedirectUrl(
  type: AuthType,
  token?: string,
  error?: string,
): string {
  const base = process.env.META_APP_REDIRECT || "influenceme://auth/success";
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("type", type);
  if (error) params.set("error", error);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Build redirect URI candidates for OAuth code exchange.
 * Meta requires this to be identical to the redirect_uri used in the authorize step.
 */
function getRedirectUriCandidates(req: Request, type: AuthType): string[] {
  const config = getAuthConfig(type);
  const fromEnv = config.redirectUri?.trim();
  const callbackPath = `${req.baseUrl}${req.path}`;

  const host = (req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = (req.get("x-forwarded-proto") || req.protocol || "https")
    .split(",")[0]
    .trim();
  const fromRequest = host ? `${proto}://${host}${callbackPath}` : undefined;

  let fromEnvWithCurrentPath: string | undefined;
  if (fromEnv) {
    try {
      const parsed = new URL(fromEnv);
      fromEnvWithCurrentPath = `${parsed.origin}${callbackPath}`;
    } catch {
      fromEnvWithCurrentPath = undefined;
    }
  }

  const candidates = [fromEnv, fromEnvWithCurrentPath, fromRequest].filter(
    (v): v is string => Boolean(v),
  );

  return [...new Set(candidates)];
}

function getOAuthUrl(type: AuthType): string | null {
  const config = getAuthConfig(type);
  if (!config.clientId || !config.redirectUri) {
    return null;
  }

  const sanitizedScopes = config.scopes.filter(
    (scope) => scope.trim().toLowerCase() !== "public_profile",
  );

  const configId =
    type === "instagram"
      ? process.env.INSTAGRAM_CONFIG_ID || process.env.CONFIGURATION_KEY
      : undefined;

  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state: type,
    scope: sanitizedScopes.join(","),
  });

  if (configId?.trim()) {
    query.set("config_id", configId.trim());
  }

  return `${META_OAUTH_URL}?${query.toString()}`;
}

const redirectWithError = (
  res: Response,
  type: AuthType,
  error: string,
): void => {
  res.redirect(getAppRedirectUrl(type, undefined, error));
};

const isRedirectUriMismatchError = (error: unknown): boolean => {
  const ax = error as {
    response?: { data?: { error?: { error_subcode?: number } } };
  };
  return ax?.response?.data?.error?.error_subcode === 36008;
};

const isCodeAlreadyUsedError = (error: unknown): boolean => {
  const ax = error as {
    response?: { data?: { error?: { code?: number; error_subcode?: number } } };
  };
  return (
    ax?.response?.data?.error?.code === 100 &&
    ax?.response?.data?.error?.error_subcode === 36009
  );
};

/**
 * @desc    Start Instagram login – redirect user to Meta OAuth
 * @route   GET /auth/instagram
 * @access  Public
 */
export const instagramLoginRedirect = (_req: Request, res: Response): void => {
  const url = getOAuthUrl("instagram");
  if (!url) {
    res
      .status(500)
      .send(
        "Instagram OAuth not configured (INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET/INSTAGRAM_REDIRECT_URI)",
      );
    return;
  }
  res.redirect(url);
};

/**
 * @desc    Start Facebook login – redirect user to Meta OAuth
 * @route   GET /auth/facebook
 * @access  Public
 */
export const facebookLoginRedirect = (_req: Request, res: Response): void => {
  const url = getOAuthUrl("facebook");
  if (!url) {
    res
      .status(500)
      .send(
        "Facebook OAuth not configured (FACEBOOK_APP_ID/FACEBOOK_APP_SECRET/FACEBOOK_REDIRECT_URI)",
      );
    return;
  }

  res.redirect(url);
};

// Legacy export kept for existing imports/routes.
export const loginRedirect = instagramLoginRedirect;

/**
 * @desc    Unified OAuth callback – handles both Instagram and Facebook using state.
 * @route   GET /auth/callback
 * @access  Public (Meta redirects here)
 */
export const callback = async (req: Request, res: Response): Promise<void> => {
  const state = req.query.state as string | undefined;
  const authType = getAuthTypeFromState(state);

  try {
    const code = req.query.code as string | undefined;
    const errorParam = req.query.error as string | undefined;

    if (errorParam) {
      redirectWithError(res, authType, errorParam);
      return;
    }

    if (!code) {
      redirectWithError(res, authType, "missing_code");
      return;
    }

    const { clientId, clientSecret } = getAuthConfig(authType);

    if (!clientId || !clientSecret) {
      redirectWithError(res, authType, "server_config");
      return;
    }

    const redirectUriCandidates = getRedirectUriCandidates(req, authType);
    if (redirectUriCandidates.length === 0) {
      redirectWithError(res, authType, "server_config");
      return;
    }

    let tokenRes: { data?: { access_token?: string } } | null = null;
    let lastExchangeError: unknown = null;

    for (const redirectUri of redirectUriCandidates) {
      try {
        tokenRes = await axios.get(`${META_GRAPH_BASE}/oauth/access_token`, {
          params: {
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
          },
        });
        if (tokenRes?.data?.access_token) {
          break;
        }
      } catch (exchangeErr: unknown) {
        if (isRedirectUriMismatchError(exchangeErr)) {
          lastExchangeError = exchangeErr;
          continue;
        }
        throw exchangeErr;
      }
    }

    if (!tokenRes?.data?.access_token) {
      if (lastExchangeError) {
        throw lastExchangeError;
      }
      redirectWithError(res, authType, "auth_failed");
      return;
    }

    let accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      redirectWithError(res, authType, "no_token");
      return;
    }

    const shortLivedToken = accessToken;

    // Exchange for long-lived token (60 days).
    const longLived = await instagramService.exchangeFacebookTokenForLongLived(
      accessToken,
      authType,
    );
    if (longLived?.accessToken) {
      accessToken = longLived.accessToken;
      console.log(
        `${authType} long-lived token obtained, expires:`,
        longLived.expiresAt,
      );
    }

    console.log("[META_TOKEN_TRACE] callback", {
      authType,
      shortLivedFingerprint: tokenFingerprint(shortLivedToken),
      finalRedirectFingerprint: tokenFingerprint(accessToken),
      sameTokenAfterExchange: shortLivedToken === accessToken,
    });

    res.redirect(getAppRedirectUrl(authType, accessToken));
  } catch (err: unknown) {
    if (isCodeAlreadyUsedError(err)) {
      res.redirect(getAppRedirectUrl(authType));
      return;
    }
    const ax = err as {
      response?: {
        data?: { error?: { code?: number; error_subcode?: number } };
      };
    };
    console.error("Instagram callback error:", ax?.response?.data ?? err);
    redirectWithError(res, authType, "auth_failed");
  }
};

/** Scopes for https://www.instagram.com/oauth/authorize (Instagram API with Instagram Login) */
const INSTAGRAM_BUSINESS_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
];

/**
 * Token exchange must use the **exact** same redirect_uri as
 * `getInstagramBusinessLoginAuthorizeUrl()` (from env / deriveInstagramBusinessLoginRedirectUri).
 * Do not try alternate paths or request-derived URLs: Meta binds the code to one string; trying
 * `/callback` before `/business` can fail first then return "authorization code has been used".
 */
function getInstagramBusinessLoginRedirectUriForExchange(
  req: Request,
): string | null {
  const fromCredentials =
    instagramService.getInstagramBusinessLoginCredentials().redirectUri?.trim();
  if (fromCredentials) {
    return fromCredentials;
  }
  const callbackPath = `${req.baseUrl}${req.path}`;
  const host = (req.get("x-forwarded-host") || req.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = (req.get("x-forwarded-proto") || req.protocol || "https")
    .split(",")[0]
    .trim();
  if (!host) {
    return null;
  }
  return `${proto}://${host}${callbackPath}`;
}

function getInstagramBusinessLoginAuthorizeUrl(): string | null {
  const { clientId, redirectUri } =
    instagramService.getInstagramBusinessLoginCredentials();
  if (!clientId || !redirectUri) {
    return null;
  }
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_BUSINESS_LOGIN_SCOPES.join(","),
    state: "instagram_business_login",
  });
  return `https://www.instagram.com/oauth/authorize?${q.toString()}`;
}

/**
 * @desc    Start Instagram Business Login (Instagram API with Instagram Login — no Facebook Page)
 * @route   GET /auth/instagram/business
 */
export const instagramBusinessLoginRedirect = (
  _req: Request,
  res: Response,
): void => {
  const url = getInstagramBusinessLoginAuthorizeUrl();
  if (!url) {
    res
      .status(500)
      .send(
        "Instagram Business Login not configured. Set INSTAGRAM_BUSINESS_LOGIN_CLIENT_ID and INSTAGRAM_BUSINESS_LOGIN_REDIRECT_URI (and secret for token exchange).",
      );
    return;
  }
  res.redirect(url);
};

/**
 * Single entry: GET /auth/instagram/business
 * - No `code` → redirect to instagram.com/oauth/authorize (redirect_uri must match Meta, usually .../auth/instagram/business)
 * - With `code` or `error` → same handler as OAuth callback (Instagram returns to the registered redirect_uri)
 */
export const instagramBusinessOAuthEntry = (
  req: Request,
  res: Response,
): void => {
  const code = req.query.code as string | undefined;
  const errorParam = req.query.error as string | undefined;
  if (code || errorParam) {
    void instagramBusinessCallback(req, res);
    return;
  }
  instagramBusinessLoginRedirect(req, res);
};

/**
 * @desc    OAuth callback for Instagram Business Login (code → api.instagram.com → graph.instagram.com long-lived)
 * @route   GET /auth/instagram/business/callback (optional; same logic as GET /auth/instagram/business?code=...)
 */
export const instagramBusinessCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authType: AuthType = "instagram";
  try {
    const code = req.query.code as string | undefined;
    const errorParam = req.query.error as string | undefined;
    if (errorParam) {
      redirectWithError(res, authType, errorParam);
      return;
    }
    if (!code) {
      redirectWithError(res, authType, "missing_code");
      return;
    }

    const redirectUri = getInstagramBusinessLoginRedirectUriForExchange(req);
    if (!redirectUri) {
      redirectWithError(res, authType, "server_config");
      return;
    }

    let shortLived: string | null = null;
    let lastExchangeError: unknown = null;
    try {
      const data = await instagramService.exchangeInstagramAuthorizationCode(
        code,
        redirectUri,
      );
      if (data.access_token) {
        shortLived = data.access_token;
      }
    } catch (exchangeErr: unknown) {
      lastExchangeError = exchangeErr;
    }

    if (!shortLived) {
      const ax = lastExchangeError as {
        response?: { data?: unknown; status?: number };
        message?: string;
      };
      console.error("Instagram Business Login code exchange failed:", {
        redirectUriUsed: redirectUri,
        status: ax?.response?.status,
        errorBody: ax?.response?.data ?? ax?.message ?? lastExchangeError,
      });
      redirectWithError(res, authType, "auth_failed");
      return;
    }

    const longLived =
      await instagramService.exchangeInstagramLongLivedTokenDetailed(shortLived);
    const accessToken = longLived.result?.accessToken || shortLived;

    res.redirect(getAppRedirectUrl(authType, accessToken));
  } catch (err: unknown) {
    console.error("instagramBusinessCallback error:", err);
    redirectWithError(res, authType, "auth_failed");
  }
};

/**
 * @desc    Get Facebook Page accounts with Instagram Business ID
 *         GET /me/accounts?fields=instagram_business_account
 * @route   GET /api/instagram/account?token=ACCESS_TOKEN
 * @access  Public (token in query)
 */
export const getAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    const pagesWithIg = await instagramService.getPagesWithInstagram(token);
    res.json({
      success: true,
      pages: pagesWithIg,
      // Raw list for backward compatibility if needed
      accounts: await instagramService.getUserPages(token),
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Instagram account error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch accounts",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Get Instagram Business profile (username, followers, media, profile picture)
 * @route   GET /api/instagram/profile?igId=IG_USER_ID&token=ACCESS_TOKEN
 * @access  Public (token in query)
 */
export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { igId, token } = req.query as { igId?: string; token?: string };
    if (!igId || !token) {
      res
        .status(400)
        .json({ success: false, message: "igId and token are required" });
      return;
    }

    const response = await axios.get(`${META_GRAPH_BASE}/${igId}`, {
      params: {
        fields: "username,followers_count,media_count,profile_picture_url",
        access_token: token,
      },
    });

    res.json(response.data);
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Instagram profile error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch profile",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Fetch Instagram Business insights (impressions, reach, engagement)
 *         Resolves IG Business ID from user token via /me/accounts?fields=instagram_business_account
 * @route   GET /api/instagram/insights?token=ACCESS_TOKEN&period=day|week|days_28
 * @access  Public (token in query)
 */
export const getInsights = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    const period = (req.query.period as "day" | "week" | "days_28") || "day";
    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    const pagesWithIg = await instagramService.getPagesWithInstagram(token);
    if (pagesWithIg.length === 0) {
      res.status(404).json({
        success: false,
        message:
          "No Facebook Page with connected Instagram Business account found",
      });
      return;
    }

    const first = pagesWithIg[0];
    const insights = await instagramService.getInsights(
      first.igBusinessId,
      first.pageAccessToken,
      period,
    );
    res.json({
      success: true,
      igBusinessId: first.igBusinessId,
      pageName: first.pageName,
      period,
      insights,
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Instagram insights error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch insights",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * Core: resolve Instagram media for a Meta user access token (same behavior as legacy query route).
 */
const getMediaForMetaUserToken = async (
  token: string,
  limit: number,
  res: Response,
): Promise<void> => {
  // 1) Instagram Login — graph.instagram.com (before Facebook /me/accounts)
  try {
    const igMe = await instagramService.getInstagramLoginProfile(token);
    const igId = (igMe as { id?: string })?.id;
    if (igId) {
      const media = await instagramService.getInstagramLoginMedia(
        igId,
        token,
        limit,
      );
      res.json({
        success: true,
        igBusinessId: igId,
        pageName: (igMe as { username?: string }).username ?? null,
        media,
        loginSource: "instagram_login",
      });
      return;
    }
  } catch (igErr: unknown) {
    console.warn(
      "[getMedia] Instagram Login media path skipped:",
      (igErr as { response?: { data?: unknown } })?.response?.data ?? igErr,
    );
  }

  // 2) Facebook Page–linked Instagram
  let pagesWithIg: Awaited<
    ReturnType<typeof instagramService.getPagesWithInstagram>
  > = [];
  try {
    pagesWithIg = await instagramService.getPagesWithInstagram(token);
  } catch (fbErr: unknown) {
    console.warn(
      "[getMedia] Facebook Graph failed:",
      (fbErr as { response?: { data?: unknown } })?.response?.data ?? fbErr,
    );
  }

  if (pagesWithIg.length > 0) {
    const first = pagesWithIg[0];
    const media = await instagramService.getBusinessMedia(
      first.igBusinessId,
      first.pageAccessToken,
      limit,
    );
    res.json({
      success: true,
      igBusinessId: first.igBusinessId,
      pageName: first.pageName,
      media,
      loginSource: "facebook_graph",
    });
    return;
  }

  res.status(404).json({
    success: false,
    message:
      "No Instagram account found for this token. Reconnect via Instagram Login or link a Facebook Page.",
  });
};

/**
 * @desc    Same as GET /api/instagram/media but uses the user's server-stored Instagram token (JWT).
 * @route   GET /api/auth/instagram/media?limit=30
 * @access  Private (JWT)
 */
export const getMyInstagramMedia = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res
        .status(401)
        .json({ success: false, message: "Unauthorized", needsReconnect: true });
      return;
    }
    const user = await User.findById(userId);
    const info = user?.influencerInfo as { metaLongLivedToken?: string } | undefined;
    const raw = info?.metaLongLivedToken;
    const token = raw
      ? instagramService.normalizeMetaAccessToken(raw)
      : null;
    if (!token) {
      res.status(401).json({
        success: false,
        message: "No Instagram connection",
        needsReconnect: true,
      });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    await getMediaForMetaUserToken(token, limit, res);
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("getMyInstagramMedia error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch media",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Fetch Instagram Business posts/reels/videos (like_count, comments_count, media_url).
 *          Does not save to DB; use POST /api/auth/instagram/fetch (JWT) to fetch and save.
 * @route   GET /api/instagram/media?token=ACCESS_TOKEN&limit=30
 * @access  Public (token in query; prefer GET /api/auth/instagram/media for app users)
 */
export const getMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.query.token as string | undefined;
    const token = instagramService.normalizeMetaAccessToken(rawToken);
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }
    await getMediaForMetaUserToken(token, limit, res);
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Instagram media error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch media",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Fetch Facebook-only details using long-lived token.
 *          Includes: /me/accounts basic list + per-page fan_count/followers_count.
 * @route   GET /api/instagram/facebook/details?token=LONG_LIVED_TOKEN
 * @access  Public (token in query)
 */
export const getFacebookDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    const pages = await instagramService.getFacebookPagesBasic(token);
    const pageDetails = await Promise.all(
      pages.map(async (page) => {
        const stats = await instagramService.getFacebookPageStats(
          page.id,
          token,
        );
        return {
          id: page.id,
          name: page.name,
          accessToken: page.accessToken,
          fanCount: stats.fanCount,
          followersCount: stats.followersCount,
        };
      }),
    );

    res.json({
      success: true,
      count: pageDetails.length,
      pages: pageDetails,
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Facebook details error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch Facebook details",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Fetch Instagram-only details using long-lived token.
 *          1) Instagram API with Instagram Login — graph.instagram.com/me (try FIRST; avoids
 *             (#100) on graph.facebook.com/me/accounts, which does not apply to IG-only tokens).
 *          2) Facebook Graph: Pages → linked IG (classic flow).
 * @route   GET /api/instagram/instagram/details?token=LONG_LIVED_TOKEN
 *          (Path repeats "instagram" because router is mounted at /api/instagram and route is /instagram/details.)
 * @access  Public (token in query)
 */
export const getInstagramDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawToken = req.query.token as string | undefined;
    const token = instagramService.normalizeMetaAccessToken(rawToken);
    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    type InstagramDetailsRow = {
      facebookPageId: string | null;
      facebookPageName: string | null;
      instagramBusinessId: string;
      username: string | null;
      followersCount: number | null;
      followsCount: number | null;
      loginSource: "facebook_graph" | "instagram_login";
    };

    let connectedInstagramAccounts: InstagramDetailsRow[] = [];

    // 1) Instagram Login (graph.instagram.com) — must run before Facebook /me/accounts
    try {
      const igMe = await instagramService.getInstagramLoginProfile(token);
      const igId = (igMe as { id?: string })?.id;
      if (igId) {
        connectedInstagramAccounts = [
          {
            facebookPageId: null,
            facebookPageName: null,
            instagramBusinessId: igId,
            username: (igMe as { username?: string }).username ?? null,
            followersCount:
              typeof (igMe as { followers_count?: number }).followers_count ===
              "number"
                ? (igMe as { followers_count: number }).followers_count
                : null,
            followsCount:
              typeof (igMe as { follows_count?: number }).follows_count ===
              "number"
                ? (igMe as { follows_count: number }).follows_count
                : null,
            loginSource: "instagram_login",
          },
        ];
      }
    } catch (igErr: unknown) {
      console.warn(
        "[getInstagramDetails] Instagram Login profile not available (will try Facebook Graph):",
        (igErr as { response?: { data?: unknown } })?.response?.data ?? igErr,
      );
    }

    // 2) Facebook Pages → linked IG (EAA user tokens)
    if (connectedInstagramAccounts.length === 0) {
      let pages: Awaited<
        ReturnType<typeof instagramService.getFacebookPagesBasic>
      > = [];
      try {
        pages = await instagramService.getFacebookPagesBasic(token);
      } catch (fbErr: unknown) {
        console.warn(
          "[getInstagramDetails] Facebook Graph pages list failed:",
          (fbErr as { response?: { data?: unknown } })?.response?.data ?? fbErr,
        );
      }

      const instagramDetails = await Promise.all(
        pages.map(async (page) => {
          const linked = await instagramService.getLinkedInstagramBusinessId(
            page.id,
            token,
          );
          if (!linked.instagramBusinessId) {
            return null;
          }

          const stats = await instagramService.getInstagramStats(
            linked.instagramBusinessId,
            token,
          );

          return {
            facebookPageId: page.id,
            facebookPageName: page.name,
            instagramBusinessId: linked.instagramBusinessId,
            username: stats.username,
            followersCount: stats.followersCount,
            followsCount: stats.followsCount,
            loginSource: "facebook_graph" as const,
          };
        }),
      );

      connectedInstagramAccounts = instagramDetails.filter(
        (item): item is NonNullable<typeof item> => Boolean(item),
      );
    }

    const first = connectedInstagramAccounts[0];
    res.json({
      success: true,
      count: connectedInstagramAccounts.length,
      instagramAccounts: connectedInstagramAccounts,
      // Flatten first account so Flutter _pickString(details, ['id','instagramBusinessId',...]) works
      ...(first
        ? {
            instagramBusinessId: first.instagramBusinessId,
            igBusinessId: first.instagramBusinessId,
            username: first.username,
            pageId: first.facebookPageId,
            followersCount: first.followersCount,
            followsCount: first.followsCount,
            loginSource: first.loginSource,
          }
        : {}),
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Instagram details error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch Instagram details",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Facebook Page insights (page_media_view; deprecated metrics removed).
 * @route   GET /api/instagram/facebook/insights?token=LONG_LIVED_TOKEN&pageId=PAGE_ID
 * @access  Public (token in query)
 */
export const getFacebookPageInsights = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    let pageId = req.query.pageId as string | undefined;

    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    const pages = await instagramService.getFacebookPagesBasic(token);
    if (!pageId && pages.length > 0) {
      pageId = pages[0].id;
    }
    if (!pageId) {
      res.status(404).json({
        success: false,
        message: "No Facebook page found for this token",
      });
      return;
    }

    const selectedPage = pages.find((page) => page.id === pageId);
    if (!selectedPage) {
      res.status(404).json({
        success: false,
        message: "Facebook page not found for this token",
      });
      return;
    }

    const insights = await instagramService.getFacebookPageInsights(
      selectedPage.id,
      selectedPage.accessToken,
    );

    res.json({
      success: true,
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      autoResolved: !req.query.pageId,
      metrics: "page_media_view",
      insights,
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Facebook insights error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch Facebook page insights",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Instagram Business account-level insights (reach, profile_views, views).
 *          Meta only supports period=day for these metrics.
 * @route   GET /api/instagram/instagram/insights?token=TOKEN
 * @access  Public (token in query)
 */
export const getInstagramBusinessInsights = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    let igBusinessId = req.query.igBusinessId as string | undefined;
    let pageId = req.query.pageId as string | undefined;

    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    // Convenience fallback: when pageId/igBusinessId are not provided,
    // auto-resolve first linked Facebook Page + Instagram account.
    if (!pageId || !igBusinessId) {
      const linkedAccounts =
        await instagramService.getPagesWithLinkedInstagramDetails(token);
      const firstLinked = linkedAccounts[0] as
        | {
            facebookPageId?: string;
            instagramId?: string;
          }
        | undefined;

      if (firstLinked?.facebookPageId && firstLinked?.instagramId) {
        pageId = pageId || firstLinked.facebookPageId;
        igBusinessId = igBusinessId || firstLinked.instagramId;
      }
    }

    if (!igBusinessId || !pageId) {
      res.status(404).json({
        success: false,
        message:
          "No linked page/instagram account found. Please connect account first or provide pageId and igBusinessId.",
      });
      return;
    }

    const pages = await instagramService.getFacebookPagesBasic(token);
    const selectedPage = pages.find((page) => page.id === pageId);
    if (!selectedPage) {
      res.status(404).json({
        success: false,
        message: "Facebook page not found for this token",
      });
      return;
    }

    const linked = await instagramService.getLinkedInstagramBusinessId(
      selectedPage.id,
      token,
    );
    if (linked.instagramBusinessId !== igBusinessId) {
      res.status(400).json({
        success: false,
        message: "Provided igBusinessId is not linked with this Facebook page",
      });
      return;
    }

    // Meta only supports period=day for reach, profile_views, and views at account level.
    const period = "day";

    const insights = await instagramService.getInstagramBusinessInsights(
      igBusinessId,
      selectedPage.accessToken,
      ["reach", "profile_views", "views"],
      period,
    );

    res.json({
      success: true,
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      igBusinessId,
      period,
      autoResolved: !req.query.pageId || !req.query.igBusinessId,
      metrics: "reach,profile_views,views",
      insights,
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error(
      "Instagram business insights error:",
      ax?.response?.data ?? err,
    );
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch Instagram business insights",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Resolve pages from /me/accounts then fetch both FB + IG insights in one call.
 * @route   GET /api/instagram/combined/insights?token=LONG_LIVED_TOKEN
 * @access  Public (token in query)
 */
export const getCombinedPlatformInsights = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ success: false, message: "token is required" });
      return;
    }

    const pages = await instagramService.getFacebookPagesBasic(token);
    const combined = await Promise.all(
      pages.map(async (page) => {
        const facebookInsights = await instagramService.getFacebookPageInsights(
          page.id,
          page.accessToken,
        );

        const linked = await instagramService.getLinkedInstagramBusinessId(
          page.id,
          token,
        );
        if (!linked.instagramBusinessId) {
          return {
            facebookPageId: page.id,
            facebookPageName: page.name,
            facebookInsights,
            instagramBusinessId: null,
            instagramInsights: [],
          };
        }

        const instagramInsights =
          await instagramService.getInstagramBusinessInsights(
            linked.instagramBusinessId,
            page.accessToken,
          );

        return {
          facebookPageId: page.id,
          facebookPageName: page.name,
          facebookInsights,
          instagramBusinessId: linked.instagramBusinessId,
          instagramInsights,
        };
      }),
    );

    res.json({
      success: true,
      count: combined.length,
      data: combined,
    });
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } };
    console.error("Combined insights error:", ax?.response?.data ?? err);
    res.status(ax?.response?.status ?? 500).json({
      success: false,
      message: "Failed to fetch combined Facebook + Instagram insights",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Connect Instagram from Flutter: accept Meta token, exchange for long-lived,
 *          fetch Facebook Pages with linked Instagram Business accounts, return for selection.
 *          If user is authenticated, saves metaLongLivedToken + linkedAccounts to DB.
 *          Invariant: never write facebookLongLivedToken (Facebook-only field) here.
 * @route   POST /api/auth/instagram/connect
 * @body    { accessToken: string }  — token from Flutter (Meta OAuth)
 * @access  Public (optional: send Bearer JWT to save to logged-in user)
 */
export const connectInstagram = async (
  req: Request | AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const debugMode =
      req.body?.debug === true ||
      req.query.debug === "1" ||
      req.query.debug === "true";
    const preferredAuthType = getAuthTypeFromBody(
      (req.body?.type || req.body?.loginType || req.body?.provider) as unknown,
    );

    /** Fixes "+" vs space in query strings; Meta rejects "Cannot parse access token" if mangled. */
    const accessToken = instagramService.normalizeMetaAccessToken(
      typeof req.body?.accessToken === "string" ? req.body.accessToken : undefined,
    );

    if (accessToken) {
      const connectKey = `${preferredAuthType}:${tokenFingerprint(accessToken)}`;
      const now = Date.now();
      const lastSeen = recentConnectRequests.get(connectKey);
      if (lastSeen && now - lastSeen < CONNECT_DUPLICATE_WINDOW_MS) {
        console.warn("[META_TOKEN_TRACE] connect:duplicate_suppressed", {
          preferredAuthType,
          requestTokenFingerprint: tokenFingerprint(accessToken),
          duplicateWindowMs: CONNECT_DUPLICATE_WINDOW_MS,
        });
        res.status(202).json({
          message: "Instagram connect request already in progress. Please wait.",
          duplicateSuppressed: true,
        });
        return;
      }
      recentConnectRequests.set(connectKey, now);
      setTimeout(() => {
        const current = recentConnectRequests.get(connectKey);
        if (current === now) {
          recentConnectRequests.delete(connectKey);
        }
      }, CONNECT_DUPLICATE_WINDOW_MS);
    }

    const authReq = req as AuthenticatedRequest;
    const authUserId = authReq.user?._id;

    let userDoc: any = null;
    if (authUserId) {
      userDoc = await User.findById(authUserId);
    }

    const influencerInfo = userDoc?.influencerInfo;
    const savedToken = influencerInfo?.metaLongLivedToken as string | undefined;
    const parsedSavedExpiresAt = influencerInfo?.metaLongLivedTokenExpiresAt
      ? new Date(influencerInfo.metaLongLivedTokenExpiresAt)
      : null;
    const savedTokenExpiresAt =
      parsedSavedExpiresAt && !Number.isNaN(parsedSavedExpiresAt.getTime())
        ? parsedSavedExpiresAt
        : null;

    const refreshBufferDays = Number(
      process.env.META_TOKEN_REFRESH_BUFFER_DAYS || 3,
    );
    const requiredScopes = [
      "instagram_manage_insights",
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "business_management",
    ];
    let longLivedToken: string | null = null;
    let longLivedTokenExpiresAt: Date | null = null;
    let tokenSource: string = "none";

    /** New OAuth token in body must win over saved/rotate path (avoids fb_exchange on IG tokens). */
    const skipSavedTokenReuse =
      preferredAuthType === "instagram" &&
      Boolean(accessToken) &&
      Boolean(savedToken) &&
      tokenFingerprint(accessToken) !== tokenFingerprint(savedToken);

    console.log("[META_TOKEN_TRACE] connect:input", {
      preferredAuthType,
      requestTokenFingerprint: tokenFingerprint(accessToken),
      savedTokenFingerprint: tokenFingerprint(savedToken),
      hasSavedTokenExpiry: Boolean(savedTokenExpiresAt),
      skipSavedTokenReuse,
    });

    // Reuse token only when valid + required scopes intact.
    if (savedToken && savedTokenExpiresAt && !skipSavedTokenReuse) {
      const shouldRefreshByBuffer = instagramService.shouldRefreshMetaToken(
        savedTokenExpiresAt,
        refreshBufferDays,
      );

      if (!shouldRefreshByBuffer) {
        const tokenValidation = await instagramService.validateMetaUserToken(
          savedToken,
          requiredScopes,
          preferredAuthType,
        );
        if (tokenValidation.isValid && tokenValidation.hasRequiredScopes) {
          longLivedToken = savedToken;
          longLivedTokenExpiresAt =
            tokenValidation.expiresAt || savedTokenExpiresAt;
          tokenSource = "saved_valid";
        } else {
          const igLoginValidation = await instagramService.validateMetaUserToken(
            savedToken,
            INSTAGRAM_LOGIN_REQUIRED_SCOPES,
            preferredAuthType,
          );
          try {
            const igMe = await instagramService.getInstagramLoginProfile(
              savedToken,
            );
            if (
              igMe &&
              typeof (igMe as { id?: string }).id === "string" &&
              igLoginValidation.isValid &&
              (igLoginValidation.hasRequiredScopes ||
                igLoginValidation.scopeCheckSkipped)
            ) {
              longLivedToken = savedToken;
              longLivedTokenExpiresAt =
                igLoginValidation.expiresAt || savedTokenExpiresAt;
              tokenSource = "saved_instagram_login";
            }
          } catch {
            /* not an Instagram Login token */
          }
        }
      } else {
        // Token is close to expiry (buffer window): proactively rotate it.
        // Instagram Login tokens must use graph.instagram.com ig_exchange_token — not Facebook fb_exchange_token.
        let rotated: {
          result: {
            accessToken: string;
            expiresIn?: number;
            expiresAt?: Date;
          } | null;
        };
        if (preferredAuthType === "instagram") {
          const igRot =
            await instagramService.exchangeInstagramLongLivedTokenDetailed(
              savedToken,
            );
          rotated = { result: igRot.result };
          if (!rotated.result?.accessToken) {
            const fbRot = await exchangeForLongLivedWithFallback(
              savedToken,
              preferredAuthType,
            );
            rotated = { result: fbRot.result };
          }
        } else {
          const fbRot = await exchangeForLongLivedWithFallback(
            savedToken,
            preferredAuthType,
          );
          rotated = { result: fbRot.result };
        }
        if (rotated.result?.accessToken) {
          longLivedToken = rotated.result.accessToken;
          longLivedTokenExpiresAt = rotated.result.expiresAt || null;
          tokenSource = "saved_rotated";
        }
      }
    }

    // Fallback for old records without expiry: validate + check required scopes.
    if (!longLivedToken && savedToken && !savedTokenExpiresAt && !skipSavedTokenReuse) {
      const tokenValidation = await instagramService.validateMetaUserToken(
        savedToken,
        requiredScopes,
        preferredAuthType,
      );
      if (tokenValidation.isValid && tokenValidation.hasRequiredScopes) {
        longLivedToken = savedToken;
        longLivedTokenExpiresAt = tokenValidation.expiresAt;
        tokenSource = "saved_without_expiry";
      }
    }

    // If token missing/expired/invalid, exchange fresh token from request body.
    if (!longLivedToken) {
      if (!accessToken) {
        res.status(400).json({
          message:
            "Token missing or expired. Please login again and send fresh accessToken.",
        });
        return;
      }

      // Instagram API with Instagram Login (graph.instagram.com) — no Facebook Page
      let igLoginMe: { id?: string } | null = null;
      try {
        igLoginMe = (await instagramService.getInstagramLoginProfile(
          accessToken,
        )) as { id?: string };
      } catch {
        igLoginMe = null;
      }

      if (igLoginMe && typeof igLoginMe.id === "string") {
        const igExchanged =
          await instagramService.exchangeInstagramLongLivedTokenDetailed(
            accessToken,
          );
        if (igExchanged.result?.accessToken) {
          longLivedToken = igExchanged.result.accessToken;
          longLivedTokenExpiresAt = igExchanged.result.expiresAt;
          tokenSource = "instagram_login_long_lived";
        } else {
          longLivedToken = accessToken;
          longLivedTokenExpiresAt = null;
          tokenSource = "instagram_login_short_lived";
        }
      } else {
        // Facebook Login / Graph user token path (Page-linked Instagram)
        const requestTokenValidation = await instagramService.validateMetaUserToken(
          accessToken,
          requiredScopes,
          preferredAuthType,
        );
        const isAlreadyLongLived =
          requestTokenValidation.isValid &&
          requestTokenValidation.hasRequiredScopes &&
          !!requestTokenValidation.expiresAt &&
          requestTokenValidation.expiresAt.getTime() - Date.now() >=
            MIN_LONG_LIVED_TOKEN_MS;

        if (isAlreadyLongLived) {
          longLivedToken = accessToken;
          longLivedTokenExpiresAt = requestTokenValidation.expiresAt;
          tokenSource = "request_already_long_lived";
        } else {
          const longLivedExchange = await exchangeForLongLivedWithFallback(
            accessToken,
            preferredAuthType,
          );
          if (!longLivedExchange.result?.accessToken) {
            if (isMetaSessionInvalidated(longLivedExchange.error)) {
              res.status(401).json({
                message:
                  "Your Meta session was invalidated. Please reconnect Instagram/Facebook and try again.",
                needsReconnect: true,
                reconnectReason: "meta_session_invalidated",
              });
              return;
            }
            res.status(400).json({
              message:
                "Failed to exchange token for long-lived. Check META_APP_ID / META_APP_SECRET.",
            });
            return;
          }
          longLivedToken = longLivedExchange.result.accessToken;
          longLivedTokenExpiresAt = longLivedExchange.result.expiresAt || null;
          tokenSource = "request_exchanged";
        }
      }
    }

    if (!longLivedToken) {
      res.status(400).json({
        message: "Unable to resolve a valid long-lived token for this user.",
      });
      return;
    }

    console.log("[META_TOKEN_TRACE] connect:resolved", {
      preferredAuthType,
      tokenSource,
      requestTokenFingerprint: tokenFingerprint(accessToken),
      resolvedLongLivedFingerprint: tokenFingerprint(longLivedToken),
      sameAsRequestToken: Boolean(accessToken && longLivedToken === accessToken),
      sameAsSavedToken: Boolean(savedToken && longLivedToken === savedToken),
      resolvedExpiry: longLivedTokenExpiresAt,
    });

    const buildLinkedFromInstagramLogin = async () => {
      try {
        const igMe = await instagramService.getInstagramLoginProfile(
          longLivedToken,
        );
        const igId = (igMe as { id?: string })?.id;
        if (igId) {
          return [
            {
              facebookPageId: null,
              facebookPageName: null,
              pageAccessToken: longLivedToken,
              instagramId: igId,
              instagramHandle: (igMe as { username?: string }).username ?? null,
              instagramName: (igMe as { name?: string }).name ?? null,
              profilePic:
                (igMe as { profile_picture_url?: string }).profile_picture_url ??
                null,
              followers:
                typeof (igMe as { followers_count?: number }).followers_count ===
                "number"
                  ? (igMe as { followers_count: number }).followers_count
                  : null,
              category: (igMe as { account_type?: string }).account_type ?? null,
              tasks: [],
              loginSource: "instagram_login",
            },
          ];
        }
      } catch (err: unknown) {
        const ax = err as { response?: { data?: unknown } };
        console.warn(
          "[META_CONNECT] getInstagramLoginProfile failed:",
          ax?.response?.data ?? err,
        );
      }
      return [];
    };

    // 2. Instagram Login (graph.instagram.com) first when client requests type=instagram;
    //    otherwise prefer Facebook Pages + linked IG (legacy Facebook Login flow).
    let linkedAccounts =
      preferredAuthType === "instagram"
        ? await buildLinkedFromInstagramLogin()
        : await instagramService.getPagesWithLinkedInstagramDetails(
            longLivedToken,
          );

    if (linkedAccounts.length === 0) {
      linkedAccounts =
        preferredAuthType === "instagram"
          ? await instagramService.getPagesWithLinkedInstagramDetails(
              longLivedToken,
            )
          : await buildLinkedFromInstagramLogin();
    }

    if (linkedAccounts.length === 0) {
      const rawPages = await instagramService.getUserPages(longLivedToken);
      const tokenValidation = await instagramService.validateMetaUserToken(
        longLivedToken,
        requiredScopes,
        preferredAuthType,
      );
      const pageDiagnostics = rawPages.map(
        (page: {
          id?: string;
          name?: string;
          category?: string;
          tasks?: string[];
          instagram_business_account?: { id?: string };
          connected_instagram_account?: { id?: string };
        }) => ({
          id: page.id || null,
          name: page.name || null,
          category: page.category || null,
          tasks: page.tasks || [],
          hasInstagramBusinessAccount: Boolean(
            page.instagram_business_account?.id,
          ),
          hasConnectedInstagramAccount: Boolean(
            page.connected_instagram_account?.id,
          ),
        }),
      );

      console.warn("[META_CONNECT_DEBUG] No linked Instagram account found", {
        sourceType: preferredAuthType,
        tokenValidation: {
          isValid: tokenValidation.isValid,
          hasRequiredScopes: tokenValidation.hasRequiredScopes,
          missingScopes: tokenValidation.missingScopes,
          grantedScopes: tokenValidation.grantedScopes,
          scopeCheckSkipped: tokenValidation.scopeCheckSkipped,
          expiresAt: tokenValidation.expiresAt,
        },
        pageCount: rawPages.length,
        pageDiagnostics,
      });

      const instagramOnlyFlow = preferredAuthType === "instagram";
      const instagramOnlyMessage =
        "Could not load your Instagram profile. Use a Professional (Business/Creator) account and complete Instagram Login again.";
      const pageLinkMessage =
        "No Instagram Business accounts found connected to your Facebook Pages.";

      if (debugMode) {
        res.status(404).json({
          message: instagramOnlyFlow ? instagramOnlyMessage : pageLinkMessage,
          debug: {
            sourceType: preferredAuthType,
            tokenValidation: {
              isValid: tokenValidation.isValid,
              hasRequiredScopes: tokenValidation.hasRequiredScopes,
              missingScopes: tokenValidation.missingScopes,
              grantedScopes: tokenValidation.grantedScopes,
              scopeCheckSkipped: tokenValidation.scopeCheckSkipped,
              expiresAt: tokenValidation.expiresAt,
            },
            pageCount: rawPages.length,
            pageDiagnostics,
            tips: instagramOnlyFlow
              ? [
                  "Instagram Login (graph.instagram.com) did not return a user id — check token and app permissions.",
                  "Account must be Professional (Business/Creator) for Instagram API with Instagram Login.",
                  "Ensure instagram_business_basic and instagram_business_manage_insights were granted.",
                ]
              : [
                  "Ensure Instagram is Professional (Business/Creator), not Personal.",
                  "Ensure Instagram is connected to the same Facebook Page in Meta Business Suite.",
                  "Ensure app has granted pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights, AND business_management.",
                  "Ensure login user has admin/task access on the connected Facebook Page.",
                  "If Page is under Business Manager, business_management permission is REQUIRED for /me/accounts to return it.",
                  "For New Pages Experience (task-based access), /me/assigned_pages is tried as fallback automatically.",
                  "During OAuth login, ensure 'All Pages' is selected — not specific pages that may miss the Insta-linked page.",
                ],
          },
        });
        return;
      }

      res.status(404).json({
        message: instagramOnlyFlow ? instagramOnlyMessage : pageLinkMessage,
        needsPageLinking: !instagramOnlyFlow,
      });
      return;
    }

    // 3. Save to DB when user is authenticated (JWT in Authorization header)
    if (authUserId) {
      const user = userDoc || (await User.findById(authUserId));
      if (user) {
        if (!user.influencerInfo) {
          user.influencerInfo = {} as any;
        }
        const info = user.influencerInfo as any;
        info.metaLongLivedToken = longLivedToken;
        if (longLivedTokenExpiresAt) {
          // Save as Date object so Mongo stores ISODate and comparisons remain reliable.
          info.metaLongLivedTokenExpiresAt = new Date(longLivedTokenExpiresAt);
        }
        info.instagramLinkedAccounts = linkedAccounts;
        // Also set instagramData.linkedAccounts so Instagram data lives under instagramData
        if (!info.instagramData) info.instagramData = {};
        info.instagramData.linkedAccounts = linkedAccounts;

        // Sync to socialMedia so admin "Social Media" and other UIs that read socialMedia see Instagram
        const existingSocial = Array.isArray(info.socialMedia)
          ? info.socialMedia
          : [];
        const nonInstagram = existingSocial.filter(
          (a: { platform?: string }) =>
            (a?.platform || "").toLowerCase() !== "instagram",
        );
        const first = linkedAccounts[0] as
          | {
              instagramHandle?: string | null;
              instagramName?: string | null;
              profilePic?: string | null;
              followers?: number | null;
              facebookPageId?: string;
            }
          | undefined;
        if (first) {
          const instagramSocialEntry = {
            platform: "instagram",
            url: first.instagramHandle
              ? `https://instagram.com/${first.instagramHandle}`
              : undefined,
            username: first.instagramHandle ?? undefined,
            profilePictureUrl: first.profilePic ?? undefined,
            followers: first.followers ?? undefined,
            isActive: true,
            addedAt:
              existingSocial.find(
                (a: { platform?: string }) =>
                  (a?.platform || "").toLowerCase() === "instagram",
              )?.addedAt ?? new Date(),
            updatedAt: new Date(),
            accessToken: longLivedToken,
            tokenExpiresAt: longLivedTokenExpiresAt
              ? new Date(longLivedTokenExpiresAt)
              : undefined,
          };
          info.socialMedia = [...nonInstagram, instagramSocialEntry];
        } else {
          info.socialMedia = nonInstagram;
        }

        user.markModified("influencerInfo");
        await user.save();
      }
    }

    res.status(200).json({
      status: "success",
      debug: debugMode,
      sourceType: preferredAuthType,
      tokenReused: Boolean(savedToken && longLivedToken === savedToken),
      tokenExpiresAt: longLivedTokenExpiresAt,
      data: linkedAccounts,
    });
  } catch (error: unknown) {
    const ax = error as { response?: { data?: unknown }; message?: string };
    console.error(
      "Meta Connection Error:",
      ax?.response?.data ?? ax?.message ?? error,
    );
    res.status(500).json({
      message: "Failed to connect Instagram",
      error: ax?.response?.data ?? null,
    });
  }
};

const INSTAGRAM_REQUIRED_SCOPES = [
  "instagram_manage_insights",
  "pages_read_engagement",
  "pages_show_list",
  "instagram_basic",
  "business_management",
];
/** Instagram API with Instagram Login (no Facebook Page) — connect + fetch */
const INSTAGRAM_LOGIN_REQUIRED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
];

/**
 * @desc    Check if long-lived Meta token is alive (valid and not expired).
 * @route   GET /api/auth/meta/token/check
 * @query   platform?: 'instagram' | 'facebook'
 * @access  Private (JWT)
 */
export const checkMetaToken = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ valid: false, needsReconnect: true });
      return;
    }
    const platform = (req.query.platform as string)?.toLowerCase();
    const user = await User.findById(userId);
    const info = user?.influencerInfo as any;
    const refreshBufferDays = Number(
      process.env.META_TOKEN_REFRESH_BUFFER_DAYS || 3,
    );

    if (platform === "facebook") {
      const token = info?.facebookLongLivedToken || info?.metaLongLivedToken;
      const expiresAt =
        info?.facebookLongLivedTokenExpiresAt ||
        info?.metaLongLivedTokenExpiresAt;
      if (!token) {
        res
          .status(200)
          .json({ valid: false, expiresAt: null, needsReconnect: true });
        return;
      }
      const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
      const shouldRefresh =
        parsedExpiresAt &&
        instagramService.shouldRefreshMetaToken(
          parsedExpiresAt,
          refreshBufferDays,
        );
      const validation = await instagramService.validateMetaUserToken(
        token,
        FACEBOOK_REQUIRED_SCOPES,
        "facebook",
      );
      const valid =
        validation.isValid &&
        (validation.hasRequiredScopes || validation.scopeCheckSkipped) &&
        !shouldRefresh;
      res.status(200).json({
        valid,
        expiresAt: validation.expiresAt || parsedExpiresAt,
        needsReconnect: !valid,
      });
      return;
    }

    // Instagram (default)
    const token = info?.metaLongLivedToken;
    const expiresAt = info?.metaLongLivedTokenExpiresAt;
    if (!token) {
      res
        .status(200)
        .json({ valid: false, expiresAt: null, needsReconnect: true });
      return;
    }
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
    const shouldRefresh =
      parsedExpiresAt &&
      instagramService.shouldRefreshMetaToken(
        parsedExpiresAt,
        refreshBufferDays,
      );
    const validationFb = await instagramService.validateMetaUserToken(
      token,
      INSTAGRAM_REQUIRED_SCOPES,
      "instagram",
    );
    const validationIg = await instagramService.validateMetaUserToken(
      token,
      INSTAGRAM_LOGIN_REQUIRED_SCOPES,
      "instagram",
    );
    const validation =
      validationFb.isValid &&
      (validationFb.hasRequiredScopes || validationFb.scopeCheckSkipped)
        ? validationFb
        : validationIg;
    const valid =
      validation.isValid &&
      (validation.hasRequiredScopes || validation.scopeCheckSkipped) &&
      !shouldRefresh;
    res.status(200).json({
      valid,
      expiresAt: validation.expiresAt || parsedExpiresAt,
      needsReconnect: !valid,
    });
  } catch (err: unknown) {
    const ax = err as { message?: string };
    console.error("Token check error:", ax?.message ?? err);
    res.status(500).json({ valid: false, needsReconnect: true });
  }
};

/**
 * @desc    Connect Facebook: accept token from deep link or reuse existing Meta token.
 *          Saves facebookLongLivedToken + facebookData.pages. No redirect when reusing token.
 *          Invariant: never write metaLongLivedToken (Instagram field) here — only facebookLongLivedToken / pages.
 * @route   POST /api/auth/facebook/connect
 * @body    { accessToken?: string }
 * @access  Public (optional JWT to save to user)
 */
export const connectFacebook = async (
  req: Request | AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { accessToken } = req.body || {};
    const authReq = req as AuthenticatedRequest;
    const authUserId = authReq.user?._id;

    let userDoc: any = null;
    if (authUserId) {
      userDoc = await User.findById(authUserId);
    }

    const info = userDoc?.influencerInfo as any;
    const savedMetaToken = info?.metaLongLivedToken;
    const savedMetaExpiresAt = info?.metaLongLivedTokenExpiresAt
      ? new Date(info.metaLongLivedTokenExpiresAt)
      : null;
    const savedFbToken = info?.facebookLongLivedToken;
    const savedFbExpiresAt = info?.facebookLongLivedTokenExpiresAt
      ? new Date(info.facebookLongLivedTokenExpiresAt)
      : null;
    const refreshBufferDays = Number(
      process.env.META_TOKEN_REFRESH_BUFFER_DAYS || 3,
    );

    let longLivedToken: string | null = null;
    let longLivedTokenExpiresAt: Date | null = null;
    let usedFacebookOnlyToken = false;

    // Reuse existing token if valid
    if (
      savedFbToken &&
      savedFbExpiresAt &&
      !instagramService.shouldRefreshMetaToken(
        savedFbExpiresAt,
        refreshBufferDays,
      )
    ) {
      const validation = await instagramService.validateMetaUserToken(
        savedFbToken,
        FACEBOOK_REQUIRED_SCOPES,
        "facebook",
      );
      if (
        validation.isValid &&
        (validation.hasRequiredScopes || validation.scopeCheckSkipped)
      ) {
        longLivedToken = savedFbToken;
        longLivedTokenExpiresAt = validation.expiresAt || savedFbExpiresAt;
        usedFacebookOnlyToken = true;
      }
    }
    if (
      !longLivedToken &&
      savedMetaToken &&
      savedMetaExpiresAt &&
      !instagramService.shouldRefreshMetaToken(
        savedMetaExpiresAt,
        refreshBufferDays,
      )
    ) {
      const validation = await instagramService.validateMetaUserToken(
        savedMetaToken,
        FACEBOOK_REQUIRED_SCOPES,
        "facebook",
      );
      if (
        validation.isValid &&
        (validation.hasRequiredScopes || validation.scopeCheckSkipped)
      ) {
        longLivedToken = savedMetaToken;
        longLivedTokenExpiresAt = validation.expiresAt || savedMetaExpiresAt;
      }
    }

    if (!longLivedToken && accessToken) {
      const exchanged =
        await instagramService.exchangeFacebookTokenForLongLived(
          accessToken,
          "facebook",
        );
      if (exchanged?.accessToken) {
        longLivedToken = exchanged.accessToken;
        longLivedTokenExpiresAt = exchanged.expiresAt || null;
        usedFacebookOnlyToken = true;
      }
    }

    if (!longLivedToken) {
      res.status(400).json({
        message: "Token missing or expired. Please connect again.",
        needsReconnect: true,
        authUrl: "/auth/facebook",
      });
      return;
    }

    const pages = await instagramService.getFacebookPagesBasic(longLivedToken);
    const pageDetails = await Promise.all(
      pages.map(
        async (page: { id: string; name: string; accessToken: string }) => {
          const stats = await instagramService.getFacebookPageStats(
            page.id,
            page.accessToken,
          );
          return {
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.accessToken,
            fanCount: stats.fanCount ?? undefined,
            followersCount: stats.followersCount ?? undefined,
          };
        },
      ),
    );

    if (authUserId && userDoc) {
      const user = userDoc;
      if (!user.influencerInfo) user.influencerInfo = {} as any;
      const inf = user.influencerInfo as any;
      if (usedFacebookOnlyToken && longLivedToken !== savedMetaToken) {
        inf.facebookLongLivedToken = longLivedToken;
        inf.facebookLongLivedTokenExpiresAt = longLivedTokenExpiresAt
          ? new Date(longLivedTokenExpiresAt)
          : undefined;
      }
      if (!inf.facebookData) inf.facebookData = { pages: [] };
      inf.facebookData.pages = pageDetails;
      inf.facebookData.lastFetchedAt = new Date();
      user.markModified("influencerInfo");
      await user.save();
    }

    res.status(200).json({
      status: "success",
      tokenReused:
        Boolean(savedMetaToken && longLivedToken === savedMetaToken) ||
        Boolean(savedFbToken && longLivedToken === savedFbToken),
      data: { pages: pageDetails },
    });
  } catch (error: unknown) {
    const ax = error as { response?: { data?: unknown }; message?: string };
    console.error(
      "Facebook connect error:",
      ax?.response?.data ?? ax?.message ?? error,
    );
    res.status(500).json({
      message: "Failed to connect Facebook",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Fetch Instagram profile, posts/reels/videos (with per-post engagement + insights), and
 *          account insights; save all to influencerInfo.instagramData and sync to socialMedia.
 * @route   POST /api/auth/instagram/fetch
 * @access  Private (JWT)
 */
export const fetchInstagramData = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized", needsReconnect: false });
      return;
    }
    const user = await User.findById(userId);
    const info = user?.influencerInfo as any;
    const token = info?.metaLongLivedToken;
    const refreshBufferDays = Number(
      process.env.META_TOKEN_REFRESH_BUFFER_DAYS || 3,
    );

    if (!token) {
      res
        .status(401)
        .json({ message: "No Instagram token", needsReconnect: true });
      return;
    }
    const expiresAt = info?.metaLongLivedTokenExpiresAt
      ? new Date(info.metaLongLivedTokenExpiresAt)
      : null;
    if (
      expiresAt &&
      instagramService.shouldRefreshMetaToken(expiresAt, refreshBufferDays)
    ) {
      res.status(401).json({ message: "Token expired", needsReconnect: true });
      return;
    }
    const fbValidation = await instagramService.validateMetaUserToken(
      token,
      INSTAGRAM_REQUIRED_SCOPES,
      "instagram",
    );
    const igLoginValidation = await instagramService.validateMetaUserToken(
      token,
      INSTAGRAM_LOGIN_REQUIRED_SCOPES,
      "instagram",
    );
    const tokenOk =
      (fbValidation.isValid &&
        (fbValidation.hasRequiredScopes || fbValidation.scopeCheckSkipped)) ||
      (igLoginValidation.isValid &&
        (igLoginValidation.hasRequiredScopes ||
          igLoginValidation.scopeCheckSkipped));
    if (!tokenOk) {
      res.status(401).json({
        message: "Token invalid or missing scopes",
        needsReconnect: true,
      });
      return;
    }

    let linkedAccounts: Awaited<
      ReturnType<typeof instagramService.getPagesWithLinkedInstagramDetails>
    > = [];
    try {
      const igMe = await instagramService.getInstagramLoginProfile(token);
      const igId = (igMe as { id?: string })?.id;
      if (igId) {
        linkedAccounts = [
          {
            facebookPageId: null,
            facebookPageName: null,
            pageAccessToken: token,
            instagramId: igId,
            instagramHandle: (igMe as { username?: string }).username ?? null,
            instagramName: (igMe as { name?: string }).name ?? null,
            profilePic:
              (igMe as { profile_picture_url?: string }).profile_picture_url ??
              null,
            followers:
              typeof (igMe as { followers_count?: number }).followers_count ===
              "number"
                ? (igMe as { followers_count: number }).followers_count
                : null,
            category: (igMe as { account_type?: string }).account_type ?? null,
            tasks: [],
            loginSource: "instagram_login",
          },
        ];
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: unknown } };
      console.warn(
        "[fetchInstagramData] Instagram Login profile failed:",
        ax?.response?.data ?? err,
      );
    }

    if (linkedAccounts.length === 0) {
      linkedAccounts =
        await instagramService.getPagesWithLinkedInstagramDetails(token);
    }

    const savedLinked = (info?.instagramLinkedAccounts ||
      info?.instagramData?.linkedAccounts) as unknown[] | undefined;
    if (
      linkedAccounts.length === 0 &&
      Array.isArray(savedLinked) &&
      savedLinked.length > 0
    ) {
      const igOnly = savedLinked.filter((a: unknown) => {
        const row = a as { loginSource?: string };
        return row.loginSource === "instagram_login";
      });
      if (igOnly.length > 0) {
        linkedAccounts = igOnly as typeof linkedAccounts;
      }
    }

    if (linkedAccounts.length === 0) {
      res.status(404).json({
        message: "No Instagram Business accounts found",
        needsReconnect: false,
      });
      return;
    }

    const first = linkedAccounts[0] as {
      instagramId: string;
      pageAccessToken: string;
      loginSource?: string;
      facebookPageId?: string | null;
      instagramHandle?: string | null;
      profilePic?: string | null;
      followers?: number | null;
    };
    const isInstagramLoginOnly =
      first.loginSource === "instagram_login" || first.facebookPageId == null;

    let profile: unknown;
    let mediaRaw: unknown[];
    let insightsRaw: unknown[];

    if (isInstagramLoginOnly) {
      profile = await instagramService.getInstagramLoginProfile(token);
      mediaRaw = await instagramService.getInstagramLoginMedia(
        first.instagramId,
        token,
        30,
      );
      insightsRaw = await instagramService.getInstagramLoginAccountInsights(
        first.instagramId,
        token,
        "day",
      );
    } else {
      const bundle = await Promise.all([
        instagramService.getInstagramBusinessProfile(
          first.instagramId,
          first.pageAccessToken,
        ),
        instagramService.getBusinessMedia(
          first.instagramId,
          first.pageAccessToken,
          30,
        ),
        instagramService.getInsights(
          first.instagramId,
          first.pageAccessToken,
          "day",
        ),
      ]);
      profile = bundle[0];
      mediaRaw = bundle[1] as unknown[];
      insightsRaw = bundle[2] as unknown[];
    }

    // Enrich each post/reel with per-media lifetime insights (reach, saved, views)
    const mediaList = mediaRaw || [];
    const insightsPerMedia = isInstagramLoginOnly
      ? mediaList.map(() => ({
          status: "fulfilled" as const,
          value: {} as { reach?: number; saved?: number; views?: number },
        }))
      : await Promise.allSettled(
          mediaList.map((m: unknown) =>
            instagramService.getMediaInsights(
              (m as { id: string }).id,
              first.pageAccessToken,
            ),
          ),
        );

    const posts = mediaList.map((m: any, index: number) => {
      const extra =
        insightsPerMedia[index]?.status === "fulfilled"
          ? insightsPerMedia[index].value
          : {};
      return {
        id: m.id,
        caption: m.caption,
        mediaType: m.media_type || "IMAGE",
        mediaUrl: m.media_url,
        thumbnailUrl: m.thumbnail_url,
        permalink: m.permalink,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        likesCount: m.like_count,
        commentsCount: m.comments_count,
        impressions: extra?.views ?? m.impressions,
        reach: extra?.reach ?? m.reach,
        engagement: (m.like_count || 0) + (m.comments_count || 0),
        saves: extra?.saved ?? m.saves,
      };
    });

    const insightsData: Record<string, number> = {};
    (insightsRaw || []).forEach((raw: unknown) => {
      const item = raw as {
        name?: string;
        values?: { value: number }[];
        total_value?: { value?: number };
      };
      const name = item.name;
      const val =
        typeof item.total_value?.value === "number"
          ? item.total_value.value
          : item.values?.[0]?.value;
      if (name != null && typeof val === "number") insightsData[name] = val;
    });

    if (!user!.influencerInfo) user!.influencerInfo = {} as any;
    const inf = user!.influencerInfo as any;
    if (!inf.instagramData) inf.instagramData = {};
    inf.instagramData.linkedAccounts = linkedAccounts;
    inf.instagramData.profile = profile || undefined;
    inf.instagramData.posts = posts;
    inf.instagramData.insights = {
      reach: insightsData.reach ?? inf.instagramData.insights?.reach,
      profileViews:
        insightsData.profile_views ?? inf.instagramData.insights?.profileViews,
      impressions:
        insightsData.views ??
        insightsData.impressions ??
        inf.instagramData.insights?.impressions,
      updatedAt: new Date(),
    };
    inf.instagramData.lastFetchedAt = new Date();
    inf.instagramLinkedAccounts = linkedAccounts;

    // Keep socialMedia in sync so admin "Social Media" shows Instagram
    const existingSocial = Array.isArray(inf.socialMedia)
      ? inf.socialMedia
      : [];
    const nonInstagram = existingSocial.filter(
      (a: { platform?: string }) =>
        (a?.platform || "").toLowerCase() !== "instagram",
    );
    const profileData = profile as
      | {
          username?: string;
          profile_picture_url?: string;
          followers_count?: number;
        }
      | undefined;
    const instagramSocialEntry = {
      platform: "instagram",
      url:
        (profileData?.username ?? first.instagramHandle)
          ? `https://instagram.com/${profileData?.username ?? first.instagramHandle}`
          : undefined,
      username: profileData?.username ?? first.instagramHandle ?? undefined,
      profilePictureUrl:
        profileData?.profile_picture_url ?? first.profilePic ?? undefined,
      followers: profileData?.followers_count ?? first.followers ?? undefined,
      isActive: true,
      addedAt:
        existingSocial.find(
          (a: { platform?: string }) =>
            (a?.platform || "").toLowerCase() === "instagram",
        )?.addedAt ?? new Date(),
      updatedAt: new Date(),
      accessToken: token,
      tokenExpiresAt: info?.metaLongLivedTokenExpiresAt
        ? new Date(info.metaLongLivedTokenExpiresAt)
        : undefined,
      insights: inf.instagramData.insights,
      posts,
    };
    inf.socialMedia = [...nonInstagram, instagramSocialEntry];

    user!.markModified("influencerInfo");
    await user!.save();

    res.status(200).json({
      status: "success",
      data: inf.instagramData,
      lastFetchedAt: inf.instagramData.lastFetchedAt,
    });
  } catch (error: unknown) {
    const ax = error as { response?: { data?: unknown }; message?: string };
    console.error(
      "Fetch Instagram data error:",
      ax?.response?.data ?? ax?.message ?? error,
    );
    res.status(500).json({
      message: "Failed to fetch Instagram data",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Fetch Facebook data from Meta and save to influencerInfo.facebookData.
 * @route   POST /api/auth/facebook/fetch
 * @access  Private (JWT)
 */
export const fetchFacebookData = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    console.log("[FB fetch] POST /api/auth/facebook/fetch hit", { userId: userId?.toString() });
    if (!userId) {
      res.status(401).json({ message: "Unauthorized", needsReconnect: false });
      return;
    }
    const user = await User.findById(userId);
    const info = user?.influencerInfo as any;
    const token =
      info?.facebookLongLivedToken ||
      (info?.metaLongLivedToken
        ? await (async () => {
            const v = await instagramService.validateMetaUserToken(
              info.metaLongLivedToken,
              FACEBOOK_REQUIRED_SCOPES,
              "facebook",
            );
            return v.isValid && (v.hasRequiredScopes || v.scopeCheckSkipped)
              ? info.metaLongLivedToken
              : null;
          })()
        : null);

    if (!token) {
      console.log("[FB fetch] No Facebook token");
      res
        .status(401)
        .json({ message: "No Facebook token", needsReconnect: true });
      return;
    }
    console.log("[FB fetch] Token present, validating with Meta...");
    // Rely on Meta validation; stored expiry can be wrong or missing
    const validation = await instagramService.validateMetaUserToken(
      token,
      FACEBOOK_REQUIRED_SCOPES,
      "facebook",
    );
    if (
      !validation.isValid ||
      !(validation.hasRequiredScopes || validation.scopeCheckSkipped)
    ) {
      console.log("[FB fetch] Token invalid or missing scopes -> 401");
      res.status(401).json({
        message: validation.isValid
          ? "Token missing scopes"
          : "Token expired or invalid",
        needsReconnect: true,
      });
      return;
    }
    console.log("[FB fetch] Token valid, loading pages...");

    type PageInput = {
      pageId: string;
      pageName: string;
      pageAccessToken: string;
      fanCount?: number;
      followersCount?: number;
    };
    let pages: PageInput[] = (info?.facebookData?.pages || []) as PageInput[];
    if (pages.length === 0) {
      console.log("[FB fetch] No cached pages, fetching from Meta GET /me/accounts...");
      const basicPages = await instagramService.getFacebookPagesBasic(token);
      pages = basicPages.map(
        (p: { id: string; name: string; accessToken: string }) => ({
          pageId: p.id,
          pageName: p.name,
          pageAccessToken: p.accessToken,
        }),
      );
      console.log("[FB fetch] Fetched", pages.length, "page(s)", pages.map((p) => ({ id: p.pageId, name: p.pageName })));
    } else {
      console.log("[FB fetch] Using", pages.length, "cached page(s)", pages.map((p) => ({ id: p.pageId, name: p.pageName })));
    }

    console.log("[FB fetch] For each page: fetching stats (GET /pageId), posts (GET /pageId/feed), insights (GET /pageId/insights)...");
    const updatedPages = await Promise.all(
      pages.map(async (page) => {
        const [stats, posts, insights] = await Promise.all([
          instagramService.getFacebookPageStats(
            page.pageId,
            page.pageAccessToken,
          ),
          instagramService.getFacebookPagePosts(
            page.pageId,
            page.pageAccessToken,
            25,
          ),
          instagramService.getFacebookPageInsights(
            page.pageId,
            page.pageAccessToken,
          ),
        ]);
        console.log("[FB fetch] Page", page.pageName, "(", page.pageId, "): stats:", { fanCount: stats.fanCount ?? page.fanCount, followersCount: stats.followersCount ?? page.followersCount }, "| posts:", (posts || []).length, "| insights:", (insights || []).length);
        return {
          pageId: page.pageId,
          pageName: page.pageName,
          pageAccessToken: page.pageAccessToken,
          fanCount: stats.fanCount ?? page.fanCount,
          followersCount: stats.followersCount ?? page.followersCount,
          posts: posts || [],
          insights: insights || [],
          lastFetchedAt: new Date(),
        };
      }),
    );

    console.log("[FB fetch] All data fetched. Saving to influencerInfo.facebookData...");
    if (!user!.influencerInfo) user!.influencerInfo = {} as any;
    const inf = user!.influencerInfo as any;
    if (!inf.facebookData) inf.facebookData = { pages: [] };
    inf.facebookData.pages = updatedPages;
    inf.facebookData.lastFetchedAt = new Date();
    user!.markModified("influencerInfo");
    await user!.save();

    console.log("[FB fetch] Saved. Responding 200. Pages:", inf.facebookData.pages?.length, "| Total posts:", inf.facebookData.pages?.reduce((sum: number, p: { posts?: unknown[] }) => sum + (p.posts?.length || 0), 0));
    res.status(200).json({
      status: "success",
      data: inf.facebookData,
      lastFetchedAt: inf.facebookData.lastFetchedAt,
    });
  } catch (error: unknown) {
    const ax = error as { response?: { data?: unknown }; message?: string };
    console.error("[FB fetch] Error:", ax?.response?.data ?? ax?.message ?? error);
    res.status(500).json({
      message: "Failed to fetch Facebook data",
      error: ax?.response?.data ?? null,
    });
  }
};

/**
 * @desc    Remove stored Instagram long-lived token and cached IG data (Mongo).
 * @route   POST /api/auth/instagram/disconnect
 * @access  Private (JWT)
 */
export const userDisconnectInstagram = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          "influencerInfo.metaLongLivedToken": "",
          "influencerInfo.metaLongLivedTokenExpiresAt": "",
          "influencerInfo.instagramLinkedAccounts": "",
          "influencerInfo.instagramData": "",
        },
      },
    );
    res.status(200).json({ status: "success", message: "Instagram data removed" });
  } catch (e: unknown) {
    const ax = e as { message?: string };
    console.error("userDisconnectInstagram:", ax?.message ?? e);
    res.status(500).json({ message: "Failed to clear Instagram data" });
  }
};

/**
 * @desc    Remove stored Facebook Page token and cached Facebook data (Mongo). Does not touch metaLongLivedToken (Instagram).
 * @route   POST /api/auth/facebook/disconnect
 * @access  Private (JWT)
 */
export const userDisconnectFacebook = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          "influencerInfo.facebookLongLivedToken": "",
          "influencerInfo.facebookLongLivedTokenExpiresAt": "",
          "influencerInfo.facebookData": "",
        },
      },
    );
    res.status(200).json({ status: "success", message: "Facebook data removed" });
  } catch (e: unknown) {
    const ax = e as { message?: string };
    console.error("userDisconnectFacebook:", ax?.message ?? e);
    res.status(500).json({ message: "Failed to clear Facebook data" });
  }
};
