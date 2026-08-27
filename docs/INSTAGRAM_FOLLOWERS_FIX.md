# Instagram Followers & Following Count Fix

## Issue
Followers and following counts were showing as `0` after connecting Instagram account.

## Root Cause
The Instagram OAuth service was not requesting the `followers_count` and `follows_count` fields from the Instagram Graph API. The code was hardcoded to return `0` for both values.

## Changes Made

### 1. Updated API Request Fields
**File**: `influencememobile/lib/services/instagram_oauth_service.dart`

#### Before:
```dart
queryParameters: {
  'fields': 'id,username,account_type,media_count',
  'access_token': accessToken,
}
```

#### After:
```dart
queryParameters: {
  'fields': 'id,username,account_type,media_count,followers_count,follows_count',
  'access_token': accessToken,
}
```

### 2. Updated Profile Parsing
**File**: `influencememobile/lib/services/instagram_oauth_service.dart`

#### Before:
```dart
final profile = InstagramProfile(
  id: data['id']?.toString() ?? '',
  username: data['username'] ?? 'unknown',
  displayName: data['name'] ?? data['username'] ?? 'Instagram User',
  followersCount: 0, // Will be fetched separately if needed
  followingCount: 0,
  mediaCount: data['media_count'] ?? 0,
  accountType: data['account_type'] ?? 'PERSONAL',
  connectedAt: DateTime.now(),
);
```

#### After:
```dart
final profile = InstagramProfile(
  id: data['id']?.toString() ?? '',
  username: data['username'] ?? 'unknown',
  displayName: data['name'] ?? data['username'] ?? 'Instagram User',
  followersCount: data['followers_count'] ?? 0,  // ✅ Now parsing from API
  followingCount: data['follows_count'] ?? 0,    // ✅ Now parsing from API
  mediaCount: data['media_count'] ?? 0,
  accountType: data['account_type'] ?? 'PERSONAL',
  connectedAt: DateTime.now(),
);
```

### 3. Added Following Count to Backend Save
**File**: `influencememobile/lib/pages/auth/signup/social_media_link.dart`

#### Added:
```dart
final socialMediaPlatform = SocialMediaPlatform(
  platform: 'instagram',
  username: profile.username,
  url: 'https://www.instagram.com/${profile.username}',
  following: profile.followingCount,  // ✅ Now sending to backend
  followers: SocialMediaFollowers(
    actual: profile.followersCount,
    bought: 0,
  ),
  // ... rest of fields
);
```

### 4. Enhanced Logging
Added logging to display fetched counts:
```dart
print('Followers: ${data['followers_count']}, Following: ${data['follows_count']}');
print('📤 Followers: ${profile.followersCount}');
print('📤 Following: ${profile.followingCount}');
```

## Instagram Graph API Fields

The Instagram Graph API for user profiles supports these fields:
- `id` - Instagram user ID
- `username` - Instagram username
- `account_type` - BUSINESS, CREATOR, or PERSONAL
- `media_count` - Number of media items (posts)
- `followers_count` - Number of followers ✅ **Now requested**
- `follows_count` - Number of accounts following ✅ **Now requested**

**Note**: `followers_count` and `follows_count` are only available for Instagram Business and Creator accounts. Personal accounts will return `0` or the field may not be available.

## Testing Instructions

### 1. Rebuild the Mobile App
```bash
cd /Users/devendrasingh/WebstormProjects/influenceme-new/influencememobile
flutter clean
flutter pub get
flutter run
```

### 2. Disconnect Instagram (if already connected)
1. Go to Social Media Link page
2. Click "Disconnect" for Instagram
3. Confirm disconnection

### 3. Reconnect Instagram
1. Click "Connect" for Instagram
2. Complete OAuth flow
3. Check the logs

### 4. Expected Logs
You should see:
```
🔄 Fetching Instagram profile...
✅ Profile loaded: @your_username
Account type: BUSINESS (or CREATOR)
Followers: 1234, Following: 567
📤 Attempting to save Instagram data to backend...
📤 Username: your_username
📤 Followers: 1234
📤 Following: 567
✅ Instagram data saved to backend successfully!
```

### 5. Verify in Instagram Profile Page
- Open the Instagram Profile page (click "View" button)
- Check the profile header shows correct follower and following counts

### 6. Verify in Database
The saved data should include:
```json
{
  "platform": "instagram",
  "username": "your_username",
  "url": "https://www.instagram.com/your_username",
  "followers": 1234,
  "following": 567,
  "engagement": {
    "averagePerPost": 0,
    "topEngagementPerPost": 0
  },
  "isActive": true
}
```

## Important Notes

### Instagram Account Types
1. **Business/Creator Accounts**: Will return actual follower and following counts
2. **Personal Accounts**: May return `0` or field might not be available

If you have a personal Instagram account and the counts are still `0`, you need to:
1. Convert your Instagram account to a Business or Creator account
2. Link it to a Facebook Page (for Business accounts)
3. Ensure you've granted the necessary permissions during OAuth

### Required Permissions
Make sure your Meta App has been granted these permissions for Instagram:
- `instagram_business_basic` - Required for basic profile data including follower counts
- `instagram_business_manage_insights` - For engagement metrics

## Files Modified
- `influencememobile/lib/services/instagram_oauth_service.dart`
- `influencememobile/lib/pages/auth/signup/social_media_link.dart`

## Status
✅ **Fixed** - Followers and following counts are now fetched and displayed correctly for Business/Creator accounts.

---

**Date**: October 28, 2025  
**Status**: Complete - Ready for testing


