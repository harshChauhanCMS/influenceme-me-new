'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Avatar,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Paper,
    Stack,
    Rating,
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Person as PersonIcon,
    AttachMoney as MoneyIcon,
    Schedule as ScheduleIcon,
    CheckCircle as AcceptIcon,
    Cancel as DeclineIcon,
    Visibility as ViewIcon,
    FilterList as FilterIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/authContext';
import vendorRequirementService from '@/services/vendorRequirementService';
import vendorBidService from '@/services/vendorBidService';
import { IVendorRequirement } from '../../../../shared/types/vendorRequirement';
import { IVendorBid } from '../../../../shared/types/vendorBid';
import { format } from 'date-fns';
import { VendorProfileDialog } from '@/components/vendors/VendorProfileDialog';
import { IUser } from '../../../../shared/types/user';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type SortOption = 'lowest-price' | 'highest-price' | 'highest-rating' | 'newest' | 'oldest';

export default function RequirementBidsPage() {
    const { user } = useAuth();
    const [requirements, setRequirements] = useState<IVendorRequirement[]>([]);
    const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
    const [bids, setBids] = useState<IVendorBid[]>([]);
    const [filteredBids, setFilteredBids] = useState<IVendorBid[]>([]);
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [loading, setLoading] = useState(true);
    const [requirementsLoading, setRequirementsLoading] = useState(true);
    const [bidsLoading, setBidsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedBid, setSelectedBid] = useState<IVendorBid | null>(null);
    const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
    const [responseMessage, setResponseMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState<IVendorRequirement | null>(null);
    const [requirementLoading, setRequirementLoading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    
    // Vendor Profile Dialog
    const [vendorProfileDialogOpen, setVendorProfileDialogOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<IUser | null>(null);

    useEffect(() => {
        loadRequirements();
    }, []);

    useEffect(() => {
        if (selectedRequirementId) {
            loadBids();
        }
    }, [selectedRequirementId]);

    // Filter and sort bids
    useEffect(() => {
        if (bids.length === 0) {
            setFilteredBids([]);
            return;
        }

        let sorted = [...bids];

        switch (sortBy) {
            case 'lowest-price':
                sorted.sort((a, b) => (a.proposedTerms?.price || 0) - (b.proposedTerms?.price || 0));
                break;
            case 'highest-price':
                sorted.sort((a, b) => (b.proposedTerms?.price || 0) - (a.proposedTerms?.price || 0));
                break;
            case 'highest-rating':
                sorted.sort((a, b) => {
                    const aRating = (a as any).vendorId?.vendorInfo?.rating || 0;
                    const bRating = (b as any).vendorId?.vendorInfo?.rating || 0;
                    return bRating - aRating;
                });
                break;
            case 'newest':
                sorted.sort((a, b) => {
                    const aDate = new Date(a.createdAt || 0).getTime();
                    const bDate = new Date(b.createdAt || 0).getTime();
                    return bDate - aDate;
                });
                break;
            case 'oldest':
                sorted.sort((a, b) => {
                    const aDate = new Date(a.createdAt || 0).getTime();
                    const bDate = new Date(b.createdAt || 0).getTime();
                    return aDate - bDate;
                });
                break;
        }

        setFilteredBids(sorted);
    }, [bids, sortBy]);

    const loadRequirements = async () => {
        try {
            setRequirementsLoading(true);
            const data = await vendorRequirementService.getUserRequirements({ page: 1, limit: 100 });
            setRequirements(data.requirements);
            
            // Select latest requirement by default
            if (data.requirements.length > 0) {
                const latestRequirement = data.requirements.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                })[0];
                setSelectedRequirementId(latestRequirement._id || '');
            }
        } catch (err: unknown) {
            console.error('Error loading requirements:', err);
            setError('Failed to load requirements');
        } finally {
            setRequirementsLoading(false);
            setLoading(false);
        }
    };

    const loadBids = async () => {
        if (!selectedRequirementId) return;

        try {
            setBidsLoading(true);
            setError(null);
            const bidsData = await vendorBidService.getBidsByRequirement(selectedRequirementId);
            console.log('Loaded bids:', bidsData);
            console.log('Bids count:', bidsData.length);
            setBids(bidsData);
            
            // Load requirement details
            loadRequirementDetails();
        } catch (err: unknown) {
            console.error('Error loading bids:', err);
            setError('Failed to load bids');
        } finally {
            setBidsLoading(false);
        }
    };

    const handleRequirementChange = (event: SelectChangeEvent<string>) => {
        setSelectedRequirementId(event.target.value);
        setBids([]);
    };

    const handleAction = (bid: IVendorBid, type: 'accept' | 'decline') => {
        setSelectedBid(bid);
        setActionType(type);
        setResponseMessage('');
        setActionDialogOpen(true);
    };

    const loadRequirementDetails = async () => {
        if (!selectedRequirementId) return;

        try {
            setRequirementLoading(true);
            const requirement = await vendorRequirementService.getRequirementById(selectedRequirementId);
            setSelectedRequirement(requirement);
        } catch (err: unknown) {
            console.error('Error loading requirement details:', err);
        } finally {
            setRequirementLoading(false);
        }
    };

    const handleViewDetails = async (bid: IVendorBid) => {
        setSelectedBid(bid);
        if (!selectedRequirement) {
            await loadRequirementDetails();
        }
        setDetailsDialogOpen(true);
    };

    const handleActionSubmit = async () => {
        if (!selectedBid) return;

        try {
            setActionLoading(true);
            if (actionType === 'accept') {
                await vendorBidService.acceptBid(selectedBid._id || '', responseMessage);
            } else {
                await vendorBidService.declineBid(selectedBid._id || '', responseMessage);
            }
            setActionDialogOpen(false);
            setSelectedBid(null);
            setResponseMessage('');
            await loadBids();
            // Show success message
            if (actionType === 'accept') {
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 5000);
            }
        } catch (err: unknown) {
            console.error('Error processing action:', err);
            setError(`Failed to ${actionType} bid`);
        } finally {
            setActionLoading(false);
        }
    };

    const getVendorRating = (bid: IVendorBid): number => {
        const vendorData = (bid as any).vendorId;
        if (vendorData && typeof vendorData === 'object') {
            return vendorData.vendorInfo?.rating || 0;
        }
        return 0;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'accepted':
                return 'success';
            case 'declined':
                return 'error';
            case 'withdrawn':
                return 'default';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
                    Requirement Bids
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    View and manage bids for your requirements
                </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Success Alert */}
            {showSuccessMessage && (
                <Alert severity="success" onClose={() => setShowSuccessMessage(false)} sx={{ mb: 3 }}>
                    Bid accepted successfully! A deal has been created.
                </Alert>
            )}

            {/* Requirement Selector */}
            <Card sx={{ mb: 3, p: 2 }}>
                <FormControl fullWidth>
                    <InputLabel id="requirement-select-label">Select Requirement</InputLabel>
                    <Select
                        labelId="requirement-select-label"
                        id="requirement-select"
                        value={selectedRequirementId}
                        label="Select Requirement"
                        onChange={handleRequirementChange}
                        disabled={requirementsLoading}
                    >
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
                                        <Box>
                                            <Typography variant="body1">{req.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {req.category} • {req.status}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </MenuItem>
                            ))
                        )}
                    </Select>
                </FormControl>
            </Card>

            {/* Filters */}
            {selectedRequirementId && bids.length > 0 && (
                <Card sx={{ mb: 3, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FilterIcon sx={{ color: '#8CC342' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Sort by:
                            </Typography>
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                sx={{
                                    bgcolor: 'white',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#e0e0e0',
                                    },
                                }}
                            >
                                <MenuItem value="newest">Newest First</MenuItem>
                                <MenuItem value="oldest">Oldest First</MenuItem>
                                <MenuItem value="lowest-price">Lowest Price</MenuItem>
                                <MenuItem value="highest-price">Highest Price</MenuItem>
                                <MenuItem value="highest-rating">Highest Rating</MenuItem>
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary">
                            {filteredBids.length} bid{filteredBids.length !== 1 ? 's' : ''} found
                        </Typography>
                    </Box>
                </Card>
            )}

            {/* Bids Content */}
            {!selectedRequirementId ? (
                <Card sx={{ textAlign: 'center', py: 8 }}>
                    <AssignmentIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Select a Requirement
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please select a requirement to view its bids
                    </Typography>
                </Card>
            ) : bidsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: '#8CC342' }} />
                </Box>
            ) : bids.length === 0 ? (
                <Card sx={{ textAlign: 'center', py: 8 }}>
                    <AssignmentIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Bids Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        No vendors have submitted bids for this requirement yet
                    </Typography>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredBids.map((bid) => {
                        // Handle vendor data - backend populates vendorId
                        // vendorId can be an object (populated) or string (not populated)
                        const vendorData = (bid as any).vendorId;
                        
                        let vendorName = 'Unknown Vendor';
                        let vendorAvatar = null;

                        if (vendorData) {
                            if (typeof vendorData === 'object' && vendorData !== null) {
                                // Populated vendor object
                                vendorName = vendorData.name || 
                                            vendorData.vendorInfo?.businessName || 
                                            'Unknown Vendor';
                                vendorAvatar = vendorData.profilePictureUrl || null;
                            } else if (typeof vendorData === 'string') {
                                // Not populated, just an ID
                                vendorName = 'Unknown Vendor';
                            }
                        }

                        // Debug logging
                        console.log('Bid:', {
                            id: bid._id,
                            vendorData,
                            vendorName,
                            price: bid.proposedTerms?.price,
                            message: bid.message,
                            status: bid.status,
                            createdAt: bid.createdAt
                        });

                        return (
                            <Card key={bid._id} sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                        <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                                            {/* Vendor Avatar */}
                                            <Avatar
                                                src={vendorAvatar}
                                                sx={{ width: 56, height: 56, bgcolor: '#8CC342' }}
                                            >
                                                {vendorName?.charAt(0)?.toUpperCase()}
                                            </Avatar>

                                            {/* Bid Details */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                                    <Typography 
                                                        variant="h6" 
                                                        sx={{ 
                                                            fontWeight: 600,
                                                            cursor: vendorData && typeof vendorData === 'object' ? 'pointer' : 'default',
                                                            '&:hover': vendorData && typeof vendorData === 'object' ? { 
                                                                textDecoration: 'underline', 
                                                                color: '#8CC342' 
                                                            } : {}
                                                        }}
                                                        onClick={() => {
                                                            if (vendorData && typeof vendorData === 'object') {
                                                                setSelectedVendor(vendorData as IUser);
                                                                setVendorProfileDialogOpen(true);
                                                            }
                                                        }}
                                                    >
                                                        {vendorName}
                                                    </Typography>
                                                    <Chip
                                                        label={bid.status}
                                                        size="small"
                                                        color={getStatusColor(bid.status)}
                                                    />
                                                </Box>

                                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <MoneyIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            ₹{bid.proposedTerms?.price?.toLocaleString() || '0'}
                                                        </Typography>
                                                    </Box>
                                                    {bid.proposedTerms?.deliveryTime && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <ScheduleIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                {bid.proposedTerms.deliveryTime}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {bid.createdAt && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {format(new Date(bid.createdAt), 'MMM dd, yyyy')}
                                                        </Typography>
                                                    )}
                                                    {getVendorRating(bid) > 0 && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <StarIcon sx={{ fontSize: 16, color: '#ffc107' }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                {getVendorRating(bid).toFixed(1)}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>

                                                {bid.message && (
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary" 
                                                        sx={{ 
                                                            mb: 0,
                                                            wordBreak: 'break-word',
                                                        }}
                                                    >
                                                        {bid.message}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Actions - Fixed to top */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignSelf: 'flex-start' }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<PersonIcon />}
                                                onClick={() => {
                                                    if (vendorData && typeof vendorData === 'object') {
                                                        setSelectedVendor(vendorData as IUser);
                                                        setVendorProfileDialogOpen(true);
                                                    }
                                                }}
                                                disabled={!vendorData || typeof vendorData !== 'object'}
                                                sx={{
                                                    borderColor: '#8CC342',
                                                    color: '#8CC342',
                                                    textTransform: 'none',
                                                    whiteSpace: 'nowrap',
                                                    '&:hover': {
                                                        borderColor: '#699e31',
                                                        bgcolor: '#8CC342',
                                                        color: 'white',
                                                    },
                                                }}
                                            >
                                                View Profile
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<ViewIcon />}
                                                onClick={() => handleViewDetails(bid)}
                                                sx={{
                                                    borderColor: '#8CC342',
                                                    color: '#8CC342',
                                                    textTransform: 'none',
                                                    whiteSpace: 'nowrap',
                                                    '&:hover': {
                                                        borderColor: '#699e31',
                                                        bgcolor: '#8CC342',
                                                        color: 'white',
                                                    },
                                                }}
                                            >
                                                View Details
                                            </Button>
                                            {bid.status === 'pending' && (
                                                <>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<AcceptIcon />}
                                                        onClick={() => handleAction(bid, 'accept')}
                                                        sx={{
                                                            bgcolor: '#8CC342',
                                                            '&:hover': { bgcolor: '#699e31' },
                                                            textTransform: 'none',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<DeclineIcon />}
                                                        onClick={() => handleAction(bid, 'decline')}
                                                        sx={{
                                                            borderColor: 'error.main',
                                                            color: 'error.main',
                                                            textTransform: 'none',
                                                            whiteSpace: 'nowrap',
                                                            '&:hover': {
                                                                borderColor: 'error.dark',
                                                                bgcolor: 'error.light',
                                                            },
                                                        }}
                                                    >
                                                        Decline
                                                    </Button>
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            )}

            {/* Action Dialog */}
            <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{actionType === 'accept' ? 'Accept Bid' : 'Decline Bid'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {actionType === 'accept'
                            ? 'Are you sure you want to accept this bid? You can add an optional message.'
                            : 'Are you sure you want to decline this bid? You can add an optional message.'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message (Optional)"
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder={
                            actionType === 'accept'
                                ? 'Add a message to the vendor...'
                                : 'Let the vendor know why you declined...'
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleActionSubmit}
                        variant="contained"
                        disabled={actionLoading}
                        sx={{
                            bgcolor: actionType === 'accept' ? '#8CC342' : 'error.main',
                            '&:hover': {
                                bgcolor: actionType === 'accept' ? '#699e31' : 'error.dark',
                            },
                        }}
                    >
                        {actionLoading ? <CircularProgress size={20} /> : actionType === 'accept' ? 'Accept' : 'Decline'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bid Details Dialog */}
            <Dialog 
                open={detailsDialogOpen} 
                onClose={() => setDetailsDialogOpen(false)} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: { maxHeight: '90vh' }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Bid Details
                        </Typography>
                        <Chip
                            label={selectedBid?.status}
                            size="small"
                            color={getStatusColor(selectedBid?.status || '')}
                        />
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedBid && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Requirement Details */}
                            {selectedRequirement && (
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AssignmentIcon sx={{ color: '#8CC342' }} />
                                        Requirement Details
                                    </Typography>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="col-span-full">
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    {selectedRequirement.title}
                                                </Typography>
                                            </div>
                                            <div className="col-span-full">
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedRequirement.description}
                                                </Typography>
                                            </div>
                                            <div>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Category:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedRequirement.category}
                                                </Typography>
                                            </div>
                                            {selectedRequirement.budget && (
                                                <div>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        Budget:
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {selectedRequirement.budgetCurrency || 'INR'} {selectedRequirement.budget.toLocaleString()}
                                                    </Typography>
                                                </div>
                                            )}
                                            {selectedRequirement.city && (
                                                <div>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        Location:
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {selectedRequirement.city}, {selectedRequirement.country}
                                                    </Typography>
                                                </div>
                                            )}
                                            {selectedRequirement.deadline && (
                                                <div>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        Deadline:
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {format(new Date(selectedRequirement.deadline), 'MMM dd, yyyy')}
                                                    </Typography>
                                                </div>
                                            )}
                                        </div>
                                    </Paper>
                                </Box>
                            )}

                            {/* Vendor Details */}
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon sx={{ color: '#8CC342' }} />
                                    Vendor Details
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    {(() => {
                                        const vendorData = (selectedBid as any).vendorId;
                                        const vendorName = vendorData && typeof vendorData === 'object' 
                                            ? (vendorData.name || vendorData.vendorInfo?.businessName || 'Unknown Vendor')
                                            : 'Unknown Vendor';
                                        const vendorAvatar = vendorData && typeof vendorData === 'object' 
                                            ? vendorData.profilePictureUrl 
                                            : null;
                                        const vendorRating = vendorData && typeof vendorData === 'object'
                                            ? vendorData.vendorInfo?.rating || 0
                                            : 0;
                                        const vendorReviews = vendorData && typeof vendorData === 'object'
                                            ? vendorData.vendorInfo?.totalReviews || 0
                                            : 0;

                                        return (
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Avatar
                                                    src={vendorAvatar}
                                                    sx={{ width: 64, height: 64, bgcolor: '#8CC342' }}
                                                >
                                                    {vendorName?.charAt(0)?.toUpperCase()}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        {vendorName}
                                                    </Typography>
                                                    {vendorRating > 0 && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                            <Rating value={vendorRating} readOnly precision={0.1} size="small" />
                                                            <Typography variant="body2" color="text.secondary">
                                                                {vendorRating.toFixed(1)} ({vendorReviews} reviews)
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<PersonIcon />}
                                                        onClick={() => {
                                                            if (vendorData && typeof vendorData === 'object') {
                                                                setSelectedVendor(vendorData as IUser);
                                                                setVendorProfileDialogOpen(true);
                                                            }
                                                        }}
                                                        disabled={!vendorData || typeof vendorData !== 'object'}
                                                        sx={{
                                                            mt: 2,
                                                            borderColor: '#8CC342',
                                                            color: '#8CC342',
                                                            textTransform: 'none',
                                                            '&:hover': {
                                                                borderColor: '#699e31',
                                                                bgcolor: '#8CC342',
                                                                color: 'white',
                                                            },
                                                        }}
                                                    >
                                                        View Profile
                                                    </Button>
                                                </Box>
                                            </Box>
                                        );
                                    })()}
                                </Paper>
                            </Box>

                            {/* Bid Details */}
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MoneyIcon sx={{ color: '#8CC342' }} />
                                    Bid Details
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                Bid Amount:
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#8CC342' }}>
                                                ₹{selectedBid.proposedTerms?.price?.toLocaleString() || '0'}
                                            </Typography>
                                        </div>
                                        {selectedBid.proposedTerms?.deliveryTime && (
                                            <div>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Delivery Time:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedBid.proposedTerms.deliveryTime}
                                                </Typography>
                                            </div>
                                        )}
                                        {selectedBid.createdAt && (
                                            <div>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Submitted On:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {format(new Date(selectedBid.createdAt), 'MMM dd, yyyy HH:mm')}
                                                </Typography>
                                            </div>
                                        )}
                                        {selectedBid.message && (
                                            <div className="col-span-full">
                                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                    Message:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedBid.message}
                                                </Typography>
                                            </div>
                                        )}
                                        {selectedBid.proposedTerms?.additionalServices && selectedBid.proposedTerms.additionalServices.length > 0 && (
                                            <div className="col-span-full">
                                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                    Additional Services:
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    {selectedBid.proposedTerms.additionalServices.map((service, index) => (
                                                        <Chip key={index} label={service} size="small" />
                                                    ))}
                                                </Stack>
                                            </div>
                                        )}
                                        {selectedBid.clientResponse && (
                                            <div className="col-span-full">
                                                <Box sx={{ 
                                                    p: 2, 
                                                    bgcolor: selectedBid.status === 'accepted' 
                                                        ? 'success.light' 
                                                        : selectedBid.status === 'declined'
                                                        ? 'error.light'
                                                        : 'grey.100',
                                                    borderRadius: 1,
                                                    border: `1px solid ${selectedBid.status === 'accepted' 
                                                        ? 'success.main' 
                                                        : selectedBid.status === 'declined'
                                                        ? 'error.main'
                                                        : 'grey.300'}`,
                                                }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                        {selectedBid.status === 'accepted' ? '✓ Bid Accepted' : '✗ Bid Declined'}
                                                    </Typography>
                                                    {selectedBid.clientResponse.message && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {selectedBid.clientResponse.message}
                                                        </Typography>
                                                    )}
                                                    {selectedBid.clientResponse.respondedAt && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                            {format(new Date(selectedBid.clientResponse.respondedAt), 'MMM dd, yyyy HH:mm')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </div>
                                        )}
                                    </div>
                                </Paper>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsDialogOpen(false)}>
                        Close
                    </Button>
                    {selectedBid?.status === 'pending' && (
                        <>
                            <Button
                                onClick={() => {
                                    setDetailsDialogOpen(false);
                                    handleAction(selectedBid, 'decline');
                                }}
                                variant="outlined"
                                sx={{
                                    borderColor: 'error.main',
                                    color: 'error.main',
                                }}
                            >
                                Decline
                            </Button>
                            <Button
                                onClick={() => {
                                    setDetailsDialogOpen(false);
                                    handleAction(selectedBid, 'accept');
                                }}
                                variant="contained"
                                sx={{
                                    bgcolor: '#8CC342',
                                    '&:hover': { bgcolor: '#699e31' },
                                }}
                            >
                                Accept Bid
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Vendor Profile Dialog */}
            <VendorProfileDialog
                open={vendorProfileDialogOpen}
                vendor={selectedVendor}
                onClose={() => {
                    setVendorProfileDialogOpen(false);
                    setSelectedVendor(null);
                }}
            />
        </Box>
    );
}

