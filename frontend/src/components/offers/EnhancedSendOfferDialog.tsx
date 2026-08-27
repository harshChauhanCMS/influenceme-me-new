// components/offers/EnhancedSendOfferDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Autocomplete,
    CircularProgress,
    Alert,
    Chip,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    Slider,
    Stack,
    Divider,
    Paper,
    IconButton,
    Collapse,
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    FilterList as FilterIcon,
    CheckCircle as CheckCircleIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import offerService from '@/services/offerService';
import userService from '@/services/userService';
import { ICampaign } from '../../../../shared/types/campaign';
import { IUser } from '../../../../shared/types/user';

interface EnhancedSendOfferDialogProps {
    open: boolean;
    onClose: () => void;
    campaign: ICampaign | null;
    onSuccess?: () => void;
}

export default function EnhancedSendOfferDialog({ open, onClose, campaign, onSuccess }: EnhancedSendOfferDialogProps) {
    // State
    const [influencers, setInfluencers] = useState<IUser[]>([]);
    const [selectedInfluencers, setSelectedInfluencers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingInfluencers, setLoadingInfluencers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filter state
    const [filters, setFilters] = useState({
        genre: [] as string[],
        influencerType: '',
        location: '',
        engagementMin: 0,
        engagementMax: 100,
        searchText: '',
    });

    // Available filter options
    const genreOptions = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Travel', 'Tech', 'Lifestyle', 'Gaming', 'Music', 'Sports'];
    const influencerTypeOptions = ['Micro', 'Macro', 'Mega', 'Nano'];

    useEffect(() => {
        if (open) {
            setPage(1);
            setSelectedInfluencers([]);
            setSuccess(false);
            setError(null);
            resetFilters();
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            loadInfluencers();
        }
    }, [open, page, filters]);

    const loadInfluencers = async () => {
        try {
            setLoadingInfluencers(true);
            // Get top influencers sorted by engagement by default
            const data = await userService.getTopInfluencers();
            setInfluencers(data || []);
            setTotalCount(data?.length || 0);
            setTotalPages(1); // Since getTopInfluencers doesn't paginate, we'll show all
        } catch (err) {
            console.error('Failed to load influencers:', err);
            setError('Failed to load influencers');
        } finally {
            setLoadingInfluencers(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            genre: [],
            influencerType: '',
            location: '',
            engagementMin: 0,
            engagementMax: 100,
            searchText: '',
        });
    };

    // Client-side filtering for real-time results
    const getFilteredInfluencers = () => {
        let filtered = [...influencers];

        // Search text filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            filtered = filtered.filter(inf =>
                inf.name?.toLowerCase().includes(searchLower) ||
                inf.email?.toLowerCase().includes(searchLower)
            );
        }

        // Genre filter
        if (filters.genre.length > 0) {
            filtered = filtered.filter(inf =>
                inf.influencerInfo?.genre?.some(g => filters.genre.includes(g))
            );
        }

        // Influencer type filter
        if (filters.influencerType) {
            filtered = filtered.filter(inf =>
                inf.influencerInfo?.influencerType === filters.influencerType
            );
        }

        // Location filter
        if (filters.location) {
            filtered = filtered.filter(inf => {
                const addr = inf.addresses;
                if (!addr) return false;
                const locationStr = `${addr.streetAddress || ''} ${addr.state || ''} ${addr.country || ''}`.toLowerCase();
                return locationStr.includes(filters.location.toLowerCase());
            });
        }

        return filtered;
    };

    const filteredInfluencers = getFilteredInfluencers();

    const handleSelectInfluencer = (influencer: IUser) => {
        if (selectedInfluencers.find(inf => inf._id === influencer._id)) {
            setSelectedInfluencers(selectedInfluencers.filter(inf => inf._id !== influencer._id));
        } else {
            setSelectedInfluencers([...selectedInfluencers, influencer]);
        }
    };

    const handleSelectAll = () => {
        if (selectedInfluencers.length === filteredInfluencers.length) {
            setSelectedInfluencers([]);
        } else {
            setSelectedInfluencers([...filteredInfluencers]);
        }
    };

    const handleSendOffers = async () => {
        if (!campaign || selectedInfluencers.length === 0) {
            setError('Please select at least one influencer');
            return;
        }

        const userData = localStorage.getItem('user');
        if (!userData) {
            setError('User not logged in');
            return;
        }

        const user = JSON.parse(userData);

        // Validate IDs
        console.log('User data:', user);
        console.log('Campaign data:', campaign);
        console.log('Selected influencers:', selectedInfluencers);

        if (!user._id) {
            setError('Invalid user data. Please log in again.');
            console.error('User missing _id:', user);
            return;
        }

        // Get campaign ID (handle both _id and id)
        const campaignId = campaign._id || (campaign as any).id;
        if (!campaignId) {
            setError(`Invalid campaign data. Campaign object: ${JSON.stringify(campaign)}`);
            console.error('Campaign missing _id:', campaign);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Send offers to all selected influencers
            const promises = selectedInfluencers.map(influencer => {
                // Get influencer ID (handle both _id and id)
                const influencerId = influencer._id || (influencer as any).id;
                
                if (!influencerId) {
                    console.error('Invalid influencer:', influencer);
                    return Promise.reject(new Error('Invalid influencer data'));
                }
                
                console.log('Creating offer:', {
                    brandId: user._id,
                    influencerId: influencerId,
                    campaignId: campaignId,
                });

                return offerService.createOffer({
                    brandId: user._id,
                    influencerId: influencerId,
                    campaignId: campaignId,
                });
            });

            await Promise.all(promises);

            setSuccess(true);
            setTimeout(() => {
                onClose();
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (err) {
            console.error('Error sending offers:', err);
            setError(err instanceof Error ? err.message : 'Failed to send offers');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle>
                <Box component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box component="div">
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            Send Offers to Influencers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Select multiple influencers and send collaboration offers
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {/* Campaign Info */}
                {campaign && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                            Campaign
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                            {campaign.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Budget: ₹${campaign.budget?.toLocaleString('en-IN')}`}
                                size="small"
                                sx={{ bgcolor: 'white', color: 'text.primary' }}
                            />
                            <Chip
                                label={campaign.type}
                                size="small"
                                sx={{ bgcolor: 'white', color: 'text.primary' }}
                            />
                            <Chip
                                label={campaign.compensationType}
                                size="small"
                                sx={{ bgcolor: 'white', color: 'text.primary' }}
                            />
                        </Box>
                    </Paper>
                )}

                {/* Filters Section */}
                <Box sx={{ mb: 3 }}>
                    <Button
                        startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{ mb: 2 }}
                    >
                        <FilterIcon sx={{ mr: 1 }} />
                        {showFilters ? 'Hide' : 'Show'} Filters ({filteredInfluencers.length} results)
                    </Button>

                    <Collapse in={showFilters}>
                        <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                Filter Influencers
                            </Typography>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                                {/* Search */}
                                <TextField
                                    fullWidth
                                    label="Search by name or email"
                                    value={filters.searchText}
                                    onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                                    size="small"
                                />

                                {/* Genre */}
                                <FormControl fullWidth size="small">
                                    <InputLabel>Genre</InputLabel>
                                    <Select
                                        multiple
                                        value={filters.genre}
                                        onChange={(e) => setFilters({ ...filters, genre: e.target.value as string[] })}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {selected.map((value) => (
                                                    <Chip key={value} label={value} size="small" />
                                                ))}
                                            </Box>
                                        )}
                                    >
                                        {genreOptions.map((genre) => (
                                            <MenuItem key={genre} value={genre}>
                                                <Checkbox checked={filters.genre.indexOf(genre) > -1} />
                                                <ListItemText primary={genre} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Influencer Type */}
                                <FormControl fullWidth size="small">
                                    <InputLabel>Influencer Type</InputLabel>
                                    <Select
                                        value={filters.influencerType}
                                        onChange={(e) => setFilters({ ...filters, influencerType: e.target.value })}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {influencerTypeOptions.map((type) => (
                                            <MenuItem key={type} value={type}>{type}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Location */}
                                <TextField
                                    fullWidth
                                    label="Location (City/State)"
                                    value={filters.location}
                                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                    size="small"
                                    placeholder="e.g. Mumbai, Delhi"
                                />

                                {/* Engagement Range */}
                                <Box sx={{ gridColumn: { xs: '1', md: 'span 2' }, px: 1 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Engagement Rate: {filters.engagementMin}% - {filters.engagementMax}%
                                    </Typography>
                                    <Slider
                                        value={[filters.engagementMin, filters.engagementMax]}
                                        onChange={(e, newValue) => {
                                            const [min, max] = newValue as number[];
                                            setFilters({ ...filters, engagementMin: min, engagementMax: max });
                                        }}
                                        valueLabelDisplay="auto"
                                        min={0}
                                        max={100}
                                        marks={[
                                            { value: 0, label: '0%' },
                                            { value: 25, label: '25%' },
                                            { value: 50, label: '50%' },
                                            { value: 75, label: '75%' },
                                            { value: 100, label: '100%' },
                                        ]}
                                    />
                                </Box>
                            </Box>

                            <Button
                                variant="outlined"
                                size="small"
                                onClick={resetFilters}
                                sx={{ mt: 2 }}
                            >
                                Reset Filters
                            </Button>
                        </Paper>
                    </Collapse>
                </Box>

                {/* Selection Summary */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {selectedInfluencers.length} of {filteredInfluencers.length} influencer(s) selected
                    </Typography>
                    <Button
                        size="small"
                        onClick={handleSelectAll}
                        disabled={filteredInfluencers.length === 0}
                    >
                        {selectedInfluencers.length === filteredInfluencers.length ? 'Deselect All' : 'Select All'}
                    </Button>
                </Box>

                {/* Influencers List */}
                {loadingInfluencers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredInfluencers.length === 0 ? (
                    <Alert severity="info">No influencers match your filters</Alert>
                ) : (
                    <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {filteredInfluencers.map((influencer) => {
                            const isSelected = selectedInfluencers.some(inf => inf._id === influencer._id);
                            return (
                                <Paper
                                    key={influencer._id}
                                    sx={{
                                        p: 2,
                                        mb: 1,
                                        cursor: 'pointer',
                                        border: '2px solid',
                                        borderColor: isSelected ? 'primary.main' : 'grey.300',
                                        bgcolor: isSelected ? 'primary.light' : 'white',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: 2,
                                        },
                                    }}
                                    onClick={() => handleSelectInfluencer(influencer)}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Checkbox checked={isSelected} />
                                        <Avatar
                                            src={influencer.profilePictureUrl}
                                            sx={{ width: 50, height: 50 }}
                                        >
                                            {influencer.name?.charAt(0)}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                {influencer.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {influencer.email}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                {influencer.influencerInfo?.genre?.slice(0, 3).map((genre, idx) => (
                                                    <Chip key={idx} label={genre} size="small" />
                                                ))}
                                                {influencer.influencerInfo?.influencerType && (
                                                    <Chip
                                                        label={influencer.influencerInfo.influencerType}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        {isSelected && (
                                            <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                                        )}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Box>
                )}

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Success Alert */}
                {success && (
                    <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                        Offers sent successfully to {selectedInfluencers.length} influencer(s)!
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSendOffers}
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={loading || selectedInfluencers.length === 0 || success}
                    sx={{
                        bgcolor: 'primary.main',
                        '&:hover': {
                            bgcolor: 'primary.dark',
                        },
                    }}
                >
                    {loading ? 'Sending...' : `Send ${selectedInfluencers.length} Offer(s)`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

