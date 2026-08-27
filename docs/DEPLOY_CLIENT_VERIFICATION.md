# 🚀 Deployment Instructions - Client Verification Flow

## Changes Deployed

### Backend Changes
1. ✅ Added `pending_verification` service status
2. ✅ Modified `updateServiceStatus` to convert vendor "completed" to "pending_verification"
3. ✅ Created `verifyServiceCompletion` endpoint for client verification
4. ✅ Updated `markDealCompleted` to require client verification first

### Mobile Changes
1. ✅ Added `pendingVerification` to ServiceStatus enum
2. ✅ Added verification UI for clients
3. ✅ Updated vendor actions to show pending verification state
4. ✅ Implemented Bloc architecture for verification flow

## Backend Deployment Steps

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

### 5. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs influenceme-backend --lines 50

# Test the new endpoint
curl -X PATCH https://api.influence-me.in/api/vendor-brand-deal/:dealId/verify-completion \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. Save PM2 Configuration
```bash
pm2 save
```

## Mobile App Deployment

### Note: Mobile changes are code-only
- Mobile app updates require building a new APK/IPA
- These changes will be included in the next app store release
- For testing, build locally:
  ```bash
  cd influencememobile
  flutter build apk --release  # Android
  flutter build ios --release # iOS
  ```

## New API Endpoints

### Verify Service Completion
```
PATCH /api/vendor-brand-deal/:dealId/verify-completion
Authorization: Bearer {token}
Role: brand | influencer (client only)
```

**Response:**
```json
{
  "status": true,
  "message": "Service completion verified successfully. Deal marked as completed.",
  "data": { /* updated deal object */ }
}
```

## Updated Service Status Flow

1. **Vendor marks service as completed**
   - Status: `pending` → `in-progress` → `pending_verification`
   - Client receives notification (if implemented)

2. **Client verifies completion**
   - Status: `pending_verification` → `completed`
   - Deal status: `running` → `completed`

3. **Deal completed**
   - Service status: `completed`
   - Deal status: `completed`
   - Deal completion date set

## Testing Checklist

- [ ] Vendor can mark service as completed (status becomes pending_verification)
- [ ] Client sees "Verify Service Completion" button
- [ ] Client can verify completion
- [ ] Deal status changes to completed after verification
- [ ] Vendor sees updated status after client verification
- [ ] Service status colors display correctly
- [ ] Error handling works for unauthorized access

## Rollback Instructions (If Needed)

```bash
# Revert to previous commit
cd /var/www/Influenceme
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
cd backend
npm run build
pm2 restart influenceme-backend
pm2 save
```

## Status
✅ **Backend changes pushed to GitHub**
⚠️ **Mobile changes committed (awaiting app build)**



