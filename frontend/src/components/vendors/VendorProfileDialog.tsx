import React, { FC, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  Rating,
  Divider,
  IconButton,
  Card,
  CardMedia,
  Tabs,
  Tab,
  LinearProgress,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  VerifiedUser as VerifiedIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Event as CalendarIcon,
  TrendingUp as ExperienceIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as AwardIcon,
  RateReview as ReviewIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { IUser } from "../../../../shared/types/user";
import { useAuth } from "@/context/authContext";
import { chatService } from "@/services/chatService";
import type { ChatType } from "@/services/chatService";
import { ReviewCard } from "./ReviewCard";
import { AddReviewDialog } from "./AddReviewDialog";
import vendorReviewService from "@/services/vendorReviewService";
import {
  IVendorReview,
  IVendorReviewStats,
} from "../../../../shared/types/vendorReview";
import { getImageUrl } from "@/utils/fileUtils";

interface VendorProfileDialogProps {
  open: boolean;
  vendor: IUser | null;
  onClose: () => void;
}

export const VendorProfileDialog: FC<VendorProfileDialogProps> = ({
  open,
  vendor,
  onClose,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [reviews, setReviews] = useState<IVendorReview[]>([]);
  const [reviewStats, setReviewStats] = useState<IVendorReviewStats | null>(
    null,
  );
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [addReviewDialogOpen, setAddReviewDialogOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (open && vendor?._id && activeTab === 1) {
      loadReviews();
    }
  }, [open, vendor, activeTab]);

  const loadReviews = async () => {
    if (!vendor?._id) return;
    setReviewsLoading(true);
    try {
      const data = await vendorReviewService.getVendorReviews(vendor._id, {
        page: 1,
        limit: 20,
      });
      setReviews(data.reviews);
      setReviewStats(data.stats);
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await vendorReviewService.markHelpful(reviewId);
    } catch (error) {
      console.error("Failed to mark review as helpful:", error);
    }
  };

  const handleReviewSuccess = () => {
    loadReviews();
  };

  const currentUserId = user ? String((user as any).id ?? (user as any)._id ?? "") : "";
  const canChatWithVendor =
    !!vendor?._id &&
    !!currentUserId &&
    (user?.role === "brand" || user?.role === "influencer" || user?.role === "admin") &&
    currentUserId !== String(vendor._id);

  const handleChatToVendor = async () => {
    if (!vendor?._id || !currentUserId) return;
    setChatError(null);
    setChatLoading(true);
    try {
      if (currentUserId === String(vendor._id)) {
        setChatError("You cannot chat with yourself.");
        return;
      }
      const chatType: ChatType =
        user.role === "brand"
          ? "brand-vendor"
          : user.role === "influencer"
            ? "vendor-influencer"
            : "brand-vendor";
      const participantId = typeof vendor._id === "string" ? vendor._id : (vendor as any)._id?.toString?.() ?? String(vendor._id);
      let roomId: string | null = null;
      try {
        const room = await chatService.createOrGetChatRoom({
          participantId,
          chatType,
        });
        roomId = room?._id ?? (room as any)?.id ?? null;
      } catch (createErr: any) {
        if (createErr.response?.status === 409) {
          const { data: rooms } = await chatService.getChatRooms(1, 100);
          const existing = rooms.find(
            (r) => String((r as any).participantInfo?._id ?? (r as any).participantInfo?.id) === String(participantId)
          );
          if (existing) roomId = existing._id;
        }
        if (!roomId) throw createErr;
      }
      if (!roomId) {
        setChatError("Could not open chat. Please try again.");
        return;
      }
      onClose();
      router.push(`/chat?roomId=${roomId}`);
    } catch (err: any) {
      setChatError(err.response?.data?.message || err.message || "Failed to start chat.");
    } finally {
      setChatLoading(false);
    }
  };

  const vendorInfo = vendor?.vendorInfo;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: "90vh",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            bgcolor: "#8CC342",
            color: "white",
            py: 3,
            position: "relative",
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "white",
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              src={getImageUrl(vendor?.profilePictureUrl)}
              sx={{ width: 100, height: 100, border: "4px solid white" }}
            >
              {vendor?.name?.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {vendorInfo?.businessName || vendor?.name}
                </Typography>
                {vendorInfo?.isVerified && (
                  <VerifiedIcon sx={{ fontSize: 28 }} />
                )}
              </Box>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
                {vendorInfo?.vendorType || "Vendor"}
              </Typography>
              {vendorInfo?.rating !== undefined && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Rating
                    value={vendorInfo.rating}
                    precision={0.1}
                    readOnly
                    sx={{
                      "& .MuiRating-iconFilled": {
                        color: "white",
                      },
                    }}
                  />
                  <Typography variant="body2">
                    ({vendorInfo.totalReviews || 0} reviews)
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogTitle>

        {/* Tabs */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "1rem",
              },
              "& .Mui-selected": {
                color: "#8CC342",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#8CC342",
              },
            }}
          >
            <Tab label="About" />
            <Tab label={`Reviews (${reviewStats?.totalReviews || 0})`} />
          </Tabs>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          {/* About Tab */}
          {activeTab === 0 && (
            <Box>
              {/* Stats */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                  mb: 3,
                }}
              >
                {vendorInfo?.experience && (
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "#f0f9ff",
                      borderColor: "#8CC342",
                    }}
                  >
                    <ExperienceIcon
                      sx={{ fontSize: 32, color: "#8CC342", mb: 1 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {vendorInfo.experience}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Years Experience
                    </Typography>
                  </Card>
                )}
                {vendorInfo?.completedProjects !== undefined && (
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "#f0f9ff",
                      borderColor: "#8CC342",
                    }}
                  >
                    <CheckCircleIcon
                      sx={{ fontSize: 32, color: "#8CC342", mb: 1 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {vendorInfo.completedProjects}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Projects Completed
                    </Typography>
                  </Card>
                )}
                {vendorInfo?.rating !== undefined && (
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "#f0f9ff",
                      borderColor: "#8CC342",
                    }}
                  >
                    <AwardIcon sx={{ fontSize: 32, color: "#8CC342", mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {vendorInfo.rating.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Average Rating
                    </Typography>
                  </Card>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Description */}
              {vendorInfo?.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                    About
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.8 }}
                  >
                    {vendorInfo.description}
                  </Typography>
                </Box>
              )}

              {/* Contact Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  Contact Information
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {vendor?.email && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <EmailIcon sx={{ color: "#8CC342" }} />
                      <Typography variant="body2">{vendor?.email}</Typography>
                    </Box>
                  )}
                  {vendor?.phone && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <PhoneIcon sx={{ color: "#8CC342" }} />
                      <Typography variant="body2">{vendor?.phone}</Typography>
                    </Box>
                  )}
                  {vendor?.addresses && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <LocationIcon sx={{ color: "#8CC342" }} />
                      <Typography variant="body2">
                        {[
                          vendor?.addresses.streetAddress,
                          vendor?.addresses.city,
                          vendor?.addresses.state,
                          vendor?.addresses.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Service Areas */}
              {vendorInfo?.serviceAreas &&
                vendorInfo.serviceAreas.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                      Service Areas
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {vendorInfo.serviceAreas.map((area: any, idx: number) => {
                        const label =
                          typeof area === "string"
                            ? area
                            : area.city ||
                              area.address ||
                              (area.latitude && area.longitude
                                ? `${area.latitude}, ${area.longitude}`
                                : "Area");
                        return (
                          <Chip
                            key={idx}
                            label={label}
                            icon={<LocationIcon />}
                            sx={{
                              bgcolor: "#e6f3d8",
                              color: "#699e31",
                              fontWeight: 600,
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}

              {/* Business Details */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  Business Details
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 2,
                  }}
                >
                  {vendorInfo?.businessName && (
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <BusinessIcon
                          sx={{ color: "text.secondary", fontSize: 20 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Business Name
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {vendorInfo.businessName}
                      </Typography>
                    </Box>
                  )}
                  {vendorInfo?.vendorSince && (
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <CalendarIcon
                          sx={{ color: "text.secondary", fontSize: 20 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Vendor Since
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(vendorInfo.vendorSince).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  {vendorInfo?.availability && (
                    <Box>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Availability
                        </Typography>
                      </Box>
                      <Chip
                        label={vendorInfo.availability}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  )}
                  {vendorInfo?.businessRegistrationNumber && (
                    <Box>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Registration Number
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {vendorInfo.businessRegistrationNumber}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Certifications */}
              {vendorInfo?.certifications &&
                vendorInfo.certifications.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                      Certifications
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {vendorInfo.certifications.map((cert, idx) => (
                        <Chip
                          key={idx}
                          label={cert}
                          icon={<AwardIcon />}
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

              {/* Portfolio */}
              {vendorInfo?.portfolio && vendorInfo.portfolio.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                    Portfolio
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: 2,
                    }}
                  >
                    {vendorInfo.portfolio.slice(0, 6).map((image, idx) => (
                      <Card
                        key={idx}
                        sx={{ borderRadius: 2, overflow: "hidden" }}
                      >
                        <CardMedia
                          component="img"
                          height="150"
                          image={getImageUrl(image)}
                          alt={`Portfolio ${idx + 1}`}
                          sx={{ objectFit: "cover", cursor: "pointer" }}
                          onClick={() =>
                            window.open(getImageUrl(image), "_blank")
                          }
                        />
                      </Card>
                    ))}
                  </Box>
                  {vendorInfo.portfolio.length > 6 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      +{vendorInfo.portfolio.length - 6} more images
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Reviews Tab */}
          {activeTab === 1 && (
            <Box>
              {/* Review Stats */}
              {reviewStats && (
                <Box sx={{ mb: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 3,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h3"
                        sx={{ fontWeight: "bold", color: "#8CC342" }}
                      >
                        {reviewStats.averageRating.toFixed(1)}
                      </Typography>
                      <Rating
                        value={reviewStats.averageRating}
                        precision={0.1}
                        readOnly
                        size="large"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Based on {reviewStats.totalReviews} reviews
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<ReviewIcon />}
                      onClick={() => setAddReviewDialogOpen(true)}
                      sx={{
                        textTransform: "none",
                        bgcolor: "#8CC342",
                        "&:hover": { bgcolor: "#699e31" },
                      }}
                    >
                      Write a Review
                    </Button>
                  </Box>

                  {/* Rating Distribution */}
                  <Box sx={{ mb: 3 }}>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <Box
                        key={star}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 50 }}>
                          {star} star
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={
                            reviewStats.totalReviews > 0
                              ? (reviewStats.ratingDistribution[
                                  star as keyof typeof reviewStats.ratingDistribution
                                ] /
                                  reviewStats.totalReviews) *
                                100
                              : 0
                          }
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "#e0e0e0",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: "#8CC342",
                            },
                          }}
                        />
                        <Typography variant="body2" sx={{ minWidth: 40 }}>
                          {
                            reviewStats.ratingDistribution[
                              star as keyof typeof reviewStats.ratingDistribution
                            ]
                          }
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Reviews List */}
              {reviewsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress sx={{ color: "#8CC342" }} />
                </Box>
              ) : reviews.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review._id}
                      review={review}
                      onMarkHelpful={handleMarkHelpful}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No reviews yet. Be the first to review this vendor!
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        {chatError && (
          <Alert
            severity="error"
            onClose={() => setChatError(null)}
            sx={{ mx: 3, mt: 1 }}
          >
            {chatError}
          </Alert>
        )}
        <DialogActions
          sx={{ p: 3, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Box sx={{ flex: 1 }} />
          {canChatWithVendor && (
            <Button
              onClick={handleChatToVendor}
              disabled={chatLoading}
              variant="contained"
              startIcon={chatLoading ? <CircularProgress size={18} color="inherit" /> : <ChatIcon />}
              sx={{
                textTransform: "none",
                bgcolor: "#8CC342",
                "&:hover": { bgcolor: "#699e31" },
              }}
            >
              {chatLoading ? "Opening…" : "Chat with vendor"}
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Review Dialog */}
      <AddReviewDialog
        open={addReviewDialogOpen}
        vendorId={vendor?._id || ""}
        vendorName={vendorInfo?.businessName || vendor?.name || ""}
        onClose={() => setAddReviewDialogOpen(false)}
        onSuccess={handleReviewSuccess}
      />
    </>
  );
};
