import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const META_GRAPH_VERSION = "v23.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
/** Instagram API with Instagram Login (no Facebook Page) — graph + OAuth token endpoints */
const INSTAGRAM_GRAPH_HOST = "https://graph.instagram.com";
const INSTAGRAM_API_OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";
type MetaAuthType = "instagram" | "facebook";
type InsightPeriod = "day" | "week" | "days_28" | "lifetime";
const IG_INSIGHT_METRIC_ALIASES: Record<string, string> = {
  impressions: "views",
  engagement: "accounts_engaged",
};
const DEFAULT_IG_INSIGHT_METRICS = ["reach", "profile_views", "views"];
const IG_TOTAL_VALUE_METRICS = new Set(["profile_views", "views"]);
const SCOPE_ALIASES: Record<string, string[]> = {
  instagram_basic: ["instagram_business_basic"],
  instagram_manage_insights: ["instagram_business_manage_insights"],
  instagram_business_basic: ["instagram_basic"],
  instagram_business_manage_insights: ["instagram_manage_insights"],
};
type TokenValidationResult = {
  isValid: boolean;
  hasRequiredScopes: boolean;
  grantedScopes: string[];
  missingScopes: string[];
  expiresAt: Date | null;
  scopeCheckSkipped: boolean;
};

type MetaExchangeErrorInfo = {
  code?: number;
  subcode?: number;
  type?: string;
  message?: string;
};

type MetaLongLivedTokenExchangeResult = {
  accessToken: string;
  expiresIn: number;
  expiresAt: Date;
};

type MetaLongLivedTokenExchangeDetailedResult = {
  result: MetaLongLivedTokenExchangeResult | null;
  error: MetaExchangeErrorInfo | null;
};

type GenericRecord = Record<string, unknown>;

const getNestedValue = (source: unknown, path: string): unknown => {
  if (!source || typeof source !== "object") return undefined;
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as GenericRecord)[part];
  }

  return current;
};

