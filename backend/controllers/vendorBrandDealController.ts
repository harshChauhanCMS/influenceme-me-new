import { Request, Response } from 'express';
import mongoose from 'mongoose';
import VendorBrandDeal from '../models/vendorBrandDeal';
import VendorOffer from '../models/vendorOffer';
import VendorRequirement from '../models/vendorRequirement';
import User from '../models/user';
import { successResponse, errorResponse, paginatedResponse, Pagination } from '../utils/responseHelper';
import { AuthenticatedRequest } from '../middleware/auth';
import { fileStorageService } from '../services/fileStorageService';

/**
 * @desc    Get user deals (Vendor or Brand/Influencer)
 * @route   GET /api/vendor-brand-deal
 * @access  Private
 */
export const getUserDeals = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const userRole = req.user?.role;
        const { page = '1', limit = '20', status, requirementId } = req.query as { page?: string; limit?: string; status?: string; requirementId?: string };

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const query: Record<string, any> = { isActive: true };

        // Filter based on user role
        if (userRole === 'vendor') {
            query.vendorId = userId.toString();
        } else if (userRole === 'brand' || userRole === 'influencer') {
            query.brandId = userId.toString();
        } else {
            return errorResponse(res, 'Role not authorized to view deals', 403);
        }

        if (status) query.status = status;
        if (requirementId) query.requirementId = requirementId;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const deals = await VendorBrandDeal.find(query)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .sort({ dealAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Manually populate brandId and vendorId since they are String fields (not ObjectId)
        const userIds = new Set<string>();
        deals.forEach(deal => {
            if (deal.brandId) userIds.add(deal.brandId.toString());
            if (deal.vendorId) userIds.add(deal.vendorId.toString());
        });

        // Convert string IDs to ObjectId for MongoDB query
        const objectIdUserIds: mongoose.Types.ObjectId[] = [];
        const userIdStrings: string[] = [];
        
        Array.from(userIds).forEach(id => {
            const idStr = id.toString();
            userIdStrings.push(idStr);
            try {
                if (mongoose.Types.ObjectId.isValid(idStr)) {
                    objectIdUserIds.push(new mongoose.Types.ObjectId(idStr));
                } else {
                    console.warn(`⚠️ Invalid ObjectId format: ${idStr}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error converting ID to ObjectId: ${idStr}`, error);
            }
        });

        if (objectIdUserIds.length === 0) {
            console.error('⚠️ No valid ObjectIds to query for user population');
            console.error(`   User ID strings collected: ${userIdStrings.join(', ')}`);
        } else {
            console.log(`🔍 Querying ${objectIdUserIds.length} users for population...`);
            console.log(`   User IDs to query: ${objectIdUserIds.map(id => id.toString()).join(', ')}`);
        }

        // Query users with ObjectId - MongoDB can handle both ObjectId and string in $in
        const users = await User.find({ 
            _id: { $in: objectIdUserIds.length > 0 ? objectIdUserIds : userIdStrings }
        })
            .select('name email phone profilePictureUrl role businessInfo addresses vendorInfo')
            .lean();

        console.log(`✅ Found ${users.length} users for population out of ${objectIdUserIds.length} requested`);
        if (users.length !== objectIdUserIds.length) {
            console.warn(`⚠️ Mismatch: Requested ${objectIdUserIds.length} users but found ${users.length}`);
            const foundIds = users.map(u => u._id.toString());
            const requestedIds = objectIdUserIds.map(id => id.toString());
            const missingIds = requestedIds.filter(id => !foundIds.includes(id));
            if (missingIds.length > 0) {
                console.warn(`   Missing user IDs: ${missingIds.join(', ')}`);
            }
        }

        // Create a map with string ID as key for lookup
        const userMap = new Map<string, any>();
        users.forEach(u => {
            const idString = u._id.toString();
            userMap.set(idString, u);
            console.log(`   Added user to map: ${idString} -> ${u.name}`);
        });

        console.log(`📋 User map created with ${userMap.size} entries`);
        console.log(`   User IDs in map: ${Array.from(userMap.keys()).join(', ')}`);

        // Attach user data to deals
        deals.forEach((deal, index) => {
            if (deal.brandId) {
                const brandIdString = deal.brandId.toString();
                let user = userMap.get(brandIdString);
                
                if (!user) {
                    // Try case-insensitive match and trimming
                    const normalizedBrandId = brandIdString.trim();
                    for (const [key, value] of userMap.entries()) {
                        if (key.trim() === normalizedBrandId) {
                            user = value;
                            break;
                        }
                    }
                }
                
                if (user) {
                    (deal as any).brandId = user;
                    console.log(`✅ Deal ${index + 1}: Populated brandId "${brandIdString}" with user: ${user.name} (${user.role})`);
                } else {
                    console.error(`❌ Deal ${index + 1}: Brand user not found for ID: "${brandIdString}"`);
                    console.error(`   Available user IDs in map: ${Array.from(userMap.keys()).join(', ')}`);
                    console.error(`   Deal brandId type: ${typeof deal.brandId}, value: "${deal.brandId}"`);
                    console.error(`   BrandId length: ${brandIdString.length}, First user ID length: ${Array.from(userMap.keys())[0]?.length || 0}`);
                }
            }
            if (deal.vendorId) {
                const vendorIdString = deal.vendorId.toString();
                let user = userMap.get(vendorIdString);
                
                if (!user) {
                    const normalizedVendorId = vendorIdString.trim();
                    for (const [key, value] of userMap.entries()) {
                        if (key.trim() === normalizedVendorId) {
                            user = value;
                            break;
                        }
                    }
                }
                
                if (user) {
                    (deal as any).vendorId = user;
                    console.log(`✅ Deal ${index + 1}: Populated vendorId "${vendorIdString}" with user: ${user.name}`);
                } else {
                    console.error(`❌ Deal ${index + 1}: Vendor user not found for ID: "${vendorIdString}"`);
                }
            }
        });

        // Debug: Check final state before sending response
        console.log(`\n🔍 FINAL CHECK - Deals before response:`);
        deals.forEach((deal, index) => {
            console.log(`   Deal ${index + 1} (${deal._id}):`);
            console.log(`     brandId type: ${typeof (deal as any).brandId}`);
            if (typeof (deal as any).brandId === 'object' && (deal as any).brandId !== null) {
                console.log(`     ✅ brandId is populated object`);
                console.log(`     ✅ name: ${(deal as any).brandId.name}, role: ${(deal as any).brandId.role}`);
            } else {
                console.log(`     ❌ brandId is still string: "${(deal as any).brandId}"`);
            }
        });

        // Ensure brandId and vendorId are properly set as objects (not strings)
        // Convert to plain objects if needed for JSON serialization
        const dealsWithPopulatedUsers = deals.map((deal: any) => {
            const dealObj: any = { ...deal };
            
            // CRITICAL: Ensure brandId is an object with proper _id conversion
            if (dealObj.brandId) {
                if (typeof dealObj.brandId === 'object' && dealObj.brandId !== null && !Array.isArray(dealObj.brandId)) {
                    // Already populated, ensure it's properly formatted with string _id
                    const brandIdValue = dealObj.brandId._id?.toString() || dealObj.brandId._id || null;
                    dealObj.brandId = {
                        _id: brandIdValue,
                        name: dealObj.brandId.name || null,
                        email: dealObj.brandId.email || null,
                        phone: dealObj.brandId.phone || null,
                        profilePictureUrl: dealObj.brandId.profilePictureUrl || null,
                        role: dealObj.brandId.role || null,
                        businessInfo: dealObj.brandId.businessInfo || null,
                        addresses: dealObj.brandId.addresses || null,
                        vendorInfo: dealObj.brandId.vendorInfo || null,
                    };
                    console.log(`✅ Deal ${dealObj._id}: Formatted brandId as object with name: "${dealObj.brandId.name}" (ID: ${brandIdValue})`);
                } else if (typeof dealObj.brandId === 'string') {
                    console.error(`❌ Deal ${dealObj._id}: brandId is still string "${dealObj.brandId}" after population attempt!`);
                    // Try to find user again as fallback
                    const fallbackUser = userMap.get(dealObj.brandId);
                    if (fallbackUser) {
                        dealObj.brandId = {
                            _id: fallbackUser._id.toString(),
                            name: fallbackUser.name || null,
                            email: fallbackUser.email || null,
                            phone: fallbackUser.phone || null,
                            profilePictureUrl: fallbackUser.profilePictureUrl || null,
                            role: fallbackUser.role || null,
                            businessInfo: fallbackUser.businessInfo || null,
                            addresses: fallbackUser.addresses || null,
                            vendorInfo: fallbackUser.vendorInfo || null,
                        };
                        console.log(`✅ Deal ${dealObj._id}: Fixed brandId from fallback map with name: "${dealObj.brandId.name}"`);
                    }
                }
            }
            
            // CRITICAL: Ensure vendorId is an object with proper _id conversion
            if (dealObj.vendorId) {
                if (typeof dealObj.vendorId === 'object' && dealObj.vendorId !== null && !Array.isArray(dealObj.vendorId)) {
                    const vendorIdValue = dealObj.vendorId._id?.toString() || dealObj.vendorId._id || null;
                    dealObj.vendorId = {
                        _id: vendorIdValue,
                        name: dealObj.vendorId.name || null,
                        email: dealObj.vendorId.email || null,
                        phone: dealObj.vendorId.phone || null,
                        profilePictureUrl: dealObj.vendorId.profilePictureUrl || null,
                        role: dealObj.vendorId.role || null,
                        businessInfo: dealObj.vendorId.businessInfo || null,
                        addresses: dealObj.vendorId.addresses || null,
                        vendorInfo: dealObj.vendorId.vendorInfo || null,
                    };
                    console.log(`✅ Deal ${dealObj._id}: Formatted vendorId as object with name: "${dealObj.vendorId.name}" (ID: ${vendorIdValue})`);
                } else if (typeof dealObj.vendorId === 'string') {
                    const fallbackVendor = userMap.get(dealObj.vendorId);
                    if (fallbackVendor) {
                        dealObj.vendorId = {
                            _id: fallbackVendor._id.toString(),
                            name: fallbackVendor.name || null,
                            email: fallbackVendor.email || null,
                            phone: fallbackVendor.phone || null,
                            profilePictureUrl: fallbackVendor.profilePictureUrl || null,
                            role: fallbackVendor.role || null,
                            businessInfo: fallbackVendor.businessInfo || null,
                            addresses: fallbackVendor.addresses || null,
                            vendorInfo: fallbackVendor.vendorInfo || null,
                        };
                        console.log(`✅ Deal ${dealObj._id}: Fixed vendorId from fallback map with name: "${dealObj.vendorId.name}"`);
                    }
                }
            }
            
            return dealObj;
        });

        // Final verification
        console.log(`\n🔍 FINAL VERIFICATION - Deals after formatting:`);
        dealsWithPopulatedUsers.forEach((deal: any, index: number) => {
            console.log(`   Deal ${index + 1} (${deal._id}):`);
            if (deal.brandId && typeof deal.brandId === 'object') {
                console.log(`     ✅ brandId is object with name: ${deal.brandId.name}`);
            } else {
                console.log(`     ❌ brandId is not properly populated: ${typeof deal.brandId}`);
            }
        });

        const totalDeals = await VendorBrandDeal.countDocuments(query);
        const totalPages = Math.ceil(totalDeals / limitNum);

        return paginatedResponse(
            res,
            'Deals fetched successfully',
            dealsWithPopulatedUsers,
            {
                page: pageNum,
                limit: limitNum,
                total: totalDeals,
                totalPages,
            }
        );
    } catch (error: unknown) {
        console.error('Get user deals error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch deals', 500);
    }
};

/**
 * @desc    Get vendor's deal for a specific requirement
 * @route   GET /api/vendor-brand-deal/requirement/:requirementId
 * @access  Private (Vendor)
 */
export const getVendorDealForRequirement = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const vendorId = req.user?._id;
        const { requirementId } = req.params;

        if (!vendorId) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const deal = await VendorBrandDeal.findOne({
            requirementId,
            vendorId: vendorId.toString(),
            isActive: true,
        })
            .populate('requirementId', 'title category budget status')
            .populate('offerId', 'message proposedTerms status createdAt')
            .lean();

        if (!deal) {
            return successResponse(res, 'No deal found for this requirement', null);
        }

        // Manually populate brandId since it's a String field
        const userIds = new Set<string>();
        if (deal.brandId) userIds.add(deal.brandId.toString());

        const objectIdUserIds: mongoose.Types.ObjectId[] = [];
        Array.from(userIds).forEach(id => {
            try {
                if (mongoose.Types.ObjectId.isValid(id)) {
                    objectIdUserIds.push(new mongoose.Types.ObjectId(id));
                }
            } catch (error) {
                console.warn(`⚠️ Error converting ID to ObjectId: ${id}`, error);
            }
        });

        const users = await User.find({ 
            _id: { $in: objectIdUserIds.length > 0 ? objectIdUserIds : Array.from(userIds) }
        })
            .select('name email phone profilePictureUrl role businessInfo addresses vendorInfo')
            .lean();

        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
        const dealObj: any = { ...deal };
        
        if (dealObj.brandId) {
            const brandIdString = dealObj.brandId.toString();
            if (userMap.has(brandIdString)) {
                dealObj.brandInfo = userMap.get(brandIdString);
            }
        }

        return successResponse(res, 'Deal fetched successfully', dealObj);
    } catch (error: unknown) {
        console.error('Get vendor deal for requirement error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch deal', 500);
    }
};

