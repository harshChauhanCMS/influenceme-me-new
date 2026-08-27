// 📁 frontend/src/services/userService.ts

import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api'; // ✅ API client factory ko import karein
import {API_ENDPOINTS, ApiResponse} from '@/utils/network_utils';
import { IUser, IInfluencerInfo, IBusinessInfo } from '../../../shared/types/user';

// --- Interfaces (ye sab same rahenge) ---

export interface AuthResponse {
    token: string;
    user: IUser;
}

export interface LoginCredentials {
    email?: string;
    phone?: string;
    phoneCode?: string;
    password?: string;
}

// Registration data including phone code for international support
export interface RegisterData {
    role: 'brand' | 'vendor' | 'influencer';
    name: string;
    email?: string;
    phone?: string;
    phoneCode?: string; // Country code for phone number (e.g., +91, +1)
    password?: string;
    profileImage?: File;
    businessName?: string;
    description?: string;
    websiteUrl?: string;
    logo?: File;
    banner?: File;
    dateOfBirth?: string;
    influencerType?: string;
}

export interface ProfileUpdateData {
    name?: string;
    profileImage?: File;
    businessInfo?: IBusinessInfo;
    influencerInfo?: IInfluencerInfo;
    logo?: File;
    banner?: File;
}

export interface GetAllInfluencersResponse {
    influencers: IUser[];
    pagination: {
        page: number;
        totalPages: number;
        totalUsers: number;
    };
}

export interface GetAllVendorsResponse {
    vendors: IUser[];
    pagination: {
        page: number;
        totalPages: number;
        total: number;
    };
}


const userService = {

    // --- Authentication Methods ---

    /**
     * Registers a new user. SSR-safe.
     */
    async register(data: RegisterData, context?: GetServerSidePropsContext): Promise<ApiResponse<AuthResponse>> {

        const apiClient = createApiClient(context);
        const formData = new FormData();
        (Object.keys(data) as Array<keyof RegisterData>).forEach((key) => {
            const value = data[key];
            if (value) {
                formData.append(key, value);
            }
        });

        const response = await apiClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.REGISTER, formData);

        if (typeof window !== "undefined" && response.data.data!.token && response.data.data!.user) {
            localStorage.setItem('token', response.data.data!.token);
            localStorage.setItem('user', JSON.stringify(response.data.data!.user));
        }
        return response.data;
    },

    /**
     * Logs in a user. SSR-safe.
     */
    async login(credentials: LoginCredentials, context?: GetServerSidePropsContext): Promise<ApiResponse<AuthResponse>> {
        const apiClient = createApiClient(context);
        const response = await apiClient.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.LOGIN, credentials);
        if (response.data != null && response.data.status == true) {
            if (typeof window !== "undefined" && response.data.data!.token && response.data.data!.user) {
                localStorage.setItem('token', response.data.data!.token);
                localStorage.setItem('user', JSON.stringify(response.data.data!.user));
            }
        }
        return response.data;
    },

    /**
     * Logs out the user. Client-side only.
     */
    logout(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    },

    /**
     * Gets current user from storage. Client-side only.
     */
    getCurrentUser(): IUser | null {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            try {
                if (userStr) return JSON.parse(userStr) as IUser;
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                return null;
            }
        }
        return null;
    },

    // --- User Profile Methods ---

    /**
     * Updates the user profile. SSR-safe.
     */
    async updateUserProfile(data: ProfileUpdateData | FormData, context?: GetServerSidePropsContext): Promise<IUser> {
        const apiClient = createApiClient(context);
        
        let formData: FormData;
        
        // If data is already FormData, use it directly
        if (data instanceof FormData) {
            formData = data;
        } else {
            // Otherwise, convert ProfileUpdateData to FormData
            formData = new FormData();
            (Object.keys(data) as Array<keyof ProfileUpdateData>).forEach((key) => {
                const value = data[key];
                if (value) {
                    if (value instanceof File) {
                        formData.append(key, value);
                    } else if (typeof value === 'object') {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, String(value));
                    }
                }
            });
        }

        const response = await apiClient.put<ApiResponse<IUser>>(API_ENDPOINTS.UPDATE_PROFILE, formData);

        // ✅ Update localStorage only in browser
        if (typeof window !== "undefined" && response.data.status && response.data.data) {
            localStorage.setItem('user', JSON.stringify(response.data.data));
            return response.data.data;
        } else if (response.data.status && response.data.data) {
            // On server, just return data
            return response.data.data;
        }

        throw new Error('Profile update failed.');
    },

    // --- Public Data Fetching Methods ---

    /**
     * Fetches top influencers. SSR-safe.
     */
    async getTopInfluencers(context?: GetServerSidePropsContext): Promise<IUser[]> {
        const apiClient = createApiClient(context); // ✨ Naya client
        const response = await apiClient.get<ApiResponse<IUser[]>>(API_ENDPOINTS.GET_TOP_INFLUENCERS);
        return response.data.data || [] ;
    },

    /**
     * Fetches all influencers with pagination and filters. SSR-safe.
     */
    async getAllInfluencers(
        page = 1, 
        limit = 10, 
        filters?: {
            search?: string;
            influencerType?: string;
            genre?: string;
            workType?: string;
            location?: string;
            country?: string;
            language?: string;
            maritalStatus?: string;
            children?: string;
            pets?: string;
            minFollowers?: string;
            maxFollowers?: string;
            minSubscribers?: string;
            maxSubscribers?: string;
        },
        context?: GetServerSidePropsContext
    ): Promise<GetAllInfluencersResponse> {
        const apiClient = createApiClient(context);
        const params: any = { page, limit };
        
        // Add filters to params
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== '') {
                    params[key] = value;
                }
            });
        }
        
        const response = await apiClient.get<ApiResponse<GetAllInfluencersResponse>>(API_ENDPOINTS.GET_ALL_INFLUENCERS, {
            params
        });
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch influencers');
    },

    /**
     * Fetches all vendors with pagination and filters. SSR-safe.
     */
    async getAllVendors(
        page = 1, 
        limit = 10,
        filters?: {
            search?: string;
            category?: string;
            vendorType?: string;
            location?: string;
            minRating?: number;
        },
        context?: GetServerSidePropsContext
    ): Promise<GetAllVendorsResponse> {
        const apiClient = createApiClient(context);
        const params: any = { page, limit };
        
        // Add filters to params
        if (filters) {
            if (filters.search) params.name = filters.search;
            if (filters.category) params.category = filters.category;
            if (filters.vendorType) params.vendorType = filters.vendorType;
            if (filters.location) params.location = filters.location;
            // Note: minRating filter would need backend support
        }
        
        const response = await apiClient.get<ApiResponse<GetAllVendorsResponse>>(API_ENDPOINTS.GET_ALL_VENDORS, {
            params
        });
        return response.data.data;
    },

    /**
     * Fetches influencer profile by ID. SSR-safe.
     */
    async getInfluencerById(id: string, context?: GetServerSidePropsContext): Promise<IUser> {
        const apiClient = createApiClient(context);
        const response = await apiClient.get<ApiResponse<IUser>>(`/api/user/${id}`);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch influencer profile');
    },
};

export default userService;