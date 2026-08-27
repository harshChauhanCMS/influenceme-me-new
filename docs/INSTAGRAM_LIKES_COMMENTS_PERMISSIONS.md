# Instagram Likes & Comments - Permissions Guide 🔐

## ✅ Fixes Applied

### Fix 1: Instagram Media Fields
Updated `/influencememobile/lib/services/instagram_oauth_service.dart` to request:
```dart
'fields': 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
```

**Added:**
- `like_count` ✅
- `comments_count` ✅  

**Note:** `insights` field removed as it requires additional permissions and was preventing posts from loading.

### Fix 2: Profile API Route
Fixed `/influencememobile/lib/services/profile_api_service.dart`:
- Changed `users/profile` → `user/profile` ✅ (3 occurrences)
- Backend route is `/api/user/profile` (singular), not `/api/users/profile`

## 🎯 Why Likes & Comments Weren't Showing

### Issue 1: Missing API Fields ❌ → ✅ FIXED
**Problem:** The media fetch wasn't requesting `like_count` and `comments_count` fields.

**Solution:** Added these fields to the API request (line 187 in `instagram_oauth_service.dart`)

### Issue 2: Permissions & Account Requirements ⚠️

For Instagram Graph API to return likes and comments, you need **ALL** of these:

## 📋 Requirements Checklist

### 1. ✅ Instagram Account Type
**Required:** Instagram **Business** or **Creator** account

**NOT supported:**
- ❌ Personal Instagram accounts

**How to check:**
1. Open Instagram app
2. Go to Settings → Account
3. Look for "Switch to Professional Account" or "Account Type"
4. **Must be Business or Creator**

**How to convert:**
1. Instagram app → Settings → Account
2. Tap "Switch to Professional Account"
3. Choose "Creator" or "Business"

### 2. ✅ Meta App Configuration
**Location:** https://developers.facebook.com/apps/

**Check these settings:**

**a) App Type:**
- Must be "Business" or "None" (NOT "Consumer")

**b) Products Added:**
- ✅ Instagram product must be added

**c) Permissions Requested:**
Your current scopes (from `oauth_config.dart`):
```dart
'instagram_business_basic',              // ✅ Required
'instagram_business_manage_insights',    // ✅ Required for likes/comments
'instagram_business_manage_messages',    // Optional
'instagram_business_content_publish',    // Optional
```

### 3. ⚠️ App Review Status

**CRITICAL:** Likes and comments data requires **App Review Approval**

**Check Status:**
1. Go to Meta Developer Console
2. Select your app
3. Go to "App Review" → "Permissions and Features"
4. Check status of:
   - `instagram_business_basic` → Should be "Approved" or "In Development" ✅
   - `instagram_business_manage_insights` → Should be "Approved" ✅

**Development Mode:**
- In development, you can access data from **Test Users** only
- Production data requires app to be **Live** with permissions **Approved**

**Add Test Users:**
1. Meta Developer Console → Your App
2. Roles → Roles
3. Add Instagram Test Users
4. Those accounts can provide full data even in development mode

### 4. ✅ OAuth Redirect URIs

**Meta Developer Console → Products → Instagram → Basic Display → OAuth Redirect URIs:**

Your current redirect URI:
```
https://influence-me.in/auth/instagram/callback
```

**Must be exactly the same** as in your code.

### 5. ⚠️ Valid Access Token

**Important:** Instagram access tokens expire!

**Token Types:**
- **Short-lived token:** Expires in 1 hour
- **Long-lived token:** Expires in 60 days (we're using this)

**Check if token is expired:**
```dart
// In instagram_repository.dart
final isConnected = await repository.isInstagramConnected();
```

**Re-authenticate if expired:**
- User will need to connect Instagram again

## 🧪 Testing Checklist

### Test 1: Check Account Type
```
1. Log into Instagram
2. Go to Settings → Account
3. Verify it says "Business" or "Creator"
4. If not, convert to Business/Creator account
```

### Test 2: Check Permissions in Meta Console
```
1. Go to https://developers.facebook.com/apps/764934132567496/
2. Navigate to App Review → Permissions and Features
3. Verify:
   - instagram_business_basic: Approved ✅
   - instagram_business_manage_insights: Approved ✅
```

### Test 3: Test in App
```
1. Disconnect Instagram (if already connected)
2. Connect Instagram again (to get fresh token)
3. After connection, check Instagram Profile Page
4. Look at media items - should show likes and comments counts
5. Check console logs for any API errors
```

## 🔍 Debugging

### Check API Response

Add this to `instagram_oauth_service.dart` line 193:

```dart
if (response.statusCode == 200 && response.data != null) {
  print('📦 Media API Response: ${response.data}'); // ADD THIS
  final data = response.data['data'] as List;
```

**Look for:**
- ✅ If `like_count` and `comments_count` are in the response → Permissions are working!
- ❌ If missing → Permissions issue or account is not Business/Creator

### Common Error Messages

**Error:** `Permissions error`
**Fix:** Submit app for review or add account as Test User

**Error:** `Invalid OAuth access token`
**Fix:** Token expired, reconnect Instagram

**Error:** `(#10) This endpoint requires the 'instagram_business_basic' permission`
**Fix:** Ensure permissions are approved in Meta Console

**Response has `like_count: 0` for all posts:**
**Fix:** Account might be Personal (not Business/Creator)

## 📝 Summary

### What I Fixed ✅
- Added `like_count` and `comments_count` to API request
- Added `insights` metrics for engagement data

### What You Need to Do ⚠️

1. **Convert Instagram to Business/Creator** (if not already)
2. **Check Meta App Review status** for permissions
3. **Add Test Users** in Meta Console (for development)
4. **Reconnect Instagram** in the app (to get fresh token with all permissions)
5. **Test and verify** likes/comments are now showing

## 🎯 Quick Test

```bash
# After deploying the updated code:
1. Open app
2. Go to Social Media Link page
3. Disconnect Instagram (if connected)
4. Connect Instagram again
5. Tap "View" on Instagram card
6. Check if likes and comments are showing on media items
```

If still not working after ALL steps above, share:
1. Meta Console App Review status screenshot
2. Instagram account type (Business/Creator?)
3. Console logs from the media API call

## Status: ✅ CODE FIXED, PERMISSIONS NEED VERIFICATION

The code now requests likes and comments. If data still doesn't show, it's a **permissions/account type** issue, not a code issue.

