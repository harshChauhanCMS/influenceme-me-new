/**
 * Utility functions for handling file URLs
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Get full image URL from path
 * Handles both full URLs and relative paths
 */
export const getImageUrl = (path?: string): string => {
    if (!path) return '';
    
    // If it's already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    // If it's a relative path, construct the full URL using the file download API
    return `${API_BASE_URL}/api/file/download?path=${encodeURIComponent(path)}`;
};

/**
 * Get file download URL
 */
export const getFileDownloadUrl = (path: string): string => {
    return `${API_BASE_URL}/api/file/download?path=${encodeURIComponent(path)}`;
};

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
