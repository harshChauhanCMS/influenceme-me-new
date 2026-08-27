import api from './api';

export interface VideoPurpose {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoPurposeResponse {
  status: boolean;
  code: number;
  message: string;
  data: VideoPurpose | VideoPurpose[];
}

export const videoPurposeService = {
  getPurposes: async (activeOnly?: boolean): Promise<VideoPurpose[]> => {
    const params = activeOnly ? { activeOnly: 'true' } : {};
    const response = await api.get<VideoPurposeResponse>('/api/admin/video-purposes', { params });
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    }
    throw new Error(response.data.message || 'Failed to fetch video purposes');
  },

  getPurpose: async (id: string): Promise<VideoPurpose> => {
    const response = await api.get<VideoPurposeResponse>(`/api/admin/video-purposes/${id}`);
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch video purpose');
  },

  createPurpose: async (purposeData: {
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<VideoPurpose> => {
    const response = await api.post<VideoPurposeResponse>(
      '/api/admin/video-purposes',
      purposeData
    );
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create video purpose');
  },

  updatePurpose: async (id: string, purposeData: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<VideoPurpose> => {
    const response = await api.put<VideoPurposeResponse>(
      `/api/admin/video-purposes/${id}`,
      purposeData
    );
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update video purpose');
  },

  deletePurpose: async (id: string): Promise<void> => {
    const response = await api.delete(`/api/admin/video-purposes/${id}`);
    if (!response.data.status) {
      throw new Error(response.data.message || 'Failed to delete video purpose');
    }
  },
};