/**
 * @desc    Get deal details
 * @route   GET /api/vendor-brand-deal/:dealId
 * @access  Private
 */
export const getDealDetails = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const deal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status requirements')
            .populate('offerId', 'message proposedTerms status createdAt')
            .lean();

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Manually populate brandId and vendorId since they are String fields (not ObjectId)
        console.log(`\n🔍 DEAL DETAILS - Starting population for deal: ${dealId}`);
        console.log(`   Original deal.brandId: ${deal.brandId} (type: ${typeof deal.brandId})`);
        console.log(`   Original deal.vendorId: ${deal.vendorId} (type: ${typeof deal.vendorId})`);
        
        const userIds = new Set<string>();
        if (deal.brandId) userIds.add(deal.brandId.toString());
        if (deal.vendorId) userIds.add(deal.vendorId.toString());

        console.log(`   User IDs to populate: ${Array.from(userIds).join(', ')}`);

        // Convert string IDs to ObjectId for MongoDB query
        const objectIdUserIds: mongoose.Types.ObjectId[] = [];
        Array.from(userIds).forEach(id => {
            try {
                if (mongoose.Types.ObjectId.isValid(id)) {
                    objectIdUserIds.push(new mongoose.Types.ObjectId(id));
                } else {
                    console.warn(`⚠️ Invalid ObjectId format: ${id}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error converting ID to ObjectId: ${id}`, error);
            }
        });

        console.log(`   Converted to ObjectIds: ${objectIdUserIds.length} valid IDs`);

        // Query users with ObjectId
        const users = await User.find({ 
            _id: { $in: objectIdUserIds }
        })
            .select('name email phone profilePictureUrl role businessInfo addresses vendorInfo')
            .lean();

        console.log(`   ✅ Found ${users.length} users from database`);
        users.forEach(u => {
            console.log(`      - User ID: ${u._id.toString()}, Name: ${u.name}, Role: ${u.role}`);
        });

        // Create a map with string ID as key for lookup
        const userMap = new Map<string, any>();
        users.forEach(u => {
            const idString = u._id.toString();
            userMap.set(idString, u);
            console.log(`   Added to map: ${idString} -> ${u.name}`);
        });

        console.log(`   User map size: ${userMap.size}`);

        // Attach user data to deal
        const dealObj: any = { ...deal };
        
        if (dealObj.brandId) {
            const brandIdString = dealObj.brandId.toString();
            let brandUser = userMap.get(brandIdString);
            
            // Try normalized lookup if direct match fails
            if (!brandUser) {
                const normalizedBrandId = brandIdString.trim();
                for (const [key, value] of userMap.entries()) {
                    if (key.trim() === normalizedBrandId) {
                        brandUser = value;
                        break;
                    }
                }
            }
            
            if (brandUser) {
                const brandIdValue = brandUser._id?.toString() || brandUser._id || null;
                dealObj.brandId = {
                    _id: brandIdValue,
                    name: brandUser.name || null,
                    email: brandUser.email || null,
                    phone: brandUser.phone || null,
                    profilePictureUrl: brandUser.profilePictureUrl || null,
                    role: brandUser.role || null,
                    businessInfo: brandUser.businessInfo || null,
                    addresses: brandUser.addresses || null,
                    vendorInfo: brandUser.vendorInfo || null,
                };
                console.log(`✅ Deal Details: Populated brandId ${brandIdString} with user: "${brandUser.name}" (ID: ${brandIdValue})`);
            } else {
                console.error(`❌ Deal Details: Brand user not found for ID: "${brandIdString}"`);
                console.error(`   Available user IDs in map: ${Array.from(userMap.keys()).join(', ')}`);
            }
        }
        
        if (dealObj.vendorId) {
            const vendorIdString = dealObj.vendorId.toString();
            let vendorUser = userMap.get(vendorIdString);
            
            if (!vendorUser) {
                const normalizedVendorId = vendorIdString.trim();
                for (const [key, value] of userMap.entries()) {
                    if (key.trim() === normalizedVendorId) {
                        vendorUser = value;
                        break;
                    }
                }
            }
            
            if (vendorUser) {
                const vendorIdValue = vendorUser._id?.toString() || vendorUser._id || null;
                dealObj.vendorId = {
                    _id: vendorIdValue,
                    name: vendorUser.name || null,
                    email: vendorUser.email || null,
                    phone: vendorUser.phone || null,
                    profilePictureUrl: vendorUser.profilePictureUrl || null,
                    role: vendorUser.role || null,
                    businessInfo: vendorUser.businessInfo || null,
                    addresses: vendorUser.addresses || null,
                    vendorInfo: vendorUser.vendorInfo || null,
                };
                console.log(`✅ Deal Details: Populated vendorId ${vendorIdString} with user: "${vendorUser.name}" (ID: ${vendorIdValue})`);
            } else {
                console.error(`❌ Deal Details: Vendor user not found for ID: "${vendorIdString}"`);
            }
        }
        
        // Debug: Final check BEFORE sending response
        console.log(`\n🔍 DEAL DETAILS - Final check BEFORE response:`);
        console.log(`   dealObj.brandId type: ${typeof dealObj.brandId}`);
        console.log(`   dealObj.brandId value: ${JSON.stringify(dealObj.brandId)}`);
        if (typeof dealObj.brandId === 'object' && dealObj.brandId !== null) {
            console.log(`   ✅ brandId is object with name: ${dealObj.brandId.name}`);
        } else {
            console.log(`   ❌ brandId is: ${typeof dealObj.brandId}, value: ${dealObj.brandId}`);
        }
        
        console.log(`   dealObj.vendorId type: ${typeof dealObj.vendorId}`);
        if (typeof dealObj.vendorId === 'object' && dealObj.vendorId !== null) {
            console.log(`   ✅ vendorId is object with name: ${dealObj.vendorId.name}`);
        }

        // Check authorization after population
        const brandIdString = dealObj.brandId?._id?.toString() || (typeof dealObj.brandId === 'object' ? dealObj.brandId?.toString() : null) || dealObj.brandId?.toString() || deal.brandId?.toString();
        const vendorIdString = dealObj.vendorId?._id?.toString() || (typeof dealObj.vendorId === 'object' ? dealObj.vendorId?.toString() : null) || dealObj.vendorId?.toString() || deal.vendorId?.toString();
        
        console.log(`   Authorization check - brandIdString: ${brandIdString}, vendorIdString: ${vendorIdString}, userId: ${userId?.toString()}`);
        
        const isVendor = userRole === 'vendor' && vendorIdString === userId?.toString();
        const isBrand = (userRole === 'brand' || userRole === 'influencer') && brandIdString === userId?.toString();

        console.log(`   isVendor: ${isVendor}, isBrand: ${isBrand}`);

        if (!isVendor && !isBrand) {
            return errorResponse(res, 'Unauthorized to view this deal', 403);
        }

        console.log(`\n✅ SENDING RESPONSE - dealObj.brandId: ${typeof dealObj.brandId}`);
        console.log(`   Response brandId will be: ${JSON.stringify(dealObj.brandId).substring(0, 100)}...`);
        
        return successResponse(res, 'Deal details fetched successfully', dealObj);
    } catch (error: unknown) {
        console.error('Get deal details error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to fetch deal details', 500);
    }
};

/**
 * @desc    Update deal (status, final terms, payment status, service status)
 * @route   PUT /api/vendor-brand-deal/:dealId
 * @access  Private
 */
export const updateDeal = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Check authorization
        const isVendor = userRole === 'vendor' && deal.vendorId === userId?.toString();
        const isBrand = (userRole === 'brand' || userRole === 'influencer') && deal.brandId === userId?.toString();

        if (!isVendor && !isBrand) {
            return errorResponse(res, 'Unauthorized to update this deal', 403);
        }

        // Handle agreement file upload if present
        const agreementFile = req.file;
        let agreementFileUrl: string | null = null;
        if (agreementFile) {
            try {
                agreementFileUrl = await fileStorageService.uploadFile(agreementFile, 'agreements');
            } catch (error: any) {
                console.error('Agreement file upload failed:', error.message);
                return errorResponse(res, `Agreement file upload failed: ${error.message}`, 500);
            }
        }

        const updates: Record<string, any> = {};

        // Update status if provided
        if (req.body.status) {
            const allowedStatuses = ['running', 'completed', 'cancelled'];
            if (!allowedStatuses.includes(req.body.status)) {
                return errorResponse(res, 'Invalid status', 400);
            }
            updates.status = req.body.status;
            if (req.body.status === 'completed') {
                updates.completedAt = new Date();
            }
        }

        // Update final terms if provided
        if (req.body.finalTerms) {
            const finalTerms = req.body.finalTerms;
            
            if (finalTerms.agreedAmount !== undefined) {
                updates['finalTerms.agreedAmount'] = finalTerms.agreedAmount;
            }
            
            if (finalTerms.agreedDeadline !== undefined) {
                updates['finalTerms.agreedDeadline'] = finalTerms.agreedDeadline ? new Date(finalTerms.agreedDeadline) : undefined;
            }
            
            if (finalTerms.serviceStatus) {
                const allowedServiceStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
                if (!allowedServiceStatuses.includes(finalTerms.serviceStatus)) {
                    return errorResponse(res, 'Invalid service status', 400);
                }
                updates['finalTerms.serviceStatus'] = finalTerms.serviceStatus;
            }
            
            if (finalTerms.paymentStatus) {
                const allowedPaymentStatuses = ['pending', 'paid', 'partial', 'refunded'];
                if (!allowedPaymentStatuses.includes(finalTerms.paymentStatus)) {
                    return errorResponse(res, 'Invalid payment status', 400);
                }
                updates['finalTerms.paymentStatus'] = finalTerms.paymentStatus;
            }
            
            if (finalTerms.finalRequirements !== undefined) {
                updates['finalTerms.finalRequirements'] = finalTerms.finalRequirements;
            }
            
            if (finalTerms.finalDeliverables !== undefined) {
                updates['finalTerms.finalDeliverables'] = finalTerms.finalDeliverables;
            }
        }

        // Update agreement file if uploaded
        if (agreementFileUrl) {
            updates.agreementFile = agreementFileUrl;
            updates.agreementAt = new Date();
        }

        // Update message if provided
        if (req.body.message !== undefined) {
            updates.message = req.body.message;
        }

        // Apply updates
        Object.keys(updates).forEach(key => {
            if (key.includes('.')) {
                const [parent, child] = key.split('.');
                if (!deal.finalTerms) {
                    deal.finalTerms = {} as any;
                }
                (deal.finalTerms as any)[child] = updates[key];
            } else {
                (deal as any)[key] = updates[key];
            }
        });

        deal.markModified('finalTerms');
        await deal.save();

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Deal updated successfully', updatedDeal);
    } catch (error: unknown) {
        console.error('Update deal error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to update deal', 500);
    }
};

/**
 * @desc    Update deal status only
 * @route   PATCH /api/vendor-brand-deal/:dealId/status
 * @access  Private
 */
export const updateDealStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { status } = req.body;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const allowedStatuses = ['running', 'completed', 'cancelled'];
        if (!status || !allowedStatuses.includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Check authorization
        const isVendor = userRole === 'vendor' && deal.vendorId === userId?.toString();
        const isBrand = (userRole === 'brand' || userRole === 'influencer') && deal.brandId === userId?.toString();

        if (!isVendor && !isBrand) {
            return errorResponse(res, 'Unauthorized to update this deal', 403);
        }

        deal.status = status;
        if (status === 'completed') {
            deal.completedAt = new Date();
            // Update requirement status to 'expired' when deal is completed
            if (deal.requirementId) {
                await VendorRequirement.findByIdAndUpdate(deal.requirementId, {
                    status: 'expired',
                });
            }
        }
        await deal.save();

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Deal status updated successfully', updatedDeal);
    } catch (error: unknown) {
        console.error('Update deal status error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to update deal status', 500);
    }
};

/**
 * @desc    Update payment status
 * @route   PATCH /api/vendor-brand-deal/:dealId/payment-status
 * @access  Private (Brand/Influencer only)
 */
export const updatePaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { paymentStatus } = req.body;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        // Only brand/influencer can update payment status
        if (userRole !== 'brand' && userRole !== 'influencer') {
            return errorResponse(res, 'Only brand/influencer can update payment status', 403);
        }

        const allowedPaymentStatuses = ['pending', 'paid', 'partial', 'refunded'];
        if (!paymentStatus || !allowedPaymentStatuses.includes(paymentStatus)) {
            return errorResponse(res, 'Invalid payment status', 400);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Check if user is the brand/influencer for this deal
        if (deal.brandId !== userId?.toString()) {
            return errorResponse(res, 'Unauthorized to update this deal', 403);
        }

        if (!deal.finalTerms) {
            deal.finalTerms = {} as any;
        }
        (deal.finalTerms as any).paymentStatus = paymentStatus;
        deal.markModified('finalTerms');
        await deal.save();

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Payment status updated successfully', updatedDeal);
    } catch (error: unknown) {
        console.error('Update payment status error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to update payment status', 500);
    }
};

