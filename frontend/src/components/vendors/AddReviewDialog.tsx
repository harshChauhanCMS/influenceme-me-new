import React, { FC, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Rating,
    Typography,
    Box,
    IconButton,
    Alert,
    CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, Star as StarIcon } from '@mui/icons-material';
import vendorReviewService from '@/services/vendorReviewService';

interface AddReviewDialogProps {
    open: boolean;
    vendorId: string | null;
    vendorName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddReviewDialog: FC<AddReviewDialogProps> = ({
    open,
    vendorId,
    vendorName,
    onClose,
    onSuccess,
}) => {
    const [rating, setRating] = useState<number>(0);
    const [reviewText, setReviewText] = useState('');
    const [projectType, setProjectType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!vendorId) return;

        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        if (!reviewText.trim()) {
            setError('Please write a review');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await vendorReviewService.createReview({
                vendorId,
                rating,
                reviewText: reviewText.trim(),
                projectType: projectType.trim() || undefined,
            });

            // Reset form
            setRating(0);
            setReviewText('');
            setProjectType('');

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setRating(0);
            setReviewText('');
            setProjectType('');
            setError(null);
            onClose();
        }
    };

    const labels: { [index: number]: string } = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent',
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle
                sx={{
                    bgcolor: '#8CC342',
                    color: 'white',
                    py: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Write a Review
                </Typography>
                <IconButton onClick={handleClose} disabled={loading} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
                {/* Vendor Name */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Share your experience with <strong>{vendorName}</strong>
                </Typography>

                {/* Rating */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Rating *
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Rating
                            value={rating}
                            onChange={(event, newValue) => {
                                setRating(newValue || 0);
                                setError(null);
                            }}
                            size="large"
                            emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
                        />
                        {rating > 0 && (
                            <Typography variant="body2" sx={{ color: '#8CC342', fontWeight: 600 }}>
                                {labels[rating]}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Project Type */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Service Type (Optional)
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="e.g., Wedding Photography, Event Planning"
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value)}
                        disabled={loading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            },
                        }}
                    />
                </Box>

                {/* Review Text */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Your Review *
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={5}
                        placeholder="Share details of your experience..."
                        value={reviewText}
                        onChange={(e) => {
                            setReviewText(e.target.value);
                            setError(null);
                        }}
                        disabled={loading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            },
                        }}
                        helperText={`${reviewText.length}/500 characters`}
                        inputProps={{ maxLength: 500 }}
                    />
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || rating === 0 || !reviewText.trim()}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{
                        textTransform: 'none',
                        bgcolor: '#8CC342',
                        '&:hover': { bgcolor: '#699e31' },
                        px: 3,
                    }}
                >
                    {loading ? 'Submitting...' : 'Submit Review'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

