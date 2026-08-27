import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseHelper';
import ShowcaseVideo from '../models/showcaseVideo';
import VideoPurpose from '../models/videoPurpose';

/**
 * @desc    Get all showcase videos
 * @route   GET /api/admin/showcase-videos
 * @access  Private (Admin only)
 */
export const getShowcaseVideos = async (req: Request, res: Response) => {
  try {
    const videos = await ShowcaseVideo.find()
      .populate('videoPurpose', 'name description')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return successResponse(
      res,
      'Showcase videos fetched successfully',
      videos,
      200
    );
  } catch (error: any) {
    console.error('Get showcase videos error:', error);
    return errorResponse(res, error.message || 'Failed to fetch showcase videos', 500);
  }
};

/**
 * @desc    Get videos by purpose (Public route)
 * @route   GET /api/videos/purpose/:purposeName
 * @access  Public
 */
export const getVideosByPurpose = async (req: Request, res: Response) => {
  try {
    // Decode URL-encoded purpose name (e.g., "Website%20Services" -> "Website Services")
    const purposeName = decodeURIComponent(String(req.params.purposeName));
    
    console.log('Fetching videos for purpose:', purposeName);
    
    // Find the purpose by name (case-insensitive search)
    const purpose = await VideoPurpose.findOne({ 
      name: { $regex: new RegExp(`^${purposeName}$`, 'i') },
      isActive: true 
    });
    
    if (!purpose) {
      console.log('Video purpose not found:', purposeName);
      // Return empty array instead of 404 for better UX
      return successResponse(
        res,
        'No videos found for this purpose',
        [],
        200
      );
    }

    // Get active videos with this purpose
    const videos = await ShowcaseVideo.find({
      videoPurpose: purpose._id,
      isActive: true,
    })
      .populate('videoPurpose', 'name description')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    console.log(`Found ${videos.length} videos for purpose: ${purposeName}`);

    return successResponse(
      res,
      'Videos fetched successfully',
      videos,
      200
    );
  } catch (error: any) {
    console.error('Get videos by purpose error:', error);
    return errorResponse(res, error.message || 'Failed to fetch videos', 500);
  }
};

/**
 * @desc    Get single showcase video
 * @route   GET /api/admin/showcase-videos/:id
 * @access  Private (Admin only)
 */
export const getShowcaseVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = await ShowcaseVideo.findById(id)
      .populate('videoPurpose', 'name description')
      .lean();

    if (!video) {
      return errorResponse(res, 'Showcase video not found', 404);
    }

    return successResponse(
      res,
      'Showcase video fetched successfully',
      video,
      200
    );
  } catch (error: any) {
    console.error('Get showcase video error:', error);
    return errorResponse(res, error.message || 'Failed to fetch showcase video', 500);
  }
};

/**
 * Helper function to extract YouTube video ID from URL
 */
const extractYouTubeId = (url: string): string | null => {
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

/**
 * Helper function to generate YouTube thumbnail URL
 * Uses hqdefault as default (more reliable than maxresdefault which may not exist for all videos)
 */
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * @desc    Create showcase video
 * @route   POST /api/admin/showcase-videos
 * @access  Private (Admin only)
 */
export const createShowcaseVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, youtubeUrl, videoPurpose, order, isActive, thumbnailUrl } = req.body;

    if (!title || !title.trim()) {
      return errorResponse(res, 'Title is required', 400);
    }

    if (!youtubeUrl || !youtubeUrl.trim()) {
      return errorResponse(res, 'YouTube URL is required', 400);
    }

    if (!videoPurpose) {
      return errorResponse(res, 'Video purpose is required', 400);
    }

    // Validate YouTube URL and extract video ID
    const videoId = extractYouTubeId(youtubeUrl.trim());
    if (!videoId) {
      return errorResponse(res, 'Invalid YouTube URL. Please provide a valid YouTube video URL.', 400);
    }

    // Verify video purpose exists
    const purpose = await VideoPurpose.findById(videoPurpose);
    if (!purpose) {
      return errorResponse(res, 'Video purpose not found', 404);
    }

    // Parse order and isActive
    const parsedOrder = order ? parseInt(order, 10) : undefined;
    const parsedIsActive = isActive !== undefined ? (isActive === 'true' || isActive === true) : undefined;

    // Get max order if not provided
    let videoOrder = parsedOrder;
    if (!videoOrder || isNaN(videoOrder)) {
      const maxOrderVideo = await ShowcaseVideo.findOne().sort({ order: -1 });
      videoOrder = maxOrderVideo ? maxOrderVideo.order + 1 : 1;
    }

    // Generate thumbnail from YouTube if not provided
    const finalThumbnailUrl = thumbnailUrl || getYouTubeThumbnail(videoId);

    // Store the full YouTube URL (or just the ID, depending on preference)
    // We'll store the full URL for flexibility
    const finalYoutubeUrl = youtubeUrl.trim();

    const newVideo = new ShowcaseVideo({
      title: title.trim(),
      description: description || '',
      youtubeUrl: finalYoutubeUrl,
      thumbnailUrl: finalThumbnailUrl,
      videoPurpose: videoPurpose,
      order: videoOrder,
      isActive: parsedIsActive !== undefined ? parsedIsActive : true,
    });

    await newVideo.save();

    const populatedVideo = await ShowcaseVideo.findById(newVideo._id)
      .populate('videoPurpose', 'name description')
      .lean();

    return successResponse(
      res,
      'Showcase video created successfully',
      populatedVideo,
      201
    );
  } catch (error: any) {
    console.error('Create showcase video error:', error);
    return errorResponse(res, error.message || 'Failed to create showcase video', 500);
  }
};

