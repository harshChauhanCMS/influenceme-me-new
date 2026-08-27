'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Typography,
    Avatar,
    Chip,
    FormControl,
    InputLabel,
    Select,
    InputAdornment,
    CircularProgress,
    Alert,
    Pagination,
    Card,
    CardContent,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    LocationOn as LocationIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { IVendorRequirement } from '../../../../shared/types/vendorRequirement';
import { IUser } from '../../../../shared/types/user';
import { VendorOfferType } from '../../../../shared/types/vendorOffer';
import userService from '@/services/userService';
import vendorOfferService from '@/services/vendorOfferService';

interface SendVendorOfferDialogProps {
    open: boolean;
    requirement: IVendorRequirement;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SendVendorOfferDialog({
    open,
    requirement,
    onClose,
    onSuccess,
}: SendVendorOfferDialogProps) {
    const [vendors, setVendors] = useState<IUser[]>([]);
    const [vendorsWithOffers, setVendorsWithOffers] = useState<Set<string>>(new Set());
    const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Offer details
    const [offerType, setOfferType] = useState<VendorOfferType>('fixed');
    const [price, setPrice] = useState('');
    const [message, setMessage] = useState('');
    const [proposedDate, setProposedDate] = useState('');

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

    useEffect(() => {
        if (open) {
            loadVendorsAndOffers();
        }
    }, [open, page, searchQuery]);

    const loadVendorsAndOffers = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch vendors and existing offers in parallel
            const [vendorsResponse, offersResponse] = await Promise.all([
                userService.getAllVendors(page, 10),
                vendorOfferService.getOffersByRequirement(requirement._id!),
            ]);

            console.log('Vendors API response:', vendorsResponse);
            console.log('Existing offers:', offersResponse);
            
            // Get vendor IDs that already have offers
            const vendorIdsWithOffers = new Set(
                offersResponse.map((offer: any) => offer.vendorId?._id || offer.vendorId).filter(Boolean)
            );
            
            console.log('Vendors with existing offers:', Array.from(vendorIdsWithOffers));
            setVendorsWithOffers(vendorIdsWithOffers);

            // Filter out vendors who already have offers
            const availableVendors = (vendorsResponse.vendors || []).filter(
                (vendor: IUser) => !vendorIdsWithOffers.has(vendor._id!)
            );

            console.log(`Filtered ${vendorsResponse.vendors?.length || 0} vendors to ${availableVendors.length} available vendors`);
            
            setVendors(availableVendors);
            setTotalPages(vendorsResponse.pagination?.totalPages || 1);
        } catch (err: unknown) {
            console.error('Error loading vendors:', err);
            if (err instanceof Error) {
                setError(`Failed to load vendors: ${err.message}`);
            } else {
                setError('Failed to load vendors');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVendorToggle = (vendorId: string) => {
        const newSelected = new Set(selectedVendors);
        if (newSelected.has(vendorId)) {
            newSelected.delete(vendorId);
        } else {
            newSelected.add(vendorId);
        }
        setSelectedVendors(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedVendors.size === vendors.length) {
            setSelectedVendors(new Set());
        } else {
            setSelectedVendors(new Set(vendors.map(v => v._id!)));
        }
    };

    const handleSendOffers = async () => {
        if (selectedVendors.size === 0) {
            setError('Please select at least one vendor');
            return;
        }

        if (!price || parseFloat(price) <= 0) {
            setError('Please enter a valid price');
            return;
        }

        if (!message.trim()) {
            setError('Please enter a message');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            setSuccess(null);

            const offerData = {
                requirementId: requirement._id!,
                offerType,
                price: parseFloat(price),
                priceCurrency: requirement.budgetCurrency || 'INR',
                message: message.trim(),
                proposedCompletionDate: proposedDate || undefined,
            };

            // Send offers to all selected vendors
            const promises = Array.from(selectedVendors).map(vendorId =>
                vendorOfferService.createOffer({
                    ...offerData,
                    vendorId,
                })
            );

            await Promise.all(promises);

            setSuccess(`Successfully sent ${selectedVendors.size} offer(s) to vendors!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            console.error('Error sending offers:', err);
            console.error('Error response:', err.response?.data);
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to send offers');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setSelectedVendors(new Set());
            setOfferType('fixed');
            setPrice('');
            setMessage('');
            setProposedDate('');
            setError(null);
            setSuccess(null);
            onClose();
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return null;
        return `${API_BASE_URL}${path}`;
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: '#8CC342', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Send Offer to Vendors
                </Typography>
                <Button onClick={handleClose} sx={{ color: 'white', minWidth: 'auto' }}>
                    <CloseIcon />
                </Button>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                {/* Requirement Info */}
                <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
                    <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Requirement
                        </Typography>
                        <Typography variant="h6" gutterBottom>
                            {requirement.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                size="small"
                                label={requirement.category}
                                sx={{ bgcolor: '#8CC342', color: 'white' }}
                            />
                            {requirement.budget && typeof requirement.budget === 'number' && (
                                <Chip
                                    size="small"
                                    label={`Budget: ${requirement.budgetCurrency || 'INR'} ${requirement.budget.toLocaleString()}`}
                                    icon={<LocationIcon />}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>

                {/* Offer Details */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Offer Details
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Offer Type</InputLabel>
                            <Select
                                value={offerType}
                                onChange={(e) => setOfferType(e.target.value as VendorOfferType)}
                                label="Offer Type"
                            >
                                <MenuItem value="fixed">Fixed Price</MenuItem>
                                <MenuItem value="hourly">Hourly Rate</MenuItem>
                                <MenuItem value="daily">Daily Rate</MenuItem>
                                <MenuItem value="package">Package Deal</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Price"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            fullWidth
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {requirement.budgetCurrency || 'INR'}
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    <TextField
                        label="Proposed Completion Date"
                        type="date"
                        value={proposedDate}
                        onChange={(e) => setProposedDate(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label="Message to Vendor"
                        multiline
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        fullWidth
                        required
                        placeholder="Describe what you need from the vendor..."
                    />
                </Box>

                {/* Search Bar */}
                <TextField
                    fullWidth
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    sx={{ mb: 2 }}
                />

                {/* Select All */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={selectedVendors.size === vendors.length && vendors.length > 0}
                                indeterminate={selectedVendors.size > 0 && selectedVendors.size < vendors.length}
                                onChange={handleSelectAll}
                            />
                        }
                        label={`Select All (${selectedVendors.size} selected)`}
                    />
                </Box>

                {/* Vendors List */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : vendors.length === 0 ? (
                    <Alert severity="info">No vendors found</Alert>
                ) : (
                    <>
                        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {vendors.map((vendor) => (
                                <Card
                                    key={vendor._id}
                                    sx={{
                                        mb: 2,
                                        cursor: 'pointer',
                                        border: selectedVendors.has(vendor._id!) ? '2px solid #8CC342' : '1px solid #e0e0e0',
                                        '&:hover': { bgcolor: '#f5f5f5' },
                                    }}
                                    onClick={() => handleVendorToggle(vendor._id!)}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Checkbox
                                                checked={selectedVendors.has(vendor._id!)}
                                                onChange={() => handleVendorToggle(vendor._id!)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <Avatar
                                                src={getImageUrl(vendor.profilePictureUrl) || undefined}
                                                sx={{ width: 50, height: 50 }}
                                            >
                                                {vendor.name.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {vendor.vendorInfo?.businessName || vendor.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {vendor.vendorInfo?.vendorType || 'Vendor'}
                                                </Typography>
                                                {vendor.vendorInfo?.averageRating && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                                                        <Typography variant="caption">
                                                            {vendor.vendorInfo.averageRating.toFixed(1)} ({vendor.vendorInfo.totalReviews || 0} reviews)
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>

                        {totalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, value) => setPage(value)}
                                    color="primary"
                                />
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSendOffers}
                    variant="contained"
                    disabled={submitting || selectedVendors.size === 0}
                    sx={{ bgcolor: '#8CC342', '&:hover': { bgcolor: '#7ab332' } }}
                >
                    {submitting ? <CircularProgress size={24} /> : `Send Offer (${selectedVendors.size})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

