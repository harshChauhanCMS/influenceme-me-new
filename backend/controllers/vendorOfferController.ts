import { Request, Response } from 'express';
import VendorOffer from '../models/vendorOffer';
import VendorRequirement from '../models/vendorRequirement';
import VendorBrandDeal from '../models/vendorBrandDeal';
import User from '../models/user';
import { successResponse, errorResponse, paginatedResponse, Pagination } from '../utils/responseHelper';
import { IVendorOffer } from '../../shared/types/vendorOffer';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAndSend } from '../services/notificationService';
import mongoose from 'mongoose';

/**
 * @desc    Create a new vendor offer (brand/influencer sends offer to vendor for a requirement)
 * @route   POST /api/vendor-offer/create
 * @access  Private (Brand/Influencer only)
 */
export const createOffer = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const userRole = req.user?.role;

        console.log('=== CREATE VENDOR OFFER ===');
        console.log('User ID:', userId);
        console.log('User Role:', userRole);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        // Only brands/influencers can send offers to vendors
        if (userRole !== 'brand' && userRole !== 'influencer') {
            return errorResponse(res, 'Only brands and influencers can send offers to vendors', 403);
        }

        const {
            requirementId,
            vendorId,
            offerType,
            price,
            priceCurrency,
            message,
            proposedCompletionDate
        } = req.body;

        console.log('Extracted fields:', { requirementId, vendorId, offerType, price, priceCurrency, message, proposedCompletionDate });

        if (!requirementId || !vendorId || !price || !message) {
            console.log('Validation failed:', { requirementId: !!requirementId, vendorId: !!vendorId, price: !!price, message: !!message });
            return errorResponse(res, 'Requirement ID, vendor ID, price, and message are required', 400);
        }

        // Check if requirement exists and belongs to the user
        console.log('Checking requirement...');
        const requirement = await VendorRequirement.findById(requirementId);

        if (!requirement) {
            console.log('Requirement not found');
            return errorResponse(res, 'Requirement not found', 404);
        }

        console.log('Requirement found:', requirement._id);
        console.log('Requirement userId:', requirement.userId);
        console.log('Current userId:', userId.toString());

        if (requirement.userId !== userId.toString()) {
            console.log('Authorization failed: requirement does not belong to user');
            return errorResponse(res, 'You can only send offers for your own requirements', 403);
        }

        // Check if requirement is inactive or expired - cannot send more offers
        if (requirement.status === 'inactive' || requirement.status === 'expired') {
            console.log('Requirement is inactive or expired, cannot send more offers');
            return errorResponse(res, 'This requirement is no longer accepting offers. A deal has already been created or the requirement has expired.', 400);
        }

        // Check if already sent an offer to this vendor for this requirement
        console.log('Checking for existing offer...');
        const existingOffer = await VendorOffer.findOne({
            requirementId,
            vendorId: vendorId.toString(),
        });

        if (existingOffer) {
            console.log('Duplicate offer found');
            return errorResponse(res, 'You have already sent an offer to this vendor for this requirement', 400);
        }

        // Build proposed terms object
        console.log('Building proposed terms...');
        const proposedTerms = {
            price: parseFloat(price),
            currency: priceCurrency || 'INR',
            deliveryTime: proposedCompletionDate || undefined,
            description: `Offer type: ${offerType || 'fixed'}`,
        };

        console.log('Proposed terms:', proposedTerms);

        const offerData: Partial<IVendorOffer> = {
            requirementId,
            vendorId: vendorId.toString(),
            userId: userId.toString(),
            message,
            proposedTerms,
            status: 'pending',
        };

        console.log('Creating offer with data:', offerData);
        const offer = await VendorOffer.create(offerData);
        console.log('Offer created successfully:', offer._id);

        // Update total offers count on requirement
        await VendorRequirement.findByIdAndUpdate(requirementId, {
            $inc: { totalOffers: 1 },
        });

        const requirementTitle = (requirement as any).title || 'A new offer';
        createAndSend(
            vendorId,
            'vendor_offer_received',
            'New offer received',
            `You have received an offer: ${requirementTitle}`,
            {
                offerId: String(offer._id),
                requirementId: String(requirementId),
            },
        ).catch((err) =>
            console.error('Failed to send vendor offer notification:', err),
        );

        // Populate before sending response
        const populatedOffer = await VendorOffer.findById(offer._id)
            .populate('requirementId', 'title category budget status')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .populate('userId', 'name profilePictureUrl role businessInfo addresses')
            .lean();

        return successResponse(res, 'Offer sent successfully to vendor', populatedOffer, 201);
    } catch (error: unknown) {
        console.error('Create offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to send offer', 500);
    }
};

