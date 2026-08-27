// components/offers/SendOfferDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Autocomplete,
    CircularProgress,
    Alert,
    Chip,
    Avatar,
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import offerService from '@/services/offerService';
import userService from '@/services/userService';
import { ICampaign } from '../../../../shared/types/campaign';
import { IUser } from '../../../../shared/types/user';

interface SendOfferDialogProps {
    open: boolean;
    onClose: () => void;
    campaign: ICampaign | null;
    onSuccess?: () => void;
}

export default function SendOfferDialog({ open, onClose, campaign, onSuccess }: SendOfferDialogProps) {
    const [influencers, setInfluencers] = useState<IUser[]>([]);
    const [selectedInfluencer, setSelectedInfluencer] = useState<IUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingInfluencers, setLoadingInfluencers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (open) {
            loadInfluencers();
            setSelectedInfluencer(null);
            setSuccess(false);
            setError(null);
        }
    }, [open]);

    const loadInfluencers = async () => {
        try {
            setLoadingInfluencers(true);
            const data = await userService.getAllInfluencers(1, 100);
            setInfluencers(data.influencers || []);
        } catch (err) {
            setError('Failed to load influencers');
        } finally {
            setLoadingInfluencers(false);
        }
    };

    const handleSendOffer = async () => {
        if (!campaign || !selectedInfluencer) {
            setError('Please select an influencer');
            return;
        }

        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (!userData) {
            setError('User not logged in');
            return;
        }

        const user = JSON.parse(userData);

        try {
            setLoading(true);
            setError(null);

            await offerService.createOffer({
                brandId: user._id,
                influencerId: selectedInfluencer._id,
                campaignId: campaign._id,
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                if (onSuccess) onSuccess();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send offer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle>
                <Box component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Send Offer to Influencer
                    </Typography>
                    <Button
                        onClick={onClose}
                        size="small"
                        sx={{ minWidth: 'auto', color: 'text.secondary' }}
                    >
                        <CloseIcon />
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {/* Campaign Info */}
                {campaign && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                        <Typography variant="body2" sx={{ mb: 0.5, opacity: 0.9 }}>
                            Campaign
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {campaign.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Budget: ₹${campaign.budget?.toLocaleString('en-IN')}`}
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                            <Chip
                                label={campaign.type}
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                        </Box>
                    </Box>
                )}

                {/* Select Influencer */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Select Influencer *
                    </Typography>
                    <Autocomplete
                        options={influencers}
                        getOptionLabel={(option) => option.name || ''}
                        value={selectedInfluencer}
                        onChange={(event, newValue) => {
                            setSelectedInfluencer(newValue);
                            setError(null);
                        }}
                        loading={loadingInfluencers}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Search influencer by name..."
                                variant="outlined"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loadingInfluencers ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                                <Avatar
                                    src={option.profilePictureUrl}
                                    sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
                                >
                                    {option.name?.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {option.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {option.email}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    />
                </Box>

                {/* Selected Influencer Preview */}
                {selectedInfluencer && (
                    <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                src={selectedInfluencer.profilePictureUrl}
                                sx={{ width: 50, height: 50, bgcolor: 'primary.main' }}
                            >
                                {selectedInfluencer.name?.charAt(0)}
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {selectedInfluencer.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedInfluencer.email}
                                </Typography>
                                {selectedInfluencer.influencerInfo?.genre && selectedInfluencer.influencerInfo.genre.length > 0 && (
                                    <Chip
                                        label={selectedInfluencer.influencerInfo.genre[0]}
                                        size="small"
                                        sx={{ mt: 0.5 }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Success Alert */}
                {success && (
                    <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                        Offer sent successfully!
                    </Alert>
                )}

                {/* Info */}
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    The influencer will receive a notification about this offer and can accept, decline, or negotiate the terms.
                </Alert>
            </DialogContent>

            <DialogActions sx={{ p: 2.5 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSendOffer}
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={loading || !selectedInfluencer || success}
                    sx={{
                        bgcolor: 'primary.main',
                        '&:hover': {
                            bgcolor: 'primary.dark',
                        },
                    }}
                >
                    {loading ? 'Sending...' : 'Send Offer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

