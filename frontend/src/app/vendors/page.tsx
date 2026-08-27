 'use client';
 
 import React, { useState, useEffect } from 'react';
 import ErrorBoundary from '@/components/ErrorBoundary';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    CircularProgress,
    Alert,
    InputAdornment,
    Chip,
    Paper,
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    LocationOn as LocationIcon,
} from '@mui/icons-material';
import vendorService from '@/services/vendorService';
import vendorReviewService from '@/services/vendorReviewService';
import { VendorCard } from '@/components/vendors/VendorCard';
import { ServiceCard } from '@/components/vendors/ServiceCard';
import { VendorProfileDialog } from '@/components/vendors/VendorProfileDialog';
import { ServiceDetailsDialog } from '@/components/vendors/ServiceDetailsDialog';
import { IUser } from '../../../../shared/types/user';
import { IService } from '../../../../shared/types/vendor';
import { IVendorReviewStats } from '../../../../shared/types/vendorReview';
import { useAuth } from '@/context/authContext';
import { canApproachVendors } from '@/utils/profileCompletion';
import { useRouter } from 'next/navigation';

const serviceCategories = [
    'All Categories',
    'photography',
    'videography',
    'event-planning',
    'makeup-artist',
    'hair-stylist',
    'catering',
    'decoration',
    'sound-system',
    'lighting',
    'content-creation',
    'graphic-design',
    'other',
];

