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
    VerifiedUser as VerifiedIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
} from '@mui/icons-material';
import { IUser } from '../../../../shared/types/user';

interface VendorCardProps {
    vendor: IUser;
    onViewProfile: (vendor: IUser) => void;
}

export const VendorCard: FC<VendorCardProps> = ({ vendor, onViewProfile }) => {
    const vendorInfo = vendor.vendorInfo;

    return (
        <Card
            sx={{
                height: '100%',
                minHeight: '450px',
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
            {/* Header with Avatar */}
            <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                    src={vendor.profilePictureUrl}
                    sx={{ width: 80, height: 80, bgcolor: '#8CC342' }}
                >
                    {vendor.name?.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {vendorInfo?.businessName || vendor.name}
                        </Typography>
                        {vendorInfo?.isVerified && (
                            <VerifiedIcon sx={{ color: '#8CC342', fontSize: 20 }} />
                        )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {vendorInfo?.vendorType || 'Vendor'}
                    </Typography>
                    {vendorInfo?.rating !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Rating
                                value={vendorInfo.rating}
                                precision={0.1}
                                size="small"
                                readOnly
                            />
                            <Typography variant="caption" color="text.secondary">
                                ({vendorInfo.totalReviews || 0} reviews)
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Content */}
            <CardContent sx={{ pt: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Description */}
                {vendorInfo?.description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mb: 2,
                            minHeight: '40px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {vendorInfo.description}
                    </Typography>
                )}
                {!vendorInfo?.description && (
                    <Box sx={{ mb: 2, minHeight: '40px' }} />
                )}

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    {vendorInfo?.experience && (
                        <Chip
                            label={`${vendorInfo.experience} years exp`}
                            size="small"
                            sx={{ bgcolor: '#e6f3d8', color: '#699e31' }}
                        />
                    )}
                    {vendorInfo?.completedProjects && (
                        <Chip
                            label={`${vendorInfo.completedProjects} projects`}
                            size="small"
                            sx={{ bgcolor: '#e6f3d8', color: '#699e31' }}
                        />
                    )}
                    {vendorInfo?.availability && (
                        <Chip
                            label={vendorInfo.availability}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </Box>

                {/* Service Areas */}
                {vendorInfo?.serviceAreas && vendorInfo.serviceAreas.length > 0 && (
                    <Box sx={{ mb: 2, minHeight: '60px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                Service Areas:
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {vendorInfo.serviceAreas.slice(0, 3).map((area: any, idx: number) => {
                                const label =
                                    typeof area === 'string'
                                        ? area
                                        : area.city || area.address || (area.latitude && area.longitude ? `${area.latitude}, ${area.longitude}` : 'Area');
                                return <Chip key={idx} label={label} size="small" />;
                            })}
                            {vendorInfo.serviceAreas.length > 3 && (
                                <Chip
                                    label={`+${vendorInfo.serviceAreas.length - 3} more`}
                                    size="small"
                                />
                            )}
                        </Box>
                    </Box>
                )}
                {(!vendorInfo?.serviceAreas || vendorInfo.serviceAreas.length === 0) && (
                    <Box sx={{ mb: 2, minHeight: '60px' }} />
                )}

                {/* Contact Info */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, justifyContent: 'flex-end' }}>
                    {vendor.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {vendor.email}
                            </Typography>
                        </Box>
                    )}
                    {vendor.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                {vendor.phone}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </CardContent>

            {/* Actions */}
            <Box sx={{ p: 2, pt: 0 }}>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={() => onViewProfile(vendor)}
                    sx={{
                        textTransform: 'none',
                        bgcolor: '#8CC342',
                        '&:hover': { bgcolor: '#699e31' },
                    }}
                >
                    View Profile
                </Button>
            </Box>
        </Card>
    );
};

