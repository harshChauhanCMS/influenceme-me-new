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
    Avatar,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    TextField,
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
    Campaign as CampaignIcon,
    Business as BusinessIcon,
    PendingActions as PendingIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    Visibility as ViewIcon,
    Download as DownloadIcon,
    Add as AddIcon,
    Description as DescriptionIcon,
    Chat as ChatIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import offerService from '@/services/offerService';
import { InfluencerBrandDealExtended } from '@/services/offerService';
import { IUser } from '../../../../../../shared/types/user';
import { format } from 'date-fns';
import paymentService, { PaymentData } from '@/services/paymentService';
import razorpayService from '@/services/razorpayService';
import agreementService from '@/services/agreementService';
import payoutMilestoneService, { PayoutMilestone } from '@/services/payoutMilestoneService';

export default function InfluencerDealDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const dealId = params?.dealId as string;

    const [deal, setDeal] = useState<InfluencerBrandDealExtended | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [agreementLoading, setAgreementLoading] = useState(false);
    const [agreeLoading, setAgreeLoading] = useState(false);
    const [milestones, setMilestones] = useState<PayoutMilestone[]>([]);
    const [milestonesLoading, setMilestonesLoading] = useState(false);
    const [requestDialogMilestone, setRequestDialogMilestone] = useState<PayoutMilestone | null>(null);
    const [workNote, setWorkNote] = useState('');
    const [requestSubmitting, setRequestSubmitting] = useState(false);

    useEffect(() => {
        if (dealId) {
            loadDealDetails();
        }
    }, [dealId]);

    const loadDealDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const dealData = await offerService.getDealDetails(dealId);
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
            if (result.payment && (result.payment.status === 'completed' || result.payment.status === 'paid')) {
                await loadMilestones(result.payment.paymentId);
            }
        } catch (err: any) {
            console.error('Error loading payment data:', err);
            // Don't show error if payment doesn't exist yet
        } finally {
            setPaymentLoading(false);
        }
    };

    const loadMilestones = async (paymentId: string) => {
        try {
            setMilestonesLoading(true);
            const result = await payoutMilestoneService.getMilestonesForPayment(paymentId);
            setMilestones(result);
        } catch (err: any) {
            console.error('Error loading payout milestones:', err);
        } finally {
            setMilestonesLoading(false);
        }
    };

    const handleRequestMilestoneRelease = async () => {
        if (!requestDialogMilestone) return;
        try {
            setRequestSubmitting(true);
            await payoutMilestoneService.requestMilestoneRelease(requestDialogMilestone._id, workNote);
            setRequestDialogMilestone(null);
            setWorkNote('');
            if (paymentData) await loadMilestones(paymentData.paymentId);
        } catch (err: any) {
            console.error('Error requesting milestone release:', err);
            setError(err.message || 'Failed to request milestone release');
        } finally {
            setRequestSubmitting(false);
        }
    };

    const getMilestoneStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
        switch (status) {
            case 'paid':
                return 'success';
            case 'requested':
                return 'warning';
            case 'rejected':
                return 'error';
            case 'pending':
                return 'info';
            default:
                return 'default';
        }
    };

    const handleApproveCompletion = async () => {
        if (!deal?._id) return;
        
        try {
            setActionLoading(true);
            await offerService.approveDealCompletion(deal._id);
            setApproveDialogOpen(false);
            await loadDealDetails(); // Reload to get updated status
        } catch (err: unknown) {
            console.error('Error approving completion:', err);
            setError('Failed to approve deal completion');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMakePayment = async () => {
        if (!deal?._id) return;

        try {
            setProcessingPayment(true);
            setError(null);

            // Create payment
            const paymentResponse = await paymentService.createPaymentFromInfluencerDeal(deal._id);
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
                    name: 'Infusee',
                    description: `Payment for Influencer Deal`,
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

    const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'error';
            case 'running':
                return 'primary';
            case 'completion_requested':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckIcon />;
            case 'cancelled':
                return <CancelIcon />;
            case 'running':
                return <DealIcon />;
            case 'completion_requested':
                return <PendingIcon />;
            default:
                return <DealIcon />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'cancelled':
                return 'Cancelled';
            case 'running':
                return 'Running';
            case 'completion_requested':
                return 'Pending Approval';
            default:
                return status.toUpperCase();
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

    const influencer = deal.influencerId as any;
    const brand = deal.brandId as any;
    const campaign = deal.campaign as any;
    const finalTerms = deal.finalTerms;

    return (
        <Box sx={{ backgroundColor: '#f9fafb', minHeight: '100vh', p: 3, pt: 5 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                    onClick={() => router.back()}
                    sx={{ color: '#8CC342' }}
                >
                    <BackIcon />
                </IconButton>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a1a1a', flex: 1 }}>
                    Deal Details
                </Typography>
                <Chip
                    icon={getStatusIcon(deal.status)}
                    label={getStatusLabel(deal.status)}
                    color={getStatusColor(deal.status)}
                    sx={{ fontWeight: 'bold' }}
                />
            </Box>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="md:col-span-2">
                    {/* Status Card */}
                    {deal.status === 'completion_requested' && (
                        <Card sx={{ mb: 3, bgcolor: 'warning.light', border: '2px solid', borderColor: 'warning.main' }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <PendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                            Completion Request Pending
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            The influencer has requested to mark this deal as completed. Please review and approve.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckCircleOutlineIcon />}
                                        onClick={() => setApproveDialogOpen(true)}
                                        disabled={actionLoading}
                                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                                    >
                                        {actionLoading ? 'Approving...' : 'Approve Completion'}
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* Campaign Details */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                <CampaignIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                    Campaign Information
                                </Typography>
                            </Stack>
                            
                            {campaign && (
                                <>
                                    {campaign.image && (
                                        <Box sx={{ mb: 2 }}>
                                            <img
                                                src={campaign.image}
                                                alt={campaign.name}
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '300px',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                }}
                                            />
                                        </Box>
                                    )}
                                    
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                                        {campaign.name || 'Campaign'}
                                    </Typography>
                                    
                                    {campaign.description && (
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                            {campaign.description}
                                        </Typography>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {campaign.budget && (
                                            <div>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <MoneyIcon sx={{ color: '#8CC342' }} />
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Budget
                                                        </Typography>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8CC342' }}>
                                                            ₹{campaign.budget.toLocaleString('en-IN')}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </div>
                                        )}
                                        
                                        {campaign.startDate && (
                                            <div>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <ScheduleIcon sx={{ color: '#8CC342' }} />
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Start Date
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                                            {format(new Date(campaign.startDate), 'MMM dd, yyyy')}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </div>
                                        )}
                                        
                                        {campaign.endDate && (
                                            <div>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <ScheduleIcon sx={{ color: '#8CC342' }} />
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            End Date
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                                            {format(new Date(campaign.endDate), 'MMM dd, yyyy')}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Deal Terms */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                <AssignmentIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                    Deal Terms
                                </Typography>
                            </Stack>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {finalTerms?.agreedAmount && (
                                    <div>
                                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <MoneyIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Agreed Amount
                                                    </Typography>
                                                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#8CC342' }}>
                                                        ₹{finalTerms.agreedAmount.toLocaleString('en-IN')}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </div>
                                )}

                                {finalTerms?.agreedDeadline && (
                                    <div>
                                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <ScheduleIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Deadline
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {format(new Date(finalTerms.agreedDeadline), 'MMM dd, yyyy')}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </div>
                                )}

                                {deal.dealAt && (
                                    <div>
                                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <DealIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Deal Date
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {format(new Date(deal.dealAt), 'MMM dd, yyyy')}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </div>
                                )}

                                {deal.completedAt && (
                                    <div>
                                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <CheckIcon sx={{ fontSize: 32, color: 'success.main' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Completed At
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {format(new Date(deal.completedAt), 'MMM dd, yyyy')}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Deliverables */}
                    {finalTerms?.finalDeliverables && finalTerms.finalDeliverables.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                        Deliverables
                                    </Typography>
                                </Stack>
                                
                                <List>
                                    {finalTerms.finalDeliverables.map((deliverable, index) => (
                                        <ListItem key={index}>
                                            <ListItemIcon>
                                                <CheckIcon sx={{ color: '#8CC342' }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={deliverable}
                                                primaryTypographyProps={{ fontWeight: 'medium' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    )}

                    {/* Requirements */}
                    {finalTerms?.finalRequirements && finalTerms.finalRequirements.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <AssignmentIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                        Requirements
                                    </Typography>
                                </Stack>
                                
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {finalTerms.finalRequirements.map((requirement, index) => (
                                        <Chip
                                            key={index}
                                            label={requirement}
                                            sx={{
                                                bgcolor: '#e6f3d8',
                                                color: '#699e31',
                                                fontWeight: 'medium',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    )}

                    {/* Agreement */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                <DescriptionIcon sx={{ fontSize: 28, color: '#8CC342' }} />
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    Agreement
                                </Typography>
                            </Stack>
                            {deal.agreementFile ? (
                                <Stack spacing={2}>
                                    <Button
                                        variant="outlined"
                                        href={deal.agreementFile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        startIcon={<ViewIcon />}
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
                                        View Agreement
                                    </Button>
                                    {deal.status === 'agreement-pending' && (
                                        <Button
                                            variant="contained"
                                            startIcon={agreeLoading ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
                                            disabled={agreeLoading}
                                            onClick={async () => {
                                                try {
                                                    setAgreeLoading(true);
                                                    const result = await agreementService.agreeToAgreement(dealId, 'influencer-brand');
                                                    if (result?.bothPartiesAgreed) {
                                                        await loadDealDetails();
                                                    } else {
                                                        await loadDealDetails();
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    setAgreeLoading(false);
                                                }
                                            }}
                                            sx={{
                                                textTransform: 'none',
                                                bgcolor: '#8CC342',
                                                '&:hover': { bgcolor: '#699e31' },
                                            }}
                                        >
                                            {agreeLoading ? 'Agreeing…' : 'Agree to agreement'}
                                        </Button>
                                    )}
                                </Stack>
                            ) : (
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Generate a collaboration agreement for this deal. Both parties can then view and agree to it.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={agreementLoading ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                                        disabled={agreementLoading}
                                        onClick={async () => {
                                            try {
                                                setAgreementLoading(true);
                                                await agreementService.generateAgreement(dealId, 'influencer-brand');
                                                await loadDealDetails();
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setAgreementLoading(false);
                                            }
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            bgcolor: '#8CC342',
                                            '&:hover': { bgcolor: '#699e31' },
                                        }}
                                    >
                                        {agreementLoading ? 'Creating…' : 'Create agreement'}
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment */}
                    {(deal.status === 'running' || deal.status === 'completion_requested' || deal.status === 'completed') && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                    <MoneyIcon sx={{ fontSize: 28, color: '#8CC342' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        Payment
                                    </Typography>
                                    {paymentData && (
                                        <Chip
                                            label={paymentData.status}
                                            color={paymentData.status === 'completed' ? 'success' : paymentData.status === 'failed' ? 'error' : 'warning'}
                                            size="small"
                                        />
                                    )}
                                </Stack>

                                {paymentLoading ? (
                                    <CircularProgress size={24} />
                                ) : !paymentData || paymentData.status === 'failed' ? (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {user?.role === 'brand'
                                                ? `Pay ${deal.finalTerms?.agreedAmount ? `₹${deal.finalTerms.agreedAmount.toLocaleString('en-IN')}` : 'the agreed amount'} to start this deal's payout.`
                                                : 'Waiting for the brand to make payment.'}
                                        </Typography>
                                        {user?.role === 'brand' && (
                                            <Button
                                                variant="contained"
                                                startIcon={processingPayment ? <CircularProgress size={18} color="inherit" /> : <MoneyIcon />}
                                                disabled={processingPayment}
                                                onClick={handleMakePayment}
                                                sx={{ textTransform: 'none', bgcolor: '#8CC342', '&:hover': { bgcolor: '#699e31' } }}
                                            >
                                                {processingPayment ? 'Processing…' : 'Make Payment'}
                                            </Button>
                                        )}
                                    </Box>
                                ) : paymentData.status !== 'completed' ? (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Payment is {paymentData.status}.
                                        </Typography>
                                        {user?.role === 'brand' && (
                                            <Button
                                                variant="contained"
                                                startIcon={processingPayment ? <CircularProgress size={18} color="inherit" /> : <MoneyIcon />}
                                                disabled={processingPayment}
                                                onClick={handleMakePayment}
                                                sx={{ textTransform: 'none', bgcolor: '#8CC342', '&:hover': { bgcolor: '#699e31' } }}
                                            >
                                                {processingPayment ? 'Processing…' : 'Complete Payment'}
                                            </Button>
                                        )}
                                    </Box>
                                ) : (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Payment received. The influencer is paid out in 3 milestones (30% / 30% / 40%) as work is delivered — each release is reviewed and processed by the Infusee team.
                                        </Typography>
                                        {milestonesLoading ? (
                                            <CircularProgress size={20} />
                                        ) : (
                                            <Stack spacing={1.5}>
                                                {milestones.map((m) => (
                                                    <Paper key={m._id} variant="outlined" sx={{ p: 2 }}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                                            <Box>
                                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                                    Milestone {m.milestoneNumber} — {m.percentage}%
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    ₹{m.amount.toLocaleString('en-IN')}
                                                                    {m.adminNote && m.status === 'pending' ? ` · Admin note: ${m.adminNote}` : ''}
                                                                </Typography>
                                                            </Box>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <Chip label={m.status} color={getMilestoneStatusColor(m.status)} size="small" />
                                                                {user?.role === 'influencer' && m.status === 'pending' && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onClick={() => setRequestDialogMilestone(m)}
                                                                        sx={{ textTransform: 'none', borderColor: '#8CC342', color: '#8CC342' }}
                                                                    >
                                                                        Request Release
                                                                    </Button>
                                                                )}
                                                            </Stack>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Message */}
                    {deal.message && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                                    Deal Message
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {deal.message}
                                </Typography>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Sidebar */}
                <div>
                    {/* Influencer Info */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                <PersonIcon sx={{ fontSize: 32, color: '#8CC342' }} />
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    Influencer
                                </Typography>
                            </Stack>
                            
                            {influencer && typeof influencer === 'object' ? (
                                <>
                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                        <Avatar
                                            src={influencer.profilePictureUrl}
                                            sx={{ width: 64, height: 64, bgcolor: '#8CC342' }}
                                        >
                                            {influencer.name?.charAt(0) || 'I'}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                {influencer.name || 'Influencer'}
                                            </Typography>
                                            {influencer.email && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {influencer.email}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                    {deal.roomId && (
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            startIcon={<ChatIcon />}
                                            onClick={() => router.push(`/chat?roomId=${deal.roomId}`)}
                                            sx={{
                                                textTransform: 'none',
                                                bgcolor: '#8CC342',
                                                '&:hover': { bgcolor: '#699e31' },
                                            }}
                                        >
                                            Message influencer
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Typography variant="body1" color="text.secondary">
                                        {deal.influencerName || 'Influencer'}
                                    </Typography>
                                    {deal.roomId && (
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            startIcon={<ChatIcon />}
                                            onClick={() => router.push(`/chat?roomId=${deal.roomId}`)}
                                            sx={{
                                                mt: 2,
                                                textTransform: 'none',
                                                bgcolor: '#8CC342',
                                                '&:hover': { bgcolor: '#699e31' },
                                            }}
                                        >
                                            Message influencer
                                        </Button>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Deal Status Timeline */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                                Deal Timeline
                            </Typography>
                            
                            <Stack spacing={2}>
                                {deal.dealAt && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Deal Created
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {format(new Date(deal.dealAt), 'MMM dd, yyyy • hh:mm a')}
                                        </Typography>
                                    </Box>
                                )}
                                
                                {deal.agreementAt && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Agreement Signed
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {format(new Date(deal.agreementAt), 'MMM dd, yyyy • hh:mm a')}
                                        </Typography>
                                    </Box>
                                )}
                                
                                {deal.completedAt && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Completed
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {format(new Date(deal.completedAt), 'MMM dd, yyyy • hh:mm a')}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    {deal.status === 'completion_requested' && (
                        <Card sx={{ bgcolor: 'warning.light' }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                                    Actions
                                </Typography>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    color="success"
                                    startIcon={<CheckCircleOutlineIcon />}
                                    onClick={() => setApproveDialogOpen(true)}
                                    disabled={actionLoading}
                                    sx={{ textTransform: 'none', fontWeight: 'bold', mb: 1 }}
                                >
                                    {actionLoading ? 'Approving...' : 'Approve Completion'}
                                </Button>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    Review the deal and approve completion request from influencer.
                                </Typography>
                            </CardContent>
                        </Card>
                    )}

                    {deal.status === 'running' && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                                    Deal Status
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    This deal is currently running. The influencer will request completion when ready.
                                </Typography>
                            </CardContent>
                        </Card>
                    )}

                    {deal.status === 'completed' && (
                        <Card sx={{ bgcolor: 'success.light' }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CheckIcon sx={{ fontSize: 32, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                            Deal Completed
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            This deal has been successfully completed.
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Approve Completion Dialog */}
            <Dialog
                open={approveDialogOpen}
                onClose={() => !actionLoading && setApproveDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    Approve Deal Completion
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Are you sure you want to approve this deal as completed?
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Once approved, the deal will be marked as completed and cannot be reversed.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setApproveDialogOpen(false)}
                        disabled={actionLoading}
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleApproveCompletion}
                        disabled={actionLoading}
                        startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckIcon />}
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                        {actionLoading ? 'Approving...' : 'Approve'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Request Milestone Release Dialog */}
            <Dialog
                open={!!requestDialogMilestone}
                onClose={() => !requestSubmitting && setRequestDialogMilestone(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    Request Milestone {requestDialogMilestone?.milestoneNumber} Release
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Describe the work completed for this milestone ({requestDialogMilestone?.percentage}% —
                        ₹{requestDialogMilestone?.amount.toLocaleString('en-IN')}). The Infusee team will review and process the release.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="e.g. Posted the sponsored reel and shared analytics screenshot in chat"
                        value={workNote}
                        onChange={(e) => setWorkNote(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRequestDialogMilestone(null)}
                        disabled={requestSubmitting}
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleRequestMilestoneRelease}
                        disabled={requestSubmitting || !workNote.trim()}
                        startIcon={requestSubmitting ? <CircularProgress size={16} /> : undefined}
                        sx={{ textTransform: 'none', fontWeight: 'bold', bgcolor: '#8CC342', '&:hover': { bgcolor: '#699e31' } }}
                    >
                        {requestSubmitting ? 'Submitting…' : 'Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
