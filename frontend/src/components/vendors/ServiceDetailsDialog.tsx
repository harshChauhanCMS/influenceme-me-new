'use client';

import React, { FC } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Avatar,
    Rating,
    Chip,
    IconButton,
} from '@mui/material';
import {
    Close as CloseIcon,
    LocationOn as LocationIcon,
    AttachMoney as MoneyIcon,
    AccessTime as TimeIcon,
    CheckCircle as CheckIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { IService } from '../../../../shared/types/vendor';
import { IUser } from '../../../../shared/types/user';

interface ServiceDetailsDialogProps {
    open: boolean;
    service: IService | null;
    onClose: () => void;
    onViewVendor?: (vendor: IUser) => void;
}

export const ServiceDetailsDialog: FC<ServiceDetailsDialogProps> = ({
    open,
    service,
    onClose,
    onViewVendor,
}) => {
    if (!service) return null;

    const vendor = service.vendorId as IUser | undefined;
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                <Chip
                    label={service.category?.replace(/-/g, ' ').toUpperCase()}
                    size="small"
                    sx={{ bgcolor: '#8CC342', color: 'white', fontWeight: 600 }}
                />
                <IconButton size="small" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
                    {service.serviceName}
                </Typography>

                {service.images && service.images.length > 0 && (
                    <Box
                        sx={{
                            width: '100%',
                            height: 220,
                            borderRadius: 2,
                            overflow: 'hidden',
                            mb: 2,
                            bgcolor: 'grey.200',
                        }}
                    >
                        <img
                            src={service.images[0]}
                            alt={service.serviceName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </Box>
                )}

                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {service.description}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MoneyIcon sx={{ fontSize: 20, color: '#8CC342' }} />
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#8CC342' }}>
                            {formatPrice(service.price, service.priceType)}
                        </Typography>
                    </Box>
                    {service.duration && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {service.duration}
                            </Typography>
                        </Box>
                    )}
                    {service.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {service.location}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {service.features && service.features.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Features
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {service.features.map((feature, idx) => (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CheckIcon sx={{ fontSize: 16, color: '#8CC342' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {feature}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {service.tags && service.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                        {service.tags.map((tag, idx) => (
                            <Chip key={idx} label={tag} size="small" variant="outlined" />
                        ))}
                    </Box>
                )}

                {vendor && typeof vendor === 'object' && (
                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Offered by
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                src={vendor.profilePictureUrl}
                                sx={{ width: 48, height: 48, bgcolor: '#8CC342' }}
                            >
                                {vendor.name?.charAt(0)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {vendor.name}
                                </Typography>
                                {vendor.vendorInfo?.rating !== undefined && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Rating value={vendor.vendorInfo.rating} precision={0.1} size="small" readOnly />
                                        <Typography variant="caption" color="text.secondary">
                                            ({vendor.vendorInfo.totalReviews ?? 0} reviews)
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                            {onViewVendor && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PersonIcon />}
                                    onClick={() => {
                                        onClose();
                                        onViewVendor(vendor);
                                    }}
                                    sx={{ textTransform: 'none', borderColor: '#8CC342', color: '#8CC342' }}
                                >
                                    View profile
                                </Button>
                            )}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Close
                </Button>
                {onViewVendor && vendor && typeof vendor === 'object' && (
                    <Button
                        variant="contained"
                        onClick={() => {
                            onClose();
                            onViewVendor(vendor);
                        }}
                        sx={{
                            textTransform: 'none',
                            bgcolor: '#8CC342',
                            '&:hover': { bgcolor: '#699e31' },
                        }}
                    >
                        Contact vendor
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
