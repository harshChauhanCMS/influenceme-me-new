import { Request, Response } from 'express';
import CMSPage, { CMSPageType } from '../models/cmsPage';
import { successResponse, errorResponse } from '../utils/responseHelper';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @desc    Get CMS page by type (Public)
 * @route   GET /api/cms/:pageType
 * @access  Public
 */
export const getCMSPage = async (req: Request, res: Response) => {
    try {
        const { pageType } = req.params;

        if (!['privacy_policy', 'terms_conditions', 'about_us'].includes(String(pageType))) {
            return errorResponse(res, 'Invalid page type', 400);
        }

        const page = await CMSPage.findOne({
            pageType: pageType as CMSPageType,
            isActive: true,
        }).populate('lastUpdatedBy', 'name email').lean();

        if (!page) {
            return errorResponse(res, 'Page not found', 404);
        }

        return successResponse(res, 'CMS page fetched successfully', page);
    } catch (error: any) {
        console.error('Get CMS page error:', error);
        return errorResponse(res, error.message || 'Failed to fetch CMS page', 500);
    }
};

/**
 * @desc    Get all CMS pages (Admin only)
 * @route   GET /api/cms
 * @access  Private (Admin only)
 */
export const getAllCMSPages = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const pages = await CMSPage.find()
            .populate('lastUpdatedBy', 'name email')
            .sort({ pageType: 1 })
            .lean();

        return successResponse(res, 'CMS pages fetched successfully', pages);
    } catch (error: any) {
        console.error('Get all CMS pages error:', error);
        return errorResponse(res, error.message || 'Failed to fetch CMS pages', 500);
    }
};

/**
 * @desc    Get CMS page by type (Admin only)
 * @route   GET /api/cms/admin/:pageType
 * @access  Private (Admin only)
 */
export const getCMSPageAdmin = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { pageType } = req.params;

        if (!['privacy_policy', 'terms_conditions', 'about_us'].includes(String(pageType))) {
            return errorResponse(res, 'Invalid page type', 400);
        }

        const page = await CMSPage.findOne({
            pageType: pageType as CMSPageType,
        }).populate('lastUpdatedBy', 'name email').lean();

        if (!page) {
            return errorResponse(res, 'Page not found', 404);
        }

        return successResponse(res, 'CMS page fetched successfully', page);
    } catch (error: any) {
        console.error('Get CMS page admin error:', error);
        return errorResponse(res, error.message || 'Failed to fetch CMS page', 500);
    }
};

/**
 * @desc    Create or update CMS page (Admin only)
 * @route   PUT /api/cms/:pageType
 * @access  Private (Admin only)
 */
export const updateCMSPage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { pageType } = req.params;
        const { title, content, metaTitle, metaDescription, isActive } = req.body;

        if (!['privacy_policy', 'terms_conditions', 'about_us'].includes(String(pageType))) {
            return errorResponse(res, 'Invalid page type', 400);
        }

        if (!title || !content) {
            return errorResponse(res, 'Title and content are required', 400);
        }

        // Find existing page or create new
        let page = await CMSPage.findOne({ pageType: pageType as CMSPageType });

        if (page) {
            // Update existing page
            page.title = title.trim();
            page.content = content;
            page.metaTitle = metaTitle?.trim() || undefined;
            page.metaDescription = metaDescription?.trim() || undefined;
            page.lastUpdatedBy = req.user?._id;
            page.version = (page.version || 1) + 1;
            if (isActive !== undefined) {
                page.isActive = isActive;
            }
            await page.save();
        } else {
            // Create new page
            page = new CMSPage({
                pageType: pageType as CMSPageType,
                title: title.trim(),
                content: content,
                metaTitle: metaTitle?.trim() || undefined,
                metaDescription: metaDescription?.trim() || undefined,
                lastUpdatedBy: req.user?._id,
                version: 1,
                isActive: isActive !== undefined ? isActive : true,
            });
            await page.save();
        }

        const updatedPage = await CMSPage.findById(page._id)
            .populate('lastUpdatedBy', 'name email')
            .lean();

        return successResponse(res, 'CMS page updated successfully', updatedPage);
    } catch (error: any) {
        console.error('Update CMS page error:', error);
        return errorResponse(res, error.message || 'Failed to update CMS page', 500);
    }
};

