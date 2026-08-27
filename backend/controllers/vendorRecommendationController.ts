import { Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseHelper';
import { AuthenticatedRequest } from '../middleware/auth';
import VendorRecommendation from '../models/vendorRecommendation';
import Service from '../models/service';

const BASE_URL = process.env.FRONTEND_URL || process.env.API_URL || 'https://influence-me.in';

/**
 * Build the message text for WhatsApp share (recommendation details).
 */
function buildWhatsAppMessage(doc: {
  businessName: string;
  description: string;
  location?: string;
  images: string[];
}): string {
  let text = `Check out this service - it's amazing! 👇\n\n`;
  text += `*${doc.businessName}*\n\n`;
  text += `${doc.description}\n\n`;
  if (doc.location) {
    text += `📍 Location: ${doc.location}\n\n`;
  }
  if (doc.images && doc.images.length > 0) {
    text += `Images: ${doc.images.slice(0, 3).join(' ')}\n`;
  }
  text += `\n_Shared via Influence-Me.in_\n`;
  text += `Influence-Me.in app: https://apps.apple.com/in/app/influence-me-in/id6755072451`;
  return text;
}

/**
 * Get all vendor services (any vendor) for "share on WhatsApp" (pick a service from DB).
 * Only authenticated vendors can call this. Returns services created by all vendors.
 * GET /api/vendor-recommendation/services?page=1&limit=20
 */
export const getMyServicesForRecommendation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role !== 'vendor') {
      return errorResponse(res, 'Only vendors can list services for recommendation', 403);
    }

    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      Service.find({ isActive: true })
        .select('_id serviceName description location images category price priceType currency vendorId')
        .populate('vendorId', 'name profilePictureUrl vendorInfo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments({ isActive: true }),
    ]);

    return successResponse(res, 'All vendor services. Pick one to share on WhatsApp.', services, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error('Get services for recommendation error:', error);
    return errorResponse(res, 'Failed to fetch services', 500);
  }
};

/**
 * Create a recommendation and return WhatsApp share URL.
 * Vendor only. Pass serviceId to share an existing service from DB (no manual entry needed).
 */
export const createRecommendation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role !== 'vendor') {
      return errorResponse(res, 'Only vendors can create service recommendations', 403);
    }

    const { businessName, description, location, images, serviceId } = req.body;

    let finalName = businessName;
    let finalDescription = description;
    let finalLocation = location;
    let finalImages: string[] = Array.isArray(images) ? images : [];

    if (serviceId) {
      const service = await Service.findOne({ _id: serviceId, isActive: true });
      if (!service) {
        return errorResponse(res, 'Service not found or inactive', 404);
      }
      finalName = service.serviceName;
      finalDescription = service.description;
      if (service.location) finalLocation = service.location;
      if (service.images?.length) finalImages = service.images;
    }

    if (!finalName || !finalDescription) {
      return errorResponse(
        res,
        serviceId ? 'Service has no name or description.' : 'Business/service name and description are required (or pass serviceId to share a service from your list).',
        400
      );
    }

    const recommendation = new VendorRecommendation({
      vendorId: userId,
      businessName: finalName,
      description: finalDescription,
      location: finalLocation || undefined,
      images: finalImages,
      serviceId: serviceId || undefined,
    });

    const saved = await recommendation.save();
    const doc = saved.toObject();

    const messageText = buildWhatsAppMessage({
      businessName: doc.businessName,
      description: doc.description,
      location: doc.location,
      images: doc.images,
    });
    const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    const sharePageUrl = `${BASE_URL.replace(/\/$/, '')}/recommendation/${saved._id}`;

    return successResponse(res, 'Recommendation created. Share via WhatsApp.', {
      recommendation: doc,
      whatsAppShareUrl,
      sharePageUrl,
    });
  } catch (error: unknown) {
    console.error('Create vendor recommendation error:', error);
    return errorResponse(res, 'Failed to create recommendation', 500);
  }
};

/**
 * Get a recommendation by ID (public – for share page / preview).
 */
export const getRecommendation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const recommendation = await VendorRecommendation.findById(id)
      .populate('vendorId', 'name email')
      .lean();

    if (!recommendation) {
      return errorResponse(res, 'Recommendation not found', 404);
    }

    const messageText = buildWhatsAppMessage({
      businessName: recommendation.businessName,
      description: recommendation.description,
      location: recommendation.location,
      images: recommendation.images,
    });
    const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    return successResponse(res, 'Recommendation found', {
      recommendation,
      whatsAppShareUrl,
    });
  } catch (error: unknown) {
    console.error('Get vendor recommendation error:', error);
    return errorResponse(res, 'Failed to get recommendation', 500);
  }
};

/**
 * List recommendations created by the current vendor (authenticated).
 */
export const getMyRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || role !== 'vendor') {
      return errorResponse(res, 'Only vendors can list their recommendations', 403);
    }

    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      VendorRecommendation.find({ vendorId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VendorRecommendation.countDocuments({ vendorId: userId }),
    ]);

    return successResponse(res, 'Recommendations retrieved', list, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error('Get my recommendations error:', error);
    return errorResponse(res, 'Failed to get recommendations', 500);
  }
};
