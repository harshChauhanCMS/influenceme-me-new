import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IVendorRequirement } from '../../../shared/types/vendorRequirement';

const vendorRequirementService = {
    /**
     * Create a new vendor requirement
     */
    async createRequirement(data: Partial<IVendorRequirement>): Promise<IVendorRequirement> {
        const apiClient = createApiClient();
        const response = await apiClient.post<ApiResponse<IVendorRequirement>>(
            API_ENDPOINTS.CREATE_REQUIREMENT,
            data
        );
        return response.data.data!;
    },

    /**
     * Get all requirements with optional filters
     */
    async getAllRequirements(params?: {
        page?: number;
        limit?: number;
        status?: string;
        category?: string;
        search?: string;
    }): Promise<{ requirements: IVendorRequirement[]; pagination: any }> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorRequirement[]>>(
            API_ENDPOINTS.GET_ALL_REQUIREMENTS,
            { params }
        );
        return {
            requirements: response.data.data || [],
            pagination: response.data.pagination || {},
        };
    },

    /**
     * Get requirement by ID
     */
    async getRequirementById(id: string): Promise<IVendorRequirement> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorRequirement>>(
            `${API_ENDPOINTS.GET_REQUIREMENT_BY_ID}/${id}`
        );
        return response.data.data!;
    },

    /**
     * Update a requirement
     */
    async updateRequirement(id: string, data: Partial<IVendorRequirement>): Promise<IVendorRequirement> {
        const apiClient = createApiClient();
        const response = await apiClient.put<ApiResponse<IVendorRequirement>>(
            `${API_ENDPOINTS.UPDATE_REQUIREMENT}/${id}`,
            data
        );
        return response.data.data!;
    },

    /**
     * Delete a requirement
     */
    async deleteRequirement(id: string): Promise<void> {
        const apiClient = createApiClient();
        await apiClient.delete(`${API_ENDPOINTS.DELETE_REQUIREMENT}/${id}`);
    },

    /**
     * Get user's requirements
     */
    async getUserRequirements(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{ requirements: IVendorRequirement[]; pagination: any }> {
        const apiClient = createApiClient();
        const response = await apiClient.get<ApiResponse<IVendorRequirement[]>>(
            API_ENDPOINTS.GET_USER_REQUIREMENTS,
            { params }
        );
        return {
            requirements: response.data.data || [],
            pagination: response.data.pagination || {},
        };
    },
};

export default vendorRequirementService;

