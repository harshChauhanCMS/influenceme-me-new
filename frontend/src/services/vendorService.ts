import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { IUser } from '../../../shared/types/user';
import { IService, IVendorRequirement } from '../../../shared/types/vendor';

interface PaginationResponse {
    currentPage?: number;
    page?: number;
    totalPages?: number;
    total?: number;
    totalCount?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}

interface ServicesResponse {
    services: IService[];
    pagination: PaginationResponse;
}

interface VendorsResponse {
    vendors: IUser[];
    pagination: PaginationResponse;
}

interface RequirementsResponse {
    requirements: IVendorRequirement[];
    pagination: PaginationResponse;
}

const vendorService = {
    // ==================== SERVICE APIs ====================
    
    /**
     * Get all services with filters
     */
    getAllServices: async (
        params?: {
            page?: number;
            limit?: number;
            category?: string;
            vendorId?: string;
            location?: string;
            priceMin?: number;
            priceMax?: number;
            search?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<ServicesResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<IService[]>>(
                API_ENDPOINTS.GET_ALL_SERVICES,
                { params }
            );
            
            const paginationData = response.data.pagination as PaginationResponse | undefined;
            return {
                services: response.data.data || [],
                pagination: paginationData || {
                    page: 1,
                    total: 0,
                    totalPages: 1,
                },
            };
        } catch (error) {
            console.error('Failed to fetch services:', error);
            return { services: [], pagination: { page: 1, total: 0, totalPages: 1 } };
        }
    },

    /**
     * Get service by ID
     */
    getServiceById: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<IService | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<IService>>(
                `${API_ENDPOINTS.GET_SERVICE_BY_ID}/${id}`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch service:', error);
            return null;
        }
    },

    // ==================== VENDOR APIs ====================
    
    /**
     * Get all vendors (users with role 'vendor')
     */
    getAllVendors: async (
        page = 1,
        limit = 20,
        context?: GetServerSidePropsContext
    ): Promise<VendorsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<{ vendors: IUser[]; pagination: PaginationResponse }>>(
                API_ENDPOINTS.GET_ALL_VENDORS,
                {
                    params: { page, limit },
                }
            );
            
            const responseData = response.data.data;
            return {
                vendors: responseData?.vendors || [],
                pagination: responseData?.pagination || {
                    page: 1,
                    total: 0,
                    totalPages: 1,
                },
            };
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            return { vendors: [], pagination: { page: 1, total: 0, totalPages: 1 } };
        }
    },

    // ==================== VENDOR REQUIREMENT APIs ====================
    
    /**
     * Get all vendor requirements
     */
    getAllRequirements: async (
        params?: {
            page?: number;
            limit?: number;
            category?: string;
            status?: string;
            location?: string;
            budgetMin?: number;
            budgetMax?: number;
            search?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<RequirementsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<IVendorRequirement[]>>(
                API_ENDPOINTS.GET_ALL_REQUIREMENTS,
                { params }
            );
            
            const paginationData = response.data.pagination as PaginationResponse | undefined;
            return {
                requirements: response.data.data || [],
                pagination: paginationData || {
                    page: 1,
                    total: 0,
                    totalPages: 1,
                },
            };
        } catch (error) {
            console.error('Failed to fetch requirements:', error);
            return { requirements: [], pagination: { page: 1, total: 0, totalPages: 1 } };
        }
    },

    /**
     * Create a vendor requirement
     */
    createRequirement: async (
        data: Partial<IVendorRequirement>,
        context?: GetServerSidePropsContext
    ): Promise<IVendorRequirement | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.post<ApiResponse<IVendorRequirement>>(
                API_ENDPOINTS.CREATE_REQUIREMENT,
                data
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to create requirement:', error);
            throw error;
        }
    },

    /**
     * Get requirement by ID
     */
    getRequirementById: async (
        id: string,
        context?: GetServerSidePropsContext
    ): Promise<IVendorRequirement | null> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<IVendorRequirement>>(
                `${API_ENDPOINTS.GET_REQUIREMENT_BY_ID}/${id}`
            );
            return response.data.data || null;
        } catch (error) {
            console.error('Failed to fetch requirement:', error);
            return null;
        }
    },

    /**
     * Get user's own requirements
     */
    getUserRequirements: async (
        params?: { page?: number; limit?: number; status?: string },
        context?: GetServerSidePropsContext
    ): Promise<RequirementsResponse> => {
        try {
            const apiClient = createApiClient(context);
            const response = await apiClient.get<ApiResponse<IVendorRequirement[]>>(
                API_ENDPOINTS.GET_USER_REQUIREMENTS,
                { params }
            );
            
            const paginationData = response.data.pagination as PaginationResponse | undefined;
            return {
                requirements: response.data.data || [],
                pagination: paginationData || {
                    page: 1,
                    total: 0,
                    totalPages: 1,
                },
            };
        } catch (error) {
            console.error('Failed to fetch user requirements:', error);
            return { requirements: [], pagination: { page: 1, total: 0, totalPages: 1 } };
        }
    },
};

export default vendorService;

