'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Paper,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    LocalOffer as OfferIcon,
    Gavel as BidIcon,
    Handshake as DealIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/authContext';
import campaignService from '@/services/campaignService';
import offerService from '@/services/offerService';
import influencerBidService from '@/services/influencerBidService';
import { CampaignSelector } from '@/components/influencer-offers/CampaignSelector';
import { OffersList } from '@/components/influencer-offers/OffersList';
import { BidsList } from '@/components/influencer-offers/BidsList';
import { DealsList } from '@/components/influencer-offers/DealsList';
import { ICampaign } from '../../../../shared/types/campaign';
import { CampaignType } from '../../../../shared/enums/enums';

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

/**
 * COLLABS & BIDS PAGE (Brand View)
 * 
 * Purpose: This page allows brands to view and manage:
 * 1. COLLABS - Offers sent by brands to influencers
 * 2. BIDS - Applications/bids received from influencers for campaigns
 * 
 * Flow:
 * - Brand views their campaigns
 * - Selects a campaign to filter collabs/bids
 * - Views collabs they sent to influencers for that campaign
 * - Views bids received from influencers for that campaign
 * - Can respond to bids (accept/reject/shortlist)
 * 
 * Backend APIs:
 * - GET /api/campaigns - Get user campaigns
 * - GET /api/influencer-offer/offers?campaignId={id} - Get offers for campaign
 * - GET /api/influencer-bid/campaign/{id}/bids - Get bids for campaign
 */
