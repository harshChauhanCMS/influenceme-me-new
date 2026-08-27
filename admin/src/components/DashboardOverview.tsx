import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  alpha,
} from "@mui/material";
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  GroupAdd as GroupAddIcon,
  HowToReg as ApprovedIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { adminService, type DashboardStats } from "../services/adminService";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: "100%",
        borderRadius: 4,
        background: "white",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
        border: `1px solid ${alpha(color, 0.1)}`,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: onClick ? "translateY(-8px)" : "none",
          boxShadow: onClick
            ? `0 12px 30px -10px ${alpha(color, 0.3)}`
            : "0 4px 20px 0 rgba(0,0,0,0.05)",
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${color} 0%, ${alpha(
                color,
                0.8,
              )} 100%)`,
              color: "white",
              boxShadow: `0 4px 10px 0 ${alpha(color, 0.3)}`,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                bgcolor: alpha("#2e7d32", 0.1),
                color: "#2e7d32",
                fontWeight: "bold",
                fontSize: "0.75rem",
                alignSelf: "start",
              }}
            >
              {trend}
            </Box>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>
          {value.toLocaleString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await adminService.getDashboard();
        if (response.status && response.data) {
          setStats(response.data.stats);
        } else {
          setError(response.message || "Failed to load dashboard data");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress thickness={5} size={60} sx={{ color: "#636B2F" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return <Alert severity="info">No data available</Alert>;
  }

  // Pre-process growth data for chart
  const chartData =
    stats.growth?.map((item) => ({
      name: `${item._id.month}/${item._id.year}`,
      users: item.count,
    })) || [];

  return (
    <Box>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1A1A1A">
            Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back to the Infusee admin portal.
          </Typography>
        </Box>
      </Box>

      {/* Primary Statistics */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Users"
            value={stats.users.total}
            icon={<PeopleIcon sx={{ fontSize: 32 }} />}
            color="#636B2F"
            trend="+5% vs last month"
            onClick={() =>
              navigate("/dashboard/users", { state: { roleFilter: "all" } })
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Influencers"
            value={stats.users.influencers}
            icon={<PersonIcon sx={{ fontSize: 32 }} />}
            color="#2196F3"
            trend="+12%"
            onClick={() =>
              navigate("/dashboard/users", {
                state: { roleFilter: "influencer" },
              })
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Brands"
            value={stats.users.brands}
            icon={<BusinessIcon sx={{ fontSize: 32 }} />}
            color="#FF9800"
            trend="+8%"
            onClick={() =>
              navigate("/dashboard/users", { state: { roleFilter: "brand" } })
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Vendors"
            value={stats.users.vendors}
            icon={<StoreIcon sx={{ fontSize: 32 }} />}
            color="#9C27B0"
            trend="+2%"
            onClick={() =>
              navigate("/dashboard/users", { state: { roleFilter: "vendor" } })
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Growth Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
              height: "100%",
              minHeight: 400,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
              <TrendingUpIcon sx={{ mr: 2, color: "#636B2F" }} />
              <Typography variant="h6" fontWeight={700}>
                User Growth Rate
              </Typography>
            </Box>

            <Box sx={{ height: 300, width: "100%" }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorUsers"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#636B2F"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#636B2F"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#eee"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#666", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#636B2F"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="100%"
                >
                  <Typography color="text.secondary">
                    Insufficient data for growth chart
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Secondary Stats */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12 }}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                  background:
                    "linear-gradient(135deg, #1A1A1A 0%, #333333 100%)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Active Sessions
                  </Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {stats.users.active}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 3,
                  }}
                >
                  <ApprovedIcon fontSize="large" />
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    New This Month
                  </Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {stats.users.recent}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: alpha("#636B2F", 0.1),
                    color: "#636B2F",
                    borderRadius: 3,
                  }}
                >
                  <GroupAddIcon fontSize="large" />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;
