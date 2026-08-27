'use client';

import React from 'react';
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
} from '@mui/material';
import {
    LocalOffer as OfferIcon,
    CheckCircle as AcceptIcon,
    Cancel as DeclineIcon,
    SwapHoriz as NegotiateIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { InfluencerOfferExtended } from '@/services/offerService';
import { format } from 'date-fns';

interface OffersListProps {
    offers: InfluencerOfferExtended[];
    loading: boolean;
    error: string | null;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onRefresh?: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'accepted':
            return 'success';
        case 'declined':
            return 'error';
        case 'negotiated':
            return 'info';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'default';
        default:
            return 'default';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'accepted':
            return <AcceptIcon fontSize="small" />;
        case 'declined':
            return <DeclineIcon fontSize="small" />;
        case 'negotiated':
            return <NegotiateIcon fontSize="small" />;
        default:
            return <OfferIcon fontSize="small" />;
    }
};

export const OffersList: React.FC<OffersListProps> = ({
    offers,
    loading,
    error,
    page,
    totalPages,
    onPageChange,
}) => {
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

    if (offers.length === 0) {
        return (
            <Alert severity="info" sx={{ mb: 2 }}>
                No offers found for this campaign.
            </Alert>
        );
    }

    return (
        <Box>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offers.map((offer) => (
                    <div key={offer._id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <OfferIcon color="primary" />
                                        <Typography variant="h6">
                                            Offer #{offer._id.slice(-6)}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        icon={getStatusIcon(offer.status)}
                                        label={offer.status.toUpperCase()}
                                        color={getStatusColor(offer.status) as any}
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
                                            {offer.influencerName || 'Unknown'}
                                        </Typography>
                                    </Box>

                                    {offer.campaign && (
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <Typography variant="body2" color="text.secondary">
                                                Campaign:
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {offer.campaign.name}
                                            </Typography>
                                        </Box>
                                    )}

                                    {offer.createdAt && (
                                        <Typography variant="caption" color="text.secondary">
                                            Sent: {format(new Date(offer.createdAt), 'MMM dd, yyyy')}
                                        </Typography>
                                    )}
                                </Box>

                                {offer.response && (
                                    <Box
                                        sx={{
                                            mt: 2,
                                            p: 1.5,
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                            Response:
                                        </Typography>
                                        <Typography variant="body2">
                                            {offer.response.message || `Status: ${offer.response.responseType}`}
                                        </Typography>
                                    </Box>
                                )}
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
        </Box>
    );
};