/**
 * @desc    Get offers for a specific requirement
 * @route   GET /api/vendor-offer/requirement/:requirementId
 * @access  Private (Requirement owner or vendors who sent offers)
 */
export const getOffersByRequirement = async (req: Request, res: Response) => {
    try {
        const { requirementId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        // Check if requirement exists
        const requirement = await VendorRequirement.findById(requirementId);

        if (!requirement) {
            return errorResponse(res, 'Requirement not found', 404);
        }

        // Only the requirement owner can see all offers
        if (requirement.userId !== userId.toString()) {
            return errorResponse(res, 'You are not authorized to view these offers', 403);
        }

        const offers = await VendorOffer.find({ requirementId })
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .sort({ isShortlisted: -1, createdAt: -1 })
            .lean();

        return successResponse(res, 'Offers fetched successfully', offers);
    } catch (error: unknown) {
        console.error('Get offers by requirement error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch offers', 500);
    }
};

/**
 * @desc    Get vendor's offer for a specific requirement
 * @route   GET /api/vendor-offer/vendor/requirement/:requirementId
 * @access  Private (Vendor)
 */
export const getVendorOfferForRequirement = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const vendorId = req.user?._id;
        const { requirementId } = req.params;

        if (!vendorId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const offer = await VendorOffer.findOne({
            requirementId,
            vendorId: vendorId.toString(),
        })
            .populate('requirementId', 'title category budget status')
            .populate('userId', 'name profilePictureUrl role businessInfo')
            .lean();

        if (!offer) {
            return successResponse(res, 'No offer found for this requirement', null);
        }

        return successResponse(res, 'Offer fetched successfully', offer);
    } catch (error: unknown) {
        console.error('Get vendor offer for requirement error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch offer', 500);
    }
};

/**
 * @desc    Get vendor's sent offers
 * @route   GET /api/vendor-offer/vendor/sent
 * @access  Private (Vendor)
 */
export const getVendorSentOffers = async (req: Request, res: Response) => {
    try {
        const vendorId = req.user?._id;

        if (!vendorId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const filter: any = { vendorId: vendorId.toString() };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        const total = await VendorOffer.countDocuments(filter);

        const offers = await VendorOffer.find(filter)
            .populate('requirementId', 'title category budget status')
            .populate('userId', 'name profilePictureUrl role businessInfo addresses')
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

        return paginatedResponse(res, 'Your sent offers fetched successfully', offers, pagination);
    } catch (error: unknown) {
        console.error('Get vendor sent offers error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch your offers', 500);
    }
};

/**
 * @desc    Get offers received by brand/influencer (vendor offers sent TO brand/influencer)
 * @route   GET /api/vendor-offer/user/received
 * @access  Private (Brand/Influencer)
 */
export const getUserReceivedOffers = async (req: Request, res: Response) => {
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

        if (req.query.requirementId) {
            filter.requirementId = req.query.requirementId;
        }

        const total = await VendorOffer.countDocuments(filter);

        const offers = await VendorOffer.find(filter)
            .populate('requirementId', 'title category budget status')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
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

        return paginatedResponse(res, 'Received offers fetched successfully', offers, pagination);
    } catch (error: unknown) {
        console.error('Get user received offers error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch received offers', 500);
    }
};

/**
 * @desc    Get offers received by vendor (brand/influencer offers sent TO vendor)
 * @route   GET /api/vendor-offer/vendor/received
 * @access  Private (Vendor)
 */
