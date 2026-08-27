import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { parseCookies } from "nookies";
import { GetServerSidePropsContext } from "next";

// API Base URLs - Remember to use NEXT_PUBLIC_ for browser access
// export const API_CONFIG = {
//   WEBSITE_BACKEND: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/",
// };
export const API_CONFIG = {
  WEBSITE_BACKEND:
    process.env.NEXT_PUBLIC_API_URL || "https://api.influence-me.in/",
};

/**
 * Factory function to create a new Axios instance.
 * @param context - Optional Next.js context (for server-side). Provides request object.
 */
export const createApiClient = (
  context?: GetServerSidePropsContext,
): AxiosInstance => {
  // 1. Create the base Axios instance
  const apiInstance: AxiosInstance = axios.create({
    baseURL: API_CONFIG.WEBSITE_BACKEND,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // 2. Add interceptors
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      let token: string | null = null;

      // --- Server-Side Logic ---
      // If context is provided, we are on the server.
      if (context?.req) {
        const cookies = parseCookies(context);
        token = cookies.token || null;
      }
      // --- Client-Side Logic ---
      // Otherwise, we are in the browser.
      else if (typeof window !== "undefined") {
        token = localStorage.getItem("token");
      }

      // If a token was found, add it to the request headers
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }

      return config;
    },
  );

  // Response interceptor for client-side 401 error handling
  apiInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      // Only run this logic in the browser
      if (typeof window !== "undefined" && error.response?.status === 401) {
        const pathname = window.location.pathname;
        const isAuthPage =
          pathname === "/login" ||
          pathname === "/signup" ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/signin");
        // Don't redirect if already on login/signup – avoids infinite loop when
        // providers (e.g. NotificationCount) call APIs on auth pages
        if (!isAuthPage) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    },
  );

  return apiInstance;
};

// 3. Export a default client instance for general client-side use
export const apiClient = createApiClient();