/**
 * @desc    Update service status
 * @route   PATCH /api/vendor-brand-deal/:dealId/service-status
 * @access  Private (Vendor only)
 */
export const updateServiceStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { serviceStatus } = req.body;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        // Only vendor can update service status
        if (userRole !== 'vendor') {
            return errorResponse(res, 'Only vendor can update service status', 403);
        }

        const allowedServiceStatuses = ['pending', 'in-progress', 'pending_verification', 'completed', 'cancelled'];
        if (!serviceStatus || !allowedServiceStatuses.includes(serviceStatus)) {
            return errorResponse(res, 'Invalid service status', 400);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Check if user is the vendor for this deal
        if (deal.vendorId !== userId?.toString()) {
            return errorResponse(res, 'Unauthorized to update this deal', 403);
        }

        // If vendor tries to mark as completed, change it to pending_verification
        let finalStatus = serviceStatus;
        if (serviceStatus === 'completed') {
            finalStatus = 'pending_verification';
        }

        if (!deal.finalTerms) {
            deal.finalTerms = {} as any;
        }
        (deal.finalTerms as any).serviceStatus = finalStatus;
        deal.markModified('finalTerms');
        await deal.save();

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Service status updated successfully', updatedDeal);
    } catch (error: unknown) {
        console.error('Update service status error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to update service status', 500);
    }
};

