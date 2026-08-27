import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseHelper';
import VideoPurpose from '../models/videoPurpose';

/**
 * @desc    Get all video purposes
 * @route   GET /api/admin/video-purposes
 * @access  Private (Admin only)
 */
export const getVideoPurposes = async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;
    const query = activeOnly === 'true' ? { isActive: true } : {};
    
    const purposes = await VideoPurpose.find(query)
      .sort({ name: 1 })
      .lean();

    return successResponse(
      res,
      'Video purposes fetched successfully',
      purposes,
      200
    );
  } catch (error: any) {
    console.error('Get video purposes error:', error);
    return errorResponse(res, error.message || 'Failed to fetch video purposes', 500);
  }
};

/**
 * @desc    Get single video purpose
 * @route   GET /api/admin/video-purposes/:id
 * @access  Private (Admin only)
 */
export const getVideoPurpose = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const purpose = await VideoPurpose.findById(id).lean();

    if (!purpose) {
      return errorResponse(res, 'Video purpose not found', 404);
    }

    return successResponse(
      res,
      'Video purpose fetched successfully',
      purpose,
      200
    );
  } catch (error: any) {
    console.error('Get video purpose error:', error);
    return errorResponse(res, error.message || 'Failed to fetch video purpose', 500);
  }
};

/**
 * @desc    Create video purpose
 * @route   POST /api/admin/video-purposes
 * @access  Private (Admin only)
 */
export const createVideoPurpose = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Name is required', 400);
    }

    // Check if purpose with same name already exists
    const existingPurpose = await VideoPurpose.findOne({ name: name.trim() });
    if (existingPurpose) {
      return errorResponse(res, 'Video purpose with this name already exists', 400);
    }

    const newPurpose = new VideoPurpose({
      name: name.trim(),
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    await newPurpose.save();

    return successResponse(
      res,
      'Video purpose created successfully',
      newPurpose.toObject(),
      201
    );
  } catch (error: any) {
    console.error('Create video purpose error:', error);
    return errorResponse(res, error.message || 'Failed to create video purpose', 500);
  }
};

/**
 * @desc    Update video purpose
 * @route   PUT /api/admin/video-purposes/:id
 * @access  Private (Admin only)
 */
export const updateVideoPurpose = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existingPurpose = await VideoPurpose.findById(id);
    if (!existingPurpose) {
      return errorResponse(res, 'Video purpose not found', 404);
    }

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingPurpose.name) {
      const duplicatePurpose = await VideoPurpose.findOne({ name: name.trim() });
      if (duplicatePurpose) {
        return errorResponse(res, 'Video purpose with this name already exists', 400);
      }
      existingPurpose.name = name.trim();
    }

    if (description !== undefined) existingPurpose.description = description;
    if (isActive !== undefined) existingPurpose.isActive = isActive;

    await existingPurpose.save();

    return successResponse(
      res,
      'Video purpose updated successfully',
      existingPurpose.toObject(),
      200
    );
  } catch (error: any) {
    console.error('Update video purpose error:', error);
    return errorResponse(res, error.message || 'Failed to update video purpose', 500);
  }
};

/**
 * @desc    Delete video purpose
 * @route   DELETE /api/admin/video-purposes/:id
 * @access  Private (Admin only)
 */
export const deleteVideoPurpose = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purpose = await VideoPurpose.findById(id);
    if (!purpose) {
      return errorResponse(res, 'Video purpose not found', 404);
    }

    // Check if any videos are using this purpose
    const ShowcaseVideo = (await import('../models/showcaseVideo')).default;
    const videosUsingPurpose = await ShowcaseVideo.countDocuments({ videoPurpose: id });
    
    if (videosUsingPurpose > 0) {
      return errorResponse(
        res,
        `Cannot delete video purpose. ${videosUsingPurpose} video(s) are using this purpose.`,
        400
      );
    }

    await VideoPurpose.findByIdAndDelete(id);

    return successResponse(
      res,
      'Video purpose deleted successfully',
      null,
      200
    );
  } catch (error: any) {
    console.error('Delete video purpose error:', error);
    return errorResponse(res, error.message || 'Failed to delete video purpose', 500);
  }
};

