// app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Stack,
    Paper,
    CircularProgress,
} from '@mui/material';
import {
    Campaign as CampaignIcon,
    TrendingUp as TrendingUpIcon,
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Add as AddIcon,
    Group as GroupIcon,
    Handshake as HandshakeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import campaignService from '@/services/campaignService';

interface DashboardStats {
    activeCampaigns: number;
    totalReach: number;
    pendingOffers: number;
    completedDeals: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        activeCampaigns: 0,
        totalReach: 0,
        pendingOffers: 0,
        completedDeals: 0,
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const campaigns = await campaignService.getUserCampaigns();

            // Calculate stats from campaigns
            const now = new Date();
            const activeCampaigns = campaigns.filter(
                (c) =>
                    c.status === 'active' &&
                    c.endDate &&
                    new Date(c.endDate) >= now &&
                    c.status !== 'expired'
            ).length;

            setStats({
                activeCampaigns,
                totalReach: 75000, // This would come from aggregated data
                pendingOffers: 8, // This would come from offers API
                completedDeals: 24, // This would come from deals API
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const statsConfig = [
        {
            label: 'Active Campaigns',
            value: stats.activeCampaigns,
            color: 'primary.main',
            icon: CampaignIcon,
        },
        {
            label: 'Total Reach',
            value: `${(stats.totalReach / 1000).toFixed(0)}K`,
            color: 'success.main',
            icon: TrendingUpIcon,
        },
        {
            label: 'Pending Offers',
            value: stats.pendingOffers,
            color: 'warning.main',
            icon: PeopleIcon,
        },
        {
            label: 'Completed Deals',
            value: stats.completedDeals,
            color: 'info.main',
            icon: CheckCircleIcon,
        },
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
            <Box>
            {/* Welcome Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Welcome Back!
                </Typography>
                <Typography color="text.secondary">
                    Here&#39;s an overview of your campaign performance and activities.
                </Typography>
            </Box>

            {/* Stats Grid */}
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                    xs: '1fr', 
                    sm: 'repeat(2, 1fr)', 
                    lg: 'repeat(4, 1fr)' 
                }, 
                gap: 3, 
                mb: 4 
            }}>
                {statsConfig.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={index}
                            sx={{
                                height: '100%',
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'primary.light',
                                bgcolor: 'primary.light',
                                p: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4,
                                }
                            }}
                        >
                            <CardContent sx={{ p: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box
                                        sx={{
                                            p: 1,
                                            borderRadius: 2,
                                            bgcolor: stat.color,
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mr: 2,
                                        }}
                                    >
                                        <Icon sx={{ fontSize: 24 }} />
                                    </Box>
                                    <Typography
                                        variant="h4"
                                        component="div"
                                        sx={{ fontWeight: 'bold', color: 'primary.dark' }}
                                    >
                                        {stat.value}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                                    {stat.label}
                                </Typography>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>

            {/* Main Content Grid */}
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                    xs: '1fr', 
                    lg: '2fr 1fr' 
                }, 
                gap: 3 
            }}>
                {/* Activity Section */}
                <Box>
                    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>
                                Recent Activity
                            </Typography>
                            <Box
                                sx={{
                                    height: 300,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'primary.light',
                                    borderRadius: 2,
                                    border: '1px dashed',
                                    borderColor: 'primary.main',
                                }}
                            >
                                <Typography color="primary.main">
                                    Activity timeline will be displayed here
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Recent Campaigns */}
                    <Card sx={{ mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}>
                        <CardContent>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <Typography variant="h6" sx={{ color: 'primary.dark', fontWeight: 'bold' }}>Recent Campaigns</Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            borderColor: 'primary.dark',
                                            bgcolor: 'primary.light'
                                        }
                                    }}
                                    onClick={() => router.push('/campaign')}
                                >
                                    View All
                                </Button>
                            </Box>
                            <Box
                                sx={{
                                    height: 200,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'primary.light',
                                    borderRadius: 2,
                                    border: '1px dashed',
                                    borderColor: 'primary.main',
                                }}
                            >
                                <Typography color="primary.main">
                                    Recent campaigns list will appear here
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* Quick Actions Sidebar */}
                <Box>
                    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>
                                Quick Actions
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 2 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<AddIcon />}
                                    onClick={() => router.push('/campaign')}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        }
                                    }}
                                >
                                    Create Campaign
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<GroupIcon />}
                                    onClick={() => router.push('/vendors')}
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            borderColor: 'primary.dark',
                                            bgcolor: 'primary.light'
                                        }
                                    }}
                                >
                                    View Vendors
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<HandshakeIcon />}
                                    onClick={() => router.push('/offers')}
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            borderColor: 'primary.dark',
                                            bgcolor: 'primary.light'
                                        }
                                    }}
                                >
                                    Check Offers
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Performance Card */}
                    <Card sx={{ mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ color: 'primary.dark', fontWeight: 'bold' }}>
                                Performance Overview
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        bgcolor: 'success.light',
                                        borderColor: 'success.main',
                                        borderRadius: 2,
                                    }}
                                >
                                    <Typography variant="body2" color="success.dark" sx={{ fontWeight: 'medium' }}>
                                        Campaign Success Rate
                                    </Typography>
                                    <Typography variant="h5" color="success.dark" sx={{ mt: 1, fontWeight: 'bold' }}>
                                        92%
                                    </Typography>
                                </Paper>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        bgcolor: 'info.light',
                                        borderColor: 'info.main',
                                        borderRadius: 2,
                                    }}
                                >
                                    <Typography variant="body2" color="info.dark" sx={{ fontWeight: 'medium' }}>
                                        Average Engagement
                                    </Typography>
                                    <Typography variant="h5" color="info.dark" sx={{ mt: 1, fontWeight: 'bold' }}>
                                        4.2%
                                    </Typography>
                                </Paper>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
            </Box>
    );
}