export default function VendorsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Vendors state
    const [vendors, setVendors] = useState<IUser[]>([]);
    const [vendorsPage, setVendorsPage] = useState(1);
    const [selectedVendor, setSelectedVendor] = useState<IUser | null>(null);
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);

    // Services state
    const [services, setServices] = useState<IService[]>([]);
    const [servicesPage, setServicesPage] = useState(1);
    const [selectedService, setSelectedService] = useState<IService | null>(null);
    const [serviceDetailsDialogOpen, setServiceDetailsDialogOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [locationFilter, setLocationFilter] = useState('');

    useEffect(() => {
        if (tabValue === 0) {
            loadVendors();
        } else {
            loadServices();
        }
    }, [tabValue, selectedCategory, locationFilter, searchQuery]);

    const loadVendors = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await vendorService.getAllVendors(vendorsPage, 20);
            const vendorList = Array.isArray(data.vendors) ? data.vendors : [];
            
            // Fetch real review stats for each vendor
            const vendorsWithRealStats = await Promise.all(
                vendorList.map(async (vendor) => {
                    if (vendor._id) {
                        try {
                            const stats = await vendorReviewService.getReviewStats(vendor._id);
                            // Update vendor info with real review stats
                            return {
                                ...vendor,
                                vendorInfo: {
                                    ...vendor.vendorInfo,
                                    rating: stats.averageRating,
                                    totalReviews: stats.totalReviews,
                                },
                            };
                        } catch (error) {
                            console.error(`Failed to fetch review stats for vendor ${vendor._id}:`, error);
                            return vendor;
                        }
                    }
                    return vendor;
                })
            );
            
            setVendors(vendorsWithRealStats);
        } catch (err) {
            setError('Failed to load vendors');
            console.error(err);
            setVendors([]); // Reset to empty array on error
        } finally {
            setLoading(false);
        }
    };

    const loadServices = async () => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, string | number> = {
                page: servicesPage,
                limit: 20,
            };

            if (selectedCategory !== 'All Categories') {
                params.category = selectedCategory;
            }
            if (locationFilter) {
                params.location = locationFilter;
            }
            if (searchQuery) {
                params.search = searchQuery;
            }

            const data = await vendorService.getAllServices(params);
            const serviceList = Array.isArray(data.services) ? data.services : [];
            
            // Fetch real review stats for vendors in services
            const servicesWithRealStats = await Promise.all(
                serviceList.map(async (service) => {
                    const vendor = service.vendorId as any;
                    if (vendor?._id) {
                        try {
                            const stats = await vendorReviewService.getReviewStats(vendor._id);
                            // Update vendor info with real review stats
                            return {
                                ...service,
                                vendorId: {
                                    ...vendor,
                                    vendorInfo: {
                                        ...vendor.vendorInfo,
                                        rating: stats.averageRating,
                                        totalReviews: stats.totalReviews,
                                    },
                                },
                            };
                        } catch (error) {
                            console.error(`Failed to fetch review stats for vendor ${vendor._id}:`, error);
                            return service;
                        }
                    }
                    return service;
                })
            );
            
            setServices(servicesWithRealStats);
        } catch (err) {
            setError('Failed to load services');
            console.error(err);
            setServices([]); // Reset to empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setSearchQuery('');
        setSelectedCategory('All Categories');
        setLocationFilter('');
    };

    const handleViewVendorProfile = (vendor: IUser) => {
        setSelectedVendor(vendor);
        setProfileDialogOpen(true);
    };


    const handleApproachService = (service: IService) => {
        if (!canApproachVendors(user)) {
            setError('Please complete your profile before approaching vendors');
            router.push('/profile');
            return;
        }
        const vendor = service.vendorId as IUser | undefined;
        if (vendor && typeof vendor === 'object' && vendor._id) {
            setSelectedVendor(vendor);
            setProfileDialogOpen(true);
        } else {
            setError('Vendor information is not available for this service');
        }
    };

    const handleViewServiceDetails = (service: IService) => {
        setSelectedService(service);
        setServiceDetailsDialogOpen(true);
    };

    const handleViewVendorFromService = (vendor: IUser) => {
        setServiceDetailsDialogOpen(false);
        setSelectedService(null);
        setSelectedVendor(vendor);
        setProfileDialogOpen(true);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedCategory('All Categories');
        setLocationFilter('');
    };

    return (
        <ErrorBoundary>
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Vendors & Services
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Find professional vendors and services for your events and campaigns
                    </Typography>
                </Box>

                {/* Tabs */}
                <Paper sx={{ borderRadius: 3, mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        sx={{
                            px: 2,
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                            },
                        }}
                    >
                        <Tab label="Vendors" />
                        <Tab label="Services" />
                    </Tabs>
                </Paper>

                {/* Filters */}
                <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <FilterIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Filters
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                            gap: 2,
                        }}
                    >
                        {/* Search */}
                        <TextField
                            fullWidth
                            placeholder={`Search ${tabValue === 0 ? 'vendors' : 'services'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />

                        {/* Category */}
                        {tabValue === 1 && (
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={selectedCategory}
                                    label="Category"
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {serviceCategories.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat === 'All Categories'
                                                ? cat
                                                : cat.replace(/-/g, ' ').toUpperCase()}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Location */}
                        <TextField
                            fullWidth
                            placeholder="Location (City)"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LocationIcon />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />

                        {/* Reset Button */}
                        <Button
                            variant="outlined"
                            onClick={handleResetFilters}
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            Reset Filters
                        </Button>
                    </Box>

                    {/* Active Filters */}
                    {(searchQuery || selectedCategory !== 'All Categories' || locationFilter) && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {searchQuery && (
                                <Chip
                                    label={`Search: ${searchQuery}`}
                                    onDelete={() => setSearchQuery('')}
                                    size="small"
                                />
                            )}
                            {selectedCategory !== 'All Categories' && (
                                <Chip
                                    label={`Category: ${selectedCategory}`}
                                    onDelete={() => setSelectedCategory('All Categories')}
                                    size="small"
                                />
                            )}
                            {locationFilter && (
                                <Chip
                                    label={`Location: ${locationFilter}`}
                                    onDelete={() => setLocationFilter('')}
                                    size="small"
                                />
                            )}
                        </Box>
                    )}
                </Paper>

                {/* Loading State */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Error State */}
                {error && !loading && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Content */}
                {!loading && !error && (
                    <>
                        {/* Vendors Tab */}
                        {tabValue === 0 && (
                            <>
                                {vendors.length === 0 ? (
                                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                                        <Typography variant="h6" color="text.secondary">
                                            No vendors found
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            Try adjusting your filters or search query
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Showing {vendors.length} vendors
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: {
                                                    xs: '1fr',
                                                    sm: 'repeat(2, 1fr)',
                                                    lg: 'repeat(3, 1fr)',
                                                },
                                                gap: 3,
                                            }}
                                        >
                                            {vendors.map((vendor) => (
                                                <VendorCard
                                                    key={vendor._id}
                                                    vendor={vendor}
                                                    onViewProfile={handleViewVendorProfile}
                                                />
                                            ))}
                                        </Box>
                                    </>
                                )}
                            </>
                        )}

                        {/* Services Tab */}
                        {tabValue === 1 && (
                            <>
                                {services.length === 0 ? (
                                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                                        <Typography variant="h6" color="text.secondary">
                                            No services found
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            Try adjusting your filters or search query
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Showing {services.length} services
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: {
                                                    xs: '1fr',
                                                    sm: 'repeat(2, 1fr)',
                                                    lg: 'repeat(3, 1fr)',
                                                },
                                                gap: 3,
                                            }}
                                        >
                                            {services.map((service) => (
                                                <ServiceCard
                                                    key={service._id}
                                                    service={service}
                                                    onApproach={handleApproachService}
                                                    onViewDetails={handleViewServiceDetails}
                                                    onViewVendor={handleViewVendorProfile}
                                                />
                                            ))}
                                        </Box>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Service Details Dialog */}
                <ServiceDetailsDialog
                    open={serviceDetailsDialogOpen}
                    service={selectedService}
                    onClose={() => { setServiceDetailsDialogOpen(false); setSelectedService(null); }}
                    onViewVendor={handleViewVendorFromService}
                />

                {/* Vendor Profile Dialog */}
                <VendorProfileDialog
                    open={profileDialogOpen}
                    vendor={selectedVendor}
                    onClose={() => setProfileDialogOpen(false)}
                />
            </Box>
        </ErrorBoundary>
    );
}

