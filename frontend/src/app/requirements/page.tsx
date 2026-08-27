'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
    Tabs,
    Tab,
    Paper,
} from '@mui/material';
import {
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    LocationOn as LocationIcon,
    AttachMoney as MoneyIcon,
    CalendarToday as CalendarIcon,
    Assignment as AssignmentIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    LocalOffer as BidsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/authContext';
import vendorRequirementService from '@/services/vendorRequirementService';
import { IVendorRequirement } from '../../../../shared/types/vendorRequirement';
import { format } from 'date-fns';
import RequirementForm from '@/components/requirements/RequirementForm';
import SendVendorOfferDialog from '@/components/requirements/SendVendorOfferDialog';
import { useRouter } from 'next/navigation';

export default function RequirementsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(0);
    const [requirements, setRequirements] = useState<IVendorRequirement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [sendOfferDialogOpen, setSendOfferDialogOpen] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState<IVendorRequirement | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        if (activeTab === 0) {
            loadRequirements();
        }
    }, [page, activeTab]);

    const loadRequirements = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await vendorRequirementService.getUserRequirements({
                page,
                limit: 10,
            });
            setRequirements(data.requirements);
            setTotalPages(data.pagination.totalPages || 1);
        } catch (err: unknown) {
            console.error('Error loading requirements:', err);
            setError('Failed to load requirements');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        if (newValue === 1) {
            // Navigate to bids page
            router.push('/requirements/bids');
        }
    };

    const handleCreate = () => {
        setSelectedRequirement(null);
        setFormDialogOpen(true);
    };

    const handleEdit = () => {
        setFormDialogOpen(true);
        handleMenuClose();
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, requirement: IVendorRequirement) => {
        setAnchorEl(event.currentTarget);
        setSelectedRequirement(requirement);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleFormSubmit = async (data: Partial<IVendorRequirement>) => {
        try {
            if (selectedRequirement?._id) {
                await vendorRequirementService.updateRequirement(selectedRequirement._id, data);
                setSuccess('Requirement updated successfully');
            } else {
                await vendorRequirementService.createRequirement(data);
                setSuccess('Requirement posted successfully');
            }
            setFormDialogOpen(false);
            setSelectedRequirement(null);
            loadRequirements();
        } catch (err: unknown) {
            console.error('Error saving requirement:', err);
            setError('Failed to save requirement');
            throw err;
        }
    };

    const handleDelete = async () => {
        if (!selectedRequirement?._id) return;

        try {
            await vendorRequirementService.deleteRequirement(selectedRequirement._id);
            setDeleteDialogOpen(false);
            setSelectedRequirement(null);
            setSuccess('Requirement deleted successfully');
            loadRequirements();
        } catch (err: unknown) {
            console.error('Error deleting requirement:', err);
            setError('Failed to delete requirement');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'success';
            case 'in-progress':
                return 'info';
            case 'completed':
                return 'default';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'urgent':
                return 'error';
            case 'high':
                return 'warning';
            case 'medium':
                return 'info';
            case 'low':
                return 'default';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                        My Requirements
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Post requirements and receive offers from vendors
                    </Typography>
                </Box>
                {activeTab === 0 && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleCreate}
                        sx={{
                            bgcolor: '#8CC342',
                            '&:hover': { bgcolor: '#699e31' },
                            textTransform: 'none',
                            px: 3,
                        }}
                    >
                        Post Requirement
                    </Button>
                )}
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                        },
                        '& .Mui-selected': {
                            color: '#8CC342',
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#8CC342',
                        },
                    }}
                >
                    <Tab label="Requirements" />
                    <Tab label="Bids" icon={<BidsIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Success Alert */}
            {success && (
                <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
                    {success}
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Content */}
            {activeTab === 0 && (
                <>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress sx={{ color: '#8CC342' }} />
                        </Box>
                    ) : requirements.length === 0 ? (
                        <Card sx={{ textAlign: 'center', py: 8 }}>
                            <AssignmentIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No requirements posted yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Post your first requirement to start receiving offers from vendors
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleCreate}
                                sx={{
                                    bgcolor: '#8CC342',
                                    '&:hover': { bgcolor: '#699e31' },
                                    textTransform: 'none',
                                }}
                            >
                                Post Your First Requirement
                            </Button>
                        </Card>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {requirements.map((requirement) => (
                                    <Card key={requirement._id} sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                            {requirement.title}
                                                        </Typography>
                                                        <Chip
                                                            label={requirement.status}
                                                            size="small"
                                                            color={getStatusColor(requirement.status)}
                                                        />
                                                        {requirement.priority && (
                                                            <Chip
                                                                label={requirement.priority}
                                                                size="small"
                                                                color={getPriorityColor(requirement.priority)}
                                                            />
                                                        )}
                                                    </Box>
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
                                                        {requirement.description}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <AssignmentIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {requirement.category}
                                                            </Typography>
                                                        </Box>
                                                        {requirement.budget && typeof requirement.budget === 'number' && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <MoneyIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {requirement.budgetCurrency || 'INR'}{' '}
                                                                    {requirement.budget.toLocaleString()}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        {requirement.city && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <LocationIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {requirement.city}, {requirement.country}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        {requirement.deadline && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <CalendarIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {format(new Date(requirement.deadline), 'MMM dd, yyyy')}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Box>
                                                <Box>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleMenuOpen(e, requirement)}
                                                    >
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                                {requirement.totalBids !== undefined && requirement.totalBids > 0 && (
                                                    <Chip
                                                        icon={<BidsIcon />}
                                                        label={`${requirement.totalBids} Bid${requirement.totalBids !== 1 ? 's' : ''} Received`}
                                                        size="small"
                                                        sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600 }}
                                                        onClick={() => router.push('/requirements/bids')}
                                                        clickable
                                                    />
                                                )}
                                                {requirement.totalOffers !== undefined && requirement.totalOffers > 0 && (
                                                    <Chip
                                                        label={`${requirement.totalOffers} Offer${requirement.totalOffers !== 1 ? 's' : ''} Sent`}
                                                        size="small"
                                                        sx={{ bgcolor: '#e6f3d8', color: '#699e31', fontWeight: 600 }}
                                                    />
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
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
                </>
            )}

            {/* Context Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleMenuClose}>
                    <ViewIcon sx={{ mr: 1, fontSize: 20 }} />
                    View Details
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        setSendOfferDialogOpen(true);
                    }}
                    sx={{ color: '#8CC342' }}
                >
                    <AddIcon sx={{ mr: 1, fontSize: 20 }} />
                    Send Offer to Vendors
                </MenuItem>
                <MenuItem onClick={handleEdit}>
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        setDeleteDialogOpen(true);
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Requirement Form Dialog */}
            <RequirementForm
                open={formDialogOpen}
                onClose={() => {
                    setFormDialogOpen(false);
                    setSelectedRequirement(null);
                }}
                onSubmit={handleFormSubmit}
                initialData={selectedRequirement}
            />

            {/* Send Offer to Vendors Dialog */}
            {selectedRequirement && (
                <SendVendorOfferDialog
                    open={sendOfferDialogOpen}
                    requirement={selectedRequirement}
                    onClose={() => {
                        setSendOfferDialogOpen(false);
                        setSelectedRequirement(null);
                    }}
                    onSuccess={() => {
                        loadRequirements();
                        setSuccess('Offers sent successfully to vendors!');
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Requirement?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this requirement? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

