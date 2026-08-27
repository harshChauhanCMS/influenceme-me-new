import api from './api';

export interface VideoPurpose {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShowcaseVideo {
  _id: string;
  title: string;
  description: string;
  youtubeUrl: string; // Changed from videoUrl
  thumbnailUrl?: string;
  videoPurpose: VideoPurpose | string; // Can be populated or just ID
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShowcaseVideoResponse {
  status: boolean;
  code: number;
  message: string;
  data: ShowcaseVideo | ShowcaseVideo[];
}

export const showcaseVideoService = {
  getVideos: async (): Promise<ShowcaseVideo[]> => {
    const response = await api.get<ShowcaseVideoResponse>('/api/admin/showcase-videos');
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    }
    throw new Error(response.data.message || 'Failed to fetch videos');
  },

  getVideo: async (id: string): Promise<ShowcaseVideo> => {
    const response = await api.get<ShowcaseVideoResponse>(`/api/admin/showcase-videos/${id}`);
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch video');
  },

  createVideo: async (videoData: {
    title: string;
    description: string;
    youtubeUrl: string;
    videoPurpose: string;
    order?: number;
    isActive?: boolean;
    thumbnailUrl?: string;
  }): Promise<ShowcaseVideo> => {
    const response = await api.post<ShowcaseVideoResponse>(
      '/api/admin/showcase-videos',
      videoData
    );
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create video');
  },

  updateVideo: async (id: string, videoData: {
    title?: string;
    description?: string;
    youtubeUrl?: string;
    videoPurpose?: string;
    order?: number;
    isActive?: boolean;
    thumbnailUrl?: string;
  }): Promise<ShowcaseVideo> => {
    const response = await api.put<ShowcaseVideoResponse>(
      `/api/admin/showcase-videos/${id}`,
      videoData
    );
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update video');
  },

  deleteVideo: async (id: string): Promise<void> => {
    const response = await api.delete(`/api/admin/showcase-videos/${id}`);
    if (!response.data.status) {
      throw new Error(response.data.message || 'Failed to delete video');
    }
  },
};

