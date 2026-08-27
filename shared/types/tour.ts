export interface ITourLocation {
    address: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
}

export interface ITour<T = string> {
    _id: T;
    influencerId: T; // Reference to User (influencer)
    title: string;
    description?: string;
    location: ITourLocation;
    startDate: Date;
    endDate: Date;
    isActive?: boolean; // Whether the tour is currently active/visible
    createdAt: Date;
    updatedAt: Date;
}

