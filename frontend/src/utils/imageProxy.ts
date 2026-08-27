/**
 * Utility function to handle image URLs (Instagram, Facebook CDN, or our filesystem)
 * Instagram URLs work directly in browsers, so we use them directly
 * Only use proxy as fallback if direct URL fails
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

/**
 * Check if URL is from Instagram or Facebook CDN
 */
const isExternalCDN = (url: string): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return (
            urlObj.hostname.includes('cdninstagram.com') ||
            urlObj.hostname.includes('fbcdn.net') ||
            urlObj.hostname.includes('scontent') ||
            urlObj.hostname.includes('instagram.com')
        );
    } catch {
        return false;
    }
};

/**
 * Check if URL is from our filesystem
 */
const isOurFilesystem = (url: string): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return (
            urlObj.hostname.includes('files.influence-me.in') ||
            urlObj.hostname.includes('influence-me.in')
        );
    } catch {
        // If it's a relative URL starting with /api/file, it's our filesystem
        return url.startsWith('/api/file') || url.startsWith('http://localhost') || url.startsWith(API_BASE_URL);
    }
};

/**
 * Get a placeholder image data URI
 */
const getPlaceholderImage = (): string => {
    // Return a data URI for a simple placeholder (1x1 transparent pixel)
    // This prevents 404 errors when images fail to load

    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
};

/**
 * Get image URL - use direct URLs for Instagram (they work in browsers)
 * Only use proxy as fallback if needed
 * @param imageUrl - Original image URL
 * @returns Direct URL (Instagram URLs work directly) or proxied URL for other cases
 */
export const getProxiedImageUrl = (imageUrl: string | undefined | null): string => {
    if (!imageUrl) return getPlaceholderImage();
    
    // If it's our filesystem URL, use it directly
    if (isOurFilesystem(imageUrl)) {
        // If it's already a full URL, use it directly
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        // If it's a relative URL, prepend API base URL
        return `${API_BASE_URL}${imageUrl}`;
    }
    
    // If it's an Instagram/Facebook CDN URL, try using proxy first (more reliable)
    // Instagram CDN URLs can have CORS issues or expire, so proxy is safer
    if (isExternalCDN(imageUrl)) {
        // Use proxy for Instagram URLs to avoid CORS and expiration issues
        const encodedUrl = encodeURIComponent(imageUrl);
        const proxyUrl = `${API_BASE_URL}/api/file/proxy?url=${encodedUrl}`;
        return proxyUrl;
    }
    
    // For other URLs, return as-is
    return imageUrl;
};