export const getVendorReceivedOffers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const vendorId = req.user?._id;

        if (!vendorId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        if (req.user?.role !== 'vendor') {
            return errorResponse(res, 'Only vendors can view received offers', 403);
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Offers sent by brands/influencers TO this vendor
        // These are offers where brand/influencer sends offer TO vendor (reversed from normal flow)
        // For now, we'll look for offers where vendorId matches, but these are actually offers FROM brands
        // We need to check the requirement's userId to find offers sent TO this vendor
        
        // Actually, based on the requirement, when brand sends offer to vendor, it should be stored differently
        // But looking at createOffer, it creates an offer with vendorId and userId
        // So offers sent BY brand TO vendor would have:
        // - userId: brand/influencer ID (who sent it)
        // - vendorId: vendor ID (who received it)
        // - But wait, that doesn't match the current schema...
        
        // Let me check: The current schema is for vendors sending offers TO brands
        // We need a different approach - maybe store "received offers" differently
        // OR we need to query requirements where vendor was selected and check for offers sent TO that vendor
        
        // Query offers sent by brands/influencers TO this vendor
        // These offers have vendorId = vendor (receiver), userId = brand/influencer (sender)
        
        const filter: any = { vendorId: vendorId.toString() };

        // Only filter by status if explicitly provided, otherwise return all offers
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const total = await VendorOffer.countDocuments(filter);

        const offers = await VendorOffer.find(filter)
            .populate('requirementId', 'title category budget status location')
            .populate('userId', 'name profilePictureUrl role businessInfo addresses')
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

        return paginatedResponse(res, 'Received offers fetched successfully', offers, pagination);
    } catch (error: unknown) {
        console.error('Get vendor received offers error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch received offers', 500);
    }
};

/**
 * @desc    Vendor accepts an offer (brand/influencer sent TO vendor)
 * @route   POST /api/vendor-offer/vendor/accept/:offerId
 * @access  Private (Vendor)
 */
export const vendorAcceptOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { offerId } = req.params;
        const vendorId = req.user?._id;
        const { message } = req.body;

        if (!vendorId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        if (req.user?.role !== 'vendor') {
            return errorResponse(res, 'Only vendors can accept offers', 403);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if vendor is the receiver of this offer
        if (offer.vendorId !== vendorId.toString()) {
            return errorResponse(res, 'You are not authorized to accept this offer', 403);
        }

        if (offer.status !== 'pending' && offer.status !== 'negotiating') {
            return errorResponse(res, 'This offer cannot be accepted', 400);
        }

        // Update offer status
        offer.status = 'accepted';
        await offer.save();

        // Get requirement and brand/influencer info
        const requirement = await VendorRequirement.findById(offer.requirementId);
        const brandUser = await User.findById(offer.userId).select('name email profilePictureUrl role businessInfo vendorInfo');

        if (!requirement) {
            return errorResponse(res, 'Requirement not found', 404);
        }

        if (!brandUser) {
            return errorResponse(res, 'Brand/Influencer not found', 404);
        }

        // Get vendor full info to send to brand
        const vendorUser = await User.findById(vendorId).select('name email phone profilePictureUrl vendorInfo businessInfo').lean();

        if (!vendorUser) {
            return errorResponse(res, 'Vendor not found', 404);
        }

        // Create VendorBrandDeal with negotiated terms from offer.proposedTerms
        const dealData = {
            brandId: offer.userId.toString(), // Brand/Influencer who sent the offer
            vendorId: vendorId.toString(), // Vendor who accepted
            requirementId: offer.requirementId.toString(),
            offerId: offer._id.toString(),
            status: 'running',
            message: message || 'Offer accepted',
            dealAt: new Date(),
            finalTerms: {
                agreedAmount: offer.proposedTerms.price,
                currency: offer.proposedTerms.currency || 'INR',
                agreedDeadline: undefined, // Delivery time is a string like "7 days", not a Date
                deliveryTime: offer.proposedTerms.deliveryTime || undefined, // Save negotiated delivery time
                serviceStatus: 'pending',
                paymentStatus: 'pending',
                finalRequirements: requirement.requirements || [],
                finalDeliverables: [offer.proposedTerms.description || ''],
                // Save all negotiated terms from offer
                includesRevisions: offer.proposedTerms.includesRevisions || false,
                numberOfRevisions: offer.proposedTerms.numberOfRevisions || undefined,
                additionalServices: offer.proposedTerms.additionalServices || [],
                description: offer.proposedTerms.description || undefined,
            },
            isActive: true,
        };

        const deal = await VendorBrandDeal.create(dealData);

        // Update requirement to mark vendor as selected and set status to 'inactive'
        // This prevents more offers and hides the requirement from public listings
        await VendorRequirement.findByIdAndUpdate(offer.requirementId, {
            selectedVendorId: vendorId.toString(),
            status: 'inactive',
        });

        // Populate offer for response
        const populatedOffer = await VendorOffer.findById(offer._id)
            .populate('requirementId', 'title category budget status location')
            .populate('userId', 'name profilePictureUrl role businessInfo addresses')
            .lean();

        // Return deal with vendor info for brand
        return successResponse(res, 'Offer accepted successfully. Deal created.', {
            offer: populatedOffer,
            deal: deal,
            vendorInfo: vendorUser, // Full vendor info to send to brand
        });
    } catch (error: unknown) {
        console.error('Vendor accept offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to accept offer', 500);
    }
};

