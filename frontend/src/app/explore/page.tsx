'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Paper,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Slider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Stack,
    IconButton,
    Avatar,
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Clear as ClearIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import userService from '@/services/userService';
import { IUser } from '../../../../shared/types/user';
import { VendorCard } from '@/components/vendors/VendorCard';
import { VendorProfileDialog } from '@/components/vendors/VendorProfileDialog';
import { InfluencerProfileDialog } from '@/components/influencers/InfluencerProfileDialog';
import { getProxiedImageUrl } from '@/utils/imageProxy';
import { getFollowerCount } from '@/utils/socialUtils';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`explore-tabpanel-${index}`}
            aria-labelledby={`explore-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

// Influencer Card Component
const InfluencerCard: React.FC<{ influencer: IUser; onViewProfile: (influencer: IUser) => void }> = ({ 
    influencer, 
    onViewProfile 
}) => {
    const instagramData = influencer.influencerInfo?.socialMedia?.find(sm => sm.platform === 'instagram');
    const youtubeData = influencer.influencerInfo?.socialMedia?.find(sm => sm.platform === 'youtube');
    const facebookData = influencer.influencerInfo?.socialMedia?.find(sm => sm.platform === 'facebook');
    
    const formatNumber = (num?: number): string => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const instagramFollowers = (() => {
        const smCount = getFollowerCount(instagramData?.followers);
        const info = influencer.influencerInfo;

        const linkedFromData = info?.instagramData?.linkedAccounts ?? [];
        let linkedMax = 0;
        linkedFromData.forEach((acc) => {
            const followers = (acc as any).followers;
            if (typeof followers === 'number' && followers > linkedMax) {
                linkedMax = followers;
            }
        });

        const linkedFromInfo = info?.instagramLinkedAccounts ?? [];
        linkedFromInfo.forEach((acc) => {
            const followers = (acc as any).followers;
            if (typeof followers === 'number' && followers > linkedMax) {
                linkedMax = followers;
            }
        });

        return Math.max(smCount, linkedMax);
    })();

    const facebookFollowers = (() => {
        const smCount = getFollowerCount(facebookData?.followers);
        const pages = influencer.influencerInfo?.facebookData?.pages ?? [];
        let maxFromPages = 0;
        pages.forEach((p: any) => {
            const v = p.followersCount ?? p.fanCount ?? 0;
            if (typeof v === 'number' && v > maxFromPages) {
                maxFromPages = v;
            }
        });
        return Math.max(smCount, maxFromPages);
    })();

    return (
        <Paper
            elevation={2}
            sx={{
                p: 2,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                },
            }}
            onClick={() => onViewProfile(influencer)}
        >
            <Box display="flex" gap={2}>
                <Avatar
                    src={getProxiedImageUrl(influencer.profilePictureUrl)}
                    sx={{
                        width: 80,
                        height: 80,
                    }}
                >
                    {influencer.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {influencer.name}
                    </Typography>
                    {influencer.influencerInfo?.influencerType && (
                        <Chip
                            label={influencer.influencerInfo.influencerType}
                            size="small"
                            sx={{ mb: 1 }}
                        />
                    )}
                    <Box display="flex" gap={2} mt={1}>
                        {instagramData && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Instagram
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatNumber(instagramFollowers)} followers
                                </Typography>
                            </Box>
                        )}
                        {facebookData && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Facebook
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatNumber(facebookFollowers)} followers
                                </Typography>
                            </Box>
                        )}
                        {youtubeData && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    YouTube
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatNumber(youtubeData.metrics?.subscribers)} subscribers
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    {influencer.influencerInfo?.genre && influencer.influencerInfo.genre.length > 0 && (
                        <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                            {influencer.influencerInfo.genre.slice(0, 3).map((g, idx) => (
                                <Chip key={idx} label={g} size="small" variant="outlined" />
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default function ExplorePage() {
    const router = useRouter();
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Influencers state
    const [influencers, setInfluencers] = useState<IUser[]>([]);
    const [influencerFilters, setInfluencerFilters] = useState({
        search: '',
        influencerType: '',
        genre: '',
        workType: '',
        location: '',
        country: '',
        language: '',
        maritalStatus: '',
        children: '',
        pets: '',
        minFollowers: '',
        maxFollowers: '',
        minSubscribers: '',
        maxSubscribers: '',
    });
    const [influencerPagination, setInfluencerPagination] = useState({
        page: 1,
        totalPages: 1,
        totalUsers: 0,
    });
    
    // Vendors state
    const [vendors, setVendors] = useState<IUser[]>([]);
    const [vendorFilters, setVendorFilters] = useState({
        search: '',
        category: '',
        vendorType: '',
        location: '',
        minRating: 0,
    });
    const [vendorPagination, setVendorPagination] = useState({
        page: 1,
        totalPages: 1,
        total: 0,
    });
    
    // Dialog states
    const [selectedInfluencer, setSelectedInfluencer] = useState<IUser | null>(null);
    const [influencerProfileOpen, setInfluencerProfileOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<IUser | null>(null);
    const [vendorProfileOpen, setVendorProfileOpen] = useState(false);

    // Load influencers
    useEffect(() => {
        if (tabValue !== 0) return;
        
        const loadInfluencers = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await userService.getAllInfluencers(
                    influencerPagination.page,
                    20,
                    influencerFilters
                );
                
                setInfluencers(response.influencers || []);
                setInfluencerPagination(response.pagination || {
                    page: 1,
                    totalPages: 1,
                    totalUsers: 0,
                });
            } catch (err: unknown) {
                console.error('Error loading influencers:', err);
                setError(err instanceof Error ? err.message : 'Failed to load influencers');
            } finally {
                setLoading(false);
            }
        };
        
        loadInfluencers();
    }, [tabValue, influencerFilters, influencerPagination.page]);

    // Load vendors
    useEffect(() => {
        if (tabValue !== 1) return;
        
        const loadVendors = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await userService.getAllVendors(
                    vendorPagination.page,
                    20,
                    vendorFilters
                );
                
                setVendors(response.vendors || []);
                setVendorPagination(response.pagination || {
                    page: 1,
                    totalPages: 1,
                    total: 0,
                });
            } catch (err: unknown) {
                console.error('Error loading vendors:', err);
                setError(err instanceof Error ? err.message : 'Failed to load vendors');
            } finally {
                setLoading(false);
            }
        };
        
        loadVendors();
    }, [tabValue, vendorFilters, vendorPagination.page]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleInfluencerFilterChange = (key: string, value: string) => {
        setInfluencerFilters(prev => ({ ...prev, [key]: value }));
        setInfluencerPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleVendorFilterChange = (key: string, value: string | number) => {
        setVendorFilters(prev => ({ ...prev, [key]: value }));
        setVendorPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearInfluencerFilters = () => {
        setInfluencerFilters({
            search: '',
            influencerType: '',
            genre: '',
            workType: '',
            location: '',
            country: '',
            language: '',
            maritalStatus: '',
            children: '',
            pets: '',
            minFollowers: '',
            maxFollowers: '',
            minSubscribers: '',
            maxSubscribers: '',
        });
        setInfluencerPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearVendorFilters = () => {
        setVendorFilters({
            search: '',
            category: '',
            vendorType: '',
            location: '',
            minRating: 0,
        });
        setVendorPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleViewInfluencerProfile = (influencer: IUser) => {
        setSelectedInfluencer(influencer);
        setInfluencerProfileOpen(true);
    };

    const handleViewVendorProfile = (vendor: IUser) => {
        setSelectedVendor(vendor);
        setVendorProfileOpen(true);
    };


    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                Explore
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
                Discover influencers and vendors for your campaigns
            </Typography>

            <Paper elevation={2} sx={{ borderRadius: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                    <Tab label={`Influencers (${influencerPagination.totalUsers})`} />
                    <Tab label={`Vendors (${vendorPagination.total})`} />
                </Tabs>

                {/* Influencers Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box>
                        {/* Filters */}
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <FilterIcon />
                                    <Typography>Filters</Typography>
                                    {(Object.values(influencerFilters).some(v => v !== '')) && (
                                        <Chip
                                            label="Active"
                                            size="small"
                                            color="primary"
                                        />
                                    )}
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 3, py: 3 }}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <div>
                                        <TextField
                                            fullWidth
                                            label="Search by name"
                                            value={influencerFilters.search}
                                            onChange={(e) => handleInfluencerFilterChange('search', e.target.value)}
                                            placeholder="Enter influencer name"
                                            InputProps={{
                                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                            }}
                                            sx={{
                                                minWidth: { xs: '100%', sm: '200px' },
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.95rem',
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '0.95rem',
                                                },
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                                            <InputLabel sx={{ fontSize: '0.95rem' }}>Influencer Type</InputLabel>
                                            <Select
                                                value={influencerFilters.influencerType}
                                                label="Influencer Type"
                                                onChange={(e) => handleInfluencerFilterChange('influencerType', e.target.value)}
                                                sx={{ fontSize: '0.95rem' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value="micro">Micro Influencer</MenuItem>
                                                <MenuItem value="macro">Macro Influencer</MenuItem>
                                                <MenuItem value="mega">Mega Influencer</MenuItem>
                                                <MenuItem value="celebrity">Celebrity</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>
                                    <div>
                                        <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                                            <InputLabel sx={{ fontSize: '0.95rem' }}>Genre</InputLabel>
                                            <Select
                                                value={influencerFilters.genre}
                                                label="Genre"
                                                onChange={(e) => handleInfluencerFilterChange('genre', e.target.value)}
                                                sx={{ fontSize: '0.95rem' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value="Fashion">Fashion</MenuItem>
                                                <MenuItem value="Beauty">Beauty</MenuItem>
                                                <MenuItem value="Food">Food</MenuItem>
                                                <MenuItem value="Travel">Travel</MenuItem>
                                                <MenuItem value="Fitness">Fitness</MenuItem>
                                                <MenuItem value="Tech">Tech</MenuItem>
                                                <MenuItem value="Lifestyle">Lifestyle</MenuItem>
                                                <MenuItem value="Entertainment">Entertainment</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>
                                    <div>
                                        <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                                            <InputLabel sx={{ fontSize: '0.95rem' }}>Work Type</InputLabel>
                                            <Select
                                                value={influencerFilters.workType}
                                                label="Work Type"
                                                onChange={(e) => handleInfluencerFilterChange('workType', e.target.value)}
                                                sx={{ fontSize: '0.95rem' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value="full-time">Full Time</MenuItem>
                                                <MenuItem value="part-time">Part Time</MenuItem>
                                                <MenuItem value="freelance">Freelance</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>
                                    <div>
                                        <TextField
                                            fullWidth
                                            label="Location"
                                            value={influencerFilters.location}
                                            onChange={(e) => handleInfluencerFilterChange('location', e.target.value)}
                                            placeholder="City, State, Country"
                                            sx={{
                                                minWidth: { xs: '100%', sm: '200px' },
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.95rem',
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '0.95rem',
                                                },
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                                            <InputLabel sx={{ fontSize: '0.95rem' }}>Marital Status</InputLabel>
                                            <Select
                                                value={influencerFilters.maritalStatus}
                                                label="Marital Status"
                                                onChange={(e) => handleInfluencerFilterChange('maritalStatus', e.target.value)}
                                                sx={{ fontSize: '0.95rem' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value="single">Single</MenuItem>
                                                <MenuItem value="married">Married</MenuItem>
                                                <MenuItem value="divorced">Divorced</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>
                                    <div>
                                        <TextField
                                            fullWidth
                                            label="Min Instagram Followers"
                                            type="number"
                                            value={influencerFilters.minFollowers}
                                            onChange={(e) => handleInfluencerFilterChange('minFollowers', e.target.value)}
                                            placeholder="e.g., 1000"
                                            sx={{
                                                minWidth: { xs: '100%', sm: '200px' },
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.95rem',
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '0.95rem',
                                                },
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <TextField
                                            fullWidth
                                            label="Max Instagram Followers"
                                            type="number"
                                            value={influencerFilters.maxFollowers}
                                            onChange={(e) => handleInfluencerFilterChange('maxFollowers', e.target.value)}
                                            placeholder="e.g., 100000"
                                            sx={{
                                                minWidth: { xs: '100%', sm: '200px' },
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.95rem',
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '0.95rem',
                                                },
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <Button
                                            variant="outlined"
                                            startIcon={<ClearIcon />}
                                            onClick={clearInfluencerFilters}
                                        >
                                            Clear All Filters
                                        </Button>
                                    </div>
                                </div>
                            </AccordionDetails>
                        </Accordion>

                        {/* Results */}
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : error ? (
                            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                        ) : influencers.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                No influencers found matching your criteria
                            </Alert>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                                    {influencers.map((influencer) => (
                                        <div key={influencer._id}>
                                            <InfluencerCard
                                                influencer={influencer}
                                                onViewProfile={handleViewInfluencerProfile}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* Pagination */}
                                {influencerPagination.totalPages > 1 && (
                                    <Box display="flex" justifyContent="center" gap={2} mt={4}>
                                        <Button
                                            disabled={influencerPagination.page === 1}
                                            onClick={() => setInfluencerPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        >
                                            Previous
                                        </Button>
                                        <Typography variant="body2" alignSelf="center">
                                            Page {influencerPagination.page} of {influencerPagination.totalPages}
                                        </Typography>
                                        <Button
                                            disabled={influencerPagination.page === influencerPagination.totalPages}
                                            onClick={() => setInfluencerPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        >
                                            Next
                                        </Button>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </TabPanel>

                {/* Vendors Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box>
                        {/* Filters */}
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <FilterIcon />
                                    <Typography>Filters</Typography>
                                    {(Object.values(vendorFilters).some(v => v !== '' && v !== 0)) && (
                                        <Chip
                                            label="Active"
                                            size="small"
                                            color="primary"
                                        />
                                    )}
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 3, py: 3 }}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <div>
                                        <TextField
                                            fullWidth
                                            label="Search by name"
                                            value={vendorFilters.search}
                                            onChange={(e) => handleVendorFilterChange('search', e.target.value)}
                                            placeholder="Enter vendor name"
                                            InputProps={{
                                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                            }}
                                            sx={{
                                                minWidth: { xs: '100%', sm: '200px' },
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.95rem',
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '0.95rem',
                                                },
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                                            <InputLabel sx={{ fontSize: '0.95rem' }}>Service Category</InputLabel>
                                            <Select
                                                value={vendorFilters.category}
                                                label="Service Category"
                                                onChange={(e) => handleVendorFilterChange('category', e.target.value)}
                                                sx={{ fontSize: '0.95rem' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value="photography">Photography</MenuItem>
                                                <MenuItem value="videography">Videography</MenuItem>
                                                <MenuItem value="editing">Editing</MenuItem>
                                                <MenuItem value="graphic-design">Graphic Design</MenuItem>
                                                <MenuItem value="content-creation">Content Creation</MenuItem>
                                                <MenuItem value="marketing">Marketing</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>
                                    <div>
                                        <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: '200px' } }}>
                                            <InputLabel sx={{ fontSize: '0.95rem' }}>Vendor Type</InputLabel>
                                            <Select
                                                value={vendorFilters.vendorType}
                                                label="Vendor Type"
                                                onChange={(e) => handleVendorFilterChange('vendorType', e.target.value)}
                                                sx={{ fontSize: '0.95rem' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value="individual">Individual</MenuItem>
                                                <MenuItem value="agency">Agency</MenuItem>
                                                <MenuItem value="studio">Studio</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>
                                    <div>
                                        <TextField
                                            fullWidth
                                            label="Location/Service Area"
                                            value={vendorFilters.location}
                                            onChange={(e) => handleVendorFilterChange('location', e.target.value)}
                                            placeholder="Enter location"
                                            sx={{
                                                minWidth: { xs: '100%', sm: '200px' },
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.95rem',
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '0.95rem',
                                                },
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <Box sx={{ px: 1 }}>
                                            <Typography gutterBottom sx={{ fontSize: '0.95rem', fontWeight: 500, mb: 2 }}>
                                                Minimum Rating: {vendorFilters.minRating}
                                            </Typography>
                                            <Slider
                                                value={vendorFilters.minRating}
                                                onChange={(_, value) => handleVendorFilterChange('minRating', value as number)}
                                                min={0}
                                                max={5}
                                                step={0.5}
                                                marks={[
                                                    { value: 0, label: '0' },
                                                    { value: 1, label: '1' },
                                                    { value: 2, label: '2' },
                                                    { value: 3, label: '3' },
                                                    { value: 4, label: '4' },
                                                    { value: 5, label: '5' },
                                                ]}
                                                valueLabelDisplay="auto"
                                                sx={{
                                                    '& .MuiSlider-markLabel': {
                                                        fontSize: '0.85rem',
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </div>
                                    <div className="col-span-full">
                                        <Button
                                            variant="outlined"
                                            startIcon={<ClearIcon />}
                                            onClick={clearVendorFilters}
                                        >
                                            Clear All Filters
                                        </Button>
                                    </div>
                                </div>
                            </AccordionDetails>
                        </Accordion>

                        {/* Results */}
                        {loading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : error ? (
                            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                        ) : vendors.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                No vendors found matching your criteria
                            </Alert>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                                    {vendors.map((vendor) => (
                                        <div key={vendor._id}>
                                            <VendorCard
                                                vendor={vendor}
                                                onViewProfile={handleViewVendorProfile}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* Pagination */}
                                {vendorPagination.totalPages > 1 && (
                                    <Box display="flex" justifyContent="center" gap={2} mt={4}>
                                        <Button
                                            disabled={vendorPagination.page === 1}
                                            onClick={() => setVendorPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        >
                                            Previous
                                        </Button>
                                        <Typography variant="body2" alignSelf="center">
                                            Page {vendorPagination.page} of {vendorPagination.totalPages}
                                        </Typography>
                                        <Button
                                            disabled={vendorPagination.page === vendorPagination.totalPages}
                                            onClick={() => setVendorPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        >
                                            Next
                                        </Button>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* Influencer Profile Dialog */}
            {selectedInfluencer && (
                <InfluencerProfileDialog
                    influencer={selectedInfluencer}
                    open={influencerProfileOpen}
                    onClose={() => {
                        setInfluencerProfileOpen(false);
                        setSelectedInfluencer(null);
                    }}
                />
            )}

            {/* Vendor Profile Dialog */}
            {selectedVendor && (
                <VendorProfileDialog
                    vendor={selectedVendor}
                    open={vendorProfileOpen}
                    onClose={() => {
                        setVendorProfileOpen(false);
                        setSelectedVendor(null);
                    }}
                />
            )}
        </Container>
    );
}

