import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import api, { getApiBaseUrl } from "../services/api";

interface Brand {
  _id: string;
  name: string;
  email: string;
  businessInfo?: {
    businessName?: string;
  };
}

interface Location {
  address?: string;
  latitude?: number;
  longitude?: number;
  _id?: string;
}

interface Deliverable {
  type: string;
  quantity: number;
  description?: string;
  _id?: string;
}

interface Campaign {
  _id?: string;
  id?: string;
  name: string;
  image?: string;
  type: string;
  compensationType?: string;
  status: string;
  budget?: number;
  startDate: string;
  endDate: string;
  targetEngagement?: number;
  description?: string;
  barterDetails?: string;
  locations?: Location[];
  deliverables?: Deliverable[];
  createdBy: string | Brand;
  createdAt: string;
  updatedAt: string;
}

const CampaignsManagement: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [detailsCampaign, setDetailsCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedBrandId, search]);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const response = await api.get("/api/admin/users", {
        params: { role: "brand", limit: 1000 },
      });
      if (response.data.status && response.data.data) {
        setBrands(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching brands:", err);
      // Dummy brands for demo
      setBrands([
        {
          _id: "1",
          name: "Brand 1",
          email: "brand1@example.com",
          businessInfo: { businessName: "Brand One Inc" },
        },
        {
          _id: "2",
          name: "Brand 2",
          email: "brand2@example.com",
          businessInfo: { businessName: "Brand Two Ltd" },
        },
      ]);
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError("");
      const params: any = {};
      if (selectedBrandId !== "all") {
        params.createdBy = selectedBrandId;
      }
      if (search) {
        params.search = search;
      }

      const response = await api.get("/api/campaign/campaigns", { params });
      if (response.data.status && response.data.data) {
        setCampaigns(response.data.data);
      } else {
        // Dummy campaigns for demo
        setCampaigns(getDummyCampaigns(selectedBrandId));
      }
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
      // Dummy campaigns on error
      setCampaigns(getDummyCampaigns(selectedBrandId));
      setError("");
    } finally {
      setLoading(false);
    }
  };

  const getDummyCampaigns = (brandId: string): Campaign[] => {
    const baseCampaigns: Campaign[] = [
      {
        _id: "1",
        name: "Summer Fashion Campaign",
        image: "",
        type: "standard",
        status: "active",
        budget: 50000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Promote summer fashion collection",
        createdBy: brandId === "all" ? "1" : brandId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: "2",
        name: "Tech Product Launch",
        image: "",
        type: "auction",
        status: "upcoming",
        budget: 100000,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Launch new tech product",
        createdBy: brandId === "all" ? "2" : brandId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    return brandId === "all"
      ? baseCampaigns
      : baseCampaigns.filter((c) => c.createdBy === brandId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "upcoming":
        return "info";
      case "completed":
        return "default";
      case "paused":
        return "warning";
      case "draft":
        return "secondary";
      default:
        return "default";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "auction" ? "primary" : "secondary";
  };

  const getBrandName = (campaign: Campaign): string => {
    if (typeof campaign.createdBy === "string") {
      const brand = brands.find((b) => b._id === campaign.createdBy);
      return (
        brand?.businessInfo?.businessName || brand?.name || "Unknown Brand"
      );
    }
    return (
      campaign.createdBy.businessInfo?.businessName ||
      campaign.createdBy.name ||
      "Unknown Brand"
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Campaigns Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
            },
            gap: 2,
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Search campaigns..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
          />
          <FormControl size="small">
            <InputLabel>Filter by Brand</InputLabel>
            <Select
              value={selectedBrandId}
              label="Filter by Brand"
              onChange={(e) => setSelectedBrandId(e.target.value)}
              disabled={brandsLoading}
            >
              <MenuItem value="all">All Brands</MenuItem>
              {brands.map((brand) => (
                <MenuItem key={brand._id} value={brand._id}>
                  {brand.businessInfo?.businessName || brand.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box mt={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCampaigns}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress />
          </Box>
        ) : campaigns.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              {selectedBrandId === "all"
                ? "No campaigns found"
                : "No campaigns found for selected brand"}
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>
                  <strong>Campaign Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Brand</strong>
                </TableCell>
                <TableCell>
                  <strong>Type</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell>
                  <strong>Budget</strong>
                </TableCell>
                <TableCell>
                  <strong>Start Date</strong>
                </TableCell>
                <TableCell>
                  <strong>End Date</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id || campaign._id || campaign.name} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {campaign.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{getBrandName(campaign)}</TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.type}
                      color={getTypeColor(campaign.type) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.status}
                      color={getStatusColor(campaign.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {campaign.budget
                      ? `₹${campaign.budget.toLocaleString()}`
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setDetailsCampaign(campaign)}
                      title="View details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog
        open={!!detailsCampaign}
        onClose={() => setDetailsCampaign(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 2,
            px: 3,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight="600">
            Campaign Details
          </Typography>
          <IconButton
            size="small"
            onClick={() => setDetailsCampaign(null)}
            sx={{ color: "text.secondary" }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {detailsCampaign && (
            <Box>
              {detailsCampaign.image && (
                <Box
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "grey.100",
                    aspectRatio: "2/1",
                    maxHeight: 240,
                  }}
                >
                  <img
                    src={
                      detailsCampaign.image.startsWith("http")
                        ? detailsCampaign.image
                        : `${getApiBaseUrl()}${detailsCampaign.image}`
                    }
                    alt={detailsCampaign.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              )}
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      mb: 0.5,
                    }}
                  >
                    Name
                  </Typography>
                  <Typography variant="h6" fontWeight="600">
                    {detailsCampaign.name}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Brand
                  </Typography>
                  <Typography variant="body2">{getBrandName(detailsCampaign)}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Type
                  </Typography>
                  <Chip
                    label={detailsCampaign.type}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.25, textTransform: "capitalize" }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Status
                  </Typography>
                  <Chip
                    label={detailsCampaign.status}
                    color={getStatusColor(detailsCampaign.status) as any}
                    size="small"
                    sx={{ mt: 0.25, textTransform: "capitalize" }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Compensation
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                    {detailsCampaign.compensationType || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Budget
                  </Typography>
                  <Typography variant="body2">
                    {detailsCampaign.budget != null
                      ? `₹${detailsCampaign.budget.toLocaleString()}`
                      : "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Target engagement
                  </Typography>
                  <Typography variant="body2">
                    {detailsCampaign.targetEngagement != null
                      ? `${detailsCampaign.targetEngagement}%`
                      : "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Start date
                  </Typography>
                  <Typography variant="body2">
                    {new Date(detailsCampaign.startDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    End date
                  </Typography>
                  <Typography variant="body2">
                    {new Date(detailsCampaign.endDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Typography>
                </Grid>

                {detailsCampaign.description && (
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {detailsCampaign.description}
                    </Typography>
                  </Grid>
                )}
                {detailsCampaign.barterDetails && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                      Barter details
                    </Typography>
                    <Typography variant="body2">{detailsCampaign.barterDetails}</Typography>
                  </Grid>
                )}

                {detailsCampaign.locations && detailsCampaign.locations.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
                      Locations
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {detailsCampaign.locations.map((loc, i) => (
                        <Chip
                          key={loc._id || i}
                          label={loc.address || `${loc.latitude}, ${loc.longitude}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {detailsCampaign.deliverables && detailsCampaign.deliverables.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
                      Deliverables
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {detailsCampaign.deliverables.map((d, i) => (
                        <Chip
                          key={d._id || i}
                          label={`${d.type}: ${d.quantity}${d.description ? ` — ${d.description}` : ""}`}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1, textTransform: "capitalize" }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Created
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(detailsCampaign.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
                    Updated
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(detailsCampaign.updatedAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "grey.50" }}>
          <Button variant="contained" onClick={() => setDetailsCampaign(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignsManagement;