/**
 * @desc    Vendor declines an offer (brand/influencer sent TO vendor)
 * @route   POST /api/vendor-offer/vendor/decline/:offerId
 * @access  Private (Vendor)
 */
export const vendorDeclineOffer = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { offerId } = req.params;
        const vendorId = req.user?._id;
        const { message } = req.body;

        if (!vendorId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        if (req.user?.role !== 'vendor') {
            return errorResponse(res, 'Only vendors can decline offers', 403);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if vendor is the receiver of this offer
        if (offer.vendorId !== vendorId.toString()) {
            return errorResponse(res, 'You are not authorized to decline this offer', 403);
        }

        if (offer.status !== 'pending' && offer.status !== 'negotiating') {
            return errorResponse(res, 'This offer cannot be declined', 400);
        }

        // Update offer status
        offer.status = 'declined';
        await offer.save();

        const populatedOffer = await VendorOffer.findById(offer._id)
            .populate('requirementId', 'title category budget status location')
            .populate('userId', 'name profilePictureUrl role businessInfo addresses')
            .lean();

        return successResponse(res, 'Offer declined successfully', populatedOffer);
    } catch (error: unknown) {
        console.error('Vendor decline offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to decline offer', 500);
    }
};

/**
 * @desc    Accept an offer (brand/influencer accepts vendor offer - OLD function kept for compatibility)
 * @route   POST /api/vendor-offer/accept/:offerId
 * @access  Private (Requirement owner)
 */
export const acceptOffer = async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const userId = req.user?._id;
        const { message } = req.body;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if user is the requirement owner
        if (offer.userId !== userId.toString()) {
            return errorResponse(res, 'You are not authorized to accept this offer', 403);
        }

        if (offer.status !== 'pending' && offer.status !== 'negotiating') {
            return errorResponse(res, 'This offer cannot be accepted', 400);
        }

        // Update offer status
        offer.status = 'accepted';
        offer.clientResponse = {
            message: message || 'Your offer has been accepted',
            respondedAt: new Date(),
        };
        await offer.save();

        // Update requirement to mark vendor as selected and set status to 'inactive'
        // This prevents more offers and hides the requirement from public listings
        await VendorRequirement.findByIdAndUpdate(offer.requirementId, {
            selectedVendorId: offer.vendorId,
            status: 'inactive',
        });

        // Notify vendor that their offer was accepted
        const requirement = await VendorRequirement.findById(offer.requirementId).select('title').lean();
        const requirementTitle = (requirement as any)?.title || 'Requirement';
        createAndSend(
            new mongoose.Types.ObjectId(offer.vendorId),
            'vendor_offer_accepted',
            'Offer accepted',
            `Your offer for "${requirementTitle}" has been accepted.`,
            {
                offerId: String(offer._id),
                requirementId: String(offer.requirementId),
            },
        ).catch((err) => console.error('Failed to send offer accepted notification to vendor:', err));

        const populatedOffer = await VendorOffer.findById(offer._id)
            .populate('requirementId', 'title category budget status')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Offer accepted successfully', populatedOffer);
    } catch (error: unknown) {
        console.error('Accept offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to accept offer', 500);
    }
};

/**
 * @desc    Decline an offer
 * @route   POST /api/vendor-offer/decline/:offerId
 * @access  Private (Requirement owner)
 */
