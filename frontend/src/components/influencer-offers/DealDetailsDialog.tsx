'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Chip,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    IconButton,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle as CompletedIcon,
    PlayArrow as RunningIcon,
    HourglassEmpty as PendingIcon,
    Cancel as CancelledIcon,
    Person as PersonIcon,
    Campaign as CampaignIcon,
    AttachMoney as MoneyIcon,
    CalendarToday as CalendarIcon,
    Assignment as DeliverableIcon,
    Description as RequirementIcon,
    AttachFile as FileIcon,
} from '@mui/icons-material';
import { InfluencerBrandDealExtended } from '@/services/offerService';
import { format } from 'date-fns';
import offerService from '@/services/offerService';
import agreementService, { IAgreement } from '@/services/agreementService';
import { useAuth } from '@/context/authContext';
import {
    Description as AgreementIcon,
    CheckCircle as AgreedIcon,
    GetApp as DownloadIcon,
    Add as GenerateIcon,
} from '@mui/icons-material';

interface DealDetailsDialogProps {
    open: boolean;
    deal: InfluencerBrandDealExtended | null;
    onClose: () => void;
    onDealUpdated?: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'running':
            return 'primary';
        case 'completion_requested':
            return 'warning';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'error';
        default:
            return 'default';
    }
};

const getStatusIcon = (status: string): React.ReactElement | undefined => {
    switch (status) {
        case 'running':
            return <RunningIcon fontSize="small" />;
        case 'completion_requested':
            return <PendingIcon fontSize="small" />;
        case 'completed':
            return <CompletedIcon fontSize="small" />;
        case 'cancelled':
            return <CancelledIcon fontSize="small" />;
        default:
            return undefined;
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'running':
            return 'RUNNING';
        case 'completion_requested':
            return 'COMPLETION REQUESTED';
        case 'completed':
            return 'COMPLETED';
        case 'cancelled':
            return 'CANCELLED';
        default:
            return status.toUpperCase();
    }
};