/**
 * @desc    Verify service completion (client only) - Approves vendor's completion request
 * @route   PATCH /api/vendor-brand-deal/:dealId/verify-completion
 * @access  Private
 */
export const verifyServiceCompletion = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        // Only brand/influencer can verify completion
        if (userRole !== 'brand' && userRole !== 'influencer') {
            return errorResponse(res, 'Only client can verify service completion', 403);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Check if user is the client for this deal
        if (deal.brandId !== userId?.toString()) {
            return errorResponse(res, 'Unauthorized to verify this deal', 403);
        }

        // Check if service status is pending_verification
        const currentServiceStatus = (deal.finalTerms as any)?.serviceStatus;
        if (currentServiceStatus !== 'pending_verification') {
            return errorResponse(res, 'Service is not pending verification', 400);
        }

        if (!deal.finalTerms) {
            deal.finalTerms = {} as any;
        }
        
        // Mark service as completed
        (deal.finalTerms as any).serviceStatus = 'completed';
        deal.markModified('finalTerms');
        
        // Also mark deal as completed
        deal.status = 'completed';
        deal.completedAt = new Date();
        await deal.save();

        // Update requirement status to 'expired' when deal is completed
        if (deal.requirementId) {
            await VendorRequirement.findByIdAndUpdate(deal.requirementId, {
                status: 'expired',
            });
        }

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Service completion verified successfully. Deal marked as completed.', updatedDeal);
    } catch (error: unknown) {
        console.error('Verify service completion error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to verify service completion', 500);
    }
};

