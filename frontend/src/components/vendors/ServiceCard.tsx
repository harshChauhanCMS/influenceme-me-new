import React, { FC } from 'react';
import {
    Card,
    CardContent,
    CardMedia,
    Typography,
    Chip,
    Box,
    Avatar,
    Rating,
    Button,
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    AttachMoney as MoneyIcon,
    AccessTime as TimeIcon,
    CheckCircle as CheckIcon,
    Share as ShareIcon,
} from '@mui/icons-material';
import { IService } from '../../../../shared/types/vendor';
import { buildServiceWhatsAppMessage, openWhatsAppShare } from '@/utils/whatsappShare';

interface ServiceCardProps {
    service: IService;
    onApproach: (service: IService) => void;
    onViewDetails: (service: IService) => void;
    onViewVendor?: (vendor: any) => void;
}

export const ServiceCard: FC<ServiceCardProps> = ({ service, onApproach, onViewDetails, onViewVendor }) => {
    const formatPrice = (price?: number, priceType?: string) => {
        if (!price) return 'Negotiable';
        const formattedPrice = `₹${price.toLocaleString('en-IN')}`;
        switch (priceType) {
            case 'hourly':
                return `${formattedPrice}/hr`;
            case 'daily':
                return `${formattedPrice}/day`;
            case 'package':
                return `${formattedPrice} package`;
            default:
                return formattedPrice;
        }
    };

    // Access vendor info from populated vendorId
    const vendor = service.vendorId as any;

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                },
                borderRadius: 3,
            }}
        >
            {/* Service Image */}
            {service.images && service.images.length > 0 && (
                <CardMedia
                    component="img"
                    height="180"
                    image={service.images[0]}
                    alt={service.serviceName}
                    sx={{ objectFit: 'cover' }}
                />
            )}

            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Category Badge */}
                <Box sx={{ mb: 1 }}>
                    <Chip
                        label={service.category.replace(/-/g, ' ').toUpperCase()}
                        size="small"
                        sx={{ bgcolor: '#8CC342', color: 'white', fontWeight: 600 }}
                    />
                </Box>

                {/* Service Name */}
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {service.serviceName}
                </Typography>

                {/* Description */}
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
                        flex: 1,
                    }}
                >
                    {service.description}
                </Typography>

                {/* Vendor Info */}
                {vendor && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 2,
                            cursor: onViewVendor ? 'pointer' : 'default',
                            '&:hover': onViewVendor ? {
                                bgcolor: 'rgba(140, 195, 66, 0.05)',
                                borderRadius: 1,
                            } : {},
                            p: onViewVendor ? 1 : 0,
                            m: onViewVendor ? -1 : 0,
                        }}
                        onClick={() => onViewVendor && onViewVendor(vendor)}
                    >
                        <Avatar
                            src={vendor.profilePictureUrl}
                            sx={{ width: 32, height: 32, bgcolor: '#8CC342' }}
                        >
                            {vendor.name?.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {vendor.name}
                            </Typography>
                            {vendor.vendorInfo?.rating !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Rating
                                        value={vendor.vendorInfo.rating}
                                        precision={0.1}
                                        size="small"
                                        readOnly
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        ({vendor.vendorInfo.totalReviews || 0})
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Service Details */}
                <Box sx={{ mb: 2 }}>
                    {/* Price */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <MoneyIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#8CC342' }}>
                            {formatPrice(service.price, service.priceType)}
                        </Typography>
                    </Box>

                    {/* Duration */}
                    {service.duration && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {service.duration}
                            </Typography>
                        </Box>
                    )}

                    {/* Location */}
                    {service.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {service.location}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Features */}
                {service.features && service.features.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        {service.features.slice(0, 3).map((feature, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <CheckIcon sx={{ fontSize: 14, color: '#8CC342' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {feature}
                                </Typography>
                            </Box>
                        ))}
                        {service.features.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                                +{service.features.length - 3} more features
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Tags */}
                {service.tags && service.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                        {service.tags.slice(0, 4).map((tag, idx) => (
                            <Chip key={idx} label={tag} size="small" variant="outlined" />
                        ))}
                    </Box>
                )}
            </CardContent>

            {/* Actions */}
            <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => onViewDetails(service)}
                        sx={{ textTransform: 'none' }}
                    >
                        Details
                    </Button>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => onApproach(service)}
                        sx={{
                            textTransform: 'none',
                            bgcolor: '#8CC342',
                            '&:hover': { bgcolor: '#699e31' },
                        }}
                    >
                        Approach
                    </Button>
                </Box>
                <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<ShareIcon />}
                    onClick={() => openWhatsAppShare(buildServiceWhatsAppMessage(service))}
                    sx={{
                        textTransform: 'none',
                        borderColor: '#25D366',
                        color: '#25D366',
                        '&:hover': {
                            borderColor: '#1da851',
                            bgcolor: 'rgba(37, 211, 102, 0.08)',
                        },
                    }}
                >
                    Recommend to someone else
                </Button>
            </Box>
        </Card>
    );
};

