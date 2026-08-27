import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseHelper';
import Blog from '../models/blog';
import { Types } from 'mongoose';

/**
 * @desc    Get all published blogs (Public)
 * @route   GET /api/blogs
 * @access  Public
 */
export const getPublishedBlogs = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      category,
      tag,
      search,
      sort = 'publishedAt',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { isPublished: true };

    if (category) {
      query.category = { $regex: category as string, $options: 'i' };
    }

    if (tag) {
      query.tags = { $in: [tag as string] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { excerpt: { $regex: search as string, $options: 'i' } },
        { content: { $regex: search as string, $options: 'i' } },
      ];
    }

    // Sort options
    let sortOption: any = { publishedAt: -1 };
    if (sort === 'views') {
      sortOption = { views: -1 };
    } else if (sort === 'recent') {
      sortOption = { publishedAt: -1 };
    }

    const blogs = await Blog.find(query)
      .select('-content') // Exclude full content from list
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Blog.countDocuments(query);

    return successResponse(
      res,
      'Blogs fetched successfully',
      {
        blogs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
      200
    );
  } catch (error: any) {
    console.error('Get published blogs error:', error);
    return errorResponse(res, error.message || 'Failed to fetch blogs', 500);
  }
};

/**
 * @desc    Get single published blog by slug or ID (Public)
 * @route   GET /api/blogs/:slugOrId
 * @access  Public
 */
export const getPublishedBlog = async (req: Request, res: Response) => {
  try {
    const { slugOrId } = req.params;

    // Try to find by slug first, then by ID
    let blog = await Blog.findOne({
      $or: [{ slug: slugOrId }, { _id: slugOrId }],
      isPublished: true,
    }).lean();

    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    // Increment views
    await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

    // Get related blogs (same category, excluding current)
    const relatedBlogs = await Blog.find({
      category: blog.category,
      isPublished: true,
      _id: { $ne: blog._id },
    })
      .select('-content')
      .limit(3)
      .sort({ publishedAt: -1 })
      .lean();

    return successResponse(
      res,
      'Blog fetched successfully',
      {
        blog,
        relatedBlogs,
      },
      200
    );
  } catch (error: any) {
    console.error('Get published blog error:', error);
    return errorResponse(res, error.message || 'Failed to fetch blog', 500);
  }
};

/**
 * @desc    Get all blogs (Admin)
 * @route   GET /api/admin/blogs
 * @access  Private (Admin only)
 */
export const getAllBlogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      category,
      tag,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (status === 'published') {
      query.isPublished = true;
    } else if (status === 'draft') {
      query.isPublished = false;
    }

    if (category) {
      query.category = { $regex: category as string, $options: 'i' };
    }

    if (tag) {
      query.tags = { $in: [tag as string] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { excerpt: { $regex: search as string, $options: 'i' } },
        { author: { $regex: search as string, $options: 'i' } },
      ];
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Blog.countDocuments(query);

    return successResponse(
      res,
      'Blogs fetched successfully',
      {
        blogs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
        },
      },
      200
    );
  } catch (error: any) {
    console.error('Get all blogs error:', error);
    return errorResponse(res, error.message || 'Failed to fetch blogs', 500);
  }
};

/**
 * @desc    Get single blog by ID (Admin)
 * @route   GET /api/admin/blogs/:id
 * @access  Private (Admin only)
 */
export const getBlogById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id).lean();

    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    return successResponse(res, 'Blog fetched successfully', blog, 200);
  } catch (error: any) {
    console.error('Get blog by ID error:', error);
    return errorResponse(res, error.message || 'Failed to fetch blog', 500);
  }
};

/**
 * @desc    Create new blog
 * @route   POST /api/admin/blogs
 * @access  Private (Admin only)
 */
