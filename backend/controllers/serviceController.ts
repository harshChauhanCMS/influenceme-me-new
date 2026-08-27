import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseHelper';
import Service from '../models/service';
import User from '../models/user';
import { AuthenticatedRequest } from '../middleware/auth';
import { fileStorageService } from '../services/fileStorageService';

// Create a new service (Vendor only)
export const createService = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can create services', 403);
        }

        const {
            serviceName,
            category,
            subCategory,
            description,
            price,
            priceType,
            currency,
            duration,
            features,
            tags,
            location,
        } = req.body;

        if (!serviceName || !category || !description) {
            return errorResponse(res, 'Service name, category, and description are required', 400);
        }

        // Upload images to file storage microservice
        const imageFiles = (req.files as Express.Multer.File[]) || [];
        let imageUrls: string[] = [];
        
        if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
            try {
                imageUrls = await fileStorageService.uploadMultipleFiles(imageFiles, 'service_images');
                console.log(`✅ Uploaded ${imageUrls.length} service images`);
            } catch (error: any) {
                console.error('Service image upload failed:', error.message);
                console.error('Error details:', error);
                return errorResponse(res, `Image upload failed: ${error.message}`, 500);
            }
        }

        const service = new Service({
            vendorId: userId,
            serviceName,
            category,
            subCategory,
            description,
            price: price ? parseFloat(price) : undefined,
            priceType,
            currency,
            duration,
            images: imageUrls, // Save uploaded image URLs
            features: features ? (Array.isArray(features) ? features : JSON.parse(features)) : [],
            tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
            location,
            isActive: true,
            availability: 'available',
        });

        const savedService = await service.save();

        return successResponse(res, 'Service created successfully', savedService.toObject());
    } catch (error: unknown) {
        console.error('Error creating service:', error);
        return errorResponse(res, 'Failed to create service', 500);
    }
};

// Get all services (Public or filtered)
export const getAllServices = async (req: Request, res: Response) => {
    try {
        const {
            page = '1',
            limit = '20',
            category,
            vendorId,
            location,
            priceMin,
            priceMax,
            search,
        } = req.query;

        const query: Record<string, unknown> = { isActive: true };

        if (category) {
            query.category = category;
        }

        if (vendorId) {
            query.vendorId = vendorId;
        }

        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }

        if (priceMin || priceMax) {
            query.price = {};
            if (priceMin) (query.price as Record<string, unknown>).$gte = parseFloat(priceMin as string);
            if (priceMax) (query.price as Record<string, unknown>).$lte = parseFloat(priceMax as string);
        }

        if (search) {
            query.$text = { $search: search as string };
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const services = await Service.find(query)
            .populate('vendorId', 'name profilePictureUrl vendorInfo phone email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit as string));

        const total = await Service.countDocuments(query);

        return successResponse(
            res,
            'Services fetched successfully',
            services,
            200,
            {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            }
        );
    } catch (error: unknown) {
        console.error('Error fetching services:', error);
        return errorResponse(res, 'Failed to fetch services', 500);
    }
};

// Get service by ID
export const getServiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id).populate(
            'vendorId',
            'name profilePictureUrl vendorInfo phone email addresses'
        );

        if (!service) {
            return errorResponse(res, 'Service not found', 404);
        }

        return successResponse(res, 'Service fetched successfully', service.toObject());
    } catch (error: unknown) {
        console.error('Error fetching service:', error);
        return errorResponse(res, 'Failed to fetch service', 500);
    }
};

// Update service (Vendor only - own services)
export const updateService = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id } = req.params;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can update services', 403);
        }

        const service = await Service.findById(id);

        if (!service) {
            return errorResponse(res, 'Service not found', 404);
        }

        if (service.vendorId.toString() !== userId) {
            return errorResponse(res, 'You can only update your own services', 403);
        }

        const {
            serviceName,
            category,
            subCategory,
            description,
            price,
            priceType,
            currency,
            duration,
            features,
            tags,
            location,
            availability,
            isActive,
        } = req.body;

        if (serviceName) service.serviceName = serviceName;
        if (category) service.category = category;
        if (subCategory !== undefined) service.subCategory = subCategory;
        if (description) service.description = description;
        if (price !== undefined) service.price = parseFloat(price);
        if (priceType) service.priceType = priceType;
        if (currency) service.currency = currency;
        if (duration !== undefined) service.duration = duration;
        if (features) service.features = Array.isArray(features) ? features : JSON.parse(features);
        if (tags) service.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
        if (location !== undefined) service.location = location;
        if (availability) service.availability = availability;
        if (isActive !== undefined) service.isActive = isActive;

        // Handle image uploads - upload new images and merge with existing ones
        const imageFiles = (req.files as Express.Multer.File[]) || [];
        if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
            try {
                const newImageUrls = await fileStorageService.uploadMultipleFiles(imageFiles, 'service_images');
                console.log(`✅ Uploaded ${newImageUrls.length} new service images`);
                
                // Merge new images with existing ones (if any)
                if (service.images && service.images.length > 0) {
                    service.images = [...service.images, ...newImageUrls];
                } else {
                    service.images = newImageUrls;
                }
            } catch (error: any) {
                console.error('Service image upload failed:', error.message);
                console.error('Error details:', error);
                return errorResponse(res, `Image upload failed: ${error.message}`, 500);
            }
        }

        const updatedService = await service.save();

        return successResponse(res, 'Service updated successfully', updatedService.toObject());
    } catch (error: unknown) {
        console.error('Error updating service:', error);
        return errorResponse(res, 'Failed to update service', 500);
    }
};

// Delete service (Vendor only - own services) - Soft delete by marking as unlisted
export const deleteService = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id } = req.params;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can delete services', 403);
        }

        const service = await Service.findById(id);

        if (!service) {
            return errorResponse(res, 'Service not found', 404);
        }

        if (service.vendorId.toString() !== userId) {
            return errorResponse(res, 'You can only delete your own services', 403);
        }

        // Soft delete: Mark as inactive (unlisted) instead of deleting
        service.isActive = false;
        service.availability = 'unavailable';
        await service.save();

        return successResponse(res, 'Service unlisted successfully', service.toObject());
    } catch (error: unknown) {
        console.error('Error deleting service:', error);
        return errorResponse(res, 'Failed to delete service', 500);
    }
};

// Get vendor's own services
export const getVendorServices = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || userRole !== 'vendor') {
            return errorResponse(res, 'Only vendors can access this endpoint', 403);
        }

        const { page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const services = await Service.find({ vendorId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit as string));

        const total = await Service.countDocuments({ vendorId: userId });

        return successResponse(
            res,
            'Vendor services fetched successfully',
            services,
            200,
            {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            }
        );
    } catch (error: unknown) {
        console.error('Error fetching vendor services:', error);
        return errorResponse(res, 'Failed to fetch vendor services', 500);
    }
};

