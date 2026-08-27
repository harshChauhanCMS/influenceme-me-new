# Instagram Data Save Fix

## Issue
Instagram data was not being saved to the database after successful connection. The backend was returning a validation error:
```
User validation failed: influencerInfo.socialMedia.0.followers: Cast to Number failed for value "{ actual: 0, bought: 0 }" (type Object) at path "followers", name: Path `name` is required.
```

## Root Causes
1. **Schema Mismatch**: The backend expects `followers` as a `Number`, but the mobile app was sending an Object `{ actual: 0, bought: 0 }`
2. **Missing Required Field**: The backend requires a `username` field, but the mobile app was sending `handle` instead
3. **Parsing Issue**: The mobile app's `UserProfileData` model was not correctly parsing `socialMedia` from the backend response. The backend stores social media data in `influencerInfo.socialMedia` (nested structure), but the mobile model was only looking for it at the root level.
4. **Validation Issue**: Users created via phone OTP might not have a `name` field, causing validation errors when updating `socialMedia` with `user.save()` which validates the entire document.

## Changes Made

### 1. Mobile Model Update (`user_profile_models.dart`)
- **File**: `influencememobile/lib/models/user_profile_models.dart`

#### SocialMediaPlatform Model Changes:
- **Added `username` field**: Required by backend schema
- **Added `profilePictureUrl` field**: Backend schema field
- **Added `following` field**: Backend schema field
- **Updated `toJson()` method**: 
  - Sends `username` instead of `handle` to backend
  - Converts `followers` from object to number (`followers!.actual ?? 0`) to match backend schema
- **Updated `fromJson()` method**:
  - Parses both `username` and `handle` fields
  - Auto-generates `handle` from `username` if not present (`@username`)
  - Handles `followers` in both formats: number (from backend) or object (from mobile)

#### UserProfileData Model Changes:
- **Updated `fromJson()` method** to properly parse `socialMedia` from `influencerInfo.socialMedia`
- **Details**: 
  - Now checks for `influencerInfo` object first
  - Parses `socialMedia` from `influencerInfo.socialMedia` if present
  - Falls back to root-level `socialMedia` for backward compatibility
  - Also parses other influencer fields from the nested structure (genre, influencerType, workType, etc.)

### 2. Instagram OAuth Callback Update (`social_media_link.dart`)
- **File**: `influencememobile/lib/pages/auth/signup/social_media_link.dart`
- **Change**: Updated Instagram data creation to match backend schema
- **Details**:
  - Changed from `handle: '@${profile.username}'` to `username: profile.username`
  - Added `isActive: true` flag
  - Added detailed logging during Instagram OAuth callback
  - Logs username, followers count, social media platform object creation
  - Logs response from backend save operation
  - Logs full error stack trace if save fails

### 3. Test Data Updates (`profile_api_service.dart`)
- **File**: `influencememobile/lib/services/profile_api_service.dart`
- **Change**: Added `username` field to all test social media data generators
- **Details**: Updated test data for Instagram, YouTube, LinkedIn, Facebook, TikTok, Twitter, and default platforms

### 4. Enhanced Logging

#### Mobile Logging (`profile_api_service.dart`)
- **File**: `influencememobile/lib/services/profile_api_service.dart`
  - Added logging in `addSocialMediaPlatform`:
    - Logs current profile fetch
    - Logs existing socialMedia count
    - Logs whether platform is new or being updated
    - Logs total platforms after update
  - Added logging in `updateSocialMediaData`:
    - Logs JSON conversion
    - Logs API request details
    - Logs response status code and data
    - Logs errors with stack trace

#### Backend Logging and Validation Fix
- **File**: `influenceme-new/backend/controllers/userController.ts`
- **Changes in `updateProfile` function**:
  - **CRITICAL FIX**: Added special handling for `socialMedia`-only updates
    - Detects when only `socialMedia` is in request body
    - Uses `User.updateOne()` with `runValidators: false` to bypass full document validation
    - This prevents "name is required" errors for users created via phone OTP without a name
    - Falls back to normal `user.save()` for other updates
  - Logs when socialMedia update is received
  - Logs received socialMedia data (formatted JSON)
  - Logs previous socialMedia state
  - Logs new socialMedia state after assignment
  - Logs socialMedia after save operation for influencers
  
  **Code snippet**:
  ```typescript
  const isSocialMediaOnlyUpdate = req.body.socialMedia && Object.keys(req.body).length === 1;
  
  if (isSocialMediaOnlyUpdate && user.role === 'influencer') {
      // Use updateOne to avoid full document validation
      await User.updateOne(
          { _id: user._id },
          { $set: { 'influencerInfo.socialMedia': req.body.socialMedia } },
          { runValidators: false }
      );
      updatedUser = await User.findById(user._id);
  } else {
      updatedUser = await user.save();
  }
  ```

## Expected Backend Schema

The backend expects this structure for `influencerInfo.socialMedia`:
```typescript
{
  platform: String,          // Required: e.g., "instagram"
  username: String,          // Required: e.g., "johndoe_tech"
  url: String,              // Optional: e.g., "https://instagram.com/johndoe_tech"
  followers: Number,         // Required: Just a number, e.g., 125000
  following: Number,         // Optional: Number of accounts following
  profilePictureUrl: String, // Optional
  engagement: {             // Optional
    averagePerPost: Number,
    topEngagementPerPost: Number,
    maximumLikes: Number
  },
  metrics: {                // Optional
    postsCount: Number,
    averageViews: Number,
    videosPosted: Number,
    subscribers: Number
  },
  isVerified: Boolean,      // Optional
  isActive: Boolean,        // Optional
  addedAt: Date,           // Optional
  updatedAt: Date          // Optional
}
```