export const DealDetailsDialog: React.FC<DealDetailsDialogProps> = ({
    open,
    deal,
    onClose,
    onDealUpdated,
}) => {
    const { user } = useAuth();
    const [approving, setApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [agreement, setAgreement] = useState<IAgreement | null>(null);
    const [loadingAgreement, setLoadingAgreement] = useState(false);
    const [generatingAgreement, setGeneratingAgreement] = useState(false);
    const [agreeingToAgreement, setAgreeingToAgreement] = useState(false);

    // Load agreement when dialog opens
    React.useEffect(() => {
        if (open && deal?._id) {
            loadAgreement();
        } else {
            setAgreement(null);
        }
    }, [open, deal?._id]);

    const loadAgreement = async () => {
        if (!deal?._id) return;
        
        try {
            setLoadingAgreement(true);
            const agreementData = await agreementService.getAgreement(String(deal._id), 'influencer-brand');
            setAgreement(agreementData);
        } catch (err: any) {
            // Agreement might not exist yet, that's okay
            if (err.response?.status !== 404) {
                console.error('Error loading agreement:', err);
            }
            setAgreement(null);
        } finally {
            setLoadingAgreement(false);
        }
    };

    const handleGenerateAgreement = async () => {
        if (!deal?._id) return;

        try {
            setGeneratingAgreement(true);
            setError(null);
            const agreementData = await agreementService.generateAgreement(String(deal._id), 'influencer-brand');
            setAgreement(agreementData);
            setSuccess('Agreement generated successfully!');
            if (onDealUpdated) {
                onDealUpdated();
            }
        } catch (err: any) {
            console.error('Error generating agreement:', err);
            setError(err.response?.data?.message || err.message || 'Failed to generate agreement');
        } finally {
            setGeneratingAgreement(false);
        }
    };

    const handleAgreeToAgreement = async () => {
        if (!deal?._id) return;

        try {
            setAgreeingToAgreement(true);
            setError(null);
            const result = await agreementService.agreeToAgreement(String(deal._id), 'influencer-brand');
            setAgreement(result.agreement);
            if (result.bothPartiesAgreed) {
                setSuccess('Both parties have agreed! Deal status updated to In-Progress.');
            } else {
                setSuccess('You have agreed to the agreement!');
            }
            if (onDealUpdated) {
                onDealUpdated();
            }
        } catch (err: any) {
            console.error('Error agreeing to agreement:', err);
            setError(err.response?.data?.message || err.message || 'Failed to agree to agreement');
        } finally {
            setAgreeingToAgreement(false);
        }
    };

    const handleApproveCompletion = async () => {
        if (!deal?._id) return;

        try {
            setApproving(true);
            setError(null);
            setSuccess(null);
            
            console.log('🔄 Approving deal completion:', deal._id);
            
            await offerService.approveDealCompletion(String(deal._id));
            
            console.log('✅ Deal completion approved successfully');
            setSuccess('Deal marked as completed successfully!');
            
            // Wait a bit to show success message
            setTimeout(() => {
                onClose();
                if (onDealUpdated) {
                    onDealUpdated();
                }
            }, 1500);
        } catch (err: any) {
            console.error('❌ Error approving deal completion:', err);
            setError(err.response?.data?.message || err.message || 'Failed to approve completion');
        } finally {
            setApproving(false);
        }
    };

    // Check if current user has agreed
    const hasUserAgreed = () => {
        if (!agreement || !user) return false;
        if (user.role === 'brand') {
            return agreement.brandAgreed;
        } else if (user.role === 'influencer') {
            return agreement.influencerAgreed;
        }
        return false;
    };

    const isBrand = user?.role === 'brand';
    const isInfluencer = user?.role === 'influencer';

    if (!deal) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            scroll="paper"
        >
            {/* Header */}
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h5" fontWeight="bold">
                            Deal Details
                        </Typography>
                        {getStatusIcon(deal.status) && (
                            <Chip
                                icon={getStatusIcon(deal.status)!}
                                label={getStatusLabel(deal.status)}
                                color={getStatusColor(deal.status) as any}
                                size="small"
                            />
                        )}
                        {!getStatusIcon(deal.status) && (
                            <Chip
                                label={getStatusLabel(deal.status)}
                                color={getStatusColor(deal.status) as any}
                                size="small"
                            />
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Deal ID: {String(deal._id).slice(-12)}
                </Typography>
            </DialogTitle>

            <Divider />

            {/* Content */}
            <DialogContent>
                {/* Participants Section */}
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="primary" />
                        Participants
                    </Typography>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Influencer */}
                        <Box 
                            sx={{ 
                                p: 2, 
                                bgcolor: 'action.hover', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                            }}
                        >
                            {deal.influencerProfilePictureUrl ? (
                                <Avatar 
                                    src={deal.influencerProfilePictureUrl}
                                    sx={{ width: 56, height: 56 }}
                                />
                            ) : (
                                <Avatar sx={{ width: 56, height: 56 }}>
                                    {deal.influencerName?.[0] || 'I'}
                                </Avatar>
                            )}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Influencer
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {deal.influencerName || 'Unknown'}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Brand */}
                        <Box 
                            sx={{ 
                                p: 2, 
                                bgcolor: 'action.hover', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                            }}
                        >
                            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                                {deal.brandName?.[0] || 'B'}
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Brand
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {deal.brandName || 'Unknown'}
                                </Typography>
                            </Box>
                        </Box>
                    </div>
                </Box>

                {/* Campaign & Amount Section */}
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CampaignIcon color="primary" />
                        Campaign & Payment
                    </Typography>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Campaign
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                                {deal.campaignName || deal.campaign?.name || 'N/A'}
                            </Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Agreed Amount
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.dark">
                                ₹{deal.agreedAmount?.toLocaleString() || deal.finalTerms?.agreedAmount?.toLocaleString() || '0'}
                            </Typography>
                        </Box>
                    </div>
                </Box>

                {/* Dates Section */}
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon color="primary" />
                        Timeline
                    </Typography>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Deal Created
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                                {deal.dealAt ? format(new Date(deal.dealAt), 'PPP') : 'N/A'}
                            </Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Deadline
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" color="warning.dark">
                                {deal.finalTerms?.agreedDeadline ? format(new Date(deal.finalTerms.agreedDeadline), 'PPP') : 'N/A'}
                            </Typography>
                        </Box>
                    </div>
                </Box>

                {/* Deliverables Section */}
                {deal.finalTerms?.finalDeliverables && deal.finalTerms.finalDeliverables.length > 0 && (
                    <Box mb={3}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DeliverableIcon color="primary" />
                            Deliverables
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <List dense>
                                {deal.finalTerms.finalDeliverables.map((deliverable, index) => (
                                    <ListItem key={index} sx={{ py: 0.5 }}>
                                        <ListItemText 
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" component="span" fontWeight="bold">
                                                        {index + 1}.
                                                    </Typography>
                                                    <Typography variant="body2" component="span">
                                                        {deliverable}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Box>
                )}

                {/* Requirements Section */}
                {deal.finalTerms?.finalRequirements && deal.finalTerms.finalRequirements.length > 0 && (
                    <Box mb={3}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RequirementIcon color="primary" />
                            Requirements
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <List dense>
                                {deal.finalTerms.finalRequirements.map((requirement, index) => (
                                    <ListItem key={index} sx={{ py: 0.5 }}>
                                        <ListItemText 
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" component="span" fontWeight="bold">
                                                        {index + 1}.
                                                    </Typography>
                                                    <Typography variant="body2" component="span">
                                                        {requirement}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Box>
                )}

                {/* Agreement Section */}
                <Box mb={2}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AgreementIcon color="primary" />
                        Agreement
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        {loadingAgreement ? (
                            <Box display="flex" justifyContent="center" p={2}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : agreement ? (
                            <Box>
                                <Box mb={2}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        href={agreement.agreementFile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        fullWidth
                                    >
                                        View Agreement PDF
                                    </Button>
                                </Box>
                                
                                {/* Agreement Status */}
                                <Box mb={2}>
                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        Agreement Status:
                                    </Typography>
                                    <div className="flex flex-col gap-2">
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {agreement.brandAgreed ? (
                                                <AgreedIcon color="success" fontSize="small" />
                                            ) : (
                                                <PendingIcon fontSize="small" />
                                            )}
                                            <Typography variant="body2">
                                                Brand: {agreement.brandAgreed ? 'Agreed' : 'Pending'}
                                            </Typography>
                                            {agreement.brandAgreedAt && (
                                                <Typography variant="caption" color="text.secondary">
                                                    ({format(new Date(agreement.brandAgreedAt), 'PPp')})
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {agreement.influencerAgreed ? (
                                                <AgreedIcon color="success" fontSize="small" />
                                            ) : (
                                                <PendingIcon fontSize="small" />
                                            )}
                                            <Typography variant="body2">
                                                Influencer: {agreement.influencerAgreed ? 'Agreed' : 'Pending'}
                                            </Typography>
                                            {agreement.influencerAgreedAt && (
                                                <Typography variant="caption" color="text.secondary">
                                                    ({format(new Date(agreement.influencerAgreedAt), 'PPp')})
                                                </Typography>
                                            )}
                                        </Box>
                                    </div>
                                </Box>

                                {/* Agree Button */}
                                {!hasUserAgreed() && (isBrand || isInfluencer) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={handleAgreeToAgreement}
                                        disabled={agreeingToAgreement}
                                        startIcon={agreeingToAgreement ? <CircularProgress size={20} /> : <AgreedIcon />}
                                    >
                                        {agreeingToAgreement ? 'Agreeing...' : 'Agree to Agreement'}
                                    </Button>
                                )}
                                
                                {hasUserAgreed() && (
                                    <Alert severity="success" sx={{ mt: 1 }}>
                                        You have agreed to this agreement.
                                    </Alert>
                                )}
                            </Box>
                        ) : (
                            <Box>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    No agreement has been generated for this deal yet.
                                </Alert>
                                {(isBrand || isInfluencer) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={handleGenerateAgreement}
                                        disabled={generatingAgreement}
                                        startIcon={generatingAgreement ? <CircularProgress size={20} /> : <GenerateIcon />}
                                    >
                                        {generatingAgreement ? 'Generating...' : 'Generate Agreement'}
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Message Section */}
                {deal.message && (
                    <Box mb={2}>
                        <Typography variant="h6" gutterBottom>
                            Message
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="body2">
                                {deal.message}
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Status Messages */}
                {(error || success) && (
                    <Box sx={{ mt: 2 }}>
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert severity="success" onClose={() => setSuccess(null)}>
                                {success}
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>

            {/* Actions */}
            <Divider />
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose} disabled={approving}>
                    Close
                </Button>
                
                {/* Accept Completion Button - Only shown when status is completion_requested */}
                {deal.status === 'completion_requested' && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleApproveCompletion}
                        disabled={approving}
                        startIcon={approving ? <CircularProgress size={20} /> : <CompletedIcon />}
                    >
                        {approving ? 'Approving...' : 'Accept Completion'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

