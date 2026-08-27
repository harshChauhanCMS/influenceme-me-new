# 🔍 Troubleshooting "Invalid Campaign Data" Error

## Problem
Getting "Invalid campaign data" error when trying to send offers.

## Root Cause
The campaign object doesn't have an `_id` field, or it's named differently.

## Solution Applied

### 1. Enhanced Logging
Added console logs to show exact campaign structure:
```typescript
console.log('Campaign data:', campaign);
```

### 2. Flexible ID Handling
Updated code to handle both `_id` and `id`:
```typescript
const campaignId = campaign._id || campaign.id;
```

## How to Debug

### Step 1: Open Browser Console
Press F12 or right-click → Inspect → Console tab

### Step 2: Try to Send Offer
1. Go to Campaigns page
2. Click "Send Offer" button
3. Select an influencer
4. Click "Send X Offer(s)"

### Step 3: Check Console Logs
Look for these logs:
```javascript
User data: { _id: "...", name: "...", ... }
Campaign data: { _id: "...", name: "...", ... }  // ← THIS ONE!
Selected influencers: [{ _id: "...", ... }]
```

## Common Scenarios

### Scenario 1: Campaign has `_id`
```javascript
Campaign data: {
  _id: "6789abcd1234...",  // ✅ Good!
  name: "Summer Campaign",
  ...
}
```
**Status:** ✅ Should work now

---

### Scenario 2: Campaign has `id` instead
```javascript
Campaign data: {
  id: "6789abcd1234...",  // ⚠️ Different field name
  name: "Summer Campaign",
  ...
}
```
**Status:** ✅ Fixed! Code now handles this

---

### Scenario 3: Campaign has NO ID
```javascript
Campaign data: {
  name: "Summer Campaign",  // ❌ No _id or id field!
  type: "product",
  ...
}
```
**Status:** ❌ Backend issue - campaigns not returning ID

**Fix:** Check backend response in Network tab:
1. F12 → Network tab
2. Look for `GET /api/campaign/user` request
3. Check Response tab
4. Campaigns should have `_id` field

---

### Scenario 4: Campaign is null/undefined
```javascript
Campaign data: null  // ❌ No campaign at all!
```
**Status:** ❌ Frontend issue - campaign not passed correctly

**Fix:** Check how `handleSendOffer` is called in campaign page

---

## Backend Check

### Verify Backend Returns _id
```bash
# Test API directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5005/api/campaign/user | json_pp
```

Expected response:
```json
{
  "data": [
    {
      "_id": "6789abcd...",  // ← Must be present
      "name": "Campaign Name",
      ...
    }
  ]
}
```

## Frontend Check

### Check Campaign Service
In `campaignService.ts`, the response should be:
```typescript
response.data.data  // Array of campaigns with _id
```

### Check Campaign Page
In `campaign/page.tsx`:
```typescript
const handleSendOffer = (campaign: ICampaign) => {
  console.log('Passing campaign to dialog:', campaign);
  setSelectedCampaign(campaign);
  setSendOfferDialogOpen(true);
};
```

## Solutions by Scenario

### If Backend Returns `id` Instead of `_id`
**Option 1:** Update backend to return `_id` (recommended)

**Option 2:** Transform in frontend (already done):
```typescript
const campaignId = campaign._id || campaign.id;
```

### If Backend Returns No ID
**Fix backend controller:**
```typescript
// In campaignController.ts
const campaigns = await Campaign.find({ brandId });
// MongoDB automatically includes _id
// Make sure toObject() or JSON.stringify preserves it
```

### If Campaign is Null
**Check campaign page:**
```typescript
// Make sure campaign has data when passed
console.log('Campaign before dialog:', campaign);
setSelectedCampaign(campaign);
```

## Quick Test

### Test in Browser Console
```javascript
// Get campaign from page
const campaign = /* your campaign object */;

// Check if it has _id
console.log('Has _id:', !!campaign._id);
console.log('Has id:', !!campaign.id);
console.log('Campaign:', campaign);

// Test what would be used
const campaignId = campaign._id || campaign.id;
console.log('Would use:', campaignId);
```

## Expected Console Output (Working)

When everything is correct, you should see:
```
User data: { _id: "123...", name: "Brand Name", role: "brand" }
Campaign data: { _id: "456...", name: "Campaign Name", status: "active" }
Selected influencers: [{ _id: "789...", name: "Influencer Name" }]

Creating offer: {
  brandId: "123...",
  influencerId: "789...",
  campaignId: "456..."
}
```

Then the POST request should succeed with 200 status!

## Still Getting Error?

### Share These Logs
1. Full console.log of campaign object
2. Network tab → GET /api/campaign/user response
3. Network tab → POST /api/influencer_offer/create request payload
4. Any error messages

### Quick Workaround
If campaign truly has no _id, you can temporarily use name:
```typescript
// TEMPORARY ONLY
const campaignId = campaign._id || campaign.id || campaign.name;
```
But this is not recommended - fix the backend instead!

---

**Next Steps:**
1. Open browser console (F12)
2. Try to send offer
3. Copy the "Campaign data:" log
4. Share it if still having issues

The console logs will tell us exactly what's wrong! 🔍