export default function InfluencerOffersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    
    // Campaign state
    const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [campaignsLoading, setCampaignsLoading] = useState(true);
    const [campaignsError, setCampaignsError] = useState<string | null>(null);

    // Offers state
    const [offers, setOffers] = useState<any[]>([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [offersError, setOffersError] = useState<string | null>(null);
    const [offersPage, setOffersPage] = useState(1);
    const [offersTotalPages, setOffersTotalPages] = useState(1);

    // Bids state
    const [bids, setBids] = useState<any[]>([]);
    const [bidsLoading, setBidsLoading] = useState(false);
    const [bidsError, setBidsError] = useState<string | null>(null);
    const [bidsPage, setBidsPage] = useState(1);
    const [bidsTotalPages, setBidsTotalPages] = useState(1);

    // Deals state
    const [deals, setDeals] = useState<any[]>([]);
    const [dealsLoading, setDealsLoading] = useState(false);
    const [dealsError, setDealsError] = useState<string | null>(null);
    const [dealsPage, setDealsPage] = useState(1);
    const [dealsTotalPages, setDealsTotalPages] = useState(1);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // Initialize mounted state
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load campaigns on mount
    useEffect(() => {
        if (mounted && user) {
            loadCampaigns();
        }
    }, [mounted, user]);

    // Auto-select latest campaign when campaigns are loaded
    useEffect(() => {
        if (campaigns.length > 0 && !selectedCampaignId && !campaignsLoading) {
            const latestCampaign: any = campaigns[0];
            // Backend may send id instead of _id
            const campaignIdRaw = latestCampaign._id || latestCampaign.id;
            if (campaignIdRaw) {
                const campaignId = typeof campaignIdRaw === 'string' 
                    ? campaignIdRaw 
                    : String(campaignIdRaw);
                console.log('✅ Auto-selecting latest campaign:', campaignId, latestCampaign.name);
                setSelectedCampaignId(campaignId);
            }
        }
    }, [campaigns, selectedCampaignId, campaignsLoading]);

    // Load offers/bids/deals when campaign or tab changes
    useEffect(() => {
        if (selectedCampaignId) {
            if (activeTab === 0) {
                loadOffers();
            } else if (activeTab === 1) {
                loadBids();
            } else if (activeTab === 2) {
                loadDeals();
            }
        }
    }, [selectedCampaignId, activeTab, offersPage, bidsPage, dealsPage]);

    /**
     * Load campaigns for the authenticated brand
     * Sorts by createdAt descending (latest first)
     */
    const loadCampaigns = async () => {
        try {
            setCampaignsLoading(true);
            setCampaignsError(null);
            console.log('🔄 Loading campaigns for brand:', user?.email, user?.role);
            
            const userCampaigns = await campaignService.getUserCampaigns();
            
            console.log('📊 API Response - Campaigns:', {
                count: userCampaigns?.length || 0,
                campaigns: userCampaigns
            });
            
            // Log each campaign's _id field specifically
            if (userCampaigns && userCampaigns.length > 0) {
                userCampaigns.forEach((campaign, index) => {
                    console.log(`📋 Campaign ${index}:`, {
                        _id: campaign._id,
                        _idType: typeof campaign._id,
                        name: campaign.name,
                        keys: Object.keys(campaign),
                        fullCampaign: campaign
                    });
                });
            }
            
            // Always process campaigns, even if empty (that's a valid state)
            if (!userCampaigns) {
                console.warn('⚠️ No campaigns returned (null/undefined)');
                setCampaigns([]);
                return;
            }
            
            if (userCampaigns.length === 0) {
                console.warn('⚠️ Empty campaigns array returned');
                setCampaigns([]);
                return;
            }
            
            // Filter out campaigns without valid IDs
            // Note: Backend transforms _id to id in toJSON, so check both
            const validCampaigns = userCampaigns.filter((campaign: any) => {
                const hasId = (campaign._id || campaign.id) !== null && (campaign._id || campaign.id) !== undefined;
                if (!hasId) {
                    console.warn('⚠️ Campaign without ID found:', campaign);
                }
                // Normalize: ensure _id exists (backend may send id instead)
                if (!campaign._id && campaign.id) {
                    campaign._id = campaign.id;
                }
                return hasId;
            });
            
            console.log('✅ Valid campaigns after filtering:', validCampaigns.length);
            
            if (validCampaigns.length === 0) {
                console.warn('⚠️ No valid campaigns after filtering');
                setCampaigns([]);
                return;
            }
            
            // Sort by createdAt descending (latest first)
            const sortedCampaigns = [...validCampaigns].sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });
            
            console.log('✅ Sorted campaigns:', sortedCampaigns.map(c => ({
                id: c._id,
                name: c.name,
                createdAt: c.createdAt
            })));
            
            setCampaigns(sortedCampaigns);
            
        } catch (error: any) {
            console.error('❌ Error loading campaigns:', error);
            console.error('❌ Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack
            });
            const errorMessage = error.response?.data?.message 
                || error.message 
                || 'Failed to load campaigns. Please check your connection and try again.';
            setCampaignsError(errorMessage);
            setCampaigns([]);
        } finally {
            setCampaignsLoading(false);
        }
    };

    /**
     * Load offers for the selected campaign
     * Offers are sent by brands to influencers
     */
    const loadOffers = async () => {
        if (!selectedCampaignId) {
            console.log('⚠️ Cannot load offers: No campaign selected');
            return;
        }

        try {
            setOffersLoading(true);
            setOffersError(null);
            console.log('🔄 Loading offers for campaign:', selectedCampaignId);
            
            const data = await offerService.getUserOffers({
                page: offersPage,
                limit: 10,
                campaignId: selectedCampaignId,
            });
            
            console.log('✅ Loaded offers:', {
                count: data.offers?.length || 0,
                offers: data.offers,
                pagination: data.pagination
            });
            
            setOffers(data.offers || []);
            setOffersTotalPages(data.pagination?.totalPages || 1);
        } catch (error: any) {
            console.error('❌ Error loading offers:', error);
            const errorMessage = error.response?.data?.message 
                || error.message 
                || 'Failed to load offers';
            setOffersError(errorMessage);
            setOffers([]);
        } finally {
            setOffersLoading(false);
        }
    };

    /**
     * Load bids for the selected campaign
     * Bids are applications submitted by influencers
     */
    const loadBids = async () => {
        if (!selectedCampaignId) {
            console.log('⚠️ Cannot load bids: No campaign selected');
            return;
        }

        try {
            setBidsLoading(true);
            setBidsError(null);
            console.log('🔄 Loading bids for campaign:', selectedCampaignId);
            
            const data = await influencerBidService.getCampaignBids(selectedCampaignId, {
                page: bidsPage,
                limit: 10,
            });
            
            console.log('✅ Loaded bids:', {
                count: data.bids?.length || 0,
                bids: data.bids,
                pagination: data.pagination
            });
            
            setBids(data.bids || []);
            setBidsTotalPages(data.pagination?.totalPages || 1);
        } catch (error: any) {
            console.error('❌ Error loading bids:', error);
            const errorMessage = error.response?.data?.message 
                || error.message 
                || 'Failed to load bids';
            setBidsError(errorMessage);
            setBids([]);
        } finally {
            setBidsLoading(false);
        }
    };

    /**
     * Load deals for the selected campaign
     * Deals are accepted offers/bids that become active collaborations
     */
    const loadDeals = async () => {
        if (!selectedCampaignId) {
            console.log('⚠️ Cannot load deals: No campaign selected');
            return;
        }

        try {
            setDealsLoading(true);
            setDealsError(null);
            console.log('🔄 Loading deals for campaign:', selectedCampaignId);
            
            const data = await offerService.getUserDeals({
                page: dealsPage,
                limit: 10,
                campaignId: selectedCampaignId,
            });
            
            console.log('✅ Loaded deals:', {
                count: data.deals?.length || 0,
                deals: data.deals,
                pagination: data.pagination
            });
            
            setDeals(data.deals || []);
            setDealsTotalPages(data.pagination?.totalPages || 1);
        } catch (error: any) {
            console.error('❌ Error loading deals:', error);
            const errorMessage = error.response?.data?.message 
                || error.message 
                || 'Failed to load deals';
            setDealsError(errorMessage);
            setDeals([]);
        } finally {
            setDealsLoading(false);
        }
    };

    /**
     * Handle campaign selection change
     */
    const handleCampaignChange = (campaignId: string) => {
        console.log('🔄 Handling campaign change:', campaignId);
        setSelectedCampaignId(campaignId);
        // Reset pagination
        setOffersPage(1);
        setBidsPage(1);
        setDealsPage(1);
        // Clear previous data
        setOffers([]);
        setBids([]);
        setDeals([]);
    };

    /**
     * Handle tab change (Offers ↔ Bids ↔ Deals)
     */
    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        const tabNames = ['Offers', 'Bids', 'Deals'];
        console.log('🔄 Switching to tab:', tabNames[newValue]);
        setActiveTab(newValue);
        // Reset pagination when switching tabs
        setOffersPage(1);
        setBidsPage(1);
        setDealsPage(1);
    };

    // Don't render until mounted (prevents hydration issues)
    if (!mounted) {
        return null;
    }

    // Check if user is authorized (only after auth has finished loading)
    if (!authLoading && (!user || user.role !== 'brand')) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">
                    {!user ? "Please log in to view this page." : "You must be logged in as a brand to view this page."}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Page Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    Collabs & Bids
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage collabs sent to influencers and review bids received for your campaigns
                </Typography>
            </Box>

            {/* Campaign Selector */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Select Campaign
                </Typography>
                {campaignsLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Loading campaigns...
                        </Typography>
                    </Box>
                ) : campaignsError ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {campaignsError}
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Please refresh the page or check your connection.
                        </Typography>
                    </Alert>
                ) : campaigns.length === 0 ? (
                    <Alert severity="info">
                        <Typography variant="body1" gutterBottom>
                            No campaigns found. Please create a campaign first.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You can create a campaign from the Campaigns page.
                        </Typography>
                    </Alert>
                ) : (
                    <CampaignSelector
                        campaigns={campaigns}
                        selectedCampaignId={selectedCampaignId}
                        onCampaignChange={handleCampaignChange}
                        loading={campaignsLoading}
                    />
                )}
            </Paper>

            {/* Tabs - Only show if campaign is selected */}
            {selectedCampaignId && (() => {
                // Get selected campaign to determine tab label
                const selectedCampaign = campaigns.find(c => {
                    const id = c._id || (c as any).id;
                    return String(id) === selectedCampaignId;
                });
                const isStandardCampaign = selectedCampaign?.type === CampaignType.STANDARD;
                const bidsTabLabel = isStandardCampaign ? 'Applicants' : 'Bids';
                
                return (
                    <>
                        <Paper sx={{ mb: 3 }}>
                            <Tabs 
                                value={activeTab} 
                                onChange={handleTabChange} 
                                aria-label="offers, bids and deals tabs"
                                sx={{ borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Tab
                                    icon={<OfferIcon />}
                                    iconPosition="start"
                                    label="Offers Sent"
                                    id="tab-0"
                                    aria-controls="tabpanel-0"
                                />
                                <Tab
                                    icon={<BidIcon />}
                                    iconPosition="start"
                                    label={bidsTabLabel}
                                    id="tab-1"
                                    aria-controls="tabpanel-1"
                                />
                                <Tab
                                    icon={<DealIcon />}
                                    iconPosition="start"
                                    label="Collabs"
                                    id="tab-2"
                                    aria-controls="tabpanel-2"
                                />
                            </Tabs>
                        </Paper>

                    {/* Tab Panels */}
                    <Paper sx={{ p: 3 }}>
                        <TabPanel value={activeTab} index={0}>
                            <OffersList
                                offers={offers}
                                loading={offersLoading}
                                error={offersError}
                                page={offersPage}
                                totalPages={offersTotalPages}
                                onPageChange={setOffersPage}
                                onRefresh={loadOffers}
                            />
                        </TabPanel>

                        <TabPanel value={activeTab} index={1}>
                            <BidsList
                                bids={bids}
                                loading={bidsLoading}
                                error={bidsError}
                                page={bidsPage}
                                totalPages={bidsTotalPages}
                                onPageChange={setBidsPage}
                                onBidUpdate={loadBids}
                            />
                        </TabPanel>

                        <TabPanel value={activeTab} index={2}>
                            <DealsList
                                deals={deals}
                                loading={dealsLoading}
                                error={dealsError}
                                page={dealsPage}
                                totalPages={dealsTotalPages}
                                onPageChange={setDealsPage}
                                onRefresh={loadDeals}
                            />
                        </TabPanel>
                    </Paper>
                    </>
                );
            })()}
        </Container>
    );
}
