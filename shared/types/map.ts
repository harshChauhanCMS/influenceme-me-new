export interface GooglePrediction {
    description: string;
    place_id: string;
}

export interface GoogleAutocompleteResponse {
    status: string;
    predictions: GooglePrediction[];
}

export interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

export interface GooglePlaceDetailsResponse {
    result: {
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        url: string;
        address_components?: AddressComponent[];
        formatted_address?: string;
    };
}

export interface Place {
    title: string;
    latitude: number;
    longitude: number;
    mapUrl: string;
    // Extended address details
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
    formattedAddress?: string;
}