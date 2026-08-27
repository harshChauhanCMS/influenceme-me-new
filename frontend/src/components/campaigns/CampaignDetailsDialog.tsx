// components/campaigns/CampaignDetailsDialog.tsx
'use client';

import React, { FC } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Chip,
    Divider,
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Send as SendIcon,
    Gavel as GavelIcon,
} from '@mui/icons-material';
import { CampaignType } from '../../../../shared/enums/enums';
import { ICampaign } from '../../../../shared/types/campaign';
import { CampaignStatus } from '../../../../shared/enums/enums';

interface CampaignDetailsDialogProps {
    open: boolean;
    campaign: ICampaign | null;
    onClose: () => void;
    onApply?: () => void; // For influencers to apply/bid
    showApplyButton?: boolean; // Whether to show Apply/Bid button
}

const getStatusColor = (status: CampaignStatus): 'success' | 'info' | 'warning' | 'default' => {
    const colors: Record<CampaignStatus, 'success' | 'info' | 'warning' | 'default'> = {
        [CampaignStatus.ACTIVE]: 'success',
        [CampaignStatus.UPCOMING]: 'info',
        [CampaignStatus.PAUSED]: 'warning',
        [CampaignStatus.DRAFT]: 'default',
        [CampaignStatus.COMPLETED]: 'default',
    };
    return colors[status] || 'default';
};

export const CampaignDetailsDialog: FC<CampaignDetailsDialogProps> = ({
                                                                          open,
                                                                          campaign,
                                                                          onClose,
                                                                          onApply,
                                                                          showApplyButton = false,
                                                                      }) => {
    if (!campaign) return null;

    const isAuction = campaign.type === CampaignType.AUCTION;

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Campaign Details</DialogTitle>

            <DialogContent>
                <Box sx={{ pt: 2 }}>
                    {/* Campaign Image */}
                    {campaign.image && (
                        <Box
                            component="img"
                            src={campaign.image}
                            alt={campaign.name}
                            sx={{
                                width: '100%',
                                height: 300,
                                objectFit: 'cover',
                                borderRadius: 2,
                                mb: 3,
                            }}
                        />
                    )}

                    {/* Campaign Name and Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" component="h2">
                            {campaign.name}
                        </Typography>
                        <Chip label={campaign.status} color={getStatusColor(campaign.status)} />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Campaign Basic Info */}
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
                        gap: 3,
                        mb: 3 
                    }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Campaign Type
                            </Typography>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                {campaign.type}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Compensation Type
                            </Typography>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                {campaign.compensationType}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Start Date
                            </Typography>
                            <Typography variant="body1">{formatDate(campaign.startDate)}</Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                End Date
                            </Typography>
                            <Typography variant="body1">{formatDate(campaign.endDate)}</Typography>
                        </Box>

                        {campaign.budget && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Budget
                                </Typography>
                                <Typography variant="body1">
                                    ₹{campaign.budget.toLocaleString('en-IN')}
                                </Typography>
                            </Box>
                        )}

                        {campaign.minBid && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Minimum Bid
                                </Typography>
                                <Typography variant="body1">
                                    ₹{campaign.minBid.toLocaleString('en-IN')}
                                </Typography>
                            </Box>
                        )}

                        {campaign.targetEngagement && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Target Engagement
                                </Typography>
                                <Typography variant="body1">
                                    {campaign.targetEngagement.toLocaleString('en-IN')}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Description */}
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Description
                    </Typography>
                    <Typography variant="body1" paragraph>
                        {campaign.description || 'No description provided'}
                    </Typography>

                    {/* Barter Details */}
                    {campaign.barterDetails && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Barter Details
                            </Typography>
                            <Typography variant="body1" paragraph>
                                {campaign.barterDetails}
                            </Typography>
                        </>
                    )}

                    {/* Deliverables */}
                    {campaign.deliverables && campaign.deliverables.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Deliverables
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {campaign.deliverables.map((deliverable, index) => (
                                    <Chip
                                        key={index}
                                        label={`${deliverable.quantity}x ${deliverable.type}`}
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        </>
                    )}

                    {/* Locations */}
                    {campaign.locations && campaign.locations.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Locations
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {campaign.locations.map((location, index) => (
                                    <Chip
                                        key={index}
                                        icon={<LocationIcon />}
                                        label={location.address}
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        </>
                    )}

                    {/* Created Date */}
                    {campaign.createdAt && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="caption" color="text.secondary">
                                Created on {formatDate(campaign.createdAt)}
                            </Typography>
                        </>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button onClick={onClose}>Close</Button>
                {showApplyButton && onApply && (
                    <Button
                        variant="contained"
                        onClick={onApply}
                        startIcon={isAuction ? <GavelIcon /> : <SendIcon />}
                        sx={{
                            bgcolor: '#8CC342',
                            color: 'white',
                            '&:hover': {
                                bgcolor: '#7CB342',
                            },
                        }}
                    >
                        {isAuction ? 'Place Bid' : 'Apply Now'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};