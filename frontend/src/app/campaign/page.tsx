// app/campaign/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    CircularProgress,
    Alert,
    Paper,
    Tabs,
    Tab,
    Card,
    CardContent,
    Chip,
    Stack,
    useTheme,
} from '@mui/material';
import { Add as AddIcon, Campaign as CampaignIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import { MultiStepCampaignForm } from '@/components/campaigns/MultiStepCampaignForm';
import { CampaignDetailsDialog } from '@/components/campaigns/CampaignDetailsDialog';
import EnhancedSendOfferDialog from '@/components/offers/EnhancedSendOfferDialog';
import campaignService from '@/services/campaignService';
import { ICampaign } from '../../../../shared/types/campaign';
import { CampaignStatus } from '../../../../shared/enums/enums';
import { useAuth } from '@/context/authContext';
import { canCreateCampaign } from '@/utils/profileCompletion';
import { useRouter } from 'next/navigation';

export default function CampaignsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<ICampaign | null>(null);
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [sendOfferDialogOpen, setSendOfferDialogOpen] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await campaignService.getUserCampaigns();
            setCampaigns(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        if (!canCreateCampaign(user)) {
            setError('Please complete your profile before creating campaigns');
            router.push('/profile');
            return;
        }
        setSelectedCampaign(null);
        setFormDialogOpen(true);
    };

    const handleEdit = (campaign: ICampaign) => {
        setSelectedCampaign(campaign);
        setFormDialogOpen(true);
    };

    const handleView = (campaign: ICampaign) => {
        setSelectedCampaign(campaign);
        setViewDialogOpen(true);
    };

    const handleSendOffer = (campaign: ICampaign) => {
        if (!canCreateCampaign(user)) {
            setError('Please complete your profile before sending offers');
            router.push('/profile');
            return;
        }
        setSelectedCampaign(campaign);
        setSendOfferDialogOpen(true);
    };

    const handleSave = async (data: Partial<ICampaign>, imageFile?: File) => {
        try {
            if (selectedCampaign) {
                await campaignService.updateCampaign(
                    selectedCampaign._id as string,
                    data,
                    imageFile
                );
            } else {
                await campaignService.createCampaign(data, imageFile);
            }
            setFormDialogOpen(false);
            loadCampaigns();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save campaign');
        }
    };

    const handleDelete = async (campaignId: string) => {
        if (window.confirm('Are you sure you want to delete this campaign?')) {
            try {
                await campaignService.deleteCampaign(campaignId);
                loadCampaigns();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete campaign');
            }
        }
    };

    const now = new Date();
    const isExpired = (campaign: ICampaign) => {
        const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
        const hasEnded = endDate ? endDate < now : false;
        return campaign.status === CampaignStatus.EXPIRED || hasEnded;
    };

    const filterCampaignsByTab = (allCampaigns: ICampaign[]) => {
        const nonExpired = allCampaigns.filter((c) => !isExpired(c));

        switch (tabValue) {
            case 1:
                return nonExpired.filter((c) => c.status === CampaignStatus.ACTIVE);
            case 2:
                return nonExpired.filter((c) => c.status === CampaignStatus.UPCOMING);
            case 3:
                return nonExpired.filter((c) => c.status === CampaignStatus.DRAFT);
            case 4:
                return allCampaigns.filter((c) => isExpired(c));
            default:
                // "All" tab should show only non-expired campaigns
                return nonExpired;
        }
    };

    const filteredCampaigns = filterCampaignsByTab(campaigns);

    // Calculate stats
    const stats = {
        total: campaigns.filter(c => !isExpired(c)).length,
        active: campaigns.filter(c => c.status === CampaignStatus.ACTIVE && !isExpired(c)).length,
        upcoming: campaigns.filter(c => c.status === CampaignStatus.UPCOMING && !isExpired(c)).length,
        draft: campaigns.filter(c => c.status === CampaignStatus.DRAFT && !isExpired(c)).length,
        expired: campaigns.filter(c => isExpired(c)).length,
    };

    return (
        <Box sx={{ backgroundColor: '#f9fafb', minHeight: '100vh', p: 3 }}>
                {/* Header Section */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
                                Campaign Management
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Create, manage, and track your influencer marketing campaigns
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreate}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                boxShadow: 2,
                                '&:hover': {
                                    boxShadow: 4,
                                }
                            }}
                        >
                            Create Campaign
                        </Button>
                    </Box>

                    {/* Stats Cards */}
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { 
                            xs: '1fr', 
                            sm: 'repeat(2, 1fr)', 
                            md: 'repeat(4, 1fr)' 
                        }, 
                        gap: 3, 
                        mb: 3 
                    }}>
                        {[
                            { label: 'Total Campaigns', value: stats.total, icon: CampaignIcon, color: 'primary.main' },
                            { label: 'Active', value: stats.active, icon: TrendingUpIcon, color: 'success.main' },
                            { label: 'Upcoming', value: stats.upcoming, icon: CampaignIcon, color: 'info.main' },
                            { label: 'Drafts', value: stats.draft, icon: CampaignIcon, color: 'warning.main' },
                        ].map((stat, index) => (
                            <Card 
                                key={index}
                                sx={{ 
                                    borderRadius: 3, 
                                    border: '1px solid', 
                                    borderColor: 'primary.light',
                                    bgcolor: 'primary.light',
                                    p: 3,
                                    height: '100%',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 4,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box sx={{ 
                                            bgcolor: stat.color, 
                                            borderRadius: 2, 
                                            p: 1, 
                                            mr: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <stat.icon sx={{ color: 'white', fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                                        {stat.label}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert 
                        severity="error" 
                        sx={{ mb: 3, borderRadius: 2 }} 
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {/* Tabs */}
                <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, newValue) => setTabValue(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 'medium',
                                px: 3,
                            },
                            '& .Mui-selected': {
                                color: 'primary.main',
                                fontWeight: 'bold',
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: 'primary.main',
                                height: 3,
                            }
                        }}
                    >
                        <Tab label={`All (${stats.total})`} />
                        <Tab label={`Active (${stats.active})`} />
                        <Tab label={`Upcoming (${stats.upcoming})`} />
                        <Tab label={`Drafts (${stats.draft})`} />
                        <Tab label={`Expired (${stats.expired})`} />
                    </Tabs>
                </Paper>

                {/* Loading State */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress size={60} sx={{ color: 'primary.main' }} />
                    </Box>
                )}

                {/* Empty State */}
                {!loading && filteredCampaigns.length === 0 && (
                    <Card sx={{ borderRadius: 3, textAlign: 'center', py: 8, px: 2 }}>
                        <CardContent>
                            <CampaignIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No campaigns found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {tabValue === 0
                                    ? 'Create your first campaign to get started with influencer marketing'
                                    : 'No campaigns in this category'}
                            </Typography>
                            {tabValue === 0 && (
                                <Button 
                                    variant="contained" 
                                    startIcon={<AddIcon />} 
                                    onClick={handleCreate}
                                    sx={{ borderRadius: 2, px: 3, textTransform: 'none' }}
                                >
                                    Create Your First Campaign
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Campaign Grid */}
                {!loading && filteredCampaigns.length > 0 && (
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: { 
                            xs: '1fr', 
                            sm: 'repeat(2, 1fr)', 
                            lg: 'repeat(3, 1fr)' 
                        }, 
                        gap: 3 
                    }}>
                        {filteredCampaigns.map((campaign, index) => (
                            <CampaignCard
                                key={campaign._id || campaign.id || `campaign-${index}`}
                                campaign={campaign}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onSendOffer={handleSendOffer}
                            />
                        ))}
                    </Box>
                )}

                {/* Create/Edit Dialog */}
                <Dialog
                    open={formDialogOpen}
                    onClose={() => setFormDialogOpen(false)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: 3 }
                    }}
                >
                    <DialogTitle>
                        <Box>
                            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
                                {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                            </Typography>
                            <Typography variant="body2" component="div" color="text.secondary">
                                {selectedCampaign ? 'Update your campaign details' : 'Fill in the details to create a new campaign'}
                            </Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        <MultiStepCampaignForm
                            campaign={selectedCampaign}
                            onSave={handleSave}
                            onCancel={() => setFormDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* View Details Dialog */}
                <CampaignDetailsDialog
                    open={viewDialogOpen}
                    campaign={selectedCampaign}
                    onClose={() => setViewDialogOpen(false)}
                />

                {/* Send Offer Dialog */}
                <EnhancedSendOfferDialog
                    open={sendOfferDialogOpen}
                    campaign={selectedCampaign}
                    onClose={() => setSendOfferDialogOpen(false)}
                    onSuccess={() => {
                        setSendOfferDialogOpen(false);
                        // Optionally show success message
                    }}
                />
            </Box>
    );
}