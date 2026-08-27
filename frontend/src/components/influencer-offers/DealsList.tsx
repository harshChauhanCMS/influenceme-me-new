'use client';

import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Chip,
    Box,
    Avatar,
    CircularProgress,
    Alert,
    Pagination,
    Button,
} from '@mui/material';
import {
    Handshake as DealIcon,
    CheckCircle as CompletedIcon,
    PlayArrow as RunningIcon,
    HourglassEmpty as PendingIcon,
    Cancel as CancelledIcon,
    Person as PersonIcon,
    Campaign as CampaignIcon,
    AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { InfluencerBrandDealExtended } from '@/services/offerService';
import { format } from 'date-fns';
import { DealDetailsDialog } from './DealDetailsDialog';

interface DealsListProps {
    deals: InfluencerBrandDealExtended[];
    loading: boolean;
    error: string | null;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onRefresh?: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'running':
            return 'primary';
        case 'completion_requested':
            return 'warning';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'error';
        default:
            return 'default';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'running':
            return <RunningIcon fontSize="small" />;
        case 'completion_requested':
            return <PendingIcon fontSize="small" />;
        case 'completed':
            return <CompletedIcon fontSize="small" />;
        case 'cancelled':
            return <CancelledIcon fontSize="small" />;
        default:
            return <DealIcon fontSize="small" />;
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'running':
            return 'RUNNING';
        case 'completion_requested':
            return 'COMPLETION REQUESTED';
        case 'completed':
            return 'COMPLETED';
        case 'cancelled':
            return 'CANCELLED';
        default:
            return status.toUpperCase();
    }
};

export const DealsList: React.FC<DealsListProps> = ({
    deals,
    loading,
    error,
    page,
    totalPages,
    onPageChange,
    onRefresh,
}) => {
    const [selectedDeal, setSelectedDeal] = useState<InfluencerBrandDealExtended | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleViewDeal = (deal: InfluencerBrandDealExtended) => {
        setSelectedDeal(deal);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedDeal(null);
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

    if (deals.length === 0) {
        return (
            <Alert severity="info" sx={{ mb: 2 }}>
                No deals found for this campaign.
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Deals are created when offers are accepted or bids are approved.
                </Typography>
            </Alert>
        );
    }

    return (
        <Box>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((deal) => (
                    <div key={deal._id}>
                        <Card>
                            <CardContent>
                                {/* Header with Status */}
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <DealIcon color="primary" />
                                        <Typography variant="h6">
                                            Deal #{String(deal._id).slice(-6)}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        icon={getStatusIcon(deal.status)}
                                        label={getStatusLabel(deal.status)}
                                        color={getStatusColor(deal.status) as any}
                                        size="small"
                                    />
                                </Box>

                                {/* Deal Details */}
                                <Box mb={2}>
                                    {/* Influencer Info */}
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        {deal.influencerProfilePictureUrl ? (
                                            <Avatar 
                                                src={deal.influencerProfilePictureUrl} 
                                                sx={{ width: 24, height: 24 }}
                                            />
                                        ) : (
                                            <PersonIcon fontSize="small" color="action" />
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            Influencer:
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {deal.influencerName || 'Unknown'}
                                        </Typography>
                                    </Box>

                                    {/* Campaign Info */}
                                    {deal.campaignName && (
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <CampaignIcon fontSize="small" color="action" />
                                            <Typography variant="body2" color="text.secondary">
                                                Campaign:
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {deal.campaignName}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Agreed Amount */}
                                    {deal.agreedAmount && (
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <MoneyIcon fontSize="small" color="action" />
                                            <Typography variant="body2" color="text.secondary">
                                                Amount:
                                            </Typography>
                                            <Typography variant="h6" color="primary">
                                                ₹{deal.agreedAmount.toLocaleString()}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Deal Date */}
                                    {deal.dealAt && (
                                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                            Deal created: {format(new Date(deal.dealAt), 'MMM dd, yyyy')}
                                        </Typography>
                                    )}

                                    {/* Deadline */}
                                    {deal.finalTerms?.agreedDeadline && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Deadline: {format(new Date(deal.finalTerms.agreedDeadline), 'MMM dd, yyyy')}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Deliverables Preview */}
                                {deal.finalTerms?.finalDeliverables && deal.finalTerms.finalDeliverables.length > 0 && (
                                    <Box
                                        sx={{
                                            mt: 2,
                                            p: 1.5,
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                            Deliverables:
                                        </Typography>
                                        <Typography variant="body2">
                                            {deal.finalTerms.finalDeliverables.slice(0, 2).join(', ')}
                                            {deal.finalTerms.finalDeliverables.length > 2 && ` +${deal.finalTerms.finalDeliverables.length - 2} more`}
                                        </Typography>
                                    </Box>
                                )}

                                {/* View Deal Button */}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleViewDeal(deal)}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                >
                                    View Deal Details
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Pagination */}
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

            {/* Deal Details Dialog */}
            <DealDetailsDialog
                open={dialogOpen}
                deal={selectedDeal}
                onClose={handleCloseDialog}
                onDealUpdated={onRefresh}
            />
        </Box>
    );
};

