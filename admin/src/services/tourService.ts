import api from "./api";
import type { ITour } from "../../../shared/types/tour";
import type { ApiResponse } from "./adminService";

const tourService = {
  getInfluencerTours: async (influencerId: string): Promise<ApiResponse<ITour[]>> => {
    const response = await api.get<ApiResponse<ITour[]>>(`/api/tour/influencer/${influencerId}`);
    return response.data;
  },

  getAllTours: async (params?: Record<string, unknown>): Promise<ApiResponse<ITour[]>> => {
    const response = await api.get<ApiResponse<ITour[]>>("/api/tour", { params });
    return response.data;
  },
};

export default tourService;