/**
 * @desc    Mark deal as completed
 * @route   PATCH /api/vendor-brand-deal/:dealId/complete
 * @access  Private
 */
export const markDealCompleted = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Only client (brand/influencer) can directly mark deal as completed
        // Vendor should use service status flow instead
        const isBrand = (userRole === 'brand' || userRole === 'influencer') && deal.brandId === userId?.toString();

        if (!isBrand) {
            return errorResponse(res, 'Only client can mark deal as completed. Vendor should mark service as completed.', 403);
        }

        // Check if service is already completed
        const serviceStatus = (deal.finalTerms as any)?.serviceStatus;
        if (serviceStatus !== 'completed') {
            return errorResponse(res, 'Service must be completed before marking deal as completed', 400);
        }

        if (deal.status === 'completed') {
            return successResponse(res, 'Deal is already marked as completed', deal.toObject());
        }

        deal.status = 'completed';
        deal.completedAt = new Date();
        await deal.save();

        // Update requirement status to 'expired' when deal is completed
        if (deal.requirementId) {
            await VendorRequirement.findByIdAndUpdate(deal.requirementId, {
                status: 'expired',
            });
        }

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Deal marked as completed successfully', updatedDeal);
    } catch (error: unknown) {
        console.error('Mark deal completed error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to complete deal', 500);
    }
};

