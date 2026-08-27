// services/mapService.ts
import { GetServerSidePropsContext } from 'next';
import { createApiClient } from '@/config/api';
import { API_ENDPOINTS, ApiResponse } from '@/utils/network_utils';
import { Place } from '../../../shared/types/map';

interface SearchPlacesParams {
    searchText: string;
    cities?: boolean;  // If true, filter only cities
    country?: string;  // Country code (e.g., 'IN', 'US')
}

const mapService = {
    /**
     * Search places using Google Places API through backend
     * @param params - Search parameters
     * @param context - Server-side context (optional)
     * @returns Promise<Place[]> - Array of places with lat/lng
     * 
     * @example
     * // Search all places in India
     * searchPlaces({ searchText: 'Mumbai' })
     * 
     * @example
     * // Search only cities in India
     * searchPlaces({ searchText: 'Delhi', cities: true })
     * 
     * @example
     * // Search places in USA
     * searchPlaces({ searchText: 'New York', country: 'US' })
     */
    searchPlaces: async (
        params: SearchPlacesParams | string, 
        context?: GetServerSidePropsContext
    ): Promise<Place[]> => {
        try {
            const apiClient = createApiClient(context);
            
            // Support both old (string) and new (object) API
            const requestBody = typeof params === 'string' 
                ? { searchText: params, cities: false, country: 'IN' }
                : { 
                    searchText: params.searchText,
                    cities: params.cities || false,
                    country: params.country || 'IN'
                };

            const response = await apiClient.post<ApiResponse<Place[]>>(
                API_ENDPOINTS.SEARCH_PLACES,
                requestBody
            );
            return response.data.data || [];
        } catch (error) {
            console.error('Failed to search places:', error);
            return [];
        }
    },
};

export default mapService;
export type { SearchPlacesParams };

