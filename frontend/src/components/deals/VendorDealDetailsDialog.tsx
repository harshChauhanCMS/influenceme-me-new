'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Typography,
    Box,
    Chip,
    Divider,
    Stack,
    CircularProgress,
    Alert,
    Button,
    Card,
    CardContent,
} from '@mui/material';
import {
    Close as CloseIcon,
    Person as PersonIcon,
    CheckCircle as CheckIcon,
    Schedule as ScheduleIcon,
    AttachMoney as MoneyIcon,
    Assignment as AssignmentIcon,
    Visibility as ViewIcon,
    CheckCircle as VerifyIcon,
} from '@mui/icons-material';
import vendorDealService from '@/services/vendorDealService';
import { IVendorBrandDeal } from '../../../../shared/types/vendorBrandDeal';
import { IUser } from '../../../../shared/types/user';
import { format } from 'date-fns';
import { VendorProfileDialog } from '@/components/vendors/VendorProfileDialog';
import { useContext } from 'react';
import { AuthContext } from '@/context/authContext';

interface VendorDealDetailsDialogProps {
    open: boolean;
    dealId: string | null;
    onClose: () => void;
}

export const VendorDealDetailsDialog: React.FC<VendorDealDetailsDialogProps> = ({
    open,
    dealId,
    onClose,
}) => {
    const [deal, setDeal] = useState<IVendorBrandDeal | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
    
    // Use useContext directly to safely access auth context
    // This won't throw if context is not available (returns undefined)
    const authContext = useContext(AuthContext);
    const user = authContext?.user || null;
    const isVendor = user?.role === 'vendor';
    const isClient = user?.role === 'brand' || user?.role === 'influencer';

    useEffect(() => {
        if (open && dealId) {
            loadDealDetails();
        } else {
            setDeal(null);
            setError(null);
        }
    }, [open, dealId]);

    const loadDealDetails = async () => {
        if (!dealId) return;
        
        try {
            setLoading(true);
            setError(null);
            const dealData = await vendorDealService.getDealDetails(dealId);
            setDeal(dealData);
        } catch (err: unknown) {
            console.error('Error loading deal details:', err);
            setError('Failed to load deal details');
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = (userId: string | any) => {
        if (userId && typeof userId === 'object') {
            setSelectedUser(userId as IUser);
            setProfileDialogOpen(true);
        }
    };

    const handleVerifyCompletion = async () => {
        if (!dealId || !deal) return;

        try {
            setVerifying(true);
            setError(null);
            setSuccessMessage(null);
            
            const updatedDeal = await vendorDealService.verifyServiceCompletion(dealId);
            setDeal(updatedDeal);
            setSuccessMessage('Service completion verified successfully! Deal marked as completed.');
            
            // Clear success message after 5 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 5000);
        } catch (err: unknown) {
            console.error('Error verifying service completion:', err);
            setError('Failed to verify service completion');
        } finally {
            setVerifying(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'error';
            case 'running':
                return 'primary';
            default:
                return 'default';
        }
    };

    const getServiceStatusColor = (status?: string) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'in-progress':
                return 'info';
            case 'pending_verification':
                return 'warning';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getPaymentStatusColor = (status?: string) => {
        switch (status) {
            case 'paid':
                return 'success';
            case 'partial':
                return 'warning';
            case 'refunded':
                return 'error';
            default:
                return 'default';
        }
    };

    if (!open) return null;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        background: 'linear-gradient(135deg, #8CC342 0%, #699e31 100%)',
                        color: 'white',
                    }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>
                        Deal Details
                    </Typography>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress sx={{ color: '#8CC342' }} />
                        </Box>
                    ) : error ? (
                        <Box sx={{ p: 3 }}>
                            <Alert severity="error">{error}</Alert>
                        </Box>
                    ) : deal ? (
                        <Box sx={{ p: 3 }}>
                            {/* Success Message */}
                            {successMessage && (
                                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
                                    {successMessage}
                                </Alert>
                            )}

                            {/* Error Message */}
                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}

                            {/* Deal Status */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Chip
                                    label={deal.status}
                                    color={getStatusColor(deal.status)}
                                    sx={{ fontWeight: 600, fontSize: '0.9rem', height: 32 }}
                                />
                            </Box>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left Column - Main Details */}
                                <div className="md:col-span-2">
                                    {/* Requirement Info */}
                                    <Card sx={{ mb: 2, borderRadius: 2 }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontSize: '1.1rem' }}>
                                                Requirement Information
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                                {(deal.requirementId as any)?.title || 'Requirement'}
                                            </Typography>
                                            {(deal.requirementId as any)?.category && (
                                                <Chip
                                                    label={(deal.requirementId as any).category}
                                                    size="small"
                                                    sx={{ mb: 1 }}
                                                />
                                            )}
                                            {(deal.requirementId as any)?.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {(deal.requirementId as any).description}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Final Terms */}
                                    {deal.finalTerms && (
                                        <Card sx={{ mb: 2, borderRadius: 2 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '1.1rem' }}>
                                                    Final Terms
                                                </Typography>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                    {/* Agreed Amount */}
                                                    {deal.finalTerms.agreedAmount !== undefined && (
                                                        <div>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <MoneyIcon sx={{ color: '#8CC342', fontSize: 20 }} />
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Agreed Amount
                                                                </Typography>
                                                            </Box>
                                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                {deal.finalTerms.currency || 'INR'} {deal.finalTerms.agreedAmount.toLocaleString()}
                                                            </Typography>
                                                        </div>
                                                    )}

                                                    {/* Delivery Time */}
                                                    {deal.finalTerms.deliveryTime && (
                                                        <div>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <ScheduleIcon sx={{ color: '#8CC342', fontSize: 20 }} />
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Delivery Time
                                                                </Typography>
                                                            </Box>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {deal.finalTerms.deliveryTime}
                                                            </Typography>
                                                        </div>
                                                    )}

                                                    {/* Service Status */}
                                                    {deal.finalTerms.serviceStatus && (
                                                        <div>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <AssignmentIcon sx={{ color: '#8CC342', fontSize: 20 }} />
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Service Status
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                label={deal.finalTerms.serviceStatus.replace('_', ' ')}
                                                                color={getServiceStatusColor(deal.finalTerms.serviceStatus)}
                                                                size="small"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Payment Status */}
                                                    {deal.finalTerms.paymentStatus && (
                                                        <div>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <MoneyIcon sx={{ color: '#8CC342', fontSize: 20 }} />
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Payment Status
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                label={deal.finalTerms.paymentStatus}
                                                                color={getPaymentStatusColor(deal.finalTerms.paymentStatus)}
                                                                size="small"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <Divider sx={{ my: 2 }} />

                                                {/* Requirements */}
                                                {deal.finalTerms.finalRequirements && deal.finalTerms.finalRequirements.length > 0 && (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                                                            Requirements
                                                        </Typography>
                                                        <Stack spacing={1} sx={{ mt: 1 }}>
                                                            {deal.finalTerms.finalRequirements.map((req, index) => (
                                                                <Box key={index} sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                                                                    <CheckIcon sx={{ color: '#8CC342', fontSize: 18, mt: 0.5 }} />
                                                                    <Typography variant="body2">{req}</Typography>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {/* Deliverables */}
                                                {deal.finalTerms.finalDeliverables && deal.finalTerms.finalDeliverables.length > 0 && (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                                                            Deliverables
                                                        </Typography>
                                                        <Stack spacing={1} sx={{ mt: 1 }}>
                                                            {deal.finalTerms.finalDeliverables.map((del, index) => (
                                                                <Box key={index} sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                                                                    <AssignmentIcon sx={{ color: '#8CC342', fontSize: 18, mt: 0.5 }} />
                                                                    <Typography variant="body2">{del}</Typography>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {/* Negotiated Terms */}
                                                {(deal.finalTerms.deliveryTime || 
                                                  deal.finalTerms.includesRevisions || 
                                                  (deal.finalTerms.additionalServices && deal.finalTerms.additionalServices.length > 0) ||
                                                  deal.finalTerms.description) && (
                                                    <>
                                                        <Divider sx={{ my: 2 }} />
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                                                            Negotiated Terms
                                                        </Typography>

                                                        {/* Revisions */}
                                                        {deal.finalTerms.includesRevisions && (
                                                            <Typography variant="body2" sx={{ mb: 1, mt: 1 }}>
                                                                <strong>Revisions:</strong> {deal.finalTerms.numberOfRevisions || 'Unlimited'} revision(s) included
                                                            </Typography>
                                                        )}

                                                        {/* Additional Services */}
                                                        {deal.finalTerms.additionalServices && deal.finalTerms.additionalServices.length > 0 && (
                                                            <Box sx={{ mb: 1, mt: 1 }}>
                                                                <Typography variant="body2" gutterBottom>
                                                                    <strong>Additional Services:</strong>
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                                                    {deal.finalTerms.additionalServices.map((service, index) => (
                                                                        <Chip
                                                                            key={index}
                                                                            label={service}
                                                                            size="small"
                                                                            sx={{ bgcolor: '#e6f3d8', color: '#699e31' }}
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            </Box>
                                                        )}

                                                        {/* Description */}
                                                        {deal.finalTerms.description && (
                                                            <Box sx={{ mt: 1 }}>
                                                                <Typography variant="body2">
                                                                    <strong>Scope of Work:</strong>
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                    {deal.finalTerms.description}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Deal Message */}
                                    {deal.message && (
                                        <Card sx={{ mb: 2, borderRadius: 2 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1.1rem' }}>
                                                    Deal Message
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {deal.message}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Right Column - Partner Info & Timeline */}
                                <div>
                                    {/* Partner Information */}
                                    <Card sx={{ mb: 2, borderRadius: 2 }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '1.1rem' }}>
                                                Partner Information
                                            </Typography>
                                            {deal.vendorId && typeof deal.vendorId === 'object' ? (
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <PersonIcon sx={{ fontSize: 40, color: '#8CC342' }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {(deal.vendorId as any).vendorInfo?.businessName || (deal.vendorId as any).name || 'Unknown Vendor'}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {(deal.vendorId as any).vendorInfo?.vendorType || 'Vendor'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Button
                                                        variant="outlined"
                                                        fullWidth
                                                        size="small"
                                                        startIcon={<ViewIcon />}
                                                        onClick={() => handleViewProfile(deal.vendorId)}
                                                        sx={{
                                                            borderColor: '#8CC342',
                                                            color: '#8CC342',
                                                            textTransform: 'none',
                                                            '&:hover': {
                                                                borderColor: '#699e31',
                                                                bgcolor: '#e6f3d8',
                                                            },
                                                        }}
                                                    >
                                                        View Profile
                                                    </Button>
                                                </Box>
                                            ) : deal.brandId && typeof deal.brandId === 'object' ? (
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <PersonIcon sx={{ fontSize: 40, color: '#8CC342' }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {(deal.brandId as any).businessInfo?.businessName || (deal.brandId as any).name || 'Unknown Client'}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {(deal.brandId as any).role === 'brand' ? 'Brand' : 'Influencer'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Button
                                                        variant="outlined"
                                                        fullWidth
                                                        size="small"
                                                        startIcon={<ViewIcon />}
                                                        onClick={() => handleViewProfile(deal.brandId)}
                                                        sx={{
                                                            borderColor: '#8CC342',
                                                            color: '#8CC342',
                                                            textTransform: 'none',
                                                            '&:hover': {
                                                                borderColor: '#699e31',
                                                                bgcolor: '#e6f3d8',
                                                            },
                                                        }}
                                                    >
                                                        View Profile
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Partner information not available
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Deal Timeline */}
                                    <Card sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '1.1rem' }}>
                                                Timeline
                                            </Typography>
                                            <Stack spacing={2}>
                                                {deal.dealAt && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Deal Created
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {format(new Date(deal.dealAt), 'MMM dd, yyyy HH:mm')}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {deal.agreementAt && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Agreement Signed
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {format(new Date(deal.agreementAt), 'MMM dd, yyyy HH:mm')}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {deal.finalTerms?.agreedDeadline && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Deadline
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {format(new Date(deal.finalTerms.agreedDeadline), 'MMM dd, yyyy')}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {deal.completedAt && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Completed
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {format(new Date(deal.completedAt), 'MMM dd, yyyy HH:mm')}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </Box>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
                    {/* Verify Completion Button - Only for clients when service is pending verification */}
                    {isClient && deal?.finalTerms?.serviceStatus === 'pending_verification' && (
                        <Button
                            variant="contained"
                            startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <VerifyIcon />}
                            onClick={handleVerifyCompletion}
                            disabled={verifying}
                            sx={{
                                bgcolor: '#8CC342',
                                color: 'white',
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': {
                                    bgcolor: '#699e31',
                                },
                                '&:disabled': {
                                    bgcolor: '#8CC342',
                                    opacity: 0.7,
                                },
                            }}
                        >
                            {verifying ? 'Verifying...' : 'Verify Service Completion'}
                        </Button>
                    )}
                    <Button
                        onClick={onClose}
                        sx={{
                            color: '#8CC342',
                            textTransform: 'none',
                            fontWeight: 600,
                            ml: 'auto',
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Vendor Profile Dialog */}
            {selectedUser && (
                <VendorProfileDialog
                    open={profileDialogOpen}
                    vendor={selectedUser}
                    onClose={() => {
                        setProfileDialogOpen(false);
                        setSelectedUser(null);
                    }}
                    onContact={(vendor) => {
                        console.log('Contact vendor:', vendor);
                    }}
                />
            )}
        </>
    );
};

