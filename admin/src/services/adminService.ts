import api from "./api";
import type { IInfluencerInfo, IBusinessInfo, IVendorInfo } from "../../../shared/types/user";

// Local ApiResponse type matching backend responses
export interface ApiResponse<T = unknown> {
  status: boolean;
  code: number;
  message: string;
  data: T | null;
  pagination?: Record<string, unknown>;
}

export interface DashboardStats {
  users: {
    total: number;
    influencers: number;
    brands: number;
    vendors: number;
    active: number;
    inactive: number;
    recent: number;
  };
  growth: Array<{
    _id: { year: number; month: number };
    count: number;
  }>;
}

export interface DashboardResponse {
  status: boolean;
  code: number;
  message: string;
  data: {
    stats: DashboardStats;
    user: {
      id: string;
      name: string;
      role: string;
    };
  };
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  role: "influencer" | "brand" | "vendor" | "admin";
  isActive: boolean;
  status?: "waiting_list" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  instagram?: string;
}

export interface UsersResponse {
  status: boolean;
  code: number;
  message: string;
  data: User[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
  reason?: string;
}

export interface UserDetail extends User {
  phoneCode?: string;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  influencerInfo?: IInfluencerInfo;
  brandInfo?: IBusinessInfo;
  businessInfo?: IBusinessInfo;
  vendorInfo?: IVendorInfo;
  addresses?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
    latitude?: string;
    longitude?: string;
  };
  spokenLanguages?: string[];
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  youtube?: string;
}

export interface UserDetailResponse {
  status: boolean;
  code: number;
  message: string;
  data: UserDetail;
}

export const adminService = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await api.get<DashboardResponse>("/api/admin/dashboard");
    return response.data;
  },

  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: string;
    search?: string;
    excludeRole?: string; // Exclude specific role from results
  }): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>("/api/admin/users", {
      params,
    });
    return response.data;
  },

  getUserById: async (userId: string): Promise<UserDetailResponse> => {
    const response = await api.get<UserDetailResponse>(
      `/api/admin/users/${userId}`,
    );
    return response.data;
  },

  getInfluencerInstagramAnalytics: async (userId: string): Promise<ApiResponse<unknown>> => {
    const response = await api.get<ApiResponse<unknown>>(
      `/api/admin/users/${userId}/instagram-analytics`,
    );
    return response.data;
  },

  updateUserStatus: async (
    userId: string,
    data: UpdateUserStatusRequest,
  ): Promise<{ status: boolean; message: string }> => {
    const response = await api.put(`/api/admin/users/${userId}/status`, data);
    return response.data;
  },

  updateUser: async (
    userId: string,
    data: Partial<UserDetail>,
  ): Promise<UserDetailResponse> => {
    const response = await api.put<UserDetailResponse>(
      `/api/admin/users/${userId}`,
      data,
    );
    return response.data;
  },

  // Admin-specific methods
  getAdmins: async (params?: {
    page?: number;
    limit?: number;
    isActive?: string;
    search?: string;
  }): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>("/api/admin/users", {
      params: { ...params, role: "admin" },
    });
    return response.data;
  },

  // Analytics
  getAnalytics: async (period?: number): Promise<ApiResponse<unknown>> => {
    const response = await api.get<ApiResponse<unknown>>("/api/admin/analytics", {
      params: { period: period || 30 },
    });
    return response.data;
  },

  // Waiting List
  getWaitingList: async (params?: {
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>("/api/admin/waiting-list", {
      params,
    });
    return response.data;
  },

  updateWaitingListStatus: async (
    userId: string,
    action: "approve" | "reject",
    reason?: string,
  ): Promise<{ status: boolean; message: string }> => {
    const response = await api.put(`/api/admin/waiting-list/${userId}`, {
      action,
      reason,
    });
    return response.data;
  },

  // Settings
  getSettings: async (): Promise<ApiResponse<unknown>> => {
    const response = await api.get<ApiResponse<unknown>>("/api/admin/settings");
    return response.data;
  },

  updateSettings: async (settings: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
    const response = await api.put<ApiResponse<unknown>>("/api/admin/settings", settings);
    return response.data;
  },

  // CMS Pages
  getCMSPages: async (): Promise<ApiResponse<unknown>> => {
    const response = await api.get<ApiResponse<unknown>>("/api/cms");
    return response.data;
  },

  getCMSPage: async (pageType: string): Promise<ApiResponse<unknown>> => {
    const response = await api.get<ApiResponse<unknown>>(`/api/cms/admin/${pageType}`);
    return response.data;
  },

  updateCMSPage: async (
    pageType: string,
    data: {
      title: string;
      content: string;
      metaTitle?: string;
      metaDescription?: string;
      isActive?: boolean;
    },
  ): Promise<ApiResponse<unknown>> => {
    const response = await api.put<ApiResponse<unknown>>(`/api/cms/${pageType}`, data);
    return response.data;
  },
};
