export const API_ENDPOINTS = {
    // Auth
    REGISTER: '/api/user/register',
    LOGIN: '/api/user/login',

    // User Profile
    GET_PROFILE: '/api/user/profile',
    UPDATE_PROFILE: '/api/user/profile',

    // Influencers
    GET_ALL_INFLUENCERS: '/api/user/influencers/get',
    GET_TOP_INFLUENCERS: '/api/user/influencers/top',

    // Campaigns
    GET_USER_CAMPAIGNS: '/api/campaign/campaigns',
    GET_ALL_CAMPAIGNS: '/api/campaign/campaigns/browse',
    GET_CAMPAIGN_DETAILS: '/api/campaign/campaigns/details',
    CREATE_CAMPAIGN: '/api/campaign/campaigns',
    UPDATE_CAMPAIGN: '/api/campaign/campaigns',
    DELETE_CAMPAIGN: '/api/campaign/campaigns',

    // Maps
    SEARCH_PLACES: '/api/map/places',

    // Inquiry
    CREATE_INQUIRY: '/api/inquiries',

    // Influencer Offers
    CREATE_OFFER: '/api/influencer-offer/create',
    GET_USER_OFFERS: '/api/influencer-offer/offers',
    GET_OFFER_DETAILS: '/api/influencer-offer/offer',
    DELETE_OFFER: '/api/influencer-offer/offer',
    RESPOND_TO_OFFER: '/api/influencer-offer/offer',

    // Influencer Brand Deals
    GET_USER_DEALS: '/api/influencer_brand_deal/deals',
    GET_DEAL_DETAILS: '/api/influencer_brand_deal/deal',
    UPDATE_DEAL: '/api/influencer_brand_deal/deal',
    COMPLETE_DEAL: '/api/influencer_brand_deal/deal',
    CANCEL_DEAL: '/api/influencer_brand_deal/deal',

    // Services
    GET_ALL_SERVICES: '/api/service/services',
    GET_SERVICE_BY_ID: '/api/service/service',
    CREATE_SERVICE: '/api/service/create',
    UPDATE_SERVICE: '/api/service/service',
    DELETE_SERVICE: '/api/service/service',
    GET_VENDOR_SERVICES: '/api/service/vendor/services',

    // Vendor Requirements
    GET_ALL_REQUIREMENTS: '/api/vendor-requirement/requirements',
    GET_REQUIREMENT_BY_ID: '/api/vendor-requirement/requirement',
    CREATE_REQUIREMENT: '/api/vendor-requirement/create',
    UPDATE_REQUIREMENT: '/api/vendor-requirement/requirement',
    DELETE_REQUIREMENT: '/api/vendor-requirement/requirement',
    GET_USER_REQUIREMENTS: '/api/vendor-requirement/user/requirements',

    // Vendor Offers
    CREATE_VENDOR_OFFER: '/api/vendor-offer/create',
    GET_OFFERS_BY_REQUIREMENT: '/api/vendor-offer/requirement',
    GET_VENDOR_SENT_OFFERS: '/api/vendor-offer/vendor/sent',
    GET_USER_RECEIVED_OFFERS: '/api/vendor-offer/user/received',
    ACCEPT_VENDOR_OFFER: '/api/vendor-offer/accept',
    DECLINE_VENDOR_OFFER: '/api/vendor-offer/decline',
    NEGOTIATE_VENDOR_OFFER: '/api/vendor-offer/negotiate',
    WITHDRAW_VENDOR_OFFER: '/api/vendor-offer/withdraw',
    SHORTLIST_VENDOR_OFFER: '/api/vendor-offer/shortlist',

    // Vendor Brand Deals
    GET_VENDOR_BRAND_DEALS: '/api/vendor-brand-deal',
    GET_VENDOR_BRAND_DEAL_DETAILS: '/api/vendor-brand-deal',
    VERIFY_SERVICE_COMPLETION: '/api/vendor-brand-deal',

    // Vendors
    GET_ALL_VENDORS: '/api/user/vendors/get',
    GET_TOP_VENDORS: '/api/user/vendors/top',

    // Vendor Reviews
    CREATE_VENDOR_REVIEW: '/api/vendor-review/create',
    GET_VENDOR_REVIEWS: '/api/vendor-review/vendor',
    GET_VENDOR_REVIEW_STATS: '/api/vendor-review/vendor',
    UPDATE_VENDOR_REVIEW: '/api/vendor-review',
    DELETE_VENDOR_REVIEW: '/api/vendor-review',
    MARK_REVIEW_HELPFUL: '/api/vendor-review',

    // Chat
    GET_CHAT_ROOMS: '/api/chat/rooms',
    CREATE_OR_GET_CHAT_ROOM: '/api/chat/room',
    GET_CHAT_MESSAGES: '/api/chat/room',
    SEND_MESSAGE: '/api/chat/message',
    MARK_MESSAGES_READ: '/api/chat/message/read',
    DELETE_MESSAGE: '/api/chat/message',
};

interface Pagination {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown; // allow custom keys
}

interface ApiResponse<T = unknown> {
    status: boolean;
    code: number;
    message: string;
    data: T | null;
    pagination?: Pagination;
}

export type { ApiResponse };