/**
 * @desc    Cancel deal
 * @route   PATCH /api/vendor-brand-deal/:dealId/cancel
 * @access  Private
 */
export const cancelDeal = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { dealId } = req.params;
        const { message } = req.body;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return errorResponse(res, 'User not authenticated', 401);
        }

        const deal = await VendorBrandDeal.findById(dealId);

        if (!deal) {
            return errorResponse(res, 'Deal not found', 404);
        }

        // Check authorization
        const isVendor = userRole === 'vendor' && deal.vendorId === userId?.toString();
        const isBrand = (userRole === 'brand' || userRole === 'influencer') && deal.brandId === userId?.toString();

        if (!isVendor && !isBrand) {
            return errorResponse(res, 'Unauthorized to cancel this deal', 403);
        }

        if (deal.status === 'cancelled') {
            return successResponse(res, 'Deal is already cancelled', deal.toObject());
        }

        deal.status = 'cancelled';
        if (message) {
            deal.message = message;
        }
        deal.isActive = false;
        await deal.save();

        // Populate and return updated deal
        const updatedDeal = await VendorBrandDeal.findById(dealId)
            .populate('requirementId', 'title category budget location status')
            .populate('offerId', 'message proposedTerms status')
            .populate('brandId', 'name profilePictureUrl role businessInfo addresses')
            .populate('vendorId', 'name profilePictureUrl vendorInfo')
            .lean();

        return successResponse(res, 'Deal cancelled successfully', updatedDeal);
    } catch (error: unknown) {
        console.error('Cancel deal error:', error);
        if (error instanceof Error) {
            return errorResponse(res, error.message, 500);
        }
        return errorResponse(res, 'Failed to cancel deal', 500);
    }
};

