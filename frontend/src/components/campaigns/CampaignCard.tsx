// components/campaigns/CampaignCard.tsx
'use client';

import React, { FC } from 'react';
import {
    Card,
    CardContent,
    CardMedia,
    Typography,
    Box,
    Chip,
    Stack,
    Button,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { ICampaign } from '../../../../shared/types/campaign';
import { CampaignStatus } from '../../../../shared/enums/enums';
import { getImageUrl } from '@/utils/fileUtils';

interface CampaignCardProps {
    campaign: ICampaign;
    onView: (campaign: ICampaign) => void;
    onEdit: (campaign: ICampaign) => void;
    onDelete: (campaignId: string) => void;
    onSendOffer?: (campaign: ICampaign) => void;
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

const getStatusBgColor = (status: CampaignStatus): string => {
    const colors: Record<CampaignStatus, string> = {
        [CampaignStatus.ACTIVE]: '#e8f5e8',
        [CampaignStatus.UPCOMING]: '#e3f2fd',
        [CampaignStatus.PAUSED]: '#fff3e0',
        [CampaignStatus.DRAFT]: '#f5f5f5',
        [CampaignStatus.COMPLETED]: '#f3e5f5',
    };
    return colors[status] || '#f5f5f5';
};

export const CampaignCard: FC<CampaignCardProps> = ({
                                                        campaign,
                                                        onView,
                                                        onEdit,
                                                        onDelete,
                                                        onSendOffer,
                                                    }) => {
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <Card 
            sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'primary.light',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                    borderColor: 'primary.main',
                }
            }}
        >
            {/* Image Section */}
            <Box sx={{ position: 'relative' }}>
                <CardMedia
                    component="img"
                    height="200"
                    image={getImageUrl(campaign.image, '/placeholder-campaign.jpg')}
                    alt={campaign.name}
                    sx={{ 
                        objectFit: 'cover',
                        borderRadius: '12px 12px 0 0'
                    }}
                />
                {/* Status Badge */}
                <Chip
                    size="small"
                    label={campaign.status.toUpperCase()}
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        bgcolor: getStatusBgColor(campaign.status),
                        color: 'text.primary',
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                        borderRadius: 2,
                    }}
                />
            </Box>

            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {/* Title */}
                <Typography
                    variant="h6"
                    component="div"
                    sx={{ 
                        fontWeight: 'bold', 
                        mb: 2,
                        color: 'text.primary',
                        lineHeight: 1.3,
                        minHeight: '2.6em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {campaign.name}
                </Typography>

                {/* Description */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.5,
                    }}
                >
                    {campaign.description || 'No description available'}
                </Typography>

                {/* Campaign Details */}
                <Stack spacing={2}>
                    {/* Date Range */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.200'
                    }}>
                        <CalendarIcon fontSize="small" sx={{ color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                            {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </Typography>
                    </Box>

                    {/* Budget */}
                    {campaign.budget && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5,
                            p: 1.5,
                            bgcolor: 'success.light',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'success.main'
                        }}>
                            <MoneyIcon fontSize="small" sx={{ color: 'success.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                                ₹{campaign.budget.toLocaleString('en-IN')}
                            </Typography>
                        </Box>
                    )}

                    {/* Campaign Type Tags */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip 
                            size="small" 
                            label={campaign.type} 
                            variant="outlined" 
                            sx={{ 
                                borderRadius: 2,
                                fontWeight: 'medium',
                                borderColor: 'primary.main',
                                color: 'primary.main'
                            }} 
                        />
                        <Chip 
                            size="small" 
                            label={campaign.compensationType} 
                            variant="outlined"
                            sx={{ 
                                borderRadius: 2,
                                fontWeight: 'medium',
                                borderColor: 'secondary.main',
                                color: 'secondary.main'
                            }}
                        />
                    </Box>
                </Stack>
            </CardContent>

            {/* Action Buttons */}
            <Box sx={{ 
                p: 3, 
                pt: 0, 
                display: 'flex', 
                gap: 1, 
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                        <IconButton
                            size="small"
                            onClick={() => onView(campaign)}
                            sx={{
                                bgcolor: 'primary.light',
                                color: 'primary.main',
                                '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                }
                            }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Campaign">
                        <IconButton
                            size="small"
                            onClick={() => onEdit(campaign)}
                            sx={{
                                bgcolor: 'info.light',
                                color: 'info.main',
                                '&:hover': {
                                    bgcolor: 'info.main',
                                    color: 'white',
                                }
                            }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Campaign">
                        <IconButton
                            size="small"
                            onClick={() => onDelete(campaign._id as string)}
                            sx={{
                                bgcolor: 'error.light',
                                color: 'error.main',
                                '&:hover': {
                                    bgcolor: 'error.main',
                                    color: 'white',
                                }
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
                
                {/* Send Offer Button */}
                {onSendOffer && campaign.status === CampaignStatus.ACTIVE && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<SendIcon />}
                        onClick={() => onSendOffer(campaign)}
                        sx={{
                            bgcolor: '#8CC342',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2,
                            '&:hover': {
                                bgcolor: '#7CB342',
                            },
                        }}
                    >
                        Send Offer
                    </Button>
                )}
            </Box>
        </Card>
    );
};