import { Request, Response } from 'express';
import VendorRequirement from '../models/vendorRequirement';
import VendorOffer from '../models/vendorOffer';
import { successResponse, errorResponse, paginatedResponse, Pagination } from '../utils/responseHelper';
import { IVendorRequirement } from '../../shared/types/vendorRequirement';

/**
 * @desc    Create a new vendor requirement
 * @route   POST /api/vendor-requirement/create
 * @access  Private (Brand/Influencer)
 */
export const createRequirement = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const userRole = req.user?.role;

        console.log('=== CREATE REQUIREMENT ===');
        console.log('User ID:', userId);
        console.log('User Role:', userRole);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        // Only brands and influencers can create requirements
        if (userRole !== 'brand' && userRole !== 'influencer') {
            return errorResponse(res, 'Only brands and influencers can create vendor requirements', 403);
        }

        const requirementData: Partial<IVendorRequirement> = {
            userId: userId.toString(),
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            budget: req.body.budget ? parseFloat(req.body.budget) : undefined,
            budgetCurrency: req.body.budgetCurrency || 'INR',
            location: req.body.location,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            priority: req.body.priority || 'medium',
            status: 'open',
            attachments: req.body.attachments || [],
            tags: req.body.tags || [],
            requirements: req.body.requirements || [],
        };

        console.log('Requirement data to create:', JSON.stringify(requirementData, null, 2));

        const requirement = await VendorRequirement.create(requirementData);

        console.log('Requirement created successfully:', requirement._id);

        return successResponse(res, 'Vendor requirement created successfully', requirement, 201);
    } catch (error: unknown) {
        console.error('Create requirement error:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to create vendor requirement', 500);
    }
};

/**
 * @desc    Get all vendor requirements with filters and pagination
 * @route   GET /api/vendor-requirement/requirements
 * @access  Public
 */
export const getAllRequirements = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Build filter query
        const filter: any = {};

        // Default to 'open' status for vendors viewing available requirements
        // Exclude 'inactive' and 'expired' requirements from public listings
        if (req.query.status) {
            filter.status = req.query.status;
        } else {
            // For public listings (no userId filter), only show open requirements
            // Exclude inactive and expired from public view
            if (!req.query.userId) {
                filter.status = 'open'; // Public listings only show open requirements
            } else {
                // For requirement owners viewing their own requirements, show all except inactive/expired by default
                // They can filter by status if needed
                filter.status = { $nin: ['inactive', 'expired'] }; // Show all active statuses
            }
        }

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.location) {
            filter.location = { $regex: req.query.location, $options: 'i' };
        }

        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        if (req.query.search) {
            filter.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
            ];
        }

        // Get total count
        const total = await VendorRequirement.countDocuments(filter);

        // Get requirements with populated user data
        // Note: userId is stored as String, not ObjectId, so we need to manually populate
        const requirements = await VendorRequirement.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Manually populate userId since it's stored as String, not ObjectId reference
        const userIds = [...new Set(requirements.map((r: any) => r.userId).filter(Boolean))];
        console.log(`🔍 DEBUG - Found ${userIds.length} unique userIds: ${userIds.join(', ')}`);
        
        // Fetch users separately to ensure all fields including businessInfo are included
        // Convert string IDs to ObjectId for MongoDB query (MongoDB can handle both, but let's be explicit)
        const User = (await import('../models/user')).default;
        const mongoose = (await import('mongoose')).default;
        const objectIdUserIds = userIds.map(id => {
            try {
                return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
            } catch {
                return id;
            }
        });
        
        const users = await User.find({ 
            $or: [
                { _id: { $in: objectIdUserIds } },
                { _id: { $in: userIds } }
            ]
        })
            .select('-password')
            .lean();
        
        console.log(`🔍 DEBUG - Fetched ${users.length} users from database`);
        users.forEach((u: any) => {
            console.log(`  - User ID: ${u._id}, Role: ${u.role}, Has businessInfo: ${!!u.businessInfo}, businessName: ${u.businessInfo?.businessName || 'N/A'}`);
        });
        
        // Create a map for quick lookup
        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
        
        // Attach user data to requirements
        const populatedRequirements = requirements.map((req: any) => {
            const userId = req.userId?.toString();
            if (userId && userMap.has(userId)) {
                req.userId = userMap.get(userId);
            }
            return req;
        });
        
        // Debug: Log first requirement's userId to see what's being returned
        if (populatedRequirements.length > 0 && populatedRequirements[0].userId) {
            const firstUserId = populatedRequirements[0].userId as any;
            console.log('🔍 DEBUG - First requirement userId data after population:');
            console.log('  - Role:', firstUserId.role);
            console.log('  - Has businessInfo:', !!firstUserId.businessInfo);
            console.log('  - businessInfo:', JSON.stringify(firstUserId.businessInfo, null, 2));
            console.log('  - businessName:', firstUserId.businessInfo?.businessName);
        }

        const pagination: Pagination = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };

        return paginatedResponse(res, 'Vendor requirements fetched successfully', populatedRequirements, pagination);
    } catch (error: unknown) {
        console.error('Get all requirements error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch vendor requirements', 500);
    }
};

/**
 * @desc    Get a single vendor requirement by ID
 * @route   GET /api/vendor-requirement/requirement/:id
 * @access  Public
 */
