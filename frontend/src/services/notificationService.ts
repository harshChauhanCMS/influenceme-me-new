import { createApiClient } from "@/config/api";
import type { GetServerSidePropsContext } from "next";
import type { ApiResponse } from "@/utils/network_utils";
import type { IUser } from "../../../../shared/types/user";

export interface INotification {
  _id: string;
  userId: string | IUser;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse extends ApiResponse<INotification[]> {
  pagination?: { unreadCount?: number; total?: number; page?: number; limit?: number; totalPages?: number };
}

const notificationService = {
  getMyNotifications: async (params?: { page?: number; limit?: number }, context?: GetServerSidePropsContext): Promise<NotificationsListResponse> => {
    const apiClient = createApiClient(context);
    const response = await apiClient.get<NotificationsListResponse>("/api/notifications", { params });
    return response.data;
  },

  /** Fetches unread count only (minimal payload). */
  getUnreadCount: async (): Promise<number> => {
    const apiClient = createApiClient();
    const res = await apiClient.get<NotificationsListResponse>("/api/notifications", {
      params: { page: 1, limit: 1 },
    });
    return res.data?.pagination?.unreadCount ?? 0;
  },

  markAsRead: async (id: string): Promise<ApiResponse<INotification>> => {
    const apiClient = createApiClient();
    const response = await apiClient.put<ApiResponse<INotification>>(`/api/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    const apiClient = createApiClient();
    const response = await apiClient.put<ApiResponse<null>>("/api/notifications/read-all");
    return response.data;
  },

  deleteAll: async (): Promise<ApiResponse<null>> => {
    const apiClient = createApiClient();
    const response = await apiClient.delete<ApiResponse<null>>("/api/notifications/all");
    return response.data;
  },
};

export default notificationService;

