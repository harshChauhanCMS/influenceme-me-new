# 🚀 Deployment Instructions - Vendor Offers Page Enhancement

## Changes Summary

### Frontend Updates
1. ✅ Requirement filter dropdown (brands/influencers only)
2. ✅ Updated tabs: Pending, Accepted, Declined, Deals
3. ✅ Declined offers tab implementation
4. ✅ Deals tab with vendor-brand deals display
5. ✅ Improved deal cards with service/payment status
6. ✅ View Details button for deals (placeholder for navigation)

### Backend Updates
1. ✅ Added `requirementId` filter support to `getUserReceivedOffers` endpoint

## Build Status
- ✅ **Backend**: Compiled successfully (TypeScript, no errors)
- ✅ **Frontend**: Compiled successfully (Next.js build, no errors)
- ✅ **Lint**: No lint errors found

## Deployment Steps

### 1. SSH to Server
```bash
ssh root@82.29.162.56
```

### 2. Navigate to Project
```bash
cd /var/www/Influenceme
```

### 3. Pull Latest Changes
```bash
git pull origin main
```

### 4. Update Backend
```bash
cd backend
npm install
npm run build
pm2 restart influenceme-backend
```

### 5. Update Frontend
```bash
cd ../frontend
npm install
npm run build
pm2 restart influenceme-frontend
```

### 6. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs influenceme-backend --lines 50

# Check frontend logs
pm2 logs influenceme-frontend --lines 50

# Test the new endpoint
curl -X GET "https://api.influence-me.in/api/vendor-offer/user/received?requirementId=YOUR_REQ_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 7. Save PM2 Configuration
```bash
pm2 save
```

## New Features Available

### For Brands/Influencers
- **Requirement Filter**: Dropdown at top to filter offers by requirement
- **Declined Tab**: View all declined offers
- **Deals Tab**: View active deals with detailed information
- **Enhanced Deal Cards**: Shows service status, payment status, agreed amount, delivery time

### For Vendors
- **Declined Tab**: View declined offers they sent

## Testing Checklist

- [ ] Requirement dropdown loads correctly
- [ ] Filtering by requirement works in all tabs
- [ ] Pending tab shows pending offers
- [ ] Accepted tab shows accepted offers
- [ ] Declined tab shows declined offers
- [ ] Deals tab loads and displays deals correctly
- [ ] Deal cards show all relevant information
- [ ] Pagination works for all tabs
- [ ] Backend endpoint accepts requirementId parameter
- [ ] No console errors in browser

## API Endpoints Updated

### GET /api/vendor-offer/user/received
**New Query Parameter:**
- `requirementId` (optional): Filter offers by requirement ID

**Example:**
```
GET /api/vendor-offer/user/received?page=1&limit=10&status=pending&requirementId=12345
```

## Files Modified

### Frontend
- `src/app/vendor-offers/page.tsx` - Main page with all new features
- `src/services/vendorDealService.ts` - New service for deals
- `src/services/vendorOfferService.ts` - Updated to support requirementId
- `src/utils/network_utils.ts` - Added vendor brand deals endpoints

### Backend
- `backend/controllers/vendorOfferController.ts` - Added requirementId filter

## Rollback Instructions (If Needed)

```bash
# Revert to previous commit
cd /var/www/Influenceme
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
cd backend
npm run build
pm2 restart influenceme-backend
cd ../frontend
npm run build
pm2 restart influenceme-frontend
pm2 save
```

## Status
✅ **All changes pushed to GitHub**
✅ **Builds successful**
✅ **Ready for deployment**