export const getRequirementById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const requirement = await VendorRequirement.findById(id).lean();
        
        if (!requirement) {
            return errorResponse(res, 'Vendor requirement not found', 404);
        }
        
        // Manually populate userId since it's stored as String, not ObjectId reference
        const User = (await import('../models/user')).default;
        const userId = requirement.userId?.toString();
        
        if (userId) {
            const user = await User.findById(userId)
                .select('-password')
                .lean();
            
            if (user) {
                (requirement as any).userId = user;
                
                // Debug: Log requirement's userId to see what's being returned
                console.log('🔍 DEBUG - Requirement detail userId data:');
                console.log('  - Role:', user.role);
                console.log('  - Has businessInfo:', !!user.businessInfo);
                console.log('  - businessInfo:', JSON.stringify(user.businessInfo, null, 2));
                console.log('  - businessName:', user.businessInfo?.businessName);
            }
        }

        return successResponse(res, 'Vendor requirement fetched successfully', requirement);
    } catch (error: unknown) {
        console.error('Get requirement by ID error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch vendor requirement', 500);
    }
};

/**
 * @desc    Update a vendor requirement
 * @route   PUT /api/vendor-requirement/requirement/:id
 * @access  Private (Owner only)
 */
export const updateRequirement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        console.log('=== UPDATE REQUIREMENT ===');
        console.log('Requirement ID:', id);
        console.log('User ID:', userId);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        const requirement = await VendorRequirement.findById(id);

        if (!requirement) {
            return errorResponse(res, 'Vendor requirement not found', 404);
        }

        // Check if user is the owner
        if (requirement.userId !== userId?.toString()) {
            return errorResponse(res, 'You are not authorized to update this requirement', 403);
        }

        // Update fields using Mongoose set method
        const updateData: any = {};

        // Basic string fields
        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.category !== undefined) updateData.category = req.body.category;
        if (req.body.budgetCurrency !== undefined) updateData.budgetCurrency = req.body.budgetCurrency;
        if (req.body.location !== undefined) updateData.location = req.body.location;
        if (req.body.city !== undefined) updateData.city = req.body.city;
        if (req.body.state !== undefined) updateData.state = req.body.state;
        if (req.body.country !== undefined) updateData.country = req.body.country;
        if (req.body.latitude !== undefined) updateData.latitude = req.body.latitude;
        if (req.body.longitude !== undefined) updateData.longitude = req.body.longitude;
        if (req.body.priority !== undefined) updateData.priority = req.body.priority;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.selectedVendorId !== undefined) updateData.selectedVendorId = req.body.selectedVendorId;

        // Arrays
        if (req.body.attachments !== undefined) updateData.attachments = req.body.attachments;
        if (req.body.tags !== undefined) updateData.tags = req.body.tags;
        if (req.body.requirements !== undefined) updateData.requirements = req.body.requirements;

        // Budget - handle number conversion
        if (req.body.budget !== undefined) {
            if (req.body.budget === null || req.body.budget === '') {
                updateData.budget = undefined;
            } else {
                updateData.budget = typeof req.body.budget === 'number' ? req.body.budget : parseFloat(req.body.budget);
            }
        }

        // Dates - handle date conversion
        if (req.body.deadline !== undefined) {
            updateData.deadline = req.body.deadline ? new Date(req.body.deadline) : undefined;
        }
        if (req.body.startDate !== undefined) {
            updateData.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
        }
        if (req.body.endDate !== undefined) {
            updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
        }

        console.log('Update data:', JSON.stringify(updateData, null, 2));

        // Use findByIdAndUpdate instead of manual save
        const updatedRequirement = await VendorRequirement.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedRequirement) {
            return errorResponse(res, 'Failed to update requirement', 500);
        }

        console.log('Updated requirement successfully:', updatedRequirement._id);

        return successResponse(res, 'Vendor requirement updated successfully', updatedRequirement);
    } catch (error: unknown) {
        console.error('Update requirement error:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to update vendor requirement', 500);
    }
};

/**
 * @desc    Delete a vendor requirement
 * @route   DELETE /api/vendor-requirement/requirement/:id
 * @access  Private (Owner only)
 */
export const deleteRequirement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const requirement = await VendorRequirement.findById(id);

        if (!requirement) {
            return errorResponse(res, 'Vendor requirement not found', 404);
        }

        // Check if user is the owner
        if (requirement.userId !== userId?.toString()) {
            return errorResponse(res, 'You are not authorized to delete this requirement', 403);
        }

        await VendorRequirement.findByIdAndDelete(id);

        return successResponse(res, 'Vendor requirement deleted successfully', null);
    } catch (error: unknown) {
        console.error('Delete requirement error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to delete vendor requirement', 500);
    }
};

/**
 * @desc    Get user's vendor requirements
 * @route   GET /api/vendor-requirement/user/requirements
 * @access  Private
 */
export const getUserRequirements = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const filter: any = { userId: userId.toString() };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const total = await VendorRequirement.countDocuments(filter);

        const requirements = await VendorRequirement.find(filter)
            .populate('selectedVendorId', 'name profilePictureUrl vendorInfo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const pagination: Pagination = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };

        return paginatedResponse(res, 'Your vendor requirements fetched successfully', requirements, pagination);
    } catch (error: unknown) {
        console.error('Get user requirements error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch your requirements', 500);
    }
};

/**
 * @desc    Submit a bid for a vendor requirement (DEPRECATED - Use /api/vendor-bid/submit instead)
 * @route   POST /api/vendor-requirement/requirement/:id/bid
 * @access  Private (Vendor only)
 * @note    This endpoint is kept for backward compatibility but redirects to the new bid API
 */
export const submitBid = async (req: Request, res: Response) => {
    // Redirect to new bid endpoint
    // This is handled by vendorBidController.submitBid
    return errorResponse(res, 'This endpoint is deprecated. Please use POST /api/vendor-bid/submit', 410);
};
