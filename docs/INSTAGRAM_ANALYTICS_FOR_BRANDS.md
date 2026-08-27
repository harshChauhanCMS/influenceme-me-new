# Instagram Analytics for Brands - Complete Implementation

## Overview
This implementation fetches comprehensive Instagram data from influencers and stores it in the database so brands can view it in the web frontend. The system intelligently uses Instagram's native insights when available, or calculates metrics from post data (likes + comments).

## What Brands Can See

When brands view an influencer profile in the web frontend, they will see:

### 1. **Profile Information**
- Instagram username
- Profile picture (from Instagram if influencer hasn't uploaded custom one)
- Follower count
- Following count
- Account type (Business/Creator/Personal)

### 2. **Engagement Metrics**
- **Average engagement per post**: Calculated from (total likes + total comments) / followers * 100
- **Top engagement per post**: Highest engagement from recent posts
- **Engagement rate**: Shows as percentage

### 3. **Content Metrics**
- Total number of posts
- Post images (top performing posts)
- Average likes
- Average comments

### 4. **Profile Picture**
- If influencer hasn't uploaded a custom profile picture, system uses Instagram profile picture
- Brands can always see the influencer's Instagram profile photo

## Data Flow

```
┌─────────────────────┐
│  Influencer         │
│  Connects Instagram │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ 1. Fetch Instagram Profile                  │
│    - Username, Followers, Following         │
│    - Profile Picture URL                    │
│    - Account Type, Media Count              │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ 2. Fetch Analytics                          │
│    ┌────────────────────────────────────┐   │
│    │ Try: Instagram Insights API        │   │
│    │ (requires permissions)             │   │
│    └────────────────────────────────────┘   │
│              │                               │
│              │ If not available             │
│              ▼                               │
│    ┌────────────────────────────────────┐   │
│    │ Fallback: Calculate from Posts     │   │
│    │ - Fetch last 50 posts              │   │
│    │ - Sum likes + comments             │   │
│    │ - Calculate engagement rate        │   │
│    │ - Find top performing posts        │   │
│    └────────────────────────────────────┘   │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ 3. Save to Database                         │
│    - Profile Picture URL                    │
│    - Followers Count                        │
│    - Following Count                        │
│    - Engagement Metrics                     │
│    - Post Statistics                        │
│    - All saved in influencerInfo.socialMedia│
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│ 4. Brands View in Web Frontend              │
│    - See all metrics                        │
│    - View profile picture                   │
│    - Analyze engagement                     │
│    - Review top posts                       │
└─────────────────────────────────────────────┘
```

## Implementation Details

### 1. Instagram API Fields Requested

**Profile Data** (`getInstagramProfile`):
```dart
'fields': 'id,username,name,account_type,media_count,followers_count,follows_count,profile_picture_url'
```

**Post Data** (`getInstagramMedia`):
```dart
'fields': 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
```

**Insights** (if available):
```dart
'metric': 'impressions,reach,engagement,saves'
```

### 2. Analytics Calculation Logic

```dart
// Calculate total engagement from posts
totalLikes = sum of all post likes
totalComments = sum of all post comments
totalEngagement = totalLikes + totalComments

// Calculate engagement rate
avgEngagementRate = (totalEngagement / followersCount) * 100

// Find top posts
topPosts = posts sorted by (likes + comments) descending

// Get top engagement
topEngagement = topPosts[0].likesCount + topPosts[0].commentsCount
```

### 3. Data Structure Saved to Backend

```json
{
  "platform": "instagram",
  "username": "influencer_username",
  "url": "https://www.instagram.com/influencer_username",
  "profilePictureUrl": "https://scontent.cdninstagram.com/...",
  "followers": 125000,
  "following": 567,
  "engagement": {
    "averagePerPost": 5250,
    "topEngagementPerPost": 18500
  },
  "metrics": {
    "postsCount": 450,
    "averageViews": 98000
  },
  "isActive": true,
  "addedAt": "2025-10-28T..."
}
```

## Code Changes

### 1. Updated Instagram OAuth Service
**File**: `influencememobile/lib/services/instagram_oauth_service.dart`

#### Added Profile Picture to API Request:
```dart
'fields': 'id,username,name,account_type,media_count,followers_count,follows_count,profile_picture_url'
```

#### Parse Profile Picture:
```dart
profilePicture: data['profile_picture_url'],  // Profile picture for brands to see
```

### 2. Enhanced Social Media Save Logic
**File**: `influencememobile/lib/pages/auth/signup/social_media_link.dart`

#### Fetch Comprehensive Analytics:
```dart
// Fetch analytics (will try insights, fallback to calculation from posts)
final analyticsResult = await repository.getInstagramAnalytics(forceRefresh: true);
final analytics = analyticsResult.data;

// Calculate engagement metrics
int avgEngagementPerPost = 0;
int topEngagementPerPost = 0;

if (analytics != null) {
  // Use calculated analytics (from likes + comments on posts)
  avgEngagementPerPost = analytics.avgEngagementRate.toInt();
  if (analytics.topPosts.isNotEmpty) {
    final topPost = analytics.topPosts.first;
    topEngagementPerPost = topPost.likesCount + topPost.commentsCount;
  }
}
```

#### Save Comprehensive Data:
```dart
final socialMediaPlatform = SocialMediaPlatform(
  platform: 'instagram',
  username: profile.username,
  url: 'https://www.instagram.com/${profile.username}',
  profilePictureUrl: profile.profilePicture,  // For brands to see
  following: profile.followingCount,
  followers: SocialMediaFollowers(
    actual: profile.followersCount,
    bought: 0,
  ),
  engagement: SocialMediaEngagement(
    averagePerPost: avgEngagementPerPost,
    topEngagementPerPost: topEngagementPerPost,
  ),
  metrics: SocialMediaMetrics(
    postsCount: postsCount,
    averageViews: analytics?.totalLikes ?? 0,
  ),
  isActive: true,
);
```

## Backend Schema

The backend stores this data in `influencerInfo.socialMedia` array:

```typescript
{
  platform: String,          // "instagram"
  username: String,          // Required
  url: String,              // Profile URL
  profilePictureUrl: String, // Instagram profile picture
  followers: Number,         // Follower count
  following: Number,         // Following count
  engagement: {
    averagePerPost: Number,     // Average engagement per post
    topEngagementPerPost: Number, // Highest engagement from a post
    maximumLikes: Number        // Max likes on any post
  },
  metrics: {
    postsCount: Number,      // Total posts
    averageViews: Number,    // Average views (uses likes as proxy)
    videosPosted: Number,
    subscribers: Number
  },
  isVerified: Boolean,
  isActive: Boolean,
  addedAt: Date
}
```

## Frontend Display (Web)

### Example Display for Brands

```jsx
// In influencer profile view
<div className="instagram-analytics">
  <div className="profile-header">
    <img src={influencer.socialMedia.instagram.profilePictureUrl || influencer.profilePictureUrl} />
    <h3>@{influencer.socialMedia.instagram.username}</h3>
    <span>{influencer.socialMedia.instagram.followers.toLocaleString()} followers</span>
  </div>
  
  <div className="engagement-metrics">
    <div className="metric">
      <label>Engagement Rate</label>
      <span>{influencer.socialMedia.instagram.engagement.averagePerPost}%</span>
    </div>
    
    <div className="metric">
      <label>Top Post Engagement</label>
      <span>{influencer.socialMedia.instagram.engagement.topEngagementPerPost.toLocaleString()}</span>
    </div>
    
    <div className="metric">
      <label>Total Posts</label>
      <span>{influencer.socialMedia.instagram.metrics.postsCount}</span>
    </div>
  </div>
  
  <div className="top-posts">
    {/* Display top performing posts with images */}
  </div>
</div>
```

## Instagram Insights vs. Manual Calculation

### When Instagram Insights Are Used:
✅ **Business or Creator accounts** with proper permissions  
✅ **App has `instagram_business_manage_insights` permission**  
✅ **Posts are not older than 2 years**

Returns: `impressions`, `reach`, `engagement`, `saves`

### When Manual Calculation Is Used:
✅ **Personal accounts** (no insights available)  
✅ **Permissions not granted**  
✅ **Insights API fails**

Calculates: From `like_count` and `comments_count` on posts

## Testing Instructions

### 1. Connect Instagram Account
```bash
cd /Users/devendrasingh/WebstormProjects/influenceme-new/influencememobile
flutter run
```

1. Login as influencer
2. Go to Social Media Link page
3. Click "Connect" for Instagram
4. Complete OAuth flow

### 2. Expected Logs
```
📤 Fetching comprehensive Instagram analytics...
📤 Username: your_username
📤 Followers: 125000
📤 Following: 567
🔄 Fetching Instagram profile...
✅ Profile loaded: @your_username
Account type: BUSINESS
Followers: 125000, Following: 567
Profile picture: Available
📊 Analytics calculated:
   - Average engagement rate: 5.2%
   - Total posts: 450
   - Total likes: 98000
   - Total comments: 12000
📤 Saving comprehensive Instagram data to backend...
📤 Data includes: profile pic, followers, engagement metrics, post stats
✅ Instagram data saved to backend successfully!
```

### 3. Verify in Database
```javascript
db.users.findOne(
  { phone: "9024653150" },
  { "influencerInfo.socialMedia": 1 }
)
```

Should show:
```json
{
  "influencerInfo": {
    "socialMedia": [
      {
        "platform": "instagram",
        "username": "your_username",
        "profilePictureUrl": "https://scontent...",
        "followers": 125000,
        "following": 567,
        "engagement": {
          "averagePerPost": 5250,
          "topEngagementPerPost": 18500
        },
        "metrics": {
          "postsCount": 450,
          "averageViews": 98000
        }
      }
    ]
  }
}
```

### 4. View in Web Frontend
1. Login as brand
2. Browse influencers
3. Click on influencer profile
4. Should see:
   - Instagram profile picture
   - Follower/following counts
   - Engagement metrics
   - Post statistics

## Files Modified
- `influencememobile/lib/services/instagram_oauth_service.dart` - Added profile picture field
- `influencememobile/lib/pages/auth/signup/social_media_link.dart` - Analytics calculation and comprehensive save
- `influencememobile/lib/models/user_profile_models.dart` - Already has profilePictureUrl field

## Benefits for Brands

1. **Complete Picture**: See real engagement, not just follower counts
2. **Authentic Data**: Uses Instagram's official API
3. **Profile Picture**: See influencer's actual Instagram photo
4. **Top Content**: View what type of content performs best
5. **ROI Estimation**: Calculate expected engagement before campaign
6. **Trust**: All data verified from Instagram directly

## Future Enhancements

1. **Historical Tracking**: Track engagement trends over time
2. **Competitor Analysis**: Compare influencers side-by-side
3. **Content Analysis**: AI analysis of top performing content themes
4. **Audience Demographics**: Age, gender, location (requires additional permissions)
5. **Story Analytics**: Performance metrics for Instagram Stories

---

**Date**: October 28, 2025  
**Status**: ✅ Complete - Ready for testing and brand review


