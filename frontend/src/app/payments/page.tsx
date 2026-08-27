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
    Stack,
    Tabs,
    Tab,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Pagination,
    Tooltip,
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    CheckCircle as CheckIcon,
    Pending as PendingIcon,
    Cancel as CancelIcon,
    FilterList as FilterIcon,
    Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import paymentService, { PaymentData } from '@/services/paymentService';
import razorpayService from '@/services/razorpayService';
import { format } from 'date-fns';

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
            id={`payment-tabpanel-${index}`}
            aria-labelledby={`payment-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function PaymentsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState(0); // 0: All, 1: Influencer, 2: Vendor
    const [statusFilter, setStatusFilter] = useState<string>('all'); // all, pending, completed, failed

    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [processingPayment, setProcessingPayment] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && user) {
            loadPayments();
        }
    }, [mounted, user, activeTab, statusFilter, page]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            setError(null);

            const paymentType = activeTab === 1 ? 'brand_to_influencer' : activeTab === 2 ? 'brand_to_vendor' : undefined;
            const status = statusFilter !== 'all' ? statusFilter : undefined;

            const response = await paymentService.getUserPayments({
                page,
                limit: 20,
                status,
                paymentType,
            });

            setPayments(response.payments);
            setTotalPages(response.totalPages);
            setTotal(response.total);
        } catch (err: any) {
            console.error('Error loading payments:', err);
            setError(err.message || 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setPage(1);
    };

    const handleStatusFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        setPage(1);
    };

    const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
        switch (status.toLowerCase()) {
            case 'completed':
            case 'paid':
                return 'success';
            case 'pending':
            case 'processing':
                return 'warning';
            case 'failed':
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
            case 'paid':
                return <CheckIcon />;
            case 'pending':
            case 'processing':
                return <PendingIcon />;
            case 'failed':
            case 'cancelled':
                return <CancelIcon />;
            default:
                return <MoneyIcon />;
        }
    };

    const handleViewDetails = (payment: PaymentData) => {
        setSelectedPayment(payment);
        setDetailsDialogOpen(true);
    };

    const handleMakePayment = async (payment: PaymentData) => {
        if (!payment.dealId) {
            setError('Deal ID not found for this payment');
            return;
        }

        try {
            setProcessingPayment(payment.paymentId);
            setError(null);

            // Get payment settings
            const settings = await razorpayService.getPaymentSettings();

            // Create Razorpay order
            const orderResponse = await razorpayService.createOrder(
                payment.totalAmount,
                payment.currency,
                payment.paymentId,
                {
                    paymentId: payment.paymentId,
                    dealId: payment.dealId,
                }
            );

            if (!orderResponse.data?.orderId) {
                throw new Error('Failed to create payment order');
            }

            // Initialize Razorpay checkout
            await razorpayService.initializeCheckout(
                orderResponse.data.orderId,
                payment.totalAmount,
                payment.currency,
                settings.razorpayKeyId,
                {
                    name: 'InfluenceMe',
                    description: `Payment for ${payment.paymentType === 'brand_to_influencer' ? 'Influencer' : 'Vendor'} Deal`,
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
                            // Reload payments
                            await loadPayments();
                            setProcessingPayment(null);
                        } catch (err: any) {
                            console.error('Payment verification failed:', err);
                            setError(err.message || 'Payment verification failed');
                            setProcessingPayment(null);
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            setProcessingPayment(null);
                        },
                    },
                }
            );
        } catch (err: any) {
            console.error('Error initiating payment:', err);
            setError(err.message || 'Failed to initiate payment');
            setProcessingPayment(null);
        }
    };

    const handleDownloadInvoice = async (payment: PaymentData) => {
        try {
            if (!payment.invoiceId) {
                // Generate invoice first
                const invoice = await paymentService.generateInvoiceForPayment(payment.paymentId);
                payment.invoiceId = invoice.invoiceId;
            }

            const pdfUrl = await paymentService.getInvoicePDF(payment.invoiceId!);
            window.open(pdfUrl, '_blank');
        } catch (err: any) {
            console.error('Error downloading invoice:', err);
            setError(err.message || 'Failed to download invoice');
        }
    };

    const handleViewDeal = (payment: PaymentData) => {
        if (!payment.dealId) return;

        if (payment.paymentType === 'brand_to_influencer') {
            router.push(`/deals/influencer/${payment.dealId}`);
        } else if (payment.paymentType === 'brand_to_vendor') {
            router.push(`/deals/vendor/${payment.dealId}`);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <MoneyIcon sx={{ fontSize: 40, color: '#8CC342' }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Payments
                </Typography>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <FilterIcon />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Filters
                        </Typography>
                    </Stack>

                    <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                        <Tab label="All Payments" />
                        <Tab label="Influencer Payments" />
                        <Tab label="Vendor Payments" />
                    </Tabs>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                            label="All"
                            onClick={() => handleStatusFilterChange('all')}
                            color={statusFilter === 'all' ? 'primary' : 'default'}
                            sx={{ bgcolor: statusFilter === 'all' ? '#8CC342' : undefined, color: statusFilter === 'all' ? 'white' : undefined }}
                        />
                        <Chip
                            label="Pending"
                            onClick={() => handleStatusFilterChange('pending')}
                            color={statusFilter === 'pending' ? 'warning' : 'default'}
                        />
                        <Chip
                            label="Completed"
                            onClick={() => handleStatusFilterChange('completed')}
                            color={statusFilter === 'completed' ? 'success' : 'default'}
                        />
                        <Chip
                            label="Failed"
                            onClick={() => handleStatusFilterChange('failed')}
                            color={statusFilter === 'failed' ? 'error' : 'default'}
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Payments List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <CircularProgress sx={{ color: '#8CC342' }} />
                </Box>
            ) : payments.length === 0 ? (
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary" align="center" sx={{ py: 4 }}>
                            No payments found
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Payment ID</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.paymentId} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {payment.paymentId}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={payment.paymentType === 'brand_to_influencer' ? 'Influencer' : 'Vendor'}
                                                size="small"
                                                sx={{
                                                    bgcolor: payment.paymentType === 'brand_to_influencer' ? '#e3f2fd' : '#fff3e0',
                                                    color: payment.paymentType === 'brand_to_influencer' ? '#1976d2' : '#f57c00',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                ₹{payment.totalAmount.toLocaleString('en-IN')}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Service: ₹{payment.amount.toLocaleString('en-IN')} + Tax: ₹{payment.taxAmount.toLocaleString('en-IN')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(payment.status)}
                                                label={payment.status}
                                                color={getStatusColor(payment.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {format(new Date(payment.createdAt), 'hh:mm a')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewDetails(payment)}
                                                        sx={{ color: '#8CC342' }}
                                                    >
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {payment.status === 'pending' && (
                                                    <Tooltip title="Make Payment">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleMakePayment(payment)}
                                                            disabled={processingPayment === payment.paymentId}
                                                            sx={{ color: '#8CC342' }}
                                                        >
                                                            {processingPayment === payment.paymentId ? (
                                                                <CircularProgress size={16} />
                                                            ) : (
                                                                <MoneyIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {(payment.status === 'completed' || payment.status === 'paid') && (
                                                    <Tooltip title="Download Invoice">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDownloadInvoice(payment)}
                                                            sx={{ color: '#8CC342' }}
                                                        >
                                                            <DownloadIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {payment.dealId && (
                                                    <Tooltip title="View Deal">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDeal(payment)}
                                                            sx={{ color: '#8CC342' }}
                                                        >
                                                            <ReceiptIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_event, value) => setPage(value)}
                                color="primary"
                                sx={{
                                    '& .MuiPaginationItem-root.Mui-selected': {
                                        bgcolor: '#8CC342',
                                        color: 'white',
                                    },
                                }}
                            />
                        </Box>
                    )}
                </>
            )}

            {/* Payment Details Dialog */}
            <Dialog
                open={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    Payment Details
                </DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Payment ID
                                </Typography>
                                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {selectedPayment.paymentId}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Type
                                </Typography>
                                <Typography variant="body1">
                                    {selectedPayment.paymentType === 'brand_to_influencer' ? 'Brand to Influencer' : 'Brand to Vendor'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Service Charge
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    ₹{selectedPayment.amount.toLocaleString('en-IN')}
                                </Typography>
                            </Box>

                            {selectedPayment.taxAmount > 0 && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Tax (GST)
                                    </Typography>
                                    <Typography variant="body1">
                                        ₹{selectedPayment.taxAmount.toLocaleString('en-IN')}
                                        {selectedPayment.taxBreakdown && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                {selectedPayment.taxBreakdown.cgst && `CGST: ${selectedPayment.taxBreakdown.cgst}%`}
                                                {selectedPayment.taxBreakdown.sgst && ` SGST: ${selectedPayment.taxBreakdown.sgst}%`}
                                                {selectedPayment.taxBreakdown.igst && ` IGST: ${selectedPayment.taxBreakdown.igst}%`}
                                            </Typography>
                                        )}
                                    </Typography>
                                </Box>
                            )}

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Total Amount
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8CC342' }}>
                                    ₹{selectedPayment.totalAmount.toLocaleString('en-IN')}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Status
                                </Typography>
                                <Chip
                                    icon={getStatusIcon(selectedPayment.status)}
                                    label={selectedPayment.status}
                                    color={getStatusColor(selectedPayment.status)}
                                    sx={{ mt: 0.5 }}
                                />
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Payment Method
                                </Typography>
                                <Typography variant="body1">
                                    {selectedPayment.paymentMethod}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Created At
                                </Typography>
                                <Typography variant="body1">
                                    {format(new Date(selectedPayment.createdAt), 'MMM dd, yyyy • hh:mm a')}
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    {selectedPayment && (selectedPayment.status === 'completed' || selectedPayment.status === 'paid') && (
                        <Button
                            startIcon={<DownloadIcon />}
                            onClick={() => {
                                handleDownloadInvoice(selectedPayment);
                                setDetailsDialogOpen(false);
                            }}
                            sx={{ color: '#8CC342' }}
                        >
                            Download Invoice
                        </Button>
                    )}
                    {selectedPayment?.dealId && (
                        <Button
                            startIcon={<ReceiptIcon />}
                            onClick={() => {
                                handleViewDeal(selectedPayment);
                                setDetailsDialogOpen(false);
                            }}
                            sx={{ color: '#8CC342' }}
                        >
                            View Deal
                        </Button>
                    )}
                    <Button onClick={() => setDetailsDialogOpen(false)} sx={{ textTransform: 'none' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
