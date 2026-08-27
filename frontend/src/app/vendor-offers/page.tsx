'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Button,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Avatar,
} from '@mui/material';
import {
    LocalOffer as OfferIcon,
    CheckCircle as AcceptIcon,
    Cancel as DeclineIcon,
    SwapHoriz as NegotiateIcon,
    Visibility as ViewIcon,
    Person as PersonIcon,
    Assignment as AssignmentIcon,
    Handshake as DealIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/authContext';
import vendorOfferService from '@/services/vendorOfferService';
import vendorDealService from '@/services/vendorDealService';
import vendorRequirementService from '@/services/vendorRequirementService';
import { IVendorOffer } from '../../../../shared/types/vendorOffer';
import { IVendorBrandDeal } from '../../../../shared/types/vendorBrandDeal';
import { IVendorRequirement } from '../../../../shared/types/vendorRequirement';
import { IUser } from '../../../../shared/types/user';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { VendorProfileDialog } from '@/components/vendors/VendorProfileDialog';
import { VendorDealDetailsDialog } from '@/components/deals/VendorDealDetailsDialog';

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export default function VendorOffersPage() {
    // Early return if not mounted (prevents SSR issues)
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(0);
    const [offers, setOffers] = useState<IVendorOffer[]>([]);
    const [deals, setDeals] = useState<IVendorBrandDeal[]>([]);
    const [requirements, setRequirements] = useState<IVendorRequirement[]>([]);
    const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [requirementsLoading, setRequirementsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOffer, setSelectedOffer] = useState<IVendorOffer | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'accept' | 'decline' | 'negotiate' | null>(null);
    const [responseMessage, setResponseMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    // Vendor Profile Dialog
    const [vendorProfileDialogOpen, setVendorProfileDialogOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<IUser | null>(null);

    // Deal Details Dialog
    const [dealDetailsDialogOpen, setDealDetailsDialogOpen] = useState(false);
    const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

    const isVendor = user?.role === 'vendor';
    
    const handleViewVendorProfile = (offer: IVendorOffer) => {
        // Get vendor from the populated field
        const vendorData = offer.vendor || (offer as any).vendorId;
        if (vendorData && typeof vendorData === 'object') {
            setSelectedVendor(vendorData as IUser);
            setVendorProfileDialogOpen(true);
        }
    };

    // Load requirements on mount (only for brands/influencers)
    useEffect(() => {
        if (!isVendor) {
            loadRequirements();
        }
    }, []);

    useEffect(() => {
        if (activeTab === 3) {
            // Deals tab
            loadDeals();
        } else {
            // Offers tabs (Pending, Accepted, Declined)
            loadOffers();
        }
    }, [activeTab, page, selectedRequirementId]);

    const loadRequirements = async () => {
        try {
            setRequirementsLoading(true);
            const data = await vendorRequirementService.getUserRequirements({ page: 1, limit: 100 });
            setRequirements(data.requirements);
        } catch (err: unknown) {
            console.error('Error loading requirements:', err);
        } finally {
            setRequirementsLoading(false);
        }
    };

    const loadOffers = async () => {
        try {
            setLoading(true);
            setError(null);

            if (isVendor) {
                // Vendor sees offers received from brands (to respond to)
                const statusFilter = activeTab === 0 ? 'pending' : activeTab === 1 ? 'accepted' : activeTab === 2 ? 'declined' : undefined;
                const data = await vendorOfferService.getVendorSentOffers({
                    page,
                    limit: 10,
                    status: statusFilter,
                });
                setOffers(data.offers);
                setTotalPages(data.pagination.totalPages || 1);
            } else {
                // Brand/Influencer sees their SENT offers to vendors (view only)
                const statusFilter = activeTab === 0 ? 'pending' : activeTab === 1 ? 'accepted' : activeTab === 2 ? 'declined' : undefined;
                const data = await vendorOfferService.getUserReceivedOffers({
                    page,
                    limit: 10,
                    status: statusFilter,
                    requirementId: selectedRequirementId || undefined,
                });
                console.log('Brand sent offers data:', data);
                console.log('First offer sample:', data.offers[0]);
                setOffers(data.offers);
                setTotalPages(data.pagination.totalPages || 1);
            }
        } catch (err: unknown) {
            console.error('Error loading offers:', err);
            setError('Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const loadDeals = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!isVendor) {
                // Brand/Influencer sees their deals
                const data = await vendorDealService.getUserDeals({
                    page,
                    limit: 10,
                    requirementId: selectedRequirementId || undefined,
                });
                setDeals(data.deals);
                setTotalPages(data.pagination.totalPages || 1);
            }
        } catch (err: unknown) {
            console.error('Error loading deals:', err);
            setError('Failed to load deals');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedOffer?._id || !actionType) return;

        try {
            setActionLoading(true);

            if (actionType === 'accept') {
                await vendorOfferService.acceptOffer(selectedOffer._id, responseMessage);
            } else if (actionType === 'decline') {
                await vendorOfferService.declineOffer(selectedOffer._id, responseMessage);
            }

            setActionDialogOpen(false);
            setResponseMessage('');
            setSelectedOffer(null);
            setActionType(null);
            loadOffers();
        } catch (err: unknown) {
            console.error('Error performing action:', err);
            setError(`Failed to ${actionType} offer`);
        } finally {
            setActionLoading(false);
        }
    };

    const openActionDialog = (offer: IVendorOffer, type: 'accept' | 'decline' | 'negotiate') => {
        setSelectedOffer(offer);
        setActionType(type);
        setActionDialogOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'accepted':
                return 'success';
            case 'declined':
                return 'error';
            case 'negotiating':
                return 'info';
            case 'withdrawn':
                return 'default';
            default:
                return 'default';
        }
    };

    if (!mounted) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress sx={{ color: '#8CC342' }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                    {isVendor ? 'Received Offers' : 'Sent Offers to Vendors'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {isVendor
                        ? 'Respond to offers received from brands and influencers'
                        : 'Track status of your offers sent to vendors'}
                </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Requirement Selector - Only for brands/influencers */}
            {!isVendor && (
                <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="requirement-select-label">Filter by Requirement</InputLabel>
                        <Select
                            labelId="requirement-select-label"
                            id="requirement-select"
                            value={selectedRequirementId}
                            label="Filter by Requirement"
                            onChange={(e) => {
                                setSelectedRequirementId(e.target.value);
                                setPage(1);
                            }}
                            sx={{
                                bgcolor: 'white',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#e0e0e0',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#8CC342',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#8CC342',
                                },
                            }}
                        >
                            <MenuItem value="">
                                <em>All Requirements</em>
                            </MenuItem>
                            {requirementsLoading ? (
                                <MenuItem disabled>
                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                    Loading requirements...
                                </MenuItem>
                            ) : (
                                requirements.map((req) => (
                                    <MenuItem key={req._id} value={req._id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AssignmentIcon fontSize="small" sx={{ color: '#8CC342' }} />
                                            {req.title}
                                        </Box>
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => {
                        setActiveTab(newValue);
                        setPage(1);
                    }}
                    sx={{
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '1rem' },
                        '& .Mui-selected': { color: '#8CC342' },
                        '& .MuiTabs-indicator': { backgroundColor: '#8CC342' },
                    }}
                >
                    <Tab label="Pending" />
                    <Tab label="Accepted" />
                    <Tab label="Declined" />
                    {!isVendor && <Tab label="Deals" />}
                </Tabs>
            </Box>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: '#8CC342' }} />
                </Box>
            ) : activeTab === 3 ? (
                // Deals Tab
                deals.length === 0 ? (
                    <Card sx={{ textAlign: 'center', py: 8 }}>
                        <DealIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No deals found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            No active deals at the moment
                        </Typography>
                    </Card>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {deals.map((deal) => (
                                <Card 
                                    key={deal._id} 
                                    sx={{ 
                                        borderRadius: 2,
                                        '&:hover': {
                                            boxShadow: 3,
                                            transition: 'all 0.2s ease-in-out',
                                        },
                                    }}
                                >
                                    <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                                    {(deal.requirementId as any)?.title || 'Requirement'}
                                                </Typography>
                                                <Chip
                                                    label={deal.status}
                                                    size="small"
                                                    color={
                                                        deal.status === 'completed'
                                                            ? 'success'
                                                            : deal.status === 'cancelled'
                                                            ? 'error'
                                                            : 'primary'
                                                    }
                                                />
                                            </Box>

                                            {/* Deal Details */}
                                            {deal.finalTerms && (
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        <strong>Agreed Amount:</strong>{' '}
                                                        {deal.finalTerms.currency || 'INR'}{' '}
                                                        {deal.finalTerms.agreedAmount?.toLocaleString() || 'N/A'}
                                                    </Typography>
                                                    {deal.finalTerms.deliveryTime && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Delivery Time:</strong> {deal.finalTerms.deliveryTime}
                                                        </Typography>
                                                    )}
                                                    {deal.finalTerms.serviceStatus && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Service Status:</strong>{' '}
                                                            <Chip
                                                                label={deal.finalTerms.serviceStatus.replace('_', ' ')}
                                                                size="small"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                        </Typography>
                                                    )}
                                                    {deal.finalTerms.paymentStatus && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Payment Status:</strong>{' '}
                                                            <Chip
                                                                label={deal.finalTerms.paymentStatus}
                                                                size="small"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}

                                            {/* Vendor/Brand Info */}
                                            <Typography variant="caption" color="text.secondary">
                                                {deal.dealAt && `Deal created: ${format(new Date(deal.dealAt), 'MMM dd, yyyy')}`}
                                            </Typography>
                                        </Box>

                                        {/* View Details Button - Fixed at bottom */}
                                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                size="small"
                                                startIcon={<ViewIcon />}
                                                onClick={() => {
                                                    setSelectedDealId(deal._id);
                                                    setDealDetailsDialogOpen(true);
                                                }}
                                                sx={{
                                                    textTransform: 'none',
                                                    borderColor: '#8CC342',
                                                    color: '#8CC342',
                                                    '&:hover': {
                                                        borderColor: '#699e31',
                                                        bgcolor: '#e6f3d8',
                                                    },
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>

                        {/* Pagination for Deals */}
                        {totalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(e, value) => setPage(value)}
                                    color="primary"
                                    sx={{
                                        '& .MuiPaginationItem-root.Mui-selected': {
                                            bgcolor: '#8CC342',
                                            '&:hover': { bgcolor: '#699e31' },
                                        },
                                    }}
                                />
                            </Box>
                        )}
                    </>
                )
            ) : offers.length === 0 ? (
                <Card sx={{ textAlign: 'center', py: 8 }}>
                    <OfferIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No offers found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {activeTab === 0
                            ? 'No pending offers at the moment'
                            : activeTab === 1
                            ? 'No accepted offers yet'
                            : activeTab === 2
                            ? 'No declined offers'
                            : 'No offers available'}
                    </Typography>
                </Card>
            ) : (
                <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {offers.map((offer) => {
                            // Get vendor data for brands/influencers
                            const vendorData = !isVendor ? (offer.vendor || (offer as any).vendorId) : null;
                            const vendorName = vendorData && typeof vendorData === 'object' 
                                ? (vendorData.name || vendorData.vendorInfo?.businessName || 'Unknown Vendor')
                                : 'Unknown Vendor';
                            const vendorAvatar = vendorData && typeof vendorData === 'object' 
                                ? vendorData.profilePictureUrl 
                                : null;

                            return (
                            <Card key={offer._id} sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    {offer.requirement?.title || 'Requirement'}
                                                </Typography>
                                                <Chip
                                                    label={offer.status}
                                                    size="small"
                                                    color={getStatusColor(offer.status)}
                                                />
                                            </Box>

                                            {/* Vendor Info with Avatar - Only for brands/influencers */}
                                            {!isVendor && vendorData && typeof vendorData === 'object' && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    <Avatar
                                                        src={vendorAvatar}
                                                        sx={{ width: 40, height: 40, bgcolor: '#8CC342' }}
                                                    >
                                                        {vendorName?.charAt(0)?.toUpperCase()}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {vendorName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Vendor
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}

                                            {/* Offer Details */}
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    mb: 2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {offer.message}
                                            </Typography>

                                            {/* Price & Terms */}
                                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                                                <Chip
                                                    label={`${offer.proposedTerms.currency || 'INR'} ${offer.proposedTerms.price.toLocaleString()}`}
                                                    size="small"
                                                    sx={{ bgcolor: '#e6f3d8', color: '#699e31', fontWeight: 600 }}
                                                />
                                                {offer.proposedTerms.deliveryTime && (
                                                    <Chip
                                                        label={`Delivery: ${offer.proposedTerms.deliveryTime}`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                                {offer.proposedTerms.includesRevisions && (
                                                    <Chip
                                                        label={`${offer.proposedTerms.numberOfRevisions || 'Unlimited'} Revisions`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>

                                            {/* Vendor/Client Info */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {isVendor
                                                        ? `From: ${offer.user?.name || (offer as any).userId?.name || 'Unknown Brand'}`
                                                        : `To: ${offer.vendor?.name || (offer as any).vendorId?.name || 'Unknown Vendor'}`}
                                                    {' • '}
                                                    {offer.createdAt && format(new Date(offer.createdAt), 'MMM dd, yyyy')}
                                                </Typography>
                                                
                                                {/* View Vendor Profile Button - For brands and influencers */}
                                                {!isVendor && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<PersonIcon />}
                                                        onClick={() => handleViewVendorProfile(offer)}
                                                        sx={{ 
                                                            ml: 'auto',
                                                            borderColor: '#8CC342',
                                                            color: '#8CC342',
                                                            textTransform: 'none',
                                                            whiteSpace: 'nowrap',
                                                            '&:hover': { 
                                                                borderColor: '#699e31',
                                                                bgcolor: '#8CC342',
                                                                color: 'white'
                                                            }
                                                        }}
                                                    >
                                                        View Profile
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Action Buttons - ONLY for vendors to respond */}
                                        {isVendor && offer.status === 'pending' && (
                                            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<AcceptIcon />}
                                                    sx={{
                                                        bgcolor: '#8CC342',
                                                        '&:hover': { bgcolor: '#699e31' },
                                                        textTransform: 'none',
                                                    }}
                                                    onClick={() => openActionDialog(offer, 'accept')}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<DeclineIcon />}
                                                    color="error"
                                                    sx={{ textTransform: 'none' }}
                                                    onClick={() => openActionDialog(offer, 'decline')}
                                                >
                                                    Decline
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<NegotiateIcon />}
                                                    sx={{ textTransform: 'none' }}
                                                    onClick={() => openActionDialog(offer, 'negotiate')}
                                                >
                                                    Negotiate
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                            );
                        })}
                    </Box>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(e, value) => setPage(value)}
                                color="primary"
                                sx={{
                                    '& .MuiPaginationItem-root.Mui-selected': {
                                        bgcolor: '#8CC342',
                                        '&:hover': { bgcolor: '#699e31' },
                                    },
                                }}
                            />
                        </Box>
                    )}
                </>
            )}

            {/* Action Dialog */}
            <Dialog
                open={actionDialogOpen}
                onClose={() => !actionLoading && setActionDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {actionType === 'accept' && 'Accept Offer'}
                    {actionType === 'decline' && 'Decline Offer'}
                    {actionType === 'negotiate' && 'Negotiate Offer'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {actionType === 'accept' &&
                            'Are you sure you want to accept this offer? The vendor will be notified.'}
                        {actionType === 'decline' &&
                            'Are you sure you want to decline this offer? This action cannot be undone.'}
                        {actionType === 'negotiate' &&
                            'Send a counter-offer to the vendor with your proposed terms.'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label={`Message to ${isVendor ? 'Client' : 'Vendor'} (Optional)`}
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder={`Add a message to explain your ${actionType}...`}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAction}
                        variant="contained"
                        disabled={actionLoading}
                        sx={{
                            bgcolor: actionType === 'decline' ? 'error.main' : '#8CC342',
                            '&:hover': {
                                bgcolor: actionType === 'decline' ? 'error.dark' : '#699e31',
                            },
                        }}
                    >
                        {actionLoading ? <CircularProgress size={24} /> : `Confirm ${actionType}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Vendor Profile Dialog */}
            {selectedVendor && (
                <VendorProfileDialog
                    open={vendorProfileDialogOpen}
                    vendor={selectedVendor}
                    onClose={() => {
                        setVendorProfileDialogOpen(false);
                        setSelectedVendor(null);
                    }}
                />
            )}

            {/* Deal Details Dialog */}
            <VendorDealDetailsDialog
                open={dealDetailsDialogOpen}
                dealId={selectedDealId}
                onClose={() => {
                    setDealDetailsDialogOpen(false);
                    setSelectedDealId(null);
                }}
            />
        </Box>
    );
}

