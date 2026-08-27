import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Campaign as CampaignIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';
import type { ApiResponse } from '../services/adminService';

interface AnalyticsData {
  period: number;
  users: {
    total: number;
    influencers: number;
    brands: number;
    vendors: number;
    active: number;
    new: number;
    growth: Array<{ _id: { year: number; month: number; day: number }; count: number }>;
    growthByRole: Array<{ _id: string; count: number }>;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    draft: number;
    new: number;
    growth: Array<{ _id: { year: number; month: number; day: number }; count: number }>;
    byStatus: Array<{ _id: string; count: number }>;
    byType: Array<{ _id: string; count: number }>;
  };
  offers: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
  };
  bids: {
    total: number;
    pending: number;
    accepted: number;
  };
  deals: {
    total: number;
    running: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
  revenue: {
    total: number;
    platformFees: number;
    data: Array<{ _id: { year: number; month: number; day: number }; totalRevenue: number; platformFees: number; count: number }>;
    byType: Array<{ _id: string; totalAmount: number; count: number }>;
  };
  transactions: {
    total: number;
    credit: number;
    debit: number;
    recent: number;
  };
  chat: {
    totalRooms: number;
    totalMessages: number;
    recentMessages: number;
  };
  topPerformers: {
    brands: Array<{ brandId: string; brandName: string; campaignCount: number }>;
    influencers: Array<{ _id: string; dealCount: number }>;
  };
}

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = (await adminService.getAnalytics(period)) as ApiResponse<AnalyticsData>;
      setData(response.data as AnalyticsData);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const StatCard = ({
    title,
    value,
    icon,
    color = 'primary',
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
    subtitle?: string;
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {typeof value === 'number' ? formatNumber(value) : value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Analytics Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value as number)}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
            <MenuItem value={180}>Last 6 months</MenuItem>
            <MenuItem value={365}>Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Stats */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 3,
        }}
      >
        <StatCard
          title="Total Users"
          value={data.users.total}
          icon={<PeopleIcon />}
          color="primary"
          subtitle={`${data.users.new} new in ${period} days`}
        />
        <StatCard
          title="Total Campaigns"
          value={data.campaigns.total}
          icon={<CampaignIcon />}
          color="info"
          subtitle={`${data.campaigns.active} active`}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          icon={<AttachMoneyIcon />}
          color="success"
          subtitle={`${formatCurrency(data.revenue.platformFees)} platform fees`}
        />
        <StatCard
          title="Total Deals"
          value={data.deals.total}
          icon={<CheckCircleIcon />}
          color="secondary"
          subtitle={`${data.deals.completed} completed`}
        />
      </Box>

      {/* User Analytics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            User Analytics
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mt: 1,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Influencers
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.users.influencers)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Brands
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.users.brands)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Vendors
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.users.vendors)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatNumber(data.users.active)}
              </Typography>
            </Box>
          </Box>
          {data.users.growthByRole.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                New Users by Role (Last {period} days)
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {data.users.growthByRole.map((item) => (
                  <Chip
                    key={item._id}
                    label={`${item._id}: ${item.count}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Campaign Analytics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Campaign Analytics
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mt: 1,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Active Campaigns
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatNumber(data.campaigns.active)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {formatNumber(data.campaigns.completed)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Draft
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {formatNumber(data.campaigns.draft)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                New Campaigns
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.campaigns.new)}
              </Typography>
            </Box>
          </Box>
          {data.campaigns.byStatus.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Campaigns by Status
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {data.campaigns.byStatus.map((item) => (
                  <Chip
                    key={item._id}
                    label={`${item._id}: ${item.count}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Offers & Bids */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
          },
          gap: 3,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Offers
            </Typography>
            <Box display="flex" gap={2} mt={2}>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatNumber(data.offers.total)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {formatNumber(data.offers.pending)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Accepted
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatNumber(data.offers.accepted)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="info.main">
                  {formatNumber(data.offers.completed)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Bids
            </Typography>
            <Box display="flex" gap={2} mt={2}>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatNumber(data.bids.total)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {formatNumber(data.bids.pending)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary">
                  Accepted
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatNumber(data.bids.accepted)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Payment & Revenue */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Payment & Revenue Analytics
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mt: 1,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Payments
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.payments.total)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatNumber(data.payments.completed)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {formatNumber(data.payments.pending)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Failed
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatNumber(data.payments.failed)}
              </Typography>
            </Box>
          </Box>
          {data.revenue.byType.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Revenue by Payment Type
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {data.revenue.byType.map((item) => (
                  <Chip
                    key={item._id}
                    label={`${item._id}: ${formatCurrency(item.totalAmount)} (${item.count})`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Top Performers */}
      {data.topPerformers.brands.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Top Performing Brands
            </Typography>
            <Box sx={{ mt: 2 }}>
              {data.topPerformers.brands.map((brand, index) => (
                <Box
                  key={brand.brandId}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  py={1}
                  borderBottom={index < data.topPerformers.brands.length - 1 ? '1px solid' : 'none'}
                  borderColor="divider"
                >
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {brand.brandName || 'Unknown Brand'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {brand.campaignCount} campaigns
                    </Typography>
                  </Box>
                  <Chip label={`#${index + 1}`} size="small" color="primary" />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Chat Analytics */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Communication Analytics
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(3, 1fr)',
              },
              gap: 2,
              mt: 1,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Chat Rooms
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.chat.totalRooms)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Messages
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(data.chat.totalMessages)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Recent Messages
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {formatNumber(data.chat.recentMessages)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Analytics;

