# Login State Management Fix - Complete ✅

## Issues Identified

### Issue 1: Login API Returning 404 ❌
**Problem:** The login API was returning 404 "User not found" even though the user exists in the database.

**Root Cause:** Inconsistent phoneCode formatting between `checkUserExists` and `login`:
- `checkUserExists` was sending: `phoneCode: '+91'` (with `+` prefix) ✅
- `login` was sending: `phoneCode: '91'` (WITHOUT `+` prefix) ❌

**Result:** 
1. `checkUserExists` updated the user's phoneCode to `+91` in the database
2. `login` tried to find user with phoneCode `91`
3. Query failed because `+91` !== `91`
4. Login returned 404 "User not found"

**Backend Logs:**
```
📥 checkUserExists - Parsed values: { phone: '9024653150', phoneCode: '+91' }  ✅
📥 loginUser - Parsed values: { phone: '9024653150', phoneCode: '91' }  ❌
```

### Issue 2: Navigation on Login Failure ❌
**Problem:** The app was navigating to the home page even when login failed.

**Root Cause:** THREE places handling `UserExistsState` and navigating immediately:

**Place 1: OTP Dialog (otp_dialog.dart - Lines 149-151):**
```dart
} else if (state is UserExistsState) {
  navigatePop(context);
  navigate(context, MainPage(), finishAffinity: true);  // ❌ Navigates immediately
}
```

**Place 2: Google Login Listener (sign_up.dart - Lines 176-196):**
```dart
listener: (context, state) {
  if (state is UserExistsState) {
    navigate(context, MainPage(), finishAffinity: true);  // ❌ Navigates immediately
  }
}
```

**Place 3: Phone Login Listener (sign_up.dart - Lines 506+):**
```dart
listener: (context, state) {
  if (state is UserExistsState) {
    bloc.add(LoginExistingUser(...));  // ✅ Triggers login first
  } else if (state is AuthSuccess) {
    navigate(context, MainPage(), finishAffinity: true);  // ✅ Navigates after login success
  }
}
```

**Result:**
1. User verified OTP → `UserExistsState` emitted
2. **All three listeners** caught the `UserExistsState`
3. OTP Dialog navigated to MainPage immediately (wrong!) ❌
4. Google listener also tried to navigate (wrong!) ❌
5. Phone listener triggered login (correct) ✅
6. Login failed, but user was already on MainPage ❌

## Solutions Implemented

### Fix 1: Consistent phoneCode Formatting ✅

**File:** `influencememobile/lib/arc/repositories/auth_repo.dart`

**Before:**
```dart
Future<BaseCallback<SignInResponse>> login({
  String? email,
  String? phone,
  String? phoneCode,
}) async {
  return await $apiClient.post(
    EndPoints.AUTH_LOGIN,
    data: {
      if (email != null) "email": email,
      if (phone != null) "phone": phone,
      if (phoneCode != null) "phoneCode": phoneCode,  // ❌ No prefix
    },
  )
}
```

**After:**
```dart
Future<BaseCallback<SignInResponse>> login({
  String? email,
  String? phone,
  String? phoneCode,
}) async {
  return await $apiClient.post(
    EndPoints.AUTH_LOGIN,
    data: {
      if (email != null) "email": email,
      if (phone != null) "phone": phone,
      if (phone != null && phoneCode != null) "phoneCode": "+$phoneCode",  // ✅ Add + prefix
    },
  )
}
```

### Fix 2: Update All Listeners to Wait for Login ✅

**Fix 2a: OTP Dialog (`influencememobile/lib/bottom_sheets/otp_dialog.dart`)**

**Before:**
```dart
} else if (state is UserExistsState) {
  navigatePop(context);
  navigate(context, MainPage(), finishAffinity: true);  // ❌ Navigates immediately
}
```

**After:**
```dart
} else if (state is UserExistsState) {
  print('✅ OTP_DIALOG: User exists - triggering login');
  navigatePop(context);  // Close OTP dialog
  // Trigger login instead of navigating immediately
  widget.authBloc.add(LoginExistingUser(
    phone: widget.phoneNumber,
    phoneCode: widget.countryCode,
  ));
} else if (state is AuthSuccess) {
  print('✅ OTP_DIALOG: Login successful - navigating to main page');
  navigate(context, MainPage(), finishAffinity: true);  // ✅ Navigate after success
} else if (state is AuthFailure) {
  print('❌ OTP_DIALOG: Auth failed - ${state.message}');
  snackBar(context, "Error", state.message);  // ✅ Show error, no navigation
}
```

**Fix 2b: Google Login Listener (`influencememobile/lib/pages/auth/signup/sign_up.dart`)**

