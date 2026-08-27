'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Card,
    CardContent,
    Typography,
    Chip,
    Box,
    CircularProgress,
    Alert,
    Pagination,
    Button,
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
    Gavel as BidIcon,
    CheckCircle as AcceptIcon,
    Cancel as RejectIcon,
    Star as ShortlistIcon,
    Person as PersonIcon,
    Add as CreateDealIcon,
    Visibility as ViewDealIcon,
} from '@mui/icons-material';
import { InfluencerBidExtended } from '@/services/influencerBidService';
import { format } from 'date-fns';
import influencerBidService from '@/services/influencerBidService';

interface BidsListProps {
    bids: InfluencerBidExtended[];
    loading: boolean;
    error: string | null;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onBidUpdate: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'accepted':
            return 'success';
        case 'rejected':
            return 'error';
        case 'shortlisted':
            return 'info';
        case 'withdrawn':
            return 'default';
        default:
            return 'default';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'accepted':
            return <AcceptIcon fontSize="small" />;
        case 'rejected':
            return <RejectIcon fontSize="small" />;
        case 'shortlisted':
            return <ShortlistIcon fontSize="small" />;
        default:
            return <BidIcon fontSize="small" />;
    }
};

export const BidsList: React.FC<BidsListProps> = ({
    bids,
    loading,
    error,
    page,
    totalPages,
    onPageChange,
    onBidUpdate,
}) => {
    const [selectedBid, setSelectedBid] = useState<InfluencerBidExtended | null>(null);
    const [responseDialogOpen, setResponseDialogOpen] = useState(false);
    const [responseType, setResponseType] = useState<'accepted' | 'rejected' | 'shortlisted'>('accepted');
    const [responseMessage, setResponseMessage] = useState('');
    const [responding, setResponding] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [bidForDetail, setBidForDetail] = useState<InfluencerBidExtended | null>(null);
    const [creatingDeal, setCreatingDeal] = useState(false);

    const handleRespond = (bid: InfluencerBidExtended, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedBid(bid);
        setResponseDialogOpen(true);
        setResponseType('accepted');
        setResponseMessage('');
    };

    const handleSubmitResponse = async () => {
        if (!selectedBid?._id) return;

        try {
            setResponding(true);
            await influencerBidService.respondToBid(selectedBid._id, {
                responseType,
                message: responseMessage || undefined,
            });
            setResponseDialogOpen(false);
            setSelectedBid(null);
            setDetailDialogOpen(false);
            setBidForDetail(null);
            onBidUpdate();
        } catch (error) {
            console.error('Failed to respond to bid:', error);
            alert('Failed to respond to bid. Please try again.');
        } finally {
            setResponding(false);
        }
    };

    const openBidDetail = (bid: InfluencerBidExtended) => {
        setBidForDetail(bid);
        setDetailDialogOpen(true);
    };

    const handleCreateDeal = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!bidForDetail?._id) return;
        try {
            setCreatingDeal(true);
            await influencerBidService.createDealFromBid(bidForDetail._id);
            onBidUpdate();
            setBidForDetail((prev) => (prev ? { ...prev, dealId: (prev as any).dealId ?? 'created' } : null));
            setDetailDialogOpen(false);
            setBidForDetail(null);
        } catch (error) {
            console.error('Failed to create deal:', error);
            alert('Failed to create deal. Please try again.');
        } finally {
            setCreatingDeal(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    if (bids.length === 0) {
        return (
            <Alert severity="info" sx={{ mb: 2 }}>
                No bids found for this campaign.
            </Alert>
        );
    }

    const dealId = (bid: InfluencerBidExtended) => (bid as { dealId?: string }).dealId;
    const hasDeal = (bid: InfluencerBidExtended) => !!dealId(bid);

    return (
        <Box>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bids.map((bid) => (
                    <div key={bid._id}>
                        <Card
                            sx={{ cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 3 } }}
                            onClick={() => openBidDetail(bid)}
                        >
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <BidIcon color="primary" />
                                        <Typography variant="h6">
                                            Bid #{bid._id.slice(-6)}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        icon={getStatusIcon(bid.status)}
                                        label={bid.status.toUpperCase()}
                                        color={getStatusColor(bid.status) as any}
                                        size="small"
                                    />
                                </Box>

                                <Box mb={2}>
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <PersonIcon fontSize="small" color="action" />
                                        <Typography variant="body2" color="text.secondary">
                                            Influencer:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {bid.influencer?.name || 'Unknown'}
                                        </Typography>
                                    </Box>

                                    {bid.bidAmount && (
                                        <Box mb={1}>
                                            <Typography variant="body2" color="text.secondary">
                                                Bid Amount:
                                            </Typography>
                                            <Typography variant="h6" color="primary">
                                                ₹{bid.bidAmount.toLocaleString()}
                                            </Typography>
                                        </Box>
                                    )}

                                    {bid.proposedValue && (
                                        <Box mb={1}>
                                            <Typography variant="body2" color="text.secondary">
                                                Proposed Value:
                                            </Typography>
                                            <Typography variant="body2">
                                                {bid.proposedValue}
                                            </Typography>
                                        </Box>
                                    )}

                                    {bid.message && (
                                        <Box
                                            sx={{
                                                mt: 1,
                                                p: 1,
                                                bgcolor: 'action.hover',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography variant="body2">{bid.message}</Typography>
                                        </Box>
                                    )}

                                    {bid.createdAt && (
                                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                            Submitted: {format(new Date(bid.createdAt), 'MMM dd, yyyy')}
                                        </Typography>
                                    )}

                                    {bid.brandResponse && (
                                        <Box
                                            sx={{
                                                mt: 1,
                                                p: 1,
                                                bgcolor: 'success.light',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                                Your Response:
                                            </Typography>
                                            <Typography variant="body2">
                                                {bid.brandResponse.message || `Status: ${bid.brandResponse.responseType}`}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                <Box display="flex" flexDirection="column" gap={1} onClick={(e) => e.stopPropagation()}>
                                    {(bid.status === 'pending' || bid.status === 'shortlisted') && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={(e) => handleRespond(bid, e)}
                                            fullWidth
                                        >
                                            Respond to Bid
                                        </Button>
                                    )}
                                    {bid.status === 'accepted' && !hasDeal(bid) && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            startIcon={<CreateDealIcon />}
                                            onClick={(e) => { e.stopPropagation(); openBidDetail(bid); }}
                                            fullWidth
                                        >
                                            Create deal
                                        </Button>
                                    )}
                                    {bid.status === 'accepted' && hasDeal(bid) && (
                                        <Button
                                            component={Link}
                                            href={`/deals/influencer/${String(dealId(bid))}`}
                                            variant="outlined"
                                            size="small"
                                            startIcon={<ViewDealIcon />}
                                            onClick={(e) => e.stopPropagation()}
                                            fullWidth
                                        >
                                            View deal
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, value) => onPageChange(value)}
                        color="primary"
                    />
                </Box>
            )}

            {/* Bid detail dialog (clickable card) */}
            <Dialog open={detailDialogOpen} onClose={() => { setDetailDialogOpen(false); setBidForDetail(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Bid #{bidForDetail?._id?.slice(-6) ?? ''}
                    {bidForDetail && (
                        <Chip
                            icon={getStatusIcon(bidForDetail.status)}
                            label={bidForDetail.status.toUpperCase()}
                            color={getStatusColor(bidForDetail.status) as any}
                            size="small"
                            sx={{ ml: 1 }}
                        />
                    )}
                </DialogTitle>
                <DialogContent>
                    {bidForDetail && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Influencer: <strong>{bidForDetail.influencer?.name || 'Unknown'}</strong>
                            </Typography>
                            {bidForDetail.bidAmount != null && (
                                <Typography variant="body1" gutterBottom>Bid amount: ₹{bidForDetail.bidAmount.toLocaleString()}</Typography>
                            )}
                            {bidForDetail.proposedValue && (
                                <Typography variant="body2" gutterBottom>Proposed value: {bidForDetail.proposedValue}</Typography>
                            )}
                            {bidForDetail.message && (
                                <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body2">{bidForDetail.message}</Typography>
                                </Box>
                            )}
                            {bidForDetail.createdAt && (
                                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                    Submitted: {format(new Date(bidForDetail.createdAt), 'MMM dd, yyyy')}
                                </Typography>
                            )}
                            {bidForDetail.brandResponse && (
                                <Box sx={{ mt: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Your response: </Typography>
                                    <Typography variant="body2">{bidForDetail.brandResponse.message || bidForDetail.brandResponse.responseType}</Typography>
                                </Box>
                            )}
                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {(bidForDetail.status === 'pending' || bidForDetail.status === 'shortlisted') && (
                                    <Button variant="contained" onClick={() => { setDetailDialogOpen(false); handleRespond(bidForDetail); }}>
                                        Respond to Bid
                                    </Button>
                                )}
                                {bidForDetail.status === 'accepted' && !hasDeal(bidForDetail) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={creatingDeal ? <CircularProgress size={18} /> : <CreateDealIcon />}
                                        disabled={creatingDeal}
                                        onClick={handleCreateDeal}
                                    >
                                        {creatingDeal ? 'Creating…' : 'Create deal'}
                                    </Button>
                                )}
                                {bidForDetail.status === 'accepted' && hasDeal(bidForDetail) && (
                                    <Button component={Link} href={`/deals/influencer/${String(dealId(bidForDetail))}`} variant="outlined" startIcon={<ViewDealIcon />}>
                                        View deal
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Response Dialog */}
            <Dialog open={responseDialogOpen} onClose={() => setResponseDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Respond to Bid</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
                        <InputLabel>Response Type</InputLabel>
                        <Select
                            value={responseType}
                            onChange={(e) => setResponseType(e.target.value as any)}
                            label="Response Type"
                        >
                            <MenuItem value="accepted">Accept</MenuItem>
                            <MenuItem value="rejected">Reject</MenuItem>
                            <MenuItem value="shortlisted">Shortlist</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message (Optional)"
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Add a message to the influencer..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResponseDialogOpen(false)} disabled={responding}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmitResponse} variant="contained" disabled={responding}>
                        {responding ? <CircularProgress size={20} /> : 'Submit Response'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

