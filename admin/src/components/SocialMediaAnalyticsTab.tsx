import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  YouTube as YouTubeIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";

interface Props {
  socialMediaAnalytics: any;
}

const SocialMediaAnalyticsTab: React.FC<Props> = ({ socialMediaAnalytics }) => {
  const initialPlatform = socialMediaAnalytics?.instagram
    ? 0
    : socialMediaAnalytics?.facebook
      ? 1
      : socialMediaAnalytics?.youtube
        ? 2
        : 0;

  const [selectedPlatform, setSelectedPlatform] = useState(initialPlatform);

  const platforms = [
    {
      name: "Instagram",
      key: "instagram",
      icon: <InstagramIcon />,
      data: socialMediaAnalytics?.instagram,
    },
    {
      name: "Facebook",
      key: "facebook",
      icon: <FacebookIcon />,
      data: socialMediaAnalytics?.facebook,
    },
    {
      name: "YouTube",
      key: "youtube",
      icon: <YouTubeIcon />,
      data: socialMediaAnalytics?.youtube,
    },
  ];

  const getCount = (val: any) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseInt(val) || 0;
    if (typeof val === "object" && val !== null) {
      return (
        val.totalCount || val.total || val.actual || val.subscriberCount || 0
      );
    }
    return 0;
  };

  const currentPlatform = platforms[selectedPlatform];
  const data = currentPlatform?.data;

  const normalizeUsername = (username: unknown): string => {
    if (typeof username !== "string") return "";
    return username.trim().replace(/^@+/, "");
  };

  const normalizeProfileUrl = (
    url: unknown,
    platformKey: string,
    username: unknown,
  ): string => {
    const normalizedUsername = normalizeUsername(username);

    if (typeof url !== "string" || !url.trim()) {
      if (platformKey === "youtube" && normalizedUsername) {
        return `https://youtube.com/@${normalizedUsername}`;
      }
      return "";
    }

    let normalizedUrl = url.trim();

    if (platformKey === "youtube") {
      normalizedUrl = normalizedUrl.replace(/youtube\.com\/@+/i, "youtube.com/@");
      normalizedUrl = normalizedUrl.replace(/\/@@+/g, "/@");
    }

    return normalizedUrl;
  };

  const normalizedUsername = normalizeUsername(data?.username);
  const profileUrl = normalizeProfileUrl(
    data?.url,
    currentPlatform?.key || "",
    data?.username,
  );
  const botDetection = data?.botDetection
    ? data.botDetection
    : data?.metrics
      ? {
          riskScore:
            typeof data.metrics.fakeFollowersPercentage === "number"
              ? data.metrics.fakeFollowersPercentage
              : 0,
          riskLevel:
            typeof data.metrics.fakeFollowersPercentage === "number" &&
            data.metrics.fakeFollowersPercentage >= 70
              ? "high"
              : typeof data.metrics.fakeFollowersPercentage === "number" &&
                  data.metrics.fakeFollowersPercentage >= 40
                ? "medium"
                : "low",
          isLikelyBot:
            typeof data.metrics.fakeFollowersPercentage === "number" &&
            data.metrics.fakeFollowersPercentage >= 70,
          isLikelyFakeFollowers:
            typeof data.metrics.fakeFollowersPercentage === "number" &&
            data.metrics.fakeFollowersPercentage >= 50,
          signals: [],
        }
      : null;

  if (!data) {
    return (
      <Alert severity="info">
        {currentPlatform.name} account not connected or no analytics data
        available.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Platform Selector */}
      <Tabs
        value={selectedPlatform}
        onChange={(_, v) => setSelectedPlatform(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        {platforms.map((platform) => (
          <Tab
            key={platform.key}
            label={platform.name}
            icon={platform.icon}
            iconPosition="start"
            disabled={!platform.data}
            sx={{ textTransform: "none" }}
          />
        ))}
      </Tabs>

      {/* Profile Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          {data.profilePictureUrl && (
            <Avatar
              src={data.profilePictureUrl}
              sx={{ width: 80, height: 80 }}
            />
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold">
              @{normalizedUsername || "N/A"}
            </Typography>
            {profileUrl && (
              <Typography variant="body2" color="text.secondary">
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  {profileUrl}
                </a>
              </Typography>
            )}
            <Box display="flex" gap={1} mt={1}>
              {data.isVerified && (
                <Chip label="Verified" color="primary" size="small" />
              )}
              <Chip
                label={data.isActive ? "Active" : "Inactive"}
                color={data.isActive ? "success" : "default"}
                size="small"
              />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          <Paper
            sx={{
              p: 2,
              bgcolor: "primary.light",
              color: "primary.contrastText",
            }}
          >
            <Typography variant="subtitle2" mb={1}>
              {currentPlatform.key === "youtube" ? "Subscribers" : "Followers"}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {getCount(
                currentPlatform.key === "youtube"
                  ? data.analytics?.totalSubscribers ||
                      data.youtubeChannel?.subscriberCount ||
                      data.subscriberCount ||
                      data.followers
                  : data.followers || data.subscriberCount || 0,
              ).toLocaleString()}
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 2,
              bgcolor: "secondary.light",
              color: "secondary.contrastText",
            }}
          >
            <Typography variant="subtitle2" mb={1}>
              {currentPlatform.key === "youtube" ? "Total Views" : "Following"}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {getCount(
                currentPlatform.key === "youtube"
                  ? data.analytics?.totalViews ||
                      data.youtubeChannel?.viewCount ||
                      data.viewCount ||
                      data.following
                  : data.following || data.viewCount || 0,
              ).toLocaleString()}
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 2,
              bgcolor: "success.light",
              color: "success.contrastText",
            }}
          >
            <Typography variant="subtitle2" mb={1}>
              {currentPlatform.key === "youtube" ? "Videos" : "Posts"}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {getCount(
                currentPlatform.key === "youtube"
                  ? data.analytics?.totalVideos ||
                      data.youtubeChannel?.videoCount ||
                      data.videoCount ||
                      data.postsCount
                  : data.postsCount || data.videoCount || 0,
              ).toLocaleString()}
            </Typography>
          </Paper>
        </Box>
      </Paper>

      {/* Engagement Metrics */}
      {data.engagement && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Engagement Metrics
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {data.engagement.averagePerPost && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Avg Engagement/Post
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.engagement.averagePerPost.toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.engagement.topEngagementPerPost && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Top Engagement/Post
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.engagement.topEngagementPerPost.toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.engagement.maximumLikes && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Maximum Likes
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.engagement.maximumLikes.toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* YouTube-specific Analytics */}
      {currentPlatform.key === "youtube" && data.youtubeChannel && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Channel Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            {data.youtubeChannel.title && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Channel Name
                </Typography>
                <Typography variant="body1">
                  {data.youtubeChannel.title}
                </Typography>
              </Box>
            )}
            {data.youtubeChannel.customUrl && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Custom URL
                </Typography>
                <Typography variant="body1">
                  {data.youtubeChannel.customUrl}
                </Typography>
              </Box>
            )}
            {data.youtubeChannel.country && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Country
                </Typography>
                <Typography variant="body1">
                  {data.youtubeChannel.country}
                </Typography>
              </Box>
            )}
            {data.youtubeChannel.publishedAt && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Published
                </Typography>
                <Typography variant="body1">
                  {new Date(
                    data.youtubeChannel.publishedAt,
                  ).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* YouTube Recent Videos */}
      {currentPlatform.key === "youtube" &&
        data.recentVideos &&
        data.recentVideos.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Recent Videos
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {data.recentVideos.map((video: any) => (
                <Box
                  key={video.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  {video.thumbnailUrl && (
                    <Box
                      component="img"
                      src={video.thumbnailUrl}
                      sx={{
                        width: "100%",
                        aspectRatio: "16/9",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <Box sx={{ p: 1.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      noWrap
                      title={video.title}
                    >
                      {video.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </Typography>
                    {video.viewCount && (
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: "medium" }}
                      >
                        {parseInt(video.viewCount).toLocaleString()} views
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

      {/* YouTube Playlists */}
      {currentPlatform.key === "youtube" &&
        data.playlists &&
        data.playlists.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Playlists
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              {data.playlists.map((playlist: any) => (
                <Box
                  key={playlist.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" noWrap>
                    {playlist.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {playlist.itemCount} items
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

      {/* Detailed YouTube Analytics */}
      {currentPlatform.key === "youtube" && data.analytics && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Channel Performance (Lifetime)
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {data.analytics.totalViews !== undefined && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Views
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {getCount(data.analytics.totalViews).toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.analytics.totalSubscribers !== undefined && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Subscribers
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {getCount(data.analytics.totalSubscribers).toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.analytics.totalVideos !== undefined && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Videos
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {getCount(data.analytics.totalVideos).toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.analytics.totalWatchTime && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Watch Time
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.analytics.totalWatchTime}
                </Typography>
              </Box>
            )}
            {data.analytics.averageViewDuration && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Avg View Duration
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.analytics.averageViewDuration}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Account Insights */}
      {data.insights && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            {currentPlatform.key === "youtube"
              ? "Account Insights"
              : "Engagement Insights"}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            {data.insights.impressions && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Impressions
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.insights.impressions.toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.insights.reach && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Reach
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.insights.reach.toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.insights.profileViews && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Profile Views
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.insights.profileViews.toLocaleString()}
                </Typography>
              </Box>
            )}
            {data.insights.engagementRate && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Engagement Rate
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {data.insights.engagementRate.toFixed(2)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Bot & Fake Follower Detection */}
      {botDetection && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <WarningAmberIcon color="warning" />
            <Typography variant="h6" fontWeight="bold">
              Bot & Fake Follower Detection
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Risk Score
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {Math.round(botDetection.riskScore || 0)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Risk Level
              </Typography>
              <Chip
                size="small"
                label={String(botDetection.riskLevel || "low").toUpperCase()}
                color={
                  botDetection.riskLevel === "high"
                    ? "error"
                    : botDetection.riskLevel === "medium"
                      ? "warning"
                      : "success"
                }
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Detection Flags
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                {botDetection.isLikelyBot && (
                  <Chip size="small" color="error" label="Likely Bot" />
                )}
                {botDetection.isLikelyFakeFollowers && (
                  <Chip
                    size="small"
                    color="warning"
                    label="Likely Fake Followers"
                  />
                )}
                {!botDetection.isLikelyBot &&
                  !botDetection.isLikelyFakeFollowers && (
                    <Chip size="small" color="success" label="Looks Organic" />
                  )}
              </Box>
            </Box>
          </Box>

          {Array.isArray(botDetection.signals) && botDetection.signals.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Signals
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {botDetection.signals.map((signal: string, idx: number) => (
                  <Chip
                    key={`${signal}-${idx}`}
                    label={signal}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Connection Info */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Connection Information
        </Typography>
        <Typography variant="body2">
          Connected:{" "}
          {data.connectedAt
            ? new Date(data.connectedAt).toLocaleString()
            : "N/A"}
        </Typography>
        {data.lastUpdated && (
          <Typography variant="body2">
            Last Updated: {new Date(data.lastUpdated).toLocaleString()}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default SocialMediaAnalyticsTab;
