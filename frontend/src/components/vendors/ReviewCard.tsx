import React, { FC, useState } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Avatar,
    Rating,
    Chip,
    IconButton,
    Button,
} from '@mui/material';
import {
    ThumbUp as ThumbUpIcon,
    VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { IVendorReview } from '../../../../shared/types/vendorReview';
import { getImageUrl } from '@/utils/fileUtils';

interface ReviewCardProps {
    review: IVendorReview;
    onMarkHelpful?: (reviewId: string) => void;
}

export const ReviewCard: FC<ReviewCardProps> = ({ review, onMarkHelpful }) => {
    const [helpfulCount, setHelpfulCount] = useState(review.helpful || 0);
    const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);

    const reviewer = review.reviewerId as any;

    const handleMarkHelpful = () => {
        if (!hasMarkedHelpful && onMarkHelpful) {
            onMarkHelpful(review._id);
            setHelpfulCount(helpfulCount + 1);
            setHasMarkedHelpful(true);
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 3,
                '&:hover': {
                    boxShadow: 2,
                },
                transition: 'all 0.2s',
            }}
        >
            <CardContent sx={{ p: 3 }}>
                {/* Reviewer Info */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Avatar
                        src={getImageUrl(reviewer?.profilePictureUrl)}
                        sx={{ width: 48, height: 48, bgcolor: '#8CC342' }}
                    >
                        {reviewer?.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {reviewer?.name}
                            </Typography>
                            {review.isVerified && (
                                <VerifiedIcon sx={{ fontSize: 18, color: '#8CC342' }} />
                            )}
                            {review.isVerified && (
                                <Chip
                                    label="Verified Purchase"
                                    size="small"
                                    sx={{
                                        bgcolor: '#e6f3d8',
                                        color: '#699e31',
                                        fontSize: '0.7rem',
                                        height: 20,
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Rating value={review.rating} readOnly size="small" precision={0.5} />
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(review.createdAt)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Project Type */}
                {review.projectType && (
                    <Box sx={{ mb: 2 }}>
                        <Chip
                            label={review.projectType}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: '#8CC342', color: '#699e31' }}
                        />
                    </Box>
                )}

                {/* Review Text */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                    {review.reviewText}
                </Typography>

                {/* Vendor Response */}
                {review.response && (
                    <Box
                        sx={{
                            bgcolor: '#f5f5f5',
                            borderLeft: '3px solid #8CC342',
                            p: 2,
                            borderRadius: 1,
                            mb: 2,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: '#699e31', display: 'block', mb: 1 }}
                        >
                            Vendor Response
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {review.response.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {formatDate(review.response.respondedAt)}
                        </Typography>
                    </Box>
                )}

                {/* Helpful Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Was this helpful?
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<ThumbUpIcon />}
                        onClick={handleMarkHelpful}
                        disabled={hasMarkedHelpful}
                        sx={{
                            textTransform: 'none',
                            color: hasMarkedHelpful ? '#8CC342' : 'text.secondary',
                            '&:hover': {
                                bgcolor: 'rgba(140, 195, 66, 0.08)',
                            },
                        }}
                    >
                        Yes ({helpfulCount})
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

