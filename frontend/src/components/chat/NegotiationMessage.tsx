'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Stack,
    Chip,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Handshake as HandshakeIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ChatMessage } from '@/services/chatService';
import { apiClient } from '@/config/api';

interface NegotiationDetails {
    proposedAmount?: number;
    proposedDeadline?: string;
    counterRequirements?: string[];
}

interface NegotiationMessageProps {
    message: ChatMessage;
    isOwnMessage: boolean;
    onAccept?: (offerId: string, negotiationDetails: NegotiationDetails) => void;
    onDecline?: (offerId: string) => void;
    isProcessing?: boolean;
}

export default function NegotiationMessage({
    message,
    isOwnMessage,
    onAccept,
    onDecline,
    isProcessing = false,
}: NegotiationMessageProps) {
    const [negotiationData, setNegotiationData] = useState<{
        offerId: string;
        negotiationDetails: NegotiationDetails;
    } | null>(() => {
        // Parse negotiation data from attachments
        if (message.attachments && message.attachments.length > 0) {
            try {
                const attachment = message.attachments[0];
                if (attachment.startsWith('{')) {
                    const data = JSON.parse(attachment);
                    if (data.type === 'negotiation' && data.offerId) {
                        return {
                            offerId: data.offerId,
                            negotiationDetails: data.negotiationDetails || {},
                        };
                    }
                }
            } catch (e) {
                console.error('Failed to parse negotiation data:', e);
            }
        }
        return null;
    });

    const [isAccepted, setIsAccepted] = useState<boolean>(false);
    const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

    // Check if negotiation has been accepted
    useEffect(() => {
        const checkOfferStatus = async () => {
            if (!negotiationData?.offerId) return;
            
            try {
                setCheckingStatus(true);
                const response = await apiClient.get(`/api/influencer-offer/offer/${negotiationData.offerId}`);
                
                if (response.data.status && response.data.data) {
                    const offer = response.data.data;
                    // Check if offer is accepted (status === "accepted" or deal exists)
                    if (offer.status === 'accepted' || offer.deal) {
                        setIsAccepted(true);
                    }
                }
            } catch (error) {
                console.error('Failed to check offer status:', error);
            } finally {
                setCheckingStatus(false);
            }
        };

        checkOfferStatus();
    }, [negotiationData?.offerId]);

    if (!negotiationData) {
        // Fallback to regular message if negotiation data is missing
        return (
            <Paper
                sx={{
                    p: 2,
                    bgcolor: isOwnMessage ? 'primary.main' : 'white',
                    color: isOwnMessage ? 'white' : 'text.primary',
                    borderRadius: 2,
                    boxShadow: 1,
                }}
            >
                <Typography variant="body1">{message.content}</Typography>
            </Paper>
        );
    }

    const formatDate = (dateValue: string | Date | undefined): string => {
        if (!dateValue) return 'Not specified';
        try {
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch (e) {
            return 'Invalid date';
        }
    };

    return (
        <Paper
            sx={{
                p: 2.5,
                bgcolor: isOwnMessage ? 'primary.main' : 'white',
                color: isOwnMessage ? 'white' : 'text.primary',
                borderRadius: 2,
                boxShadow: 2,
                border: `2px solid ${isOwnMessage ? 'primary.dark' : 'primary.main'}`,
                maxWidth: '100%',
            }}
        >
            {/* Header */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <HandshakeIcon sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight="bold">
                    {isOwnMessage ? 'Your Negotiation Request' : 'Negotiation Request'}
                </Typography>
            </Stack>

            {/* Message Content */}
            <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {message.content}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Negotiation Details */}
            {negotiationData.negotiationDetails && (
                <Box
                    sx={{
                        p: 2,
                        bgcolor: isOwnMessage ? 'rgba(255, 255, 255, 0.15)' : 'grey.50',
                        borderRadius: 1,
                        mb: 2,
                    }}
                >
                    {negotiationData.negotiationDetails.proposedAmount && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                💰 Proposed Amount
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                ₹{negotiationData.negotiationDetails.proposedAmount.toLocaleString('en-IN')}
                            </Typography>
                        </Box>
                    )}

                    {negotiationData.negotiationDetails.proposedDeadline && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                📅 Proposed Deadline
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {formatDate(negotiationData.negotiationDetails.proposedDeadline)}
                            </Typography>
                        </Box>
                    )}

                    {negotiationData.negotiationDetails.counterRequirements &&
                        negotiationData.negotiationDetails.counterRequirements.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    📝 Counter Requirements:
                                </Typography>
                                <Stack direction="column" spacing={0.5}>
                                    {negotiationData.negotiationDetails.counterRequirements.map((req, index) => (
                                        <Typography key={index} variant="body2" sx={{ pl: 1 }}>
                                            • {req}
                                        </Typography>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                </Box>
            )}

            {/* Action Buttons (only show for recipient, not sender, and if not accepted) */}
            {!isOwnMessage && onAccept && onDecline && !isAccepted && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => onDecline(negotiationData.offerId)}
                        disabled={isProcessing || checkingStatus}
                        sx={{ flex: 1 }}
                    >
                        Decline
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => onAccept(negotiationData.offerId, negotiationData.negotiationDetails)}
                        disabled={isProcessing || checkingStatus}
                        sx={{ flex: 1 }}
                    >
                        {isProcessing || checkingStatus ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : (
                            'Accept'
                        )}
                    </Button>
                </Stack>
            )}

            {/* Show accepted status if negotiation was accepted */}
            {isAccepted && (
                <Box
                    sx={{
                        mt: 2,
                        p: 1.5,
                        bgcolor: 'success.light',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 'medium' }}>
                        Negotiation Accepted - Deal Created
                    </Typography>
                </Box>
            )}

            {/* Timestamp */}
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block', opacity: 0.7 }}
            >
                {new Date(message.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </Typography>
        </Paper>
    );
}

