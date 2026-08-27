import { apiClient } from "@/config/api";

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  author: string;
  category: string;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
  isPublished: boolean;
  publishedAt?: string;
  views: number;
  readingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  status: boolean;
  code: number;
  message: string;
  data: {
    blogs: Blog[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface BlogDetailResponse {
  status: boolean;
  code: number;
  message: string;
  data: {
    blog: Blog;
    relatedBlogs: Blog[];
  };
}

// Get all published blogs
export const getAllBlogs = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  sort?: 'publishedAt' | 'views' | 'recent';
}): Promise<BlogListResponse['data']> => {
  try {
    const response = await apiClient.get<BlogListResponse>("/api/blogs", {
      params,
    });
    if (response.data.status && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to load blogs");
  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    throw new Error(error.response?.data?.message || "Failed to load blogs. Please try again later.");
  }
};

// Get blog by slug or ID
export const getBlogBySlugOrId = async (slugOrId: string): Promise<BlogDetailResponse['data']> => {
  try {
    const response = await apiClient.get<BlogDetailResponse>(`/api/blogs/${slugOrId}`);
    if (response.data.status && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to load blog");
  } catch (error: any) {
    console.error("Error fetching blog:", error);
    throw new Error(error.response?.data?.message || "Failed to load blog. Please try again later.");
  }
};

// Get blog by ID (alias for backward compatibility)
export const getBlogById = getBlogBySlugOrId;