const resolveFirstStringValue = (
  source: unknown,
  candidates: string[],
): string | null => {
  for (const candidate of candidates) {
    const value = getNestedValue(source, candidate);
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return null;
};

const normalizeInstagramInsightMetrics = (
  metrics: string[] = DEFAULT_IG_INSIGHT_METRICS,
) => {
  const normalized = metrics
    .map((metric) => metric.trim())
    .filter(Boolean)
    .map((metric) => IG_INSIGHT_METRIC_ALIASES[metric] || metric);

  return [...new Set(normalized)].join(",");
};

const requiresTotalValueMetricType = (metricCsv: string): boolean =>
  metricCsv
    .split(",")
    .map((m) => m.trim())
    .some((m) => IG_TOTAL_VALUE_METRICS.has(m));

const getPlatformClientId = (type: MetaAuthType): string | undefined => {
  if (type === "facebook") {
    return process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
  }
  // Prefer Instagram-product app id (Instagram Login) for token debug + Graph calls
  return (
    process.env.INSTAGRAM_BUSINESS_LOGIN_CLIENT_ID?.trim() ||
    process.env.INSTAGRAM_APP_ID ||
    process.env.META_APP_ID
  );
};

const getPlatformClientSecret = (type: MetaAuthType): string | undefined => {
  if (type === "facebook") {
    return process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
  }
  return (
    process.env.INSTAGRAM_BUSINESS_LOGIN_CLIENT_SECRET?.trim() ||
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.META_APP_SECRET
  );
};

/**
 * Service to handle Meta (Instagram & Facebook) API interactions
 */
export const instagramService = {
  /**
   * Query strings often turn "+" into spaces; Meta tokens break and return OAuth 190.
   */
  normalizeMetaAccessToken: (
    token: string | undefined | null,
  ): string | undefined => {
    if (token == null || typeof token !== "string") {
      return undefined;
    }
    try {
      const decoded = decodeURIComponent(token.trim());
      const fixed = decoded.replace(/\s+/g, "+");
      return fixed.length === 0 ? undefined : fixed;
    } catch {
      const fixed = token.trim().replace(/\s+/g, "+");
      return fixed.length === 0 ? undefined : fixed;
    }
  },

  /**
   * Unify Client Secret retrieval
   */
  getSecret: () =>
    process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET,
  getClientId: () => process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID,
  /**
   * Exchange Facebook short-lived User Access Token for long-lived (60 days).
   * Use this when the frontend sends the token from Facebook OAuth (our /auth/instagram flow).
   * GET /oauth/access_token?grant_type=fb_exchange_token&client_id=&client_secret=&fb_exchange_token=
   */
  exchangeFacebookTokenForLongLived: async (
    shortLivedToken: string,
    authType: MetaAuthType = "facebook",
  ) => {
    const detailed =
      await instagramService.exchangeFacebookTokenForLongLivedDetailed(
        shortLivedToken,
        authType,
      );
    return detailed.result;
  },

  /**
   * Exchange Facebook short-lived User Access Token for long-lived (60 days)
   * and return normalized error info for callers that need reconnect UX logic.
   */
  exchangeFacebookTokenForLongLivedDetailed: async (
    shortLivedToken: string,
    authType: MetaAuthType = "facebook",
  ): Promise<MetaLongLivedTokenExchangeDetailedResult> => {
    try {
      const clientId = getPlatformClientId(authType);
      const clientSecret = getPlatformClientSecret(authType);
      if (!clientId || !clientSecret) {
        console.warn(
          "⚠️ App ID / Secret missing for long-lived token exchange.",
        );
        return {
          result: null,
          error: {
            message: "App ID / Secret missing for long-lived token exchange.",
          },
        };
      }

      const response = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in || 0) * 1000);

      return {
        result: {
          accessToken: access_token,
          expiresIn: expires_in,
          expiresAt: expiresAt,
        },
        error: null,
      };
    } catch (error: any) {
      const metaError = error?.response?.data?.error;
      const normalizedError: MetaExchangeErrorInfo = {
        code: metaError?.code,
        subcode: metaError?.error_subcode,
        type: metaError?.type,
        message: metaError?.message || error?.message,
      };

      if (normalizedError.code === 190 && normalizedError.subcode === 460) {
        console.warn(
          "⚠️ Meta session invalidated (190/460). Reconnect required.",
        );
      } else {
        console.error(
          "❌ Failed to exchange token for long-lived:",
          error?.response?.data || error.message,
        );
      }
      return {
        result: null,
        error: normalizedError,
      };
    }
  },

  /**
   * Backward-compatible alias for long-lived exchange.
   * Professional flows should use Meta user access tokens via Graph API.
   */
  exchangeForLongLivedToken: async (shortLivedToken: string) => {
    return instagramService.exchangeFacebookTokenForLongLived(shortLivedToken);
  },

  resolveIdFromCandidates: (
    source: unknown,
    candidates: string[] = ["id"],
  ): string | null => resolveFirstStringValue(source, candidates),

  /**
   * Extend/exchange a user token using Graph API exchange endpoint.
   */
  refreshAccessToken: async (currentToken: string) => {
    try {
      const clientId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID;
      const clientSecret =
        process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("META_APP_ID / META_APP_SECRET not configured");
      }

      const response = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: currentToken,
        },
      });

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      return {
        accessToken: access_token,
        expiresAt: expiresAt,
      };
    } catch (error: any) {
      console.error(
        "❌ Failed to refresh Instagram token:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * True when token should be rotated now, using a safety buffer before actual expiry.
   */
  shouldRefreshMetaToken: (
    expiresAt: Date,
    bufferDays: number = 3,
  ): boolean => {
    const safeBufferDays = Number.isFinite(bufferDays)
      ? Math.max(0, bufferDays)
      : 3;
    const bufferMs = safeBufferDays * 24 * 60 * 60 * 1000;
    return expiresAt.getTime() <= Date.now() + bufferMs;
  },

  /**
   * Validate Meta token and, when possible, verify granted scopes via /debug_token.
   * Instagram Login tokens only work on graph.instagram.com/me; Facebook Graph /me fails for them.
   */
  validateMetaUserToken: async (
    accessToken: string,
    requiredScopes: string[] = [],
    authType: MetaAuthType = "instagram",
  ): Promise<TokenValidationResult> => {
    const normalizedRequiredScopes = requiredScopes
      .map((scope) => scope.trim())
      .filter(Boolean);

    const baseResult: TokenValidationResult = {
      isValid: false,
      hasRequiredScopes: normalizedRequiredScopes.length === 0,
      grantedScopes: [],
      missingScopes: normalizedRequiredScopes,
      expiresAt: null,
      scopeCheckSkipped: true,
    };

    const applyDebugToken = async (
      partial: TokenValidationResult,
    ): Promise<TokenValidationResult> => {
      const clientId = getPlatformClientId(authType);
      const clientSecret = getPlatformClientSecret(authType);
      if (!clientId || !clientSecret) {
        return partial;
      }

      const appAccessToken = `${clientId}|${clientSecret}`;
      try {
        const debugResponse = await axios.get(`${META_GRAPH_URL}/debug_token`, {
          params: {
            input_token: accessToken,
            access_token: appAccessToken,
          },
        });

        const debugData = (debugResponse.data?.data || {}) as {
          is_valid?: boolean;
          scopes?: string[];
          expires_at?: number;
        };

        if (debugData.is_valid === false) {
          return {
            ...partial,
            isValid: false,
          };
        }

        const grantedScopes = Array.isArray(debugData.scopes)
          ? debugData.scopes.filter(
              (scope): scope is string => typeof scope === "string",
            )
          : [];
        const hasScopeOrAlias = (scope: string): boolean => {
          const aliases = SCOPE_ALIASES[scope] || [];
          return [scope, ...aliases].some((candidate) =>
            grantedScopes.includes(candidate),
          );
        };

        const missingScopes = normalizedRequiredScopes.filter(
          (scope) => !hasScopeOrAlias(scope),
        );

        return {
          ...partial,
          grantedScopes,
          missingScopes,
          hasRequiredScopes: missingScopes.length === 0,
          scopeCheckSkipped: false,
          expiresAt:
            typeof debugData.expires_at === "number" && debugData.expires_at > 0
              ? new Date(debugData.expires_at * 1000)
              : null,
        };
      } catch {
        return {
          ...partial,
          scopeCheckSkipped: true,
        };
      }
    };

    let resolved = false;

    if (authType === "instagram") {
      try {
        const igRes = await axios.get(`${INSTAGRAM_GRAPH_HOST}/me`, {
          params: {
            fields: "id",
            access_token: accessToken,
          },
        });
        if (igRes.data?.id) {
          resolved = true;
        }
      } catch {
        /* try Facebook Graph below */
      }
    }

    if (!resolved) {
      try {
        const fbRes = await axios.get(`${META_GRAPH_URL}/me`, {
          params: {
            fields: "id",
            access_token: accessToken,
          },
        });
        if (fbRes.data?.id) {
          resolved = true;
        }
      } catch {
        return baseResult;
      }
    }

    if (!resolved) {
      return baseResult;
    }

    const afterMe: TokenValidationResult = {
      ...baseResult,
      isValid: true,
    };

    return applyDebugToken(afterMe);
  },

  /**
   * Fetch first linked Instagram Business profile from Meta Graph.
   * @param accessToken Meta user access token
   */
  getInstagramProfile: async (accessToken: string) => {
    try {
      const pagesWithIg =
        await instagramService.getPagesWithInstagram(accessToken);
      if (!pagesWithIg.length) return null;

      const first = pagesWithIg[0];
      return instagramService.getInstagramBusinessProfile(
        first.igBusinessId,
        first.pageAccessToken,
      );
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch Instagram profile:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * Fetch Instagram Business Profile (business accounts only)
   * Requires professional Instagram scopes configured in Meta app
   */
  getInstagramBusinessProfile: async (igId: string, accessToken: string) => {
    try {
      const response = await axios.get(`${META_GRAPH_URL}/${igId}`, {
        params: {
          fields:
            "id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website",
          access_token: accessToken,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch Instagram business profile:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * Fetch Facebook Page Details (followers, likes, etc.)
   * Requires: pages_read_engagement
   */
  getFacebookPageDetails: async (pageId: string, accessToken: string) => {
    try {
      // For pages, we often need the Page Access Token, but User Access Token with 'pages_read_engagement' works for basic fields
      const response = await axios.get(`${META_GRAPH_URL}/${pageId}`, {
        params: {
          fields:
            "id,name,username,fan_count,followers_count,picture,link,about",
          access_token: accessToken,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch Facebook page details:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * List Facebook Pages with instagram_business_account.
   * GET /me/accounts?fields=id,name,access_token,instagram_business_account
   * Fallback: GET /me/assigned_pages for New Pages Experience (task-based access).
   * Use the returned page access_token for IG Business API (insights, media).
   */
  getUserPages: async (accessToken: string) => {
    try {
      const response = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
        params: {
          fields:
            "id,name,access_token,category,tasks,instagram_business_account,connected_instagram_account",
          access_token: accessToken,
        },
      });
      const pages = response.data.data || [];
      if (pages.length > 0) {
        return pages;
      }

      // Fallback: /me/assigned_pages for task-based access (New Pages Experience)
      console.log(
        "[Meta] /me/accounts returned 0 pages, trying /me/assigned_pages fallback...",
      );
      try {
        const assignedResponse = await axios.get(
          `${META_GRAPH_URL}/me/assigned_pages`,
          {
            params: {
              fields:
                "id,name,access_token,category,tasks,instagram_business_account,connected_instagram_account",
              access_token: accessToken,
            },
          },
        );
        const assignedPages = assignedResponse.data.data || [];
        console.log(
          `[Meta] /me/assigned_pages returned ${assignedPages.length} page(s)`,
        );
        return assignedPages;
      } catch (assignedErr: any) {
        console.warn(
          "[Meta] /me/assigned_pages fallback failed:",
          assignedErr?.response?.data?.error?.message || assignedErr.message,
        );
        return [];
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch user pages:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * Reduced page list used by new split Facebook/Instagram details APIs.
   * Required fields: data[].id, data[].name, data[].access_token
   * Fallback: /me/assigned_pages for New Pages Experience (task-based access).
   */
  getFacebookPagesBasic: async (accessToken: string) => {
    console.log(
      "[FB fetch] Service: GET",
      META_GRAPH_URL,
      "/me/accounts",
      "fields=id,name,access_token",
    );
    const response = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        fields: "id,name,access_token",
        access_token: accessToken,
      },
    });

    let raw = Array.isArray(response.data?.data)
      ? (response.data.data as unknown[])
      : [];

    // Fallback: /me/assigned_pages for New Pages Experience (task-based access)
    if (raw.length === 0) {
      console.log(
        "[FB fetch] /me/accounts returned 0 pages, trying /me/assigned_pages fallback...",
      );
      try {
        const assignedResponse = await axios.get(
          `${META_GRAPH_URL}/me/assigned_pages`,
          {
            params: {
              fields: "id,name,access_token",
              access_token: accessToken,
            },
          },
        );
        raw = Array.isArray(assignedResponse.data?.data)
          ? (assignedResponse.data.data as unknown[])
          : [];
        console.log(
          `[FB fetch] /me/assigned_pages returned ${raw.length} page(s)`,
        );
      } catch (assignedErr: any) {
        console.warn(
          "[FB fetch] /me/assigned_pages fallback failed:",
          assignedErr?.response?.data?.error?.message || assignedErr.message,
        );
      }
    }

    const pages = raw
      .map((page) => {
        const id = instagramService.resolveIdFromCandidates(page, [
          "id",
          "data.id",
          "node.id",
          "page.id",
        ]);
        const name = resolveFirstStringValue(page, ["name", "page.name"]);
        const pageAccessToken = resolveFirstStringValue(page, [
          "access_token",
          "token",
          "page_access_token",
        ]);

        if (!id || !name || !pageAccessToken) {
          return null;
        }

        return {
          id,
          name,
          accessToken: pageAccessToken,
        };
      })
      .filter(
        (page): page is { id: string; name: string; accessToken: string } =>
          Boolean(page),
      );
    console.log(
      "[FB fetch] Service: getFacebookPagesBasic ->",
      pages.length,
      "page(s)",
    );
    return pages;
  },

  /**
   * Required fields: fan_count, followers_count
   */
  getFacebookPageStats: async (pageId: string, accessToken: string) => {
    console.log(
      "[FB fetch] Service: GET",
      META_GRAPH_URL,
      "/" + pageId,
      "fields=id,name,fan_count,followers_count",
    );
    const response = await axios.get(`${META_GRAPH_URL}/${pageId}`, {
      params: {
        fields: "id,name,fan_count,followers_count",
        access_token: accessToken,
      },
    });

    const data = (response.data || {}) as GenericRecord;
    const result = {
      id:
        instagramService.resolveIdFromCandidates(data, ["id", "page.id"]) ||
        pageId,
      name: resolveFirstStringValue(data, ["name", "page.name"]),
      fanCount: typeof data.fan_count === "number" ? data.fan_count : null,
      followersCount:
        typeof data.followers_count === "number" ? data.followers_count : null,
      raw: data,
    };
    console.log("[FB fetch] Service: getFacebookPageStats", pageId, "->", {
      fanCount: result.fanCount,
      followersCount: result.followersCount,
    });
    return result;
  },

  /**
   * Resolve linked IG business account id from a page.
   * Required field: instagram_business_account.id
   */
  getLinkedInstagramBusinessId: async (pageId: string, accessToken: string) => {
    const response = await axios.get(`${META_GRAPH_URL}/${pageId}`, {
      params: {
        fields:
          "id,name,instagram_business_account,connected_instagram_account",
        access_token: accessToken,
      },
    });

    const data = (response.data || {}) as GenericRecord;
    const instagramBusinessId = instagramService.resolveIdFromCandidates(data, [
      "instagram_business_account.id",
      "instagramBusinessAccount.id",
      "connected_instagram_account.id",
    ]);

    return {
      pageId:
        instagramService.resolveIdFromCandidates(data, ["id", "page.id"]) ||
        pageId,
      pageName: resolveFirstStringValue(data, ["name", "page.name"]),
      instagramBusinessId,
      raw: data,
    };
  },

  /**
   * Required fields: username, followers_count, follows_count
   */
  getInstagramStats: async (igBusinessId: string, accessToken: string) => {
    const response = await axios.get(`${META_GRAPH_URL}/${igBusinessId}`, {
      params: {
        fields: "id,username,followers_count,follows_count",
        access_token: accessToken,
      },
    });

    const data = (response.data || {}) as GenericRecord;
    return {
      id:
        instagramService.resolveIdFromCandidates(data, ["id", "ig_id"]) ||
        igBusinessId,
      username: resolveFirstStringValue(data, ["username", "name"]),
      followersCount:
        typeof data.followers_count === "number" ? data.followers_count : null,
      followsCount:
        typeof data.follows_count === "number" ? data.follows_count : null,
      raw: data,
    };
  },

  /**
   * Facebook Page insights.
   * Uses current non-deprecated metrics: page_media_view (page_impressions* deprecated Nov 2025).
   * page_engaged_users was deprecated March 2024; omitted to avoid invalid metric error.
   * GET /{page-id}/insights?metric=page_media_view&period=day
   */
  getFacebookPageInsights: async (pageId: string, pageAccessToken: string) => {
    try {
      console.log(
        "[FB fetch] Service: GET",
        META_GRAPH_URL,
        "/" + pageId + "/insights",
        "metric=page_media_view, period=day",
      );
      const response = await axios.get(`${META_GRAPH_URL}/${pageId}/insights`, {
        params: {
          metric: "page_media_view",
          period: "day",
          access_token: pageAccessToken,
        },
      });
      const data = response.data?.data || [];
      console.log(
        "[FB fetch] Service: getFacebookPageInsights",
        pageId,
        "->",
        data.length,
        "metric(s)",
      );
      return data;
    } catch (error: any) {
      // Metric may still change; don't fail the whole flow
      console.warn(
        "[FB fetch] Service: getFacebookPageInsights",
        pageId,
        "skipped:",
        error?.response?.data?.error?.message || error.message,
      );
      return [];
    }
  },

  /**
   * Facebook Page feed. Requests minimal non-deprecated fields (incl. full_picture, picture) to avoid deprecation #12.
   * GET /{page-id}/feed?access_token=...&limit=25&fields=...
   */
  getFacebookPagePosts: async (
    pageId: string,
    pageAccessToken: string,
    limit: number = 25,
  ) => {
    try {
      const url = `${META_GRAPH_URL}/${pageId}/feed`;
      const fields =
        "id,message,story,created_time,full_picture,picture,permalink_url,shares,status_type,updated_time";
      console.log("[FB fetch] Service: GET", url, "(fields, limit=" + limit + ")");
      const response = await axios.get(url, {
        params: {
          access_token: pageAccessToken,
          limit,
          fields,
        },
      });
      const data = response.data?.data || [];
      console.log("[FB fetch] Service: getFacebookPagePosts", pageId, "->", data.length, "post(s)");
      return data.map((post: GenericRecord) => {
        const shares = (post.shares as { count?: number }) ?? {};
        return {
          id: instagramService.resolveIdFromCandidates(post, ["id"]) || "",
          message: resolveFirstStringValue(post, ["message"]),
          story: resolveFirstStringValue(post, ["story"]),
          created_time:
            typeof (post as { created_time?: string }).created_time === "string"
              ? (post as { created_time: string }).created_time
              : undefined,
          full_picture: resolveFirstStringValue(post, ["full_picture"]),
          link: resolveFirstStringValue(post, ["link"]),
          type: resolveFirstStringValue(post, ["type"]),
          reaction_count: 0,
          comment_count: 0,
          share_count:
            typeof (shares as { count?: number }).count === "number"
              ? (shares as { count: number }).count
              : 0,
          permalink: resolveFirstStringValue(post, ["permalink_url", "permalink"]),
          status_type: resolveFirstStringValue(post, ["status_type"]),
          updated_time:
            typeof (post as { updated_time?: string }).updated_time === "string"
              ? (post as { updated_time: string }).updated_time
              : undefined,
          picture: resolveFirstStringValue(post, ["picture"]),
        };
      });
    } catch (error: any) {
      const code = error?.response?.data?.error?.code;
      const msg = error?.response?.data?.error?.message || error.message;
      console.error("[FB fetch] Service: getFacebookPagePosts", pageId, "FAILED:", code, msg);
      return [];
    }
  },

  /**
   * Instagram Business insights.
   * GET /{instagram-business-id}/insights?metric=reach,profile_views,views
   */
  getInstagramBusinessInsights: async (
    igBusinessId: string,
    pageAccessToken: string,
    metrics: string[] = DEFAULT_IG_INSIGHT_METRICS,
    period: InsightPeriod = "day",
  ) => {
    const metricCsv = normalizeInstagramInsightMetrics(metrics);
    const response = await axios.get(
      `${META_GRAPH_URL}/${igBusinessId}/insights`,
      {
        params: {
          metric: metricCsv,
          ...(requiresTotalValueMetricType(metricCsv)
            ? { metric_type: "total_value" }
            : {}),
          period,
          access_token: pageAccessToken,
        },
      },
    );
    return response.data?.data || [];
  },

  /**
   * Get pages that have an Instagram Business Account connected.
   * Returns { pageId, pageName, pageAccessToken, igBusinessId } for each such page.
   */
  getPagesWithInstagram: async (userAccessToken: string) => {
    const pages = await instagramService.getUserPages(userAccessToken);
    const withIg = pages
      .filter(
        (p: {
          instagram_business_account?: { id: string };
          connected_instagram_account?: { id: string };
        }) =>
          p.instagram_business_account?.id || p.connected_instagram_account?.id,
      )
      .map(
        (p: {
          id: string;
          name: string;
          access_token: string;
          instagram_business_account?: { id: string };
          connected_instagram_account?: { id: string };
        }) => ({
          pageId: p.id,
          pageName: p.name,
          pageAccessToken: p.access_token,
          igBusinessId:
            p.instagram_business_account?.id ||
            p.connected_instagram_account?.id ||
            "",
        }),
      )
      .filter((p: { igBusinessId: string }) => Boolean(p.igBusinessId));
    return withIg;
  },

  /**
   * Fetch Facebook Pages with full Instagram Business Account details.
   * GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}
   * Fallback: /me/assigned_pages for New Pages Experience (task-based access).
   * For use by POST /api/auth/instagram/connect (Flutter token flow).
   */
  getPagesWithLinkedInstagramDetails: async (longLivedToken: string) => {
    const igDetailFields =
      "id,name,access_token,tasks,category,instagram_business_account{id,username,name,profile_picture_url,followers_count},connected_instagram_account{id,username,name,profile_picture_url,followers_count}";

    const response = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        fields: igDetailFields,
        access_token: longLivedToken,
      },
    });
    let pages = response.data.data || [];

    // Fallback: /me/assigned_pages for task-based access (New Pages Experience)
    if (pages.length === 0) {
      console.log(
        "[Meta] getPagesWithLinkedInstagramDetails: /me/accounts returned 0 pages, trying /me/assigned_pages...",
      );
      try {
        const assignedResponse = await axios.get(
          `${META_GRAPH_URL}/me/assigned_pages`,
          {
            params: {
              fields: igDetailFields,
              access_token: longLivedToken,
            },
          },
        );
        pages = assignedResponse.data.data || [];
        console.log(
          `[Meta] /me/assigned_pages returned ${pages.length} page(s)`,
        );
      } catch (assignedErr: any) {
        console.warn(
          "[Meta] /me/assigned_pages fallback failed:",
          assignedErr?.response?.data?.error?.message || assignedErr.message,
        );
      }
    }
    const linkedAccounts = pages
      .filter(
        (p: {
          instagram_business_account?: { id?: string };
          connected_instagram_account?: { id?: string };
        }) =>
          p.instagram_business_account?.id || p.connected_instagram_account?.id,
      )
      .map(
        (p: {
          id: string;
          name: string;
          access_token: string;
          instagram_business_account?: {
            id: string;
            username?: string;
            name?: string;
            profile_picture_url?: string;
            followers_count?: number;
          };
          connected_instagram_account?: {
            id: string;
            username?: string;
            name?: string;
            profile_picture_url?: string;
            followers_count?: number;
          };
        }) => ({
          // Prefer instagram_business_account, fallback to connected_instagram_account.
          _ig: p.instagram_business_account?.id
            ? p.instagram_business_account
            : p.connected_instagram_account,
          facebookPageId: p.id,
          facebookPageName: p.name,
          pageAccessToken: p.access_token,
          instagramId:
            p.instagram_business_account?.id ||
            p.connected_instagram_account?.id ||
            null,
          instagramHandle:
            p.instagram_business_account?.username ||
            p.connected_instagram_account?.username ||
            null,
          instagramName:
            p.instagram_business_account?.name ||
            p.connected_instagram_account?.name ||
            null,
          profilePic:
            p.instagram_business_account?.profile_picture_url ||
            p.connected_instagram_account?.profile_picture_url ||
            null,
          followers:
            p.instagram_business_account?.followers_count ??
            p.connected_instagram_account?.followers_count ??
            null,
          category: (p as { category?: string }).category || null,
          tasks: (p as { tasks?: string[] }).tasks || [],
        }),
      )
      .filter((a: { instagramId: string | null }) => Boolean(a.instagramId))
      .map(
        ({ _ig, ...rest }: { _ig?: unknown; [key: string]: unknown }) => rest,
      );
    return linkedAccounts;
  },

  /**
   * Fetch Instagram Business/Creator account-level insights.
   * GET /{ig-business-id}/insights?metric=reach,profile_views,accounts_engaged&period=day|week|days_28|lifetime
   */
  getInsights: async (
    igBusinessId: string,
    pageAccessToken: string,
    period: InsightPeriod = "day",
  ) => {
    try {
      const metricCsv = normalizeInstagramInsightMetrics([
        "reach",
        "profile_views",
        "accounts_engaged",
      ]);
      const response = await axios.get(
        `${META_GRAPH_URL}/${igBusinessId}/insights`,
        {
          params: {
            metric: metricCsv,
            ...(requiresTotalValueMetricType(metricCsv)
              ? { metric_type: "total_value" }
              : {}),
            period,
            access_token: pageAccessToken,
          },
        },
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch Instagram insights:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * Fetch Instagram Business Media (posts, reels, videos) with engagement.
   * GET /{ig-business-id}/media?fields=like_count,comments_count,media_url,...
   */
  getBusinessMedia: async (
    igId: string,
    accessToken: string,
    limit: number = 30,
  ) => {
    try {
      const response = await axios.get(`${META_GRAPH_URL}/${igId}/media`, {
        params: {
          fields:
            "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
          access_token: accessToken,
          limit: limit,
        },
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch Instagram business media:",
        error?.response?.data || error.message,
      );
      return [];
    }
  },

  /**
   * Fetch lifetime insights for a single media (post/reel/video).
   * GET /{ig-media-id}/insights?metric=reach,saved,views&period=lifetime
   * Returns { reach, saved, views } for the media. Not available for album children.
   */
  getMediaInsights: async (
    mediaId: string,
    pageAccessToken: string,
  ): Promise<{ reach?: number; saved?: number; views?: number }> => {
    try {
      const response = await axios.get(
        `${META_GRAPH_URL}/${mediaId}/insights`,
        {
          params: {
            metric: "reach,saved,views",
            period: "lifetime",
            access_token: pageAccessToken,
          },
        },
      );
      const data = response.data?.data || [];
      const out: { reach?: number; saved?: number; views?: number } = {};
      data.forEach(
        (item: {
          name?: string;
          total_value?: { value?: number };
          values?: { value: number }[];
        }) => {
          const name = item.name;
          const val = item.total_value?.value ?? item.values?.[0]?.value;
          if (name != null && typeof val === "number") {
            if (name === "reach") out.reach = val;
            else if (name === "saved") out.saved = val;
            else if (name === "views") out.views = val;
          }
        },
      );
      return out;
    } catch (error: any) {
      // Album children and some media types don't support insights; avoid logging as error
      return {};
    }
  },

  /**
   * Fetch recent media for first linked Instagram Business account.
   * @param accessToken Meta user access token
   * @param limit Number of posts to fetch (default 20)
   */
  getRecentMedia: async (accessToken: string, limit: number = 20) => {
    try {
      const pagesWithIg =
        await instagramService.getPagesWithInstagram(accessToken);
      if (!pagesWithIg.length) return [];

      const first = pagesWithIg[0];
      return instagramService.getBusinessMedia(
        first.igBusinessId,
        first.pageAccessToken,
        limit,
      );
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch Instagram media:",
        error?.response?.data || error.message,
      );
      throw error;
    }
  },

  /**
   * redirect_uri for Instagram OAuth must match Meta dashboard exactly (strict mode).
   * Use /auth/instagram/business — NOT .../business/callback — unless you registered the /callback URL.
   */
  deriveInstagramBusinessLoginRedirectUri: (): string | undefined => {
    const explicit =
      process.env.INSTAGRAM_BUSINESS_LOGIN_REDIRECT_URI?.trim();
    if (explicit) {
      if (explicit.endsWith("/auth/instagram/business/callback")) {
        return explicit.replace(
          "/auth/instagram/business/callback",
          "/auth/instagram/business",
        );
      }
      return explicit;
    }
    const legacy =
      process.env.INSTAGRAM_REDIRECT_URI?.trim() ||
      process.env.REDIRECT_URI?.trim();
    if (!legacy) {
      return undefined;
    }
    if (legacy.includes("/auth/instagram/business/callback")) {
      return legacy.replace(
        "/auth/instagram/business/callback",
        "/auth/instagram/business",
      );
    }
    if (legacy.includes("/auth/instagram/callback")) {
      return legacy.replace(
        "/auth/instagram/callback",
        "/auth/instagram/business",
      );
    }
    return undefined;
  },

  /**
   * Credentials for "Instagram API with Instagram Login" (instagram.com/oauth/authorize).
   * Prefer Instagram app id from Meta → Instagram → API setup (often different from META_APP_ID).
   */
  getInstagramBusinessLoginCredentials: () => ({
    clientId:
      process.env.INSTAGRAM_BUSINESS_LOGIN_CLIENT_ID?.trim() ||
      process.env.INSTAGRAM_APP_ID?.trim() ||
      process.env.META_APP_ID?.trim(),
    clientSecret:
      process.env.INSTAGRAM_BUSINESS_LOGIN_CLIENT_SECRET?.trim() ||
      process.env.INSTAGRAM_APP_SECRET?.trim() ||
      process.env.META_APP_SECRET?.trim(),
    redirectUri: instagramService.deriveInstagramBusinessLoginRedirectUri(),
  }),

  /**
   * Exchange authorization code from instagram.com/oauth/authorize for a short-lived user token.
   * POST https://api.instagram.com/oauth/access_token
   */
  exchangeInstagramAuthorizationCode: async (
    code: string,
    redirectUri: string,
  ): Promise<{ access_token: string; user_id?: string }> => {
    const { clientId, clientSecret } =
      instagramService.getInstagramBusinessLoginCredentials();
    if (!clientId || !clientSecret) {
      throw new Error("Instagram Business Login client id/secret not configured");
    }
    const params = new URLSearchParams();
    params.set("client_id", clientId);
    params.set("client_secret", clientSecret);
    params.set("grant_type", "authorization_code");
    params.set("redirect_uri", redirectUri);
    params.set("code", code);
    const response = await axios.post(INSTAGRAM_API_OAUTH_TOKEN, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data as { access_token: string; user_id?: string };
  },

  /**
   * Short-lived → long-lived (≈60 days) for Instagram Login tokens.
   * GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token
   */
  exchangeInstagramLongLivedTokenDetailed: async (
    shortLivedToken: string,
  ): Promise<MetaLongLivedTokenExchangeDetailedResult> => {
    try {
      const clientSecret =
        process.env.INSTAGRAM_BUSINESS_LOGIN_CLIENT_SECRET?.trim() ||
        process.env.INSTAGRAM_APP_SECRET?.trim() ||
        process.env.META_APP_SECRET?.trim();
      if (!clientSecret) {
        return {
          result: null,
          error: { message: "Instagram app secret missing for ig_exchange_token" },
        };
      }
      const response = await axios.get(`${INSTAGRAM_GRAPH_HOST}/access_token`, {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: clientSecret,
          access_token: shortLivedToken,
        },
      });
      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in || 0) * 1000);
      return {
        result: {
          accessToken: access_token,
          expiresIn: expires_in,
          expiresAt,
        },
        error: null,
      };
    } catch (error: any) {
      const metaError = error?.response?.data?.error;
      return {
        result: null,
        error: {
          code: metaError?.code,
          type: metaError?.type,
          message: metaError?.message || error?.message,
        },
      };
    }
  },

  /** Profile for Instagram Login token (graph.instagram.com — no Facebook Page). */
  getInstagramLoginProfile: async (accessToken: string) => {
    const minimal = await axios.get(`${INSTAGRAM_GRAPH_HOST}/me`, {
      params: {
        fields: "id,username,name",
        access_token: accessToken,
      },
    });
    const base = minimal.data as GenericRecord;
    try {
      const extra = await axios.get(`${INSTAGRAM_GRAPH_HOST}/me`, {
        params: {
          fields:
            "account_type,media_count,followers_count,follows_count,profile_picture_url,biography,website",
          access_token: accessToken,
        },
      });
      return { ...base, ...(extra.data as GenericRecord) };
    } catch (err: unknown) {
      console.warn(
        "[Instagram] getInstagramLoginProfile: optional fields skipped:",
        (err as { response?: { data?: unknown } })?.response?.data ?? err,
      );
      return base;
    }
  },

  /** Media for Instagram Login (user token; same graph host). */
  getInstagramLoginMedia: async (
    igUserId: string,
    accessToken: string,
    limit: number = 30,
  ) => {
    const response = await axios.get(`${INSTAGRAM_GRAPH_HOST}/${igUserId}/media`, {
      params: {
        fields:
          "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
        limit,
        access_token: accessToken,
      },
    });
    return (response.data?.data || []) as GenericRecord[];
  },

  /** Account-level insights (Instagram Login). */
  getInstagramLoginAccountInsights: async (
    igUserId: string,
    accessToken: string,
    period: InsightPeriod = "day",
  ) => {
    try {
      const metricCsv = normalizeInstagramInsightMetrics([
        "reach",
        "profile_views",
        "views",
      ]);
      const response = await axios.get(`${INSTAGRAM_GRAPH_HOST}/${igUserId}/insights`, {
        params: {
          metric: metricCsv,
          ...(requiresTotalValueMetricType(metricCsv)
            ? { metric_type: "total_value" }
            : {}),
          period,
          access_token: accessToken,
        },
      });
      return response.data?.data || [];
    } catch {
      return [];
    }
  },
};
