import { IUser } from '../../../shared/types/user';

export interface ProfileCompletionStatus {
    isComplete: boolean;
    completionPercentage: number;
    missingFields: string[];
    missingFieldsLabels: string[];
}

/**
 * Required fields for brand profile completion
 */
const REQUIRED_BRAND_FIELDS = {
    // Basic user info
    name: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    
    // Business info
    'businessInfo.businessName': 'Business Name',
    'businessInfo.businessType': 'Business Type',
    'businessInfo.industry': 'Industry',
    'businessInfo.businessEmail': 'Business Email',
    'businessInfo.businessDescription': 'Business Description',
    
    // Location (addresses)
    'addresses.streetAddress': 'Street Address',
    'addresses.city': 'City',
    'addresses.state': 'State',
    'addresses.country': 'Country',
    // Note: pinCode is optional as Google Maps doesn't always provide it
    'addresses.latitude': 'Location Coordinates',
};

/**
 * Check if a nested field exists and has a value
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check brand profile completion status
 */
export function checkBrandProfileCompletion(user: IUser | null): ProfileCompletionStatus {
    if (!user || user.role !== 'brand') {
        return {
            isComplete: false,
            completionPercentage: 0,
            missingFields: [],
            missingFieldsLabels: [],
        };
    }

    const missingFields: string[] = [];
    const missingFieldsLabels: string[] = [];
    const totalFields = Object.keys(REQUIRED_BRAND_FIELDS).length;

    // Check each required field
    Object.entries(REQUIRED_BRAND_FIELDS).forEach(([fieldPath, label]) => {
        const value = getNestedValue(user, fieldPath);
        if (!value || (typeof value === 'string' && !value.trim())) {
            missingFields.push(fieldPath);
            missingFieldsLabels.push(label);
        }
    });

    const completedFields = totalFields - missingFields.length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);
    const isComplete = missingFields.length === 0;

    return {
        isComplete,
        completionPercentage,
        missingFields,
        missingFieldsLabels,
    };
}

/**
 * Get a user-friendly message about profile completion
 */
export function getProfileCompletionMessage(status: ProfileCompletionStatus): string {
    if (status.isComplete) {
        return 'Your profile is complete! 🎉';
    }

    const count = status.missingFields.length;
    if (count === 1) {
        return `Complete your profile to create campaigns and approach vendors. 1 field missing.`;
    }

    return `Complete your profile to create campaigns and approach vendors. ${count} fields missing.`;
}

/**
 * Check if user can create campaigns
 */
export function canCreateCampaign(user: IUser | null): boolean {
    if (!user || user.role !== 'brand') return false;
    return checkBrandProfileCompletion(user).isComplete;
}

/**
 * Check if user can approach vendors
 */
export function canApproachVendors(user: IUser | null): boolean {
    if (!user || user.role !== 'brand') return false;
    return checkBrandProfileCompletion(user).isComplete;
}

/**
 * Check if user can send offers to influencers
 */
export function canSendOffers(user: IUser | null): boolean {
    if (!user || user.role !== 'brand') return false;
    return checkBrandProfileCompletion(user).isComplete;
}