/**
 * @desc    Update showcase video
 * @route   PUT /api/admin/showcase-videos/:id
 * @access  Private (Admin only)
 */
export const updateShowcaseVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, youtubeUrl, videoPurpose, order, isActive, thumbnailUrl } = req.body;

    const existingVideo = await ShowcaseVideo.findById(id);
    if (!existingVideo) {
      return errorResponse(res, 'Showcase video not found', 404);
    }

    // Parse order and isActive
    const parsedOrder = order !== undefined ? parseInt(order, 10) : undefined;
    const parsedIsActive = isActive !== undefined ? (isActive === 'true' || isActive === true) : undefined;

    // Update fields
    if (title !== undefined) existingVideo.title = title.trim();
    if (description !== undefined) existingVideo.description = description;
    if (parsedOrder !== undefined && !isNaN(parsedOrder)) existingVideo.order = parsedOrder;
    if (parsedIsActive !== undefined) existingVideo.isActive = parsedIsActive;

    // Update YouTube URL if provided
    if (youtubeUrl && youtubeUrl.trim()) {
      const videoId = extractYouTubeId(youtubeUrl.trim());
      if (!videoId) {
        return errorResponse(res, 'Invalid YouTube URL. Please provide a valid YouTube video URL.', 400);
      }
      existingVideo.youtubeUrl = youtubeUrl.trim();
      
      // Auto-update thumbnail if not manually provided
      if (!thumbnailUrl) {
        existingVideo.thumbnailUrl = getYouTubeThumbnail(videoId);
      }
    }

    // Update thumbnail if provided
    if (thumbnailUrl !== undefined) {
      existingVideo.thumbnailUrl = thumbnailUrl;
    }

    // Update video purpose if provided
    if (videoPurpose) {
      const purpose = await VideoPurpose.findById(videoPurpose);
      if (!purpose) {
        return errorResponse(res, 'Video purpose not found', 404);
      }
      existingVideo.videoPurpose = videoPurpose;
    }

    await existingVideo.save();

    const populatedVideo = await ShowcaseVideo.findById(existingVideo._id)
      .populate('videoPurpose', 'name description')
      .lean();

    return successResponse(
      res,
      'Showcase video updated successfully',
      populatedVideo,
      200
    );
  } catch (error: any) {
    console.error('Update showcase video error:', error);
    return errorResponse(res, error.message || 'Failed to update showcase video', 500);
  }
};

/**
 * @desc    Delete showcase video
 * @route   DELETE /api/admin/showcase-videos/:id
 * @access  Private (Admin only)
 */
export const deleteShowcaseVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await ShowcaseVideo.findById(id);
    if (!video) {
      return errorResponse(res, 'Showcase video not found', 404);
    }

    // Optionally delete video file from storage
    // await fileStorageService.deleteFile(video.videoUrl);
    // if (video.thumbnailUrl) {
    //   await fileStorageService.deleteFile(video.thumbnailUrl);
    // }

    await ShowcaseVideo.findByIdAndDelete(id);

    return successResponse(
      res,
      'Showcase video deleted successfully',
      null,
      200
    );
  } catch (error: any) {
    console.error('Delete showcase video error:', error);
    return errorResponse(res, error.message || 'Failed to delete showcase video', 500);
  }
};

