# Location Data Debug Guide 🔍

## Issue
Location data exists in database but shows "Location information not provided" in mobile app.

## Debug Logging Added

### ✅ Debug Points

I've added comprehensive logging at 3 critical points:

#### 1. **BrandAddresses Parsing** (`campaign_model.dart` line ~451)
```dart
🏠 DEBUG BrandAddresses.fromJson: input JSON = {...}
🏠 DEBUG BrandAddresses created: city="...", street="..."
```

#### 2. **BrandInfo Parsing** (`campaign_model.dart` line ~309)
```dart
📦 DEBUG BrandInfo.fromJson: addresses in JSON = {...}
📦 DEBUG BrandInfo.fromJson: parsed addresses object = ...
📦 DEBUG: city from parsed = "..."
📦 DEBUG: streetAddress from parsed = "..."
```

#### 3. **Location Tab Display** (`brand_profile_page.dart` line ~340)
```dart
🔍 DEBUG: addresses object = ...
🔍 DEBUG: addresses == null? ...
🔍 DEBUG: streetAddress = "..."
🔍 DEBUG: city = "..."
🔍 DEBUG: state = "..."
🔍 DEBUG: country = "..."
🔍 DEBUG: pinCode = "..."
🔍 DEBUG: hasAnyAddress = ...
```

---

## Testing Steps

### 1. **Run the App**
```bash
cd influencememobile
flutter run
```

### 2. **Navigate to Brand Profile**
- Open any campaign
- Scroll to brand section
- Tap "View Full Brand Profile"
- Switch to "Location" tab

### 3. **Check Debug Logs**

Look for the debug output in your console. You should see:

```
📦 DEBUG BrandInfo.fromJson: addresses in JSON = {city: Bhilwara, country: India, ...}
🏠 DEBUG BrandAddresses.fromJson: input JSON = {city: Bhilwara, ...}
🏠 DEBUG BrandAddresses created: city="Bhilwara", street="Bhilwara, Rajasthan, India"
📦 DEBUG BrandInfo.fromJson: parsed addresses object = Instance of 'BrandAddresses'
📦 DEBUG: city from parsed = "Bhilwara"
📦 DEBUG: streetAddress from parsed = "Bhilwara, Rajasthan, India"

🔍 DEBUG: addresses object = Instance of 'BrandAddresses'
🔍 DEBUG: addresses == null? false
🔍 DEBUG: streetAddress = "Bhilwara, Rajasthan, India"
🔍 DEBUG: city = "Bhilwara"
🔍 DEBUG: state = "Rajasthan"
🔍 DEBUG: country = "India"
🔍 DEBUG: pinCode = ""
🔍 DEBUG: hasAnyAddress = true
✅ DEBUG: Address data found, displaying location info
```

---

## Possible Issues & Solutions

### Issue 1: `addresses in JSON = null`
**Problem**: Backend not sending addresses
**Solution**: Check backend populate

```typescript
// backend/controllers/campaignController.ts line 146
.populate("createdBy", "... addresses ...")  // Make sure 'addresses' is included
```

**Fix**: Already done ✅

---

### Issue 2: `input JSON = {}` (empty object)
**Problem**: Addresses object exists but all fields are null/empty
**Solution**: Check database - brand may not have filled addresses

**Check MongoDB**:
```javascript
db.users.findOne({_id: "brandId"}, {addresses: 1})
```

---

### Issue 3: `addresses object = null` but JSON had data
**Problem**: Parsing failed silently
**Solution**: Check for type mismatches

**Look for**:
- JSON has `addresses` but it's not a Map
- Field names don't match (e.g., `street` vs `streetAddress`)

---

### Issue 4: `hasAnyAddress = false` but fields have data
**Problem**: All fields are empty strings `""`
**Solution**: Check if database has empty strings vs null

**Fix in code** (if needed):
```dart
// Change this:
addresses!.city != null

// To this:
addresses!.city != null && addresses!.city!.isNotEmpty
```

---

## Expected Database Structure

```json
{
  "_id": "userId",
  "name": "Brand Name",
  "addresses": {
    "streetAddress": "123 Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pinCode": "400001",
    "latitude": "19.0760",
    "longitude": "72.8777"
  }
}
```

---

## Backend Check

### Verify Population
```bash
# SSH to server
ssh root@82.29.162.56

# Check PM2 logs
pm2 logs backend

# Look for the populate query
# Should include "addresses" in the select fields
```

### Test API Directly
```bash
curl -X POST https://api.influence-me.in/campaign/details \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"id": "CAMPAIGN_ID", "userId": "USER_ID"}' | jq '.data.createdBy.addresses'
```

Should return:
```json
{
  "city": "Bhilwara",
  "country": "India",
  "state": "Rajasthan",
  "streetAddress": "Bhilwara, Rajasthan, India",
  "pinCode": "",
  "latitude": "25.3407388",
  "longitude": "74.6313182999999"
}
```

---

## Mobile Debug

### Check Network Response

Add this to `campaign_repo.dart`:
```dart
Future<Campaign> getCampaignDetails(String id) async {
  final response = await DioClient.websiteDio.post(...);
  
  // ADD THIS:
  print('🌐 API Response: ${response.data}');
  print('🌐 createdBy: ${response.data['data']['createdBy']}');
  print('🌐 addresses: ${response.data['data']['createdBy']['addresses']}');
  
  return Campaign.fromJson(response.data['data']);
}
```

---

## Quick Fix Options

### Option A: Data is null in DB
**Fix**: Brand needs to fill their profile
- Go to frontend brand profile page
- Fill in location information
- Save

### Option B: Backend not sending
**Fix**: Update populate query (already done ✅)

### Option C: Parsing issue
**Fix**: Check field name mismatches

### Option D: Display logic issue
**Fix**: Update check in brand_profile_page.dart

---

## Remove Debug Logs (After Fixed)

Once issue is found and fixed, remove debug prints:

### 1. **campaign_model.dart**
Remove lines ~310-320 and ~451-463

### 2. **brand_profile_page.dart**
Remove lines ~340-369

Or use conditional debug:
```dart
if (kDebugMode) {
  print('DEBUG: ...');
}
```

---

## Contact Flow

Based on debug output, we can determine:

1. ✅ **Backend sends data**: Addresses in JSON not null
2. ✅ **Parsing works**: BrandAddresses created successfully
3. ✅ **Data reaches UI**: addresses object not null in Location tab
4. ❌ **Display logic fails**: hasAnyAddress = false or other issue

Then fix the specific failing step!

---

## Status: 🔍 DEBUG MODE ACTIVE

Run the app and check console logs to identify exactly where the data is being lost.

**Next Steps:**
1. Run app
2. Navigate to brand profile → Location tab
3. Copy console logs
4. Share logs to identify issue
5. Apply specific fix based on findings

---

**Created**: October 28, 2025
**Purpose**: Debug location data flow from database → API → mobile app → UI