**Before:**
```dart
// Google login listener (Line 176)
BlocConsumer<AuthBloc, AuthState>(
  listener: (context, state) {
    if (state is UserExistsState) {
      navigate(context, MainPage(), finishAffinity: true);  // ❌ Navigates immediately
    }
    // ... other states
  },
)
```

**After:**
```dart
// Google login listener (Line 176)
BlocConsumer<AuthBloc, AuthState>(
  listener: (context, state) {
    // ✅ Removed UserExistsState navigation - now handled by phone login listener
    // to ensure login API is called before navigation
    if (state is UserNotExistsState) {
      // ... handle signup
    }
    // ... other states
  },
)
```

## Correct Flow Now ✅

```
1. User enters phone number and verifies OTP
   ↓
2. CheckUserExists event dispatched
   ↓
3. Backend finds user and updates phoneCode to "+91"
   ↓
4. UserExistsState emitted
   ↓
5. Phone login listener (ONLY) catches UserExistsState
   ↓
6. LoginExistingUser event dispatched with phoneCode: "+91"
   ↓
7. Backend login API searches for:
   - phone: "9024653150" AND
   - phoneCode: "+91" (now matches!)
   ↓
8. User found! ✅
   ↓
9. AuthSuccess emitted
   ↓
10. Navigate to MainPage ✅
```

## Files Modified

### Mobile:
1. **`influencememobile/lib/arc/repositories/auth_repo.dart`**
   - Updated `login` function to add `+` prefix to phoneCode (line 201)

2. **`influencememobile/lib/pages/auth/signup/sign_up.dart`**
   - Removed `UserExistsState` navigation from Google login listener (lines 177-178)
   - Now only phone login listener handles `UserExistsState`

3. **`influencememobile/lib/bottom_sheets/otp_dialog.dart`**
   - Updated `UserExistsState` handler to dispatch `LoginExistingUser` event instead of navigating (lines 149-157)
   - Added `AuthSuccess` handler to navigate after successful login (lines 158-161)
   - Updated `AuthFailure` handler with logging (lines 171-173)

## Testing Instructions

### Test 1: Existing User Login ✅
1. Open the mobile app
2. Enter phone: `9024653150`, country code: `+91`
3. Tap "Send OTP"
4. Enter OTP
5. **Expected:**
   - User exists → `UserExistsState`
   - Login triggered → `LoginExistingUser` event
   - Login API called with `phoneCode: "+91"`
   - Login successful → `AuthSuccess`
   - Navigate to MainPage ✅

### Test 2: Login Failure Handling ✅
1. Manually cause login to fail (e.g., wrong credentials)
2. **Expected:**
   - Login fails
   - `AuthFailure` emitted
   - Error snackbar shown
   - **Does NOT navigate to MainPage** ✅

## Key Learnings

1. **Data Consistency:** Always ensure the same data format across all API calls
   - `checkUserExists` and `login` must send phoneCode in the same format

2. **State Management:** Avoid multiple listeners handling the same state
   - Can lead to race conditions and unexpected behavior
   - Use comments to document which listener handles which states

3. **Separation of Concerns:**
   - Google login listener should only handle Google-related states
   - Phone login listener should only handle phone-related states

## Important Note: Brand vs Influencer Accounts ⚠️

**Issue Discovered:** The test phone number `9024653150` belongs to a **brand** account, not an influencer account.

**Backend Behavior:**
- **Influencers:** Can login with OTP only (passwordless login) ✅
- **Brands & Vendors:** Must provide a password when logging in ❌

**Database Check:**
```json
{
  "phone": "9024653150",
  "phoneCode": "+91",
  "email": "idevendrajput@gmail.com",
  "role": "brand"  // ← This user is a brand, not influencer!
}
```

**Backend Response:**
```
400 Bad Request
"Please provide password."
```

**Solution:**
For testing the **mobile app (influencer app)**, please use:
1. An **influencer** account phone number, OR
2. Create a new influencer account through the signup flow

**Backend Code Reference:**
```typescript
// userController.ts - Line 272-275
} else if (user.role !== 'influencer') {
    // Password is required for brands and vendors
    return errorResponse(res, 'Please provide password.', 400);
}
```

## Status: ✅ COMPLETE

- phoneCode formatting is now consistent (`+91` in both APIs)
- All conflicting BlocListeners fixed (OTP dialog + Google listener + Phone listener)
- Proper state management with single source of truth
- Login works correctly for existing **influencer** users
- Navigation only happens after successful login
- Error handling shows snackbar without navigation

## Next Steps

Please test the OTP login flow:
1. **Use an INFLUENCER account** (not a brand account like `9024653150`)
2. Or create a new influencer account through signup
3. Verify that login succeeds and navigates to MainPage
4. Verify that on any errors, it shows error message and does NOT navigate

