import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Paper,
  Avatar,
} from "@mui/material";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { adminService, type UserDetail, type ApiResponse } from "../services/adminService";
import type { IServiceArea } from "../../../shared/types/user";
import UserEditDialog from "./UserEditDialog";
import SocialMediaAnalyticsTab from "./SocialMediaAnalyticsTab";

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onUserUpdated?: () => void;
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  open,
  onClose,
  userId,
  onUserUpdated,
}) => {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [socialMediaAnalytics, setSocialMediaAnalytics] = useState<any>(null);
  const [socialMediaLoading, setSocialMediaLoading] = useState(false);
  const [socialMediaError, setSocialMediaError] = useState("");

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  useEffect(() => {
    // Fetch social media analytics when Social Media Analytics tab is selected
    if (open && userId && user?.role === "influencer" && tabValue === 2) {
      fetchSocialMediaAnalytics();
    }
  }, [open, userId, tabValue, user?.role]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await adminService.getUserById(userId);
      if (response.status && response.data) {
        setUser(response.data);
      } else {
        setError(response.message || "Failed to load user details");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load user details",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialMediaAnalytics = async () => {
    try {
      setSocialMediaLoading(true);
      setSocialMediaError("");
      const response = (await adminService.getInfluencerInstagramAnalytics(userId)) as ApiResponse<any>;
      if (response && response.status && response.data) {
        setSocialMediaAnalytics(response.data);
      } else {
        setSocialMediaError(response ? response.message : "Failed to load social media analytics");
      }
    } catch (err: any) {
      setSocialMediaError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load social media analytics",
      );
    } finally {
      setSocialMediaLoading(false);
    }
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!user) return;

    try {
      await adminService.updateUserStatus(user._id, {
        isActive,
        reason: isActive
          ? "Account activated by admin"
          : "Account deactivated by admin",
      });
      if (onUserUpdated) onUserUpdated();
      fetchUserDetails();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update user status",
      );
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "influencer":
        return "primary";
      case "brand":
        return "warning";
      case "vendor":
        return "secondary";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "influencer":
        return "Influencer";
      case "brand":
        return "Brand";
      case "vendor":
        return "Vendor";
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            User Details
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setEditDialogOpen(true)}
            >
              Edit
            </Button>
            <Button onClick={onClose} size="small">
              <CloseIcon />
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="300px"
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : user ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar
                  src={user.profilePictureUrl}
                  sx={{ width: 80, height: 80, bgcolor: "primary.main" }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {user.name || "N/A"}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                    <Chip
                      label={user.isActive ? "Active" : "Inactive"}
                      color={user.isActive ? "success" : "default"}
                      size="small"
                      icon={user.isActive ? <CheckCircleIcon /> : <BlockIcon />}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{ mb: 2 }}
            >
              <Tab label="Basic Information" />
              <Tab label="Profile Details" />
              {user.role?.toLowerCase() === "influencer" && (
                <Tab label="Social Media Analytics" />
              )}
              <Tab label="Account Info" />
            </Tabs>

            {tabValue === 0 && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <Paper sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Full Name
                    </Typography>
                  </Box>
                  <Typography>{user.name || "N/A"}</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <EmailIcon color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Email
                    </Typography>
                  </Box>
                  <Typography>{user.email}</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PhoneIcon color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Phone
                    </Typography>
                  </Box>
                  <Typography>
                    {user.phoneCode && user.phone
                      ? `${user.phoneCode} ${user.phone}`
                      : user.phone || "N/A"}
                  </Typography>
                </Paper>
                {user.dateOfBirth && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      Date of Birth
                    </Typography>
                    <Typography>
                      {new Date(user.dateOfBirth).toLocaleDateString()}
                    </Typography>
                  </Paper>
                )}
                {user.spokenLanguages && user.spokenLanguages.length > 0 && (
                  <Paper sx={{ p: 2, gridColumn: { xs: "1", sm: "1 / -1" } }}>
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      Languages Spoken
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {user.spokenLanguages.map((lang: string, idx: number) => (
                        <Chip key={idx} label={lang} size="small" />
                      ))}
                    </Box>
                  </Paper>
                )}
                {user.addresses && (
                  <Paper sx={{ p: 2, gridColumn: { xs: "1", sm: "1 / -1" } }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <LocationIcon color="primary" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Address
                      </Typography>
                    </Box>
                    <Typography>
                      {[
                        user.addresses.streetAddress,
                        user.addresses.city,
                        user.addresses.state,
                        user.addresses.pinCode,
                        user.addresses.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "N/A"}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                {user.role === "influencer" && user.influencerInfo && (
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Influencer Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      {user.influencerInfo.influencerSince && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Influencer Since
                          </Typography>
                          <Typography>
                            {user.influencerInfo.influencerSince}
                          </Typography>
                        </Box>
                      )}
                      {user.influencerInfo.influencerType && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Type
                          </Typography>
                          <Typography>
                            {user.influencerInfo.influencerType}
                          </Typography>
                        </Box>
                      )}
                      {user.influencerInfo.workType && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Work Type
                          </Typography>
                          <Typography>
                            {user.influencerInfo.workType}
                          </Typography>
                        </Box>
                      )}
                      {user.influencerInfo.maritalStatus && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Marital Status
                          </Typography>
                          <Typography>
                            {user.influencerInfo.maritalStatus}
                          </Typography>
                        </Box>
                      )}
                      {user.influencerInfo.children !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Children
                          </Typography>
                          <Typography>
                            {user.influencerInfo.children}
                          </Typography>
                        </Box>
                      )}
                      {user.influencerInfo.pets !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Pets
                          </Typography>
                          <Typography>{user.influencerInfo.pets}</Typography>
                        </Box>
                      )}
                      {user.influencerInfo.showOnTop !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Show on Top
                          </Typography>
                          <Chip
                            label={user.influencerInfo.showOnTop ? "Yes" : "No"}
                            size="small"
                          />
                        </Box>
                      )}
                      {user.influencerInfo.genre &&
                        user.influencerInfo.genre.length > 0 && (
                          <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              mb={1}
                            >
                              Genres
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {user.influencerInfo.genre.map(
                                (genre: string, idx: number) => (
                                  <Chip key={idx} label={genre} size="small" />
                                ),
                              )}
                            </Box>
                          </Box>
                        )}
                    </Box>
                  </Paper>
                )}
                {user.role === "brand" && user.businessInfo && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Business Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      {user.businessInfo.businessName && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Business Name
                          </Typography>
                          <Typography>
                            {user.businessInfo.businessName}
                          </Typography>
                        </Box>
                      )}
                      {user.businessInfo.businessEmail && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Business Email
                          </Typography>
                          <Typography>
                            {user.businessInfo.businessEmail}
                          </Typography>
                        </Box>
                      )}
                      {user.businessInfo.websiteUrl && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Website URL
                          </Typography>
                          <Typography>
                            {user.businessInfo.websiteUrl}
                          </Typography>
                        </Box>
                      )}
                      {user.businessInfo.businessType && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Business Type
                          </Typography>
                          <Typography>
                            {user.businessInfo.businessType}
                          </Typography>
                        </Box>
                      )}
                      {user.businessInfo.industry && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Industry
                          </Typography>
                          <Typography>{user.businessInfo.industry}</Typography>
                        </Box>
                      )}
                      {user.businessInfo.businessSize && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Business Size
                          </Typography>
                          <Typography>
                            {user.businessInfo.businessSize}
                          </Typography>
                        </Box>
                      )}
                      {(user.businessInfo.businessDescription ||
                        user.businessInfo.description) && (
                        <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            mb={1}
                          >
                            Description
                          </Typography>
                          <Typography>
                            {user.businessInfo.businessDescription ||
                              user.businessInfo.description}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )}
                {user.role === "vendor" && user.vendorInfo && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Vendor Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      {user.vendorInfo.vendorSince && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Vendor Since
                          </Typography>
                          <Typography>{user.vendorInfo.vendorSince}</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.vendorType && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Vendor Type
                          </Typography>
                          <Typography>{user.vendorInfo.vendorType}</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.businessName && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Business Name
                          </Typography>
                          <Typography>
                            {user.vendorInfo.businessName}
                          </Typography>
                        </Box>
                      )}
                      {user.vendorInfo.businessRegistrationNumber && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Business Registration Number
                          </Typography>
                          <Typography>
                            {user.vendorInfo.businessRegistrationNumber}
                          </Typography>
                        </Box>
                      )}
                      {user.vendorInfo.gstNumber && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            GST Number
                          </Typography>
                          <Typography>{user.vendorInfo.gstNumber}</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.panNumber && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            PAN Number
                          </Typography>
                          <Typography>{user.vendorInfo.panNumber}</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.experience !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Experience (Years)
                          </Typography>
                          <Typography>{user.vendorInfo.experience}</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.availability && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Availability
                          </Typography>
                          <Typography>
                            {user.vendorInfo.availability}
                          </Typography>
                        </Box>
                      )}
                      {user.vendorInfo.rating !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Rating
                          </Typography>
                          <Typography>{user.vendorInfo.rating}/5</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.totalReviews !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Total Reviews
                          </Typography>
                          <Typography>
                            {user.vendorInfo.totalReviews}
                          </Typography>
                        </Box>
                      )}
                      {user.vendorInfo.completedProjects !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Completed Projects
                          </Typography>
                          <Typography>
                            {user.vendorInfo.completedProjects}
                          </Typography>
                        </Box>
                      )}
                      {user.vendorInfo.isVerified !== undefined && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Verified
                          </Typography>
                          <Chip
                            label={user.vendorInfo.isVerified ? "Yes" : "No"}
                            size="small"
                          />
                        </Box>
                      )}
                      {user.vendorInfo.description && (
                        <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            mb={1}
                          >
                            Description
                          </Typography>
                          <Typography>{user.vendorInfo.description}</Typography>
                        </Box>
                      )}
                      {user.vendorInfo.servicesOffered &&
                        user.vendorInfo.servicesOffered.length > 0 && (
                          <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              mb={1}
                            >
                              Services Offered
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {user.vendorInfo.servicesOffered.map(
                                (service: string, idx: number) => (
                                  <Chip
                                    key={idx}
                                    label={service}
                                    size="small"
                                  />
                                ),
                              )}
                            </Box>
                          </Box>
                        )}
                      {user.vendorInfo.serviceAreas &&
                        user.vendorInfo.serviceAreas.length > 0 && (
                          <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                            <Typography
                              variant="subtitle2"
                              color="text.secondary"
                              mb={1}
                            >
                              Service Areas
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {user.vendorInfo.serviceAreas.map(
                                (area: IServiceArea, idx: number) => (
                                  <Chip
                                    key={idx}
                                    label={area.city || area.state || `${area.latitude},${area.longitude}` || 'Area'}
                                    size="small"
                                  />
                                ),
                              )}
                            </Box>
                          </Box>
                        )}
                    </Box>
                  </Paper>
                )}
                {user.role === "vendor" && user.addresses && (
                  <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      Address Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      {user.addresses.streetAddress && (
                        <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Street Address
                          </Typography>
                          <Typography>
                            {user.addresses.streetAddress}
                          </Typography>
                        </Box>
                      )}
                      {user.addresses.city && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            City
                          </Typography>
                          <Typography>{user.addresses.city}</Typography>
                        </Box>
                      )}
                      {user.addresses.state && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            State
                          </Typography>
                          <Typography>{user.addresses.state}</Typography>
                        </Box>
                      )}
                      {user.addresses.pinCode && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Pincode
                          </Typography>
                          <Typography>{user.addresses.pinCode}</Typography>
                        </Box>
                      )}
                      {user.addresses.country && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Country
                          </Typography>
                          <Typography>{user.addresses.country}</Typography>
                        </Box>
                      )}
                      {(user.addresses.latitude ||
                        user.addresses.longitude) && (
                        <Box>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Coordinates
                          </Typography>
                          <Typography>
                            {user.addresses.latitude && user.addresses.longitude
                              ? `${user.addresses.latitude}, ${user.addresses.longitude}`
                              : "N/A"}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}

            {/* Social Media Analytics Tab - Only for influencers */}
            {user.role?.toLowerCase() === "influencer" && tabValue === 2 && (
              <Box>
                {socialMediaLoading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="300px"
                  >
                    <CircularProgress />
                  </Box>
                ) : socialMediaError ? (
                  <Alert severity="error">{socialMediaError}</Alert>
                ) : socialMediaAnalytics ? (
                  <SocialMediaAnalyticsTab socialMediaAnalytics={socialMediaAnalytics} />
                ) : (
                  <Alert severity="info">
                    No social media accounts connected or analytics data available.
                  </Alert>
                )}
              </Box>
            )}

            {/* Account Info Tab */}
            {tabValue ===
              (user.role?.toLowerCase() === "influencer" ? 3 : 2) && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    User ID
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {user._id}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Account Status
                  </Typography>
                  <Chip
                    label={user.isActive ? "Active" : "Inactive"}
                    color={user.isActive ? "success" : "default"}
                    size="small"
                  />
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Created At
                  </Typography>
                  <Typography>
                    {new Date(user.createdAt).toLocaleString()}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Last Updated
                  </Typography>
                  <Typography>
                    {new Date(user.updatedAt).toLocaleString()}
                  </Typography>
                </Paper>
              </Box>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        {user && (
          <Button
            onClick={() => handleStatusChange(!user.isActive)}
            color={user.isActive ? "error" : "success"}
            variant="outlined"
          >
            {user.isActive ? "Deactivate" : "Activate"} User
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>

      {user && (
        <UserEditDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            fetchUserDetails(); // Refresh user data after edit
          }}
          userId={user._id}
          onUserUpdated={() => {
            fetchUserDetails();
            if (onUserUpdated) onUserUpdated();
          }}
        />
      )}
    </Dialog>
  );
};

export default UserDetailDialog;