export const createBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      author,
      category,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogImage,
      isPublished,
    } = req.body;

    if (!title || !excerpt || !content || !author || !category) {
      return errorResponse(
        res,
        'Title, excerpt, content, author, and category are required',
        400
      );
    }

    // Check if slug already exists
    const existingSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingBlog = await Blog.findOne({ slug: existingSlug });
    if (existingBlog) {
      return errorResponse(res, 'A blog with this slug already exists', 409);
    }

    const blogData: any = {
      title: title.trim(),
      slug: existingSlug,
      excerpt: excerpt.trim(),
      content,
      author: author.trim(),
      authorId: req.user?.id,
      category: category.trim(),
      tags: Array.isArray(tags) ? tags : tags ? tags.split(',').map((t: string) => t.trim()) : [],
      isPublished: isPublished === true || isPublished === 'true',
    };

    if (featuredImage) blogData.featuredImage = featuredImage;
    if (metaTitle) blogData.metaTitle = metaTitle.trim();
    if (metaDescription) blogData.metaDescription = metaDescription.trim();
    if (metaKeywords) {
      blogData.metaKeywords = Array.isArray(metaKeywords)
        ? metaKeywords
        : metaKeywords.split(',').map((k: string) => k.trim());
    }
    if (ogImage) blogData.ogImage = ogImage;

    if (blogData.isPublished) {
      blogData.publishedAt = new Date();
    }

    const blog = new Blog(blogData);
    await blog.save();

    return successResponse(res, 'Blog created successfully', blog.toObject(), 201);
  } catch (error: any) {
    console.error('Create blog error:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'A blog with this slug already exists', 409);
    }
    return errorResponse(res, error.message || 'Failed to create blog', 500);
  }
};

/**
 * @desc    Update blog
 * @route   PUT /api/admin/blogs/:id
 * @access  Private (Admin only)
 */
export const updateBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      author,
      category,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogImage,
      isPublished,
    } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    // Update fields
    if (title !== undefined) blog.title = title.trim();
    if (slug !== undefined) {
      const newSlug = slug.trim().toLowerCase();
      // Check if slug is being changed and if it already exists
      if (newSlug !== blog.slug) {
        const existingBlog = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
        if (existingBlog) {
          return errorResponse(res, 'A blog with this slug already exists', 409);
        }
        blog.slug = newSlug;
      }
    }
    if (excerpt !== undefined) blog.excerpt = excerpt.trim();
    if (content !== undefined) blog.content = content;
    if (featuredImage !== undefined) blog.featuredImage = featuredImage;
    if (author !== undefined) blog.author = author.trim();
    if (category !== undefined) blog.category = category.trim();
    if (tags !== undefined) {
      blog.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    }
    if (metaTitle !== undefined) blog.metaTitle = metaTitle.trim();
    if (metaDescription !== undefined) blog.metaDescription = metaDescription.trim();
    if (metaKeywords !== undefined) {
      blog.metaKeywords = Array.isArray(metaKeywords)
        ? metaKeywords
        : metaKeywords.split(',').map((k: string) => k.trim());
    }
    if (ogImage !== undefined) blog.ogImage = ogImage;

    // Handle publish status
    if (isPublished !== undefined) {
      const wasPublished = blog.isPublished;
      blog.isPublished = isPublished === true || isPublished === 'true';
      if (!wasPublished && blog.isPublished && !blog.publishedAt) {
        blog.publishedAt = new Date();
      }
    }

    await blog.save();

    return successResponse(res, 'Blog updated successfully', blog.toObject(), 200);
  } catch (error: any) {
    console.error('Update blog error:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'A blog with this slug already exists', 409);
    }
    return errorResponse(res, error.message || 'Failed to update blog', 500);
  }
};

/**
 * @desc    Delete blog
 * @route   DELETE /api/admin/blogs/:id
 * @access  Private (Admin only)
 */
export const deleteBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog) {
      return errorResponse(res, 'Blog not found', 404);
    }

    await Blog.findByIdAndDelete(id);

    return successResponse(res, 'Blog deleted successfully', null, 200);
  } catch (error: any) {
    console.error('Delete blog error:', error);
    return errorResponse(res, error.message || 'Failed to delete blog', 500);
  }
};

/**
 * @desc    Get blog statistics (Admin)
 * @route   GET /api/admin/blogs/stats
 * @access  Private (Admin only)
 */
export const getBlogStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const total = await Blog.countDocuments();
    const published = await Blog.countDocuments({ isPublished: true });
    const drafts = await Blog.countDocuments({ isPublished: false });
    const totalViews = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    // Get top categories
    const topCategories = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get top tags
    const topTags = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get recent blogs
    const recentBlogs = await Blog.find({ isPublished: true })
      .select('title views publishedAt')
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();

    return successResponse(
      res,
      'Blog statistics fetched successfully',
      {
        stats: {
          total,
          published,
          drafts,
          totalViews: totalViews[0]?.total || 0,
          topCategories,
          topTags,
          recentBlogs,
        },
      },
      200
    );
  } catch (error: any) {
    console.error('Get blog stats error:', error);
    return errorResponse(res, error.message || 'Failed to fetch blog statistics', 500);
  }
};

