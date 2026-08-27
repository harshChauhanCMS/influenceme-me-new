import { apiClient } from "@/config/api";

export interface Video {
  _id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  videoPurpose: {
    _id: string;
    name: string;
    description?: string;
  };
  order: number;
  isActive: boolean;
}

export interface VideoPurpose {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// Get videos by purpose name (Public route)
export const getVideosByPurpose = async (purposeName: string): Promise<Video[]> => {
  try {
    // Encode the purpose name for URL
    const encodedPurposeName = encodeURIComponent(purposeName);
    const response = await apiClient.get(`/api/videos/purpose/${encodedPurposeName}`);
    
    // Handle both response formats: { data: [...] } or direct array
    if (response.data && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error: any) {
    console.error("Error fetching videos by purpose:", error);
    // If it's a 404 or empty result, return empty array instead of throwing
    if (error.response?.status === 404 || error.response?.status === 200) {
      return [];
    }
    throw new Error("Failed to load videos. Please try again later.");
  }
};

// Extract YouTube video ID from URL
export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

// Get YouTube embed URL
export const getYouTubeEmbedUrl = (youtubeUrl: string): string => {
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}`;
};

// Get YouTube thumbnail URL with fallback
export const getYouTubeThumbnail = (youtubeUrl: string, preferHighRes: boolean = true): string => {
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return '';
  
  // Try high-res first, fallback to standard quality
  if (preferHighRes) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

