import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
} from "@mui/material";
import { TrendingUp as TrendingUpIcon } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { adminService } from "../services/adminService";
import type { ApiResponse } from "../services/adminService";
import SocialMediaAnalyticsTab from "./SocialMediaAnalyticsTab";

const SocialMediaAnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get("id");

  // State for analytics data
  const [socialMediaAnalytics, setSocialMediaAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for influencer selection
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loadingInfluencers, setLoadingInfluencers] = useState(false);

  // Fetch influencers on mount
  useEffect(() => {
    fetchInfluencers();
  }, []);

  const fetchInfluencers = async () => {
    try {
      setLoadingInfluencers(true);
      const response = await adminService.getUsers({
        role: "influencer",
        limit: 100,
      });
      if (response.status) {
        setInfluencers(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch influencers:", err);
    } finally {
      setLoadingInfluencers(false);
    }
  };

  const handleInfluencerChange = (id: string) => {
    setSearchParams({ id });
  };

  // Fetch analytics when user selected
  useEffect(() => {
    if (selectedUserId) {
      fetchAnalytics(selectedUserId);
    } else {
      setSocialMediaAnalytics(null);
    }
  }, [selectedUserId]);

  const fetchAnalytics = async (userId: string) => {
    try {
      setLoadingAnalytics(true);
      setError(null);
      // This endpoint now returns { instagram, facebook, youtube }
      const response = (await adminService.getInfluencerInstagramAnalytics(userId)) as ApiResponse<any>;
      if (response && response.status) {
        setSocialMediaAnalytics(response.data);
      } else {
        setError(response ? response.message : "Failed to load analytics data.");
      }
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err);
      if (err.response && err.response.status === 404) {
        setError(
          "Social media accounts not connected or analytics unavailable for this user.",
        );
      } else {
        setError(err.message || "Failed to load analytics data.");
      }
      setSocialMediaAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
          boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TrendingUpIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Social Media Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View comprehensive cross-platform performance metrics.
            </Typography>
          </Box>
        </Box>

        <FormControl size="small" sx={{ minWidth: 250, ml: "auto" }}>
          <InputLabel id="influencer-select-label">
            Select Influencer
          </InputLabel>
          <Select
            labelId="influencer-select-label"
            value={selectedUserId || ""}
            label="Select Influencer"
            onChange={(e) => handleInfluencerChange(e.target.value)}
            disabled={loadingInfluencers}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {influencers.map((inf) => (
              <MenuItem key={inf._id} value={inf._id}>
                {inf.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {!selectedUserId ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          color="text.secondary"
          textAlign="center"
          p={4}
        >
          <TrendingUpIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">Select an Influencer</Typography>
          <Typography variant="body2">
            Choose an influencer from the dropdown above to view their
            consolidated social media presence.
          </Typography>
        </Box>
      ) : loadingAnalytics ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : socialMediaAnalytics ? (
        <SocialMediaAnalyticsTab socialMediaAnalytics={socialMediaAnalytics} />
      ) : (
        <Alert severity="info">No data available for the selected user.</Alert>
      )}
    </Container>
  );
};

export default SocialMediaAnalyticsPage;