export const declineOffer = async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const userId = req.user?._id;
        const { message } = req.body;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if user is the requirement owner
        if (offer.userId !== userId.toString()) {
            return errorResponse(res, 'You are not authorized to decline this offer', 403);
        }

        if (offer.status !== 'pending' && offer.status !== 'negotiating') {
            return errorResponse(res, 'This offer cannot be declined', 400);
        }

        // Update offer status
        offer.status = 'declined';
        offer.clientResponse = {
            message: message || 'Your offer has been declined',
            respondedAt: new Date(),
        };
        await offer.save();

        // Notify vendor that their offer was declined
        const requirement = await VendorRequirement.findById(offer.requirementId).select('title').lean();
        const requirementTitle = (requirement as any)?.title || 'Requirement';
        createAndSend(
            new mongoose.Types.ObjectId(offer.vendorId),
            'vendor_offer_declined',
            'Offer declined',
            `Your offer for "${requirementTitle}" was not accepted.`,
            {
                offerId: String(offer._id),
                requirementId: String(offer.requirementId),
            },
        ).catch((err) => console.error('Failed to send offer declined notification to vendor:', err));

        return successResponse(res, 'Offer declined successfully', offer);
    } catch (error: unknown) {
        console.error('Decline offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to decline offer', 500);
    }
};

/**
 * @desc    Start negotiation / counter-offer
 * @route   POST /api/vendor-offer/negotiate/:offerId
 * @access  Private (Requirement owner or Vendor)
 */
export const negotiateOffer = async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const userId = req.user?._id;
        const { message, proposedTerms } = req.body;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        if (!message || !proposedTerms) {
            return errorResponse(res, 'Message and proposed terms are required', 400);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if user is either the requirement owner or the vendor
        const isOwner = offer.userId === userId.toString();
        const isVendor = offer.vendorId === userId.toString();

        if (!isOwner && !isVendor) {
            return errorResponse(res, 'You are not authorized to negotiate this offer', 403);
        }

        // Parse proposed terms
        const parsedProposedTerms = {
            ...proposedTerms,
            price: parseFloat(proposedTerms.price),
            numberOfRevisions: proposedTerms.numberOfRevisions ? parseInt(proposedTerms.numberOfRevisions) : undefined,
        };

        // Add to negotiation history
        if (!offer.negotiationHistory) {
            offer.negotiationHistory = [];
        }

        offer.negotiationHistory.push({
            message,
            proposedTerms: parsedProposedTerms,
            sender: isVendor ? 'vendor' : 'client',
            createdAt: new Date(),
        });

        // Update current proposed terms and status
        offer.proposedTerms = parsedProposedTerms;
        offer.status = 'negotiating';

        await offer.save();

        const populatedOffer = await VendorOffer.findById(offer._id)
            .populate('requirementId', 'title category budget status')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .populate('userId', 'name profilePictureUrl role businessInfo addresses')
            .lean();

        return successResponse(res, 'Counter-offer sent successfully', populatedOffer);
    } catch (error: unknown) {
        console.error('Negotiate offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to send counter-offer', 500);
    }
};

/**
 * @desc    Withdraw an offer (vendor can withdraw their offer)
 * @route   POST /api/vendor-offer/withdraw/:offerId
 * @access  Private (Vendor)
 */
export const withdrawOffer = async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if user is the vendor who sent the offer
        if (offer.vendorId !== userId.toString()) {
            return errorResponse(res, 'You are not authorized to withdraw this offer', 403);
        }

        if (offer.status === 'accepted' || offer.status === 'withdrawn') {
            return errorResponse(res, 'This offer cannot be withdrawn', 400);
        }

        // Update offer status
        offer.status = 'withdrawn';
        await offer.save();

        // Decrement total offers count on requirement
        await VendorRequirement.findByIdAndUpdate(offer.requirementId, {
            $inc: { totalOffers: -1 },
        });

        return successResponse(res, 'Offer withdrawn successfully', offer);
    } catch (error: unknown) {
        console.error('Withdraw offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to withdraw offer', 500);
    }
};

/**
 * @desc    Shortlist an offer
 * @route   POST /api/vendor-offer/shortlist/:offerId
 * @access  Private (Requirement owner)
 */
export const shortlistOffer = async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const userId = req.user?._id;

        if (!userId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const offer = await VendorOffer.findById(offerId);

        if (!offer) {
            return errorResponse(res, 'Offer not found', 404);
        }

        // Check if user is the requirement owner
        if (offer.userId !== userId.toString()) {
            return errorResponse(res, 'You are not authorized to shortlist this offer', 403);
        }

        offer.isShortlisted = !offer.isShortlisted;
        await offer.save();

        return successResponse(
            res,
            offer.isShortlisted ? 'Offer shortlisted successfully' : 'Offer removed from shortlist',
            offer
        );
    } catch (error: unknown) {
        console.error('Shortlist offer error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to shortlist offer', 500);
    }
};

