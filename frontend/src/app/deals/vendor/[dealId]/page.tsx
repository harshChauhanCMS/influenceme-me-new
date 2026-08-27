'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Divider,
    Stack,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Handshake as DealIcon,
    Person as PersonIcon,
    CheckCircle as CheckIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    AttachMoney as MoneyIcon,
    Assignment as AssignmentIcon,
    Visibility as ViewIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import vendorDealService from '@/services/vendorDealService';
import { IVendorBrandDeal } from '../../../../../../shared/types/vendorBrandDeal';
import { IUser } from '../../../../../../shared/types/user';
import { format } from 'date-fns';
import { VendorProfileDialog } from '@/components/vendors/VendorProfileDialog';
import paymentService, { PaymentData } from '@/services/paymentService';
import razorpayService from '@/services/razorpayService';

export default function VendorDealDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const dealId = params?.dealId as string;

    const [deal, setDeal] = useState<IVendorBrandDeal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Vendor/Brand Profile Dialog
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

    // Payment state
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    const isVendor = user?.role === 'vendor';

    useEffect(() => {
        if (dealId) {
            loadDealDetails();
        }
    }, [dealId]);

    const loadDealDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const dealData = await vendorDealService.getDealDetails(dealId);
            setDeal(dealData);
            // Load payment data
            await loadPaymentData();
        } catch (err: unknown) {
            console.error('Error loading deal details:', err);
            setError('Failed to load deal details');
        } finally {
            setLoading(false);
        }
    };

    const loadPaymentData = async () => {
        try {
            setPaymentLoading(true);
            const result = await paymentService.getDealPaymentAndInvoice(dealId);
            setPaymentData(result.payment);
        } catch (err: any) {
            console.error('Error loading payment data:', err);
            // Don't show error if payment doesn't exist yet
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleMakePayment = async () => {
        if (!deal?._id) return;

        try {
            setProcessingPayment(true);
            setError(null);

            // Create payment
            const paymentResponse = await paymentService.createPaymentFromVendorDeal(deal._id);
            setPaymentData(paymentResponse.payment);

            if (!paymentResponse.razorpay?.orderId) {
                throw new Error('Failed to create payment order');
            }

            // Get payment settings
            const settings = await razorpayService.getPaymentSettings();

            // Initialize Razorpay checkout
            await razorpayService.initializeCheckout(
                paymentResponse.razorpay.orderId,
                paymentResponse.razorpay.amount,
                paymentResponse.razorpay.currency,
                settings.razorpayKeyId,
                {
                    name: 'InfluenceMe',
                    description: `Payment for Vendor Deal`,
                    prefill: {
                        name: user?.name || '',
                        email: user?.email || '',
                        contact: user?.phone || '',
                    },
                    theme: {
                        color: '#8CC342',
                    },
                    handler: async (response: any) => {
                        try {
                            // Verify payment
                            await paymentService.verifyPayment(
                                response.razorpay_payment_id,
                                response.razorpay_order_id,
                                response.razorpay_signature
                            );
                            // Reload payment data
                            await loadPaymentData();
                            setProcessingPayment(false);
                        } catch (err: any) {
                            console.error('Payment verification failed:', err);
                            setError(err.message || 'Payment verification failed');
                            setProcessingPayment(false);
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            setProcessingPayment(false);
                        },
                    },
                }
            );
        } catch (err: any) {
            console.error('Error initiating payment:', err);
            setError(err.message || 'Failed to initiate payment');
            setProcessingPayment(false);
        }
    };

    const handleViewProfile = (userId: string | any) => {
        if (userId && typeof userId === 'object') {
            setSelectedUser(userId as IUser);
            setProfileDialogOpen(true);
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

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress sx={{ color: '#8CC342' }} />
            </Box>
        );
    }

    if (error || !deal) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error || 'Deal not found'}
                </Alert>
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => router.back()}
                    sx={{ color: '#8CC342' }}
                >
                    Go Back
                </Button>
            </Box>
        );
    }

    const requirement = deal.requirementId as any;
    const vendor = isVendor ? null : (deal.vendorId as any);
    const brand = isVendor ? (deal.brandId as any) : null;
    const finalTerms = deal.finalTerms;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => router.back()} sx={{ color: '#8CC342' }}>
                    <BackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                        Deal Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View and manage your vendor deal
                    </Typography>
                </Box>
                <Chip
                    label={deal.status}
                    color={getStatusColor(deal.status)}
                    sx={{ fontWeight: 600 }}
                />
            </Box>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="md:col-span-2">
                    {/* Requirement Info */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Requirement Information
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                {requirement?.title || 'Requirement'}
                            </Typography>
                            {requirement?.category && (
                                <Chip
                                    label={requirement.category}
                                    size="small"
                                    sx={{ mb: 2 }}
                                />
                            )}
                            {requirement?.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {requirement.description}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Final Terms */}
                    {finalTerms && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                    Final Terms
                                </Typography>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Agreed Amount */}
                                    {finalTerms.agreedAmount !== undefined && (
                                        <div>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <MoneyIcon sx={{ color: '#8CC342' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Agreed Amount
                                                </Typography>
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {finalTerms.currency || 'INR'} {finalTerms.agreedAmount.toLocaleString()}
                                            </Typography>
                                        </div>
                                    )}

                                    {/* Delivery Time */}
                                    {finalTerms.deliveryTime && (
                                        <div>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <ScheduleIcon sx={{ color: '#8CC342' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Delivery Time
                                                </Typography>
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {finalTerms.deliveryTime}
                                            </Typography>
                                        </div>
                                    )}

                                    {/* Service Status */}
                                    {finalTerms.serviceStatus && (
                                        <div>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <AssignmentIcon sx={{ color: '#8CC342' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Service Status
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={finalTerms.serviceStatus.replace('_', ' ')}
                                                color={getServiceStatusColor(finalTerms.serviceStatus)}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </div>
                                    )}

                                    {/* Payment Status */}
                                    {finalTerms.paymentStatus && (
                                        <div>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <MoneyIcon sx={{ color: '#8CC342' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Payment Status
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={finalTerms.paymentStatus}
                                                color={getPaymentStatusColor(finalTerms.paymentStatus)}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <Divider sx={{ my: 2 }} />

                                {/* Requirements */}
                                {finalTerms.finalRequirements && finalTerms.finalRequirements.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Requirements
                                        </Typography>
                                        <Stack spacing={1}>
                                            {finalTerms.finalRequirements.map((req, index) => (
                                                <Box key={index} sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                                                    <CheckIcon sx={{ color: '#8CC342', fontSize: 20, mt: 0.5 }} />
                                                    <Typography variant="body2">{req}</Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {/* Deliverables */}
                                {finalTerms.finalDeliverables && finalTerms.finalDeliverables.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Deliverables
                                        </Typography>
                                        <Stack spacing={1}>
                                            {finalTerms.finalDeliverables.map((del, index) => (
                                                <Box key={index} sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                                                    <AssignmentIcon sx={{ color: '#8CC342', fontSize: 20, mt: 0.5 }} />
                                                    <Typography variant="body2">{del}</Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {/* Negotiated Terms */}
                                {(finalTerms.deliveryTime || 
                                  finalTerms.includesRevisions || 
                                  (finalTerms.additionalServices && finalTerms.additionalServices.length > 0) ||
                                  finalTerms.description) && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Negotiated Terms
                                        </Typography>

                                        {/* Revisions */}
                                        {finalTerms.includesRevisions && (
                                            <Box sx={{ mb: 1 }}>
                                                <Typography variant="body2">
                                                    <strong>Revisions:</strong> {finalTerms.numberOfRevisions || 'Unlimited'} revision(s) included
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Additional Services */}
                                        {finalTerms.additionalServices && finalTerms.additionalServices.length > 0 && (
                                            <Box sx={{ mb: 1 }}>
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>Additional Services:</strong>
                                                </Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    {finalTerms.additionalServices.map((service, index) => (
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
                                        {finalTerms.description && (
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="body2">
                                                    <strong>Scope of Work:</strong>
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {finalTerms.description}
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
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    Deal Message
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {deal.message}
                                </Typography>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Partner Info & Actions */}
                <div>
                    {/* Partner Information */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                {isVendor ? 'Client Information' : 'Vendor Information'}
                            </Typography>
                            {isVendor && brand ? (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <PersonIcon sx={{ fontSize: 40, color: '#8CC342' }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {brand.name || brand.businessInfo?.businessName || 'Unknown Client'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {brand.role === 'brand' ? 'Brand' : 'Influencer'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<ViewIcon />}
                                        onClick={() => handleViewProfile(brand)}
                                        sx={{
                                            borderColor: '#8CC342',
                                            color: '#8CC342',
                                            '&:hover': {
                                                borderColor: '#699e31',
                                                bgcolor: '#e6f3d8',
                                            },
                                        }}
                                    >
                                        View Profile
                                    </Button>
                                </Box>
                            ) : vendor ? (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <PersonIcon sx={{ fontSize: 40, color: '#8CC342' }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {vendor.vendorInfo?.businessName || vendor.name || 'Unknown Vendor'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {vendor.vendorInfo?.vendorType || 'Vendor'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<ViewIcon />}
                                        onClick={() => handleViewProfile(vendor)}
                                        sx={{
                                            borderColor: '#8CC342',
                                            color: '#8CC342',
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

                    {/* Payment Section */}
                    {(deal.status === 'running' || deal.status === 'completed') && !isVendor && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <MoneyIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        Payment
                                    </Typography>
                                </Stack>

                                {paymentLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : paymentData ? (
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Payment Status
                                            </Typography>
                                            <Chip
                                                icon={getStatusIcon(paymentData.status)}
                                                label={paymentData.status}
                                                color={getStatusColor(paymentData.status)}
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Total Amount
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8CC342' }}>
                                                ₹{paymentData.totalAmount.toLocaleString('en-IN')}
                                            </Typography>
                                        </Box>
                                        {paymentData.status === 'pending' && (
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                startIcon={<MoneyIcon />}
                                                onClick={handleMakePayment}
                                                disabled={processingPayment}
                                                sx={{
                                                    bgcolor: '#8CC342',
                                                    textTransform: 'none',
                                                    fontWeight: 'bold',
                                                    '&:hover': { bgcolor: '#699e31' },
                                                }}
                                            >
                                                {processingPayment ? 'Processing...' : 'Make Payment'}
                                            </Button>
                                        )}
                                        {(paymentData.status === 'completed' || paymentData.status === 'paid') && paymentData.invoiceId && (
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                startIcon={<DownloadIcon />}
                                                onClick={async () => {
                                                    try {
                                                        const pdfUrl = await paymentService.getInvoicePDF(paymentData.invoiceId!);
                                                        window.open(pdfUrl, '_blank');
                                                    } catch (err: any) {
                                                        setError(err.message || 'Failed to download invoice');
                                                    }
                                                }}
                                                sx={{
                                                    borderColor: '#8CC342',
                                                    color: '#8CC342',
                                                    textTransform: 'none',
                                                    '&:hover': { borderColor: '#699e31', bgcolor: '#e6f3d8' },
                                                }}
                                            >
                                                Download Invoice
                                            </Button>
                                        )}
                                    </Stack>
                                ) : (
                                    <Stack spacing={2}>
                                        <Typography variant="body2" color="text.secondary">
                                            No payment record found. Click below to initiate payment.
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            startIcon={<MoneyIcon />}
                                            onClick={handleMakePayment}
                                            disabled={processingPayment}
                                            sx={{
                                                bgcolor: '#8CC342',
                                                textTransform: 'none',
                                                fontWeight: 'bold',
                                                '&:hover': { bgcolor: '#699e31' },
                                            }}
                                        >
                                            {processingPayment ? 'Processing...' : 'Make Payment'}
                                        </Button>
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Deal Timeline */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
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
                                {finalTerms?.agreedDeadline && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Deadline
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {format(new Date(finalTerms.agreedDeadline), 'MMM dd, yyyy')}
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

            {/* Vendor Profile Dialog */}
            {selectedUser && (
                <VendorProfileDialog
                    open={profileDialogOpen}
                    vendor={selectedUser}
                    onClose={() => {
                        setProfileDialogOpen(false);
                        setSelectedUser(null);
                    }}
                />
            )}
        </Box>
    );
}



