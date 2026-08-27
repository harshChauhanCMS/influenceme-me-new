"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";
import { useAuth } from "@/context/authContext";
import { checkBrandProfileCompletion } from "@/utils/profileCompletion";
import userService from "@/services/userService";
import { GoogleMapsLocationPicker } from "@/components/campaigns/GoogleMapsLocationPicker";
import { countryCodes } from "@/utils/countryCodes";
import { apiClient } from "@/config/api";

const BUSINESS_TYPES = [
  "Private Limited",
  "Public Limited",
  "Partnership",
  "Sole Proprietorship",
  "LLP",
  "Other",
];

const INDUSTRIES = [
  "Fashion & Apparel",
  "Beauty & Cosmetics",
  "Food & Beverage",
  "Technology",
  "Healthcare",
  "Fitness & Wellness",
  "Travel & Tourism",
  "Entertainment",
  "Education",
  "Real Estate",
  "Automotive",
  "Finance",
  "E-commerce",
  "Other",
];

const BUSINESS_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501+ employees",
];

export default function BrandProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    phoneCode: "",
    businessName: "",
    businessType: "",
    industry: "",
    businessSize: "",
    businessEmail: "",
    businessDescription: "",
    websiteUrl: "",
    streetAddress: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
    latitude: "",
    longitude: "",
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [uploadedProfilePictureUrl, setUploadedProfilePictureUrl] = useState<
    string | null
  >(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        phoneCode: user.phoneCode || "+91",
        businessName: user.businessInfo?.businessName || "",
        businessType: user.businessInfo?.businessType || "",
        industry: user.businessInfo?.industry || "",
        businessSize: user.businessInfo?.businessSize || "",
        businessEmail: user.businessInfo?.businessEmail || "",
        businessDescription: user.businessInfo?.businessDescription || "",
        websiteUrl: user.businessInfo?.websiteUrl || "",
        streetAddress: user.addresses?.streetAddress || "",
        city: user.addresses?.city || "",
        state: user.addresses?.state || "",
        country: user.addresses?.country || "",
        pinCode: user.addresses?.pinCode || "",
        latitude: user.addresses?.latitude || "",
        longitude: user.addresses?.longitude || "",
      });
      setProfileImagePreview(user.profilePictureUrl || "");
    }
  }, [user]);

  const profileStatus = checkBrandProfileCompletion(user);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
    setError(null);
    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      const uploadRes = await apiClient.post<{
        status: boolean;
        data: { url: string };
      }>("/api/file/upload", uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (uploadRes.data?.data?.url) {
        setUploadedProfilePictureUrl(uploadRes.data.data.url);
      }
    } catch (err: unknown) {
      const ax =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
          : null;
      setError(
        ax?.response?.data?.message ||
          (err instanceof Error ? err.message : "Failed to upload image"),
      );
      setProfileImage(null);
      setProfileImagePreview(user?.profilePictureUrl || "");
    } finally {
      setUploadingImage(false);
    }
    e.target.value = "";
  };

  const handleLocationSelect = (location: {
    address: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
    latitude: number;
    longitude: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      streetAddress: location.address,
      city: location.city || "",
      state: location.state || "",
      country: location.country || "",
      pinCode: location.pinCode || "",
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
    }));
    setLocationPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataToSend = new FormData();

      // Basic fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("phoneCode", formData.phoneCode);

      // Business info
      formDataToSend.append("businessName", formData.businessName);
      formDataToSend.append("businessType", formData.businessType);
      formDataToSend.append("industry", formData.industry);
      formDataToSend.append("businessSize", formData.businessSize);
      formDataToSend.append("businessEmail", formData.businessEmail);
      formDataToSend.append(
        "businessDescription",
        formData.businessDescription,
      );
      formDataToSend.append("websiteUrl", formData.websiteUrl);

      // Address
      formDataToSend.append("streetAddress", formData.streetAddress);
      formDataToSend.append("city", formData.city);
      formDataToSend.append("state", formData.state);
      formDataToSend.append("country", formData.country);
      formDataToSend.append("pinCode", formData.pinCode);
      formDataToSend.append("latitude", formData.latitude);
      formDataToSend.append("longitude", formData.longitude);

      // Profile image: use URL from upload (already uploaded on image select)
      if (uploadedProfilePictureUrl) {
        formDataToSend.append("profilePictureUrl", uploadedProfilePictureUrl);
      }

      // Debug: Log all form data
      console.log("=== Submitting Profile Update ===");
      console.log("Form Data Contents:");
      for (const [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }

      const updatedUser = await userService.updateUserProfile(formDataToSend);
      console.log("Updated user received:", updatedUser);

      await refreshUser();
      console.log("User refreshed, new user state:", user);

      setSuccess("Profile updated successfully!");
      setUploadedProfilePictureUrl(null);
      setProfileImage(null);
      setProfileImagePreview(updatedUser?.profilePictureUrl ?? user?.profilePictureUrl ?? "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error("Profile update error:", err);
      const ax = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }) : null;
      console.error("Error response:", ax?.response);
      setError(
        ax?.response?.data?.message ||
          (err instanceof Error ? err.message : "Failed to update profile"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && (!user || user.role !== "brand")) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {!user ? "Please log in to view this page." : "This page is only accessible to brand users."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#f5f7fa", minHeight: "100vh", pb: 6 }}>
      <Box
        sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3, md: 4 }, py: 4 }}
      >
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: "#1a1a1a", mb: 1 }}
          >
            Brand Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your business information and profile settings
          </Typography>
        </Box>

        {/* Profile Completion Status */}
        {!profileStatus.isComplete && (
          <Alert
            severity="warning"
            icon={<InfoIcon />}
            sx={{
              mb: 3,
              borderRadius: 3,
              bgcolor: "#fff8e1",
              border: "1px solid #ffe082",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Box>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, mb: 1, color: "#f57c00" }}
              >
                Complete your profile to unlock all features
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: "#5f4c00" }}>
                You won&#39;t be able to create campaigns, send offers, or
                approach vendors until your profile is complete.
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
              >
                <LinearProgress
                  variant="determinate"
                  value={profileStatus.completionPercentage}
                  sx={{
                    flex: 1,
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "#ffe57f",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#8CC342",
                      borderRadius: 5,
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "#f57c00", minWidth: 45 }}
                >
                  {profileStatus.completionPercentage}%
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                {profileStatus.missingFieldsLabels
                  .slice(0, 5)
                  .map((field, idx) => (
                    <Chip
                      key={idx}
                      label={field}
                      size="small"
                      sx={{
                        bgcolor: "#fff3e0",
                        color: "#e65100",
                        fontWeight: 500,
                        border: "1px solid #ffb74d",
                      }}
                    />
                  ))}
                {profileStatus.missingFieldsLabels.length > 5 && (
                  <Chip
                    label={`+${profileStatus.missingFieldsLabels.length - 5} more`}
                    size="small"
                    sx={{
                      bgcolor: "#fff3e0",
                      color: "#e65100",
                      fontWeight: 500,
                      border: "1px solid #ffb74d",
                    }}
                  />
                )}
              </Box>
            </Box>
          </Alert>
        )}

        {profileStatus.isComplete && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              borderRadius: 3,
              bgcolor: "#f1f8e9",
              border: "1px solid #aed581",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, color: "#558b2f" }}
            >
              ✅ Your profile is complete!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can now create campaigns, send offers, and approach vendors.
            </Typography>
          </Alert>
        )}

        {/* Success/Error Messages */}
        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess(null)}
            sx={{
              mb: 3,
              borderRadius: 3,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {success}
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              mb: 3,
              borderRadius: 3,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {error}
          </Alert>
        )}

        {/* Profile Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Profile Picture Section */}
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              mb: 3,
              bgcolor: "white",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={profileImagePreview}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: "#8CC342",
                    fontSize: 40,
                    fontWeight: 600,
                    border: "4px solid #f5f7fa",
                  }}
                >
                  {formData.name?.charAt(0)}
                </Avatar>
                {uploadingImage && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <CircularProgress size={32} sx={{ color: "white" }} />
                  </Box>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Profile Picture
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {uploadingImage
                    ? "Uploading..."
                    : "Upload a professional photo. Recommended: Square image, at least 400x400px"}
                </Typography>
                <input
                  accept="image/*"
                  id="profile-image-upload"
                  type="file"
                  hidden
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                />
                <label htmlFor="profile-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    disabled={uploadingImage}
                    startIcon={
                      uploadingImage ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <PhotoCameraIcon />
                      )
                    }
                    sx={{
                      textTransform: "none",
                      borderColor: "#8CC342",
                      color: "#8CC342",
                      "&:hover": {
                        borderColor: "#699e31",
                        bgcolor: "#f1f8e9",
                      },
                      "&.Mui-disabled": {
                        borderColor: "#8CC342",
                        color: "#8CC342",
                        opacity: 0.7,
                      },
                    }}
                  >
                    {uploadingImage ? "Uploading..." : "Change Photo"}
                  </Button>
                </label>
              </Box>
            </Box>
          </Paper>

          {/* Basic Information */}
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              mb: 3,
              bgcolor: "white",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "#e6f3d8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PersonIcon sx={{ color: "#8CC342", fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Basic Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your personal contact details
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 4,
              }}
            >
              <TextField
                fullWidth
                required
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />
              <TextField
                fullWidth
                required
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                InputProps={{
                  sx: { borderRadius: 2 },
                }}
              />
              <Box
                sx={{
                  gridColumn: { xs: "span 1", md: "span 2" },
                  display: "flex",
                  gap: 1.5,
                }}
              >
                <FormControl sx={{ minWidth: 130 }}>
                  <InputLabel>Code</InputLabel>
                  <Select
                    value={formData.phoneCode}
                    label="Code"
                    onChange={(e) =>
                      handleSelectChange("phoneCode", e.target.value)
                    }
                    sx={{ borderRadius: 2 }}
                    renderValue={(value) => {
                      const country = countryCodes.find(
                        (c) => c.dial === value,
                      );
                      return country
                        ? `${country.flag} ${country.dial}`
                        : value;
                    }}
                  >
                    {countryCodes.map((country) => (
                      <MenuItem key={country.code} value={country.dial}>
                        {country.flag} {country.dial} {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  required
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  InputProps={{
                    sx: { borderRadius: 2 },
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Business Information */}
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              mb: 3,
              bgcolor: "white",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "#e6f3d8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BusinessIcon sx={{ color: "#8CC342", fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Business Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Details about your company
                </Typography>
              </Box>
            </Box>
            {/* Row 1 - Business Name & Email */}
            <Box
              sx={{
                display: "flex",
                gap: 4,
                mb: 4,
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <TextField
                fullWidth
                required
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                fullWidth
                required
                label="Business Email"
                name="businessEmail"
                type="email"
                value={formData.businessEmail}
                onChange={handleInputChange}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Box>

            {/* Row 2 - Business Type & Industry */}
            <Box
              sx={{
                display: "flex",
                gap: 4,
                mb: 4,
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <FormControl fullWidth required>
                <InputLabel>Business Type</InputLabel>
                <Select
                  value={formData.businessType}
                  label="Business Type"
                  onChange={(e) =>
                    handleSelectChange("businessType", e.target.value)
                  }
                  sx={{ borderRadius: 2 }}
                >
                  {BUSINESS_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={formData.industry}
                  label="Industry"
                  onChange={(e) =>
                    handleSelectChange("industry", e.target.value)
                  }
                  sx={{ borderRadius: 2 }}
                >
                  {INDUSTRIES.map((industry) => (
                    <MenuItem key={industry} value={industry}>
                      {industry}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Row 3 - Business Size & Website */}
            <Box
              sx={{
                display: "flex",
                gap: 4,
                mb: 4,
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Business Size</InputLabel>
                <Select
                  value={formData.businessSize}
                  label="Business Size"
                  onChange={(e) =>
                    handleSelectChange("businessSize", e.target.value)
                  }
                  sx={{ borderRadius: 2 }}
                >
                  {BUSINESS_SIZES.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Website URL"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                placeholder="https://www.example.com"
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Box>

            {/* Divider before Description */}
            <Divider sx={{ my: 4 }} />

            {/* Description Section - COMPLETELY SEPARATE */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2, color: "#1a1a1a" }}
              >
                Business Description
              </Typography>
              <TextField
                fullWidth
                required
                multiline
                rows={5}
                name="businessDescription"
                value={formData.businessDescription}
                onChange={handleInputChange}
                placeholder="Tell us about your business, what you do, and what makes you unique..."
                helperText={`${formData.businessDescription.length}/500 characters`}
                inputProps={{ maxLength: 500 }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            </Box>
          </Paper>

          {/* Business Location */}
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              mb: 3,
              bgcolor: "white",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "#e6f3d8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LocationIcon sx={{ color: "#8CC342", fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Business Location
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the button below to select your business location on the
                  map
                </Typography>
              </Box>
            </Box>

            {/* Location Display / Selector */}
            <Box
              onClick={() => setLocationPickerOpen(true)}
              sx={{
                p: 3,
                border: "2px dashed",
                borderColor: formData.streetAddress ? "#8CC342" : "#e0e0e0",
                borderRadius: 3,
                bgcolor: formData.streetAddress ? "#f1f8e9" : "#fafafa",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  borderColor: "#8CC342",
                  bgcolor: "#f1f8e9",
                  boxShadow: "0 4px 12px rgba(140, 195, 66, 0.15)",
                },
              }}
            >
              {formData.streetAddress ? (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "start",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, color: "#1a1a1a", mb: 1 }}
                      >
                        {formData.streetAddress}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[
                          formData.city,
                          formData.state,
                          formData.country,
                          formData.pinCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LocationIcon />}
                      sx={{
                        textTransform: "none",
                        borderColor: "#8CC342",
                        color: "#8CC342",
                        "&:hover": {
                          borderColor: "#699e31",
                          bgcolor: "transparent",
                        },
                      }}
                    >
                      Change
                    </Button>
                  </Box>
                  {formData.latitude && formData.longitude && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 2,
                        pt: 2,
                        borderTop: "1px solid #c5e1a5",
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "#8CC342",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "#558b2f", fontWeight: 600 }}
                      >
                        Location verified with coordinates
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({formData.latitude}, {formData.longitude})
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <LocationIcon
                    sx={{ fontSize: 48, color: "#bdbdbd", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "#757575", mb: 1 }}
                  >
                    No Location Selected
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Click here to select your business location on the map
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<LocationIcon />}
                    sx={{
                      textTransform: "none",
                      bgcolor: "#8CC342",
                      "&:hover": {
                        bgcolor: "#699e31",
                      },
                    }}
                  >
                    Select Location
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Submit Button */}
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 4 }}
          >
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={saving}
              startIcon={
                saving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              sx={{
                textTransform: "none",
                bgcolor: "#8CC342",
                px: 5,
                py: 1.5,
                borderRadius: 2,
                fontSize: "1rem",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(140, 195, 66, 0.3)",
                "&:hover": {
                  bgcolor: "#699e31",
                  boxShadow: "0 6px 16px rgba(140, 195, 66, 0.4)",
                },
              }}
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </Button>
          </Box>
        </Box>

        {/* Location Picker Dialog */}
        <Dialog
          open={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              minHeight: "500px", // Ensure enough space for results
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#8CC342",
              color: "white",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 2.5,
              px: 3,
            }}
          >
            <LocationIcon sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Business Location
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Search and select your business address from the map
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent
            sx={{
              p: 4,
              minHeight: "400px", // Plenty of space for autocomplete dropdown
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start typing your business address. We&apos;ll help you find the
                exact location with coordinates.
              </Typography>
            </Box>
            <GoogleMapsLocationPicker
              onLocationSelect={handleLocationSelect}
              label="Search for your business location"
              placeholder="Enter your business address..."
              country="IN"
            />
            {/* Spacer to ensure dropdown has room */}
            <Box sx={{ flex: 1, minHeight: "250px" }} />
          </DialogContent>
          <DialogActions
            sx={{ p: 3, borderTop: "1px solid #e0e0e0", bgcolor: "#fafafa" }}
          >
            <Button
              onClick={() => setLocationPickerOpen(false)}
              variant="outlined"
              size="large"
              sx={{
                textTransform: "none",
                borderColor: "#8CC342",
                color: "#8CC342",
                px: 4,
                "&:hover": {
                  borderColor: "#699e31",
                  bgcolor: "#f1f8e9",
                },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