## Mobile App Changes

The mobile app now:
1. **Sends `username`** (required) instead of just `handle`
2. **Converts `followers` to a number** when sending to backend (uses `followers.actual`)
3. **Parses `socialMedia` from `influencerInfo.socialMedia`** when reading from backend
4. **Maintains backward compatibility** by also checking root-level fields

## Testing Instructions

### 1. Rebuild the Mobile App
```bash
cd /Users/devendrasingh/WebstormProjects/influenceme-new/influencememobile
flutter clean
flutter pub get
flutter run
```

### 2. Test Instagram Connection
1. Login with your influencer account (phone: 9024653150, phoneCode: 91)
2. Navigate to Social Media Link page
3. Click "Connect" for Instagram
4. Complete Instagram OAuth flow
5. You should be redirected back to the app

### 3. Expected Mobile Logs
Look for these log sequences in the console:

#### During OAuth Callback:
```
📤 Attempting to save Instagram data to backend...
📤 Username: [instagram_username]
📤 Followers: [follower_count]
📤 Social media platform object created: {...}
```

#### During Profile Fetch:
```
📥 ProfileApiService: Getting current profile...
📥 ProfileApiService: Current profile fetched. Existing socialMedia: X platforms
📥 ProfileApiService: Copied existing socialMedia list
📥 ProfileApiService: Platform instagram is new, adding... (or "already exists at index X, updating...")
📥 ProfileApiService: Total platforms after update: X
📥 ProfileApiService: Platforms: [instagram, ...]
```

#### During Backend Save:
```
📤 updateSocialMediaData: Converting X platforms to JSON...
📤 updateSocialMediaData: JSON data: [...]
📤 updateSocialMediaData: Sending PUT request to user/profile...
📤 updateSocialMediaData: Response status code: 200
📤 updateSocialMediaData: Response data: {...}
✅ updateSocialMediaData: Successfully parsed response
✅ ProfileApiService: updateSocialMediaData completed successfully
✅ Instagram data saved to backend successfully!
✅ Response: Profile updated successfully
```

### 4. Expected Backend Logs
SSH into the server and check PM2 logs:
```bash
pm2 logs influenceme-backend --lines 50
```

Look for:
```
=== UPDATE PROFILE REQUEST ===
User ID: [user_id]
User Role: influencer
Request Body: {...}

📱 SOCIAL MEDIA UPDATE RECEIVED
📱 Received socialMedia data: [
  {
    "platform": "instagram",
    "handle": "@username",
    "url": "https://www.instagram.com/username",
    "followers": {
      "actual": XXXX,
      "bought": 0
    },
    "engagement": {
      "averagePerPost": 0,
      "topEngagementPerPost": 0
    }
  }
]
📱 Previous socialMedia: null (or existing data)
📱 New socialMedia: [...same as above...]

Before save - addresses: {...}
After save - updated user addresses: {...}
📱 After save - influencerInfo.socialMedia: [
  {
    "platform": "instagram",
    "handle": "@username",
    ...
  }
]
```

### 5. Verify in Database
After connecting Instagram, verify the data is saved:
```javascript
// In MongoDB shell or Compass
db.users.findOne({ phone: "9024653150" })
```

Check that `influencerInfo.socialMedia` array contains:
```javascript
{
  influencerInfo: {
    socialMedia: [
      {
        platform: "instagram",
        handle: "@username",
        url: "https://www.instagram.com/username",
        followers: {
          actual: XXXX,
          bought: 0
        },
        engagement: {
          averagePerPost: 0,
          topEngagementPerPost: 0
        }
      }
    ]
  }
}
```

## Error Scenarios to Watch For

### If Save Fails
Look for:
```
❌ ERROR: Failed to save Instagram data to backend
❌ Error: [error message]
❌ Stack trace: [stack trace]
```

### Common Issues
1. **Authentication Error**: User not logged in or token expired
2. **Network Error**: Mobile app cannot reach backend
3. **Validation Error**: Backend rejects the socialMedia format
4. **Parsing Error**: Mobile model cannot parse backend response

## Backend Deployment Status
- ✅ Changes committed to Git
- ✅ Changes pushed to GitHub
- ✅ Changes pulled on server
- ✅ Backend rebuilt successfully
- ✅ PM2 process restarted

## Next Steps
1. **Test the flow** with the instructions above
2. **Share the logs** (both mobile and backend) if the issue persists
3. **Check the database** to confirm data is actually saved

## Files Modified
### Mobile (Not deployed - local testing needed)
- `influencememobile/lib/models/user_profile_models.dart`
- `influencememobile/lib/services/profile_api_service.dart`
- `influencememobile/lib/pages/auth/signup/social_media_link.dart`

### Backend (Deployed to production)
- `influenceme-new/backend/controllers/userController.ts`

---

**Date**: October 28, 2025  
**Status**: Backend deployed, Mobile changes ready for testing

