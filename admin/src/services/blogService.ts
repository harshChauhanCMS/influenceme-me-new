import api from './api';

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  author: string;
  authorId?: string;
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
  seoScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogResponse {
  status: boolean;
  code: number;
  message: string;
  data: Blog | Blog[] | { blogs: Blog[]; pagination: any } | { stats: any };
}

export interface BlogStats {
  total: number;
  published: number;
  drafts: number;
  totalViews: number;
  topCategories: Array<{ _id: string; count: number }>;
  topTags: Array<{ _id: string; count: number }>;
  recentBlogs: Blog[];
}

export const blogService = {
  getBlogs: async (params?: {
    page?: number;
    limit?: number;
    status?: 'published' | 'draft';
    category?: string;
    tag?: string;
    search?: string;
  }): Promise<{ blogs: Blog[]; pagination: any }> => {
    const response = await api.get<BlogResponse>('/api/admin/blogs', { params });
    if (response.data.status && response.data.data) {
      const data = response.data.data as { blogs: Blog[]; pagination: any };
      return data;
    }
    throw new Error(response.data.message || 'Failed to fetch blogs');
  },

  getBlog: async (id: string): Promise<Blog> => {
    const response = await api.get<BlogResponse>(`/api/admin/blogs/${id}`);
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data as Blog;
    }
    throw new Error(response.data.message || 'Failed to fetch blog');
  },

  createBlog: async (blogData: {
    title: string;
    slug?: string;
    excerpt: string;
    content: string;
    featuredImage?: string;
    author: string;
    category: string;
    tags?: string[] | string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[] | string;
    ogImage?: string;
    isPublished?: boolean;
  }): Promise<Blog> => {
    const response = await api.post<BlogResponse>('/api/admin/blogs', blogData);
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data as Blog;
    }
    throw new Error(response.data.message || 'Failed to create blog');
  },

  updateBlog: async (id: string, blogData: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    featuredImage?: string;
    author?: string;
    category?: string;
    tags?: string[] | string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[] | string;
    ogImage?: string;
    isPublished?: boolean;
  }): Promise<Blog> => {
    const response = await api.put<BlogResponse>(`/api/admin/blogs/${id}`, blogData);
    if (response.data.status && response.data.data) {
      return Array.isArray(response.data.data) ? response.data.data[0] : response.data.data as Blog;
    }
    throw new Error(response.data.message || 'Failed to update blog');
  },

  deleteBlog: async (id: string): Promise<void> => {
    const response = await api.delete(`/api/admin/blogs/${id}`);
    if (!response.data.status) {
      throw new Error(response.data.message || 'Failed to delete blog');
    }
  },

  getStats: async (): Promise<{ stats: BlogStats }> => {
    const response = await api.get<BlogResponse>('/api/admin/blogs/stats');
    if (response.data.status && response.data.data) {
      return response.data.data as { stats: BlogStats };
    }
    throw new Error(response.data.message || 'Failed to fetch blog statistics');
  },
};

