import axios, { AxiosResponse } from "axios";
import { Request, Response } from "express";
import { errorResponse, successResponse } from "../utils/responseHelper";
import { GoogleAutocompleteResponse, GooglePlaceDetailsResponse, GooglePrediction, Place } from "../../shared/types/map";

const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDaBH4s0V--dDHWMpw4wNKIXiQ-EIFuSJM";
const googleApiUrl = "https://maps.googleapis.com/maps/api";

const getLatLngByPlaceId = async (placeId: string): Promise<GooglePlaceDetailsResponse> => {
    try {
        const response: AxiosResponse<GooglePlaceDetailsResponse> = await axios.get(
            `${googleApiUrl}/place/details/json`,
            {
                params: {
                    placeid: placeId,
                    key: googleApiKey
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("getLatLngByPlaceId Error:", error);
        throw new Error('Failed to fetch map data');
    }
};

export const getPlaces = async (req: Request, res: Response) => {
    try {
        const { searchText, cities = false, country = 'IN' } = req.body as { searchText?: string; cities?: boolean; country?: string };

        if (!searchText) {
            return errorResponse(res, "Search text is required");
        }

        const autocompleteResponse: AxiosResponse<GoogleAutocompleteResponse> = await axios.get(
            `${googleApiUrl}/place/autocomplete/json`,
            {
                params: {
                    input: searchText,
                    types: cities ? '(cities)' : '',
                    components: `country:${country}`,
                    key: googleApiKey
                }
            }
        );

        if (autocompleteResponse.data.status === "ZERO_RESULTS") {
            return successResponse(res, "No places found", []);
        }
        if (autocompleteResponse.data.status !== "OK") {
            console.error("Google Places API Error:", autocompleteResponse.data.status);
            return errorResponse(res, `Failed to fetch places: ${autocompleteResponse.data.status}`);
        }

        const places: GooglePrediction[] = autocompleteResponse.data.predictions;
        const placesArray: Place[] = [];

        for (const place of places) {
            if (place.place_id) {
                try {
                    const placeDetails = await getLatLngByPlaceId(place.place_id);
                    
                    // Extract address components
                    const addressComponents = placeDetails.result.address_components || [];
                    let city = '';
                    let state = '';
                    let country = '';
                    let pinCode = '';

                    addressComponents.forEach((component) => {
                        if (component.types.includes('locality')) {
                            city = component.long_name;
                        } else if (component.types.includes('administrative_area_level_3') && !city) {
                            city = component.long_name;
                        } else if (component.types.includes('administrative_area_level_1')) {
                            state = component.long_name;
                        } else if (component.types.includes('country')) {
                            country = component.long_name;
                        } else if (component.types.includes('postal_code')) {
                            pinCode = component.long_name;
                        }
                    });

                    const modifiedPlace: Place = {
                        title: place.description,
                        latitude: placeDetails.result.geometry.location.lat,
                        longitude: placeDetails.result.geometry.location.lng,
                        mapUrl: placeDetails.result.url,
                        city,
                        state,
                        country,
                        pinCode,
                        formattedAddress: placeDetails.result.formatted_address,
                    };
                    placesArray.push(modifiedPlace);
                } catch (detailError) {
                    console.error(`Failed to get details for place_id ${place.place_id}:`, detailError);
                    // Continue processing other places even if one fails
                }
            }
        }

        successResponse(res, "Places fetched successfully", placesArray);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Google Maps API Error:", error.message);
        } else {
            console.error("Google Maps API Error:", error);
        }
        errorResponse(res, "Failed to fetch map data");
    }
};
