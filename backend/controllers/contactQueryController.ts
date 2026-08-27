import { Request, Response } from 'express';
import ContactQuery from '../models/contactQuery';
import { successResponse, errorResponse } from '../utils/responseHelper';
import User from '../models/user';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @desc    Submit a contact query
 * @route   POST /api/contact/submit
 * @access  Public (can be used by logged-in or anonymous users)
 */
export const submitContactQuery = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, phone, phoneCode, message } = req.body;

        // Validation - check for empty strings as well
        if (!firstName || firstName.trim() === '' || !lastName || lastName.trim() === '' || !email || email.trim() === '' || !message || message.trim() === '') {
            return errorResponse(res, 'First name, last name, email, and message are required', 400);
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return errorResponse(res, 'Invalid email format', 400);
        }

        // Get user info if authenticated
        let userId = null;
        let userRole = null;
        if (req.user) {
            userId = req.user._id;
            userRole = req.user.role;
        }

        // Create contact query
        const contactQuery = new ContactQuery({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || undefined,
            phoneCode: phoneCode?.trim() || undefined,
            message: message.trim(),
            userId: userId || undefined,
            userRole: userRole || undefined,
            status: 'pending',
        });

        await contactQuery.save();

        return successResponse(res, 'Your message has been submitted successfully. We will get back to you soon.', {
            queryId: contactQuery._id,
        });
    } catch (error: any) {
        console.error('Submit contact query error:', error);
        return errorResponse(res, error.message || 'Failed to submit contact query', 500);
    }
};

/**
 * @desc    Get all contact queries (Admin only)
 * @route   GET /api/contact/queries
 * @access  Private (Admin only)
 */
export const getAllContactQueries = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Build filter
        const filter: any = {};
        if (status && ['pending', 'in_progress', 'resolved', 'closed'].includes(status as string)) {
            filter.status = status;
        }

        // Get total count
        const total = await ContactQuery.countDocuments(filter);

        // Get queries with pagination
        const queries = await ContactQuery.find(filter)
            .populate('userId', 'name email phone role')
            .populate('respondedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        return successResponse(res, 'Contact queries fetched successfully', {
            queries,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error('Get contact queries error:', error);
        return errorResponse(res, error.message || 'Failed to fetch contact queries', 500);
    }
};

/**
 * @desc    Get a single contact query by ID (Admin only)
 * @route   GET /api/contact/queries/:id
 * @access  Private (Admin only)
 */
export const getContactQueryById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const query = await ContactQuery.findById(id)
            .populate('userId', 'name email phone role')
            .populate('respondedBy', 'name email')
            .lean();

        if (!query) {
            return errorResponse(res, 'Contact query not found', 404);
        }

        return successResponse(res, 'Contact query fetched successfully', query);
    } catch (error: any) {
        console.error('Get contact query by ID error:', error);
        return errorResponse(res, error.message || 'Failed to fetch contact query', 500);
    }
};

/**
 * @desc    Update contact query status (Admin only)
 * @route   PATCH /api/contact/queries/:id/status
 * @access  Private (Admin only)
 */
export const updateContactQueryStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;

        if (!status || !['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
            return errorResponse(res, 'Valid status is required', 400);
        }

        const query = await ContactQuery.findById(id);
        if (!query) {
            return errorResponse(res, 'Contact query not found', 404);
        }

        query.status = status;
        if (adminResponse) {
            query.adminResponse = adminResponse.trim();
        }

        // If status is resolved or closed, mark as responded
        if (status === 'resolved' || status === 'closed') {
            query.respondedBy = req.user?._id;
            query.respondedAt = new Date();
        }

        await query.save();

        return successResponse(res, 'Contact query status updated successfully', query);
    } catch (error: any) {
        console.error('Update contact query status error:', error);
        return errorResponse(res, error.message || 'Failed to update contact query status', 500);
    }
};

/**
 * @desc    Respond to a contact query (Admin only)
 * @route   POST /api/contact/queries/:id/respond
 * @access  Private (Admin only)
 */
export const respondToContactQuery = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { adminResponse, status } = req.body;

        if (!adminResponse || adminResponse.trim().isEmpty) {
            return errorResponse(res, 'Admin response is required', 400);
        }

        const query = await ContactQuery.findById(id);
        if (!query) {
            return errorResponse(res, 'Contact query not found', 404);
        }

        query.adminResponse = adminResponse.trim();
        query.respondedBy = req.user?._id;
        query.respondedAt = new Date();
        if (status && ['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
            query.status = status;
        } else {
            query.status = 'resolved';
        }

        await query.save();

        return successResponse(res, 'Response sent successfully', query);
    } catch (error: any) {
        console.error('Respond to contact query error:', error);
        return errorResponse(res, error.message || 'Failed to respond to contact query', 500);
    }
};

/**
 * @desc    Delete a contact query (Admin only)
 * @route   DELETE /api/contact/queries/:id
 * @access  Private (Admin only)
 */
export const deleteContactQuery = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        const query = await ContactQuery.findByIdAndDelete(id);
        if (!query) {
            return errorResponse(res, 'Contact query not found', 404);
        }

        return successResponse(res, 'Contact query deleted successfully', null);
    } catch (error: any) {
        console.error('Delete contact query error:', error);
        return errorResponse(res, error.message || 'Failed to delete contact query', 500);
    }
};

