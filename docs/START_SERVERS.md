# 🚀 Quick Start Guide

## Starting the Application

### 1. Start Backend Server

```bash
cd /Users/devendrasingh/WebstormProjects/influenceme-new/backend
npm start
```

**Expected Output:**
```
> backend@1.0.0 start
> nodemon dist/server.js

[nodemon] starting `node dist/server.js`
✅ MongoDB connected successfully
🚀 Server is running on port 5005
```

**Verify Backend is Running:**
```bash
curl http://localhost:5005/api/user/top-influencers
```

---

### 2. Start Frontend Server

**In a new terminal:**
```bash
cd /Users/devendrasingh/WebstormProjects/influenceme-new/frontend
npm run dev
```

**Expected Output:**
```
   ▲ Next.js 15.x.x
   - Local:        http://localhost:3000
   - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.3s
```

**Open in Browser:**
```
http://localhost:3000
```

---

## Testing the Send Offer Flow

### Step 1: Login as Brand
1. Navigate to `http://localhost:3000/login`
2. Login with brand credentials
3. You'll be redirected to dashboard

### Step 2: Go to Campaigns
1. Click on "Campaigns" in the sidebar
2. You should see your campaigns listed

### Step 3: Send Offer to Influencers
1. Find an **Active** campaign
2. Click the **"Send Offer"** button
3. Enhanced Send Offer Dialog opens

### Step 4: Filter Influencers
1. Use filters to find suitable influencers:
   - **Search**: Type name or email
   - **Genre**: Select multiple (Fashion, Beauty, etc.)
   - **Influencer Type**: Micro, Macro, Mega, Nano
   - **Location**: Type city/state
   - **Engagement**: Drag slider (0-100%)

### Step 5: Select Influencers
1. Click on influencer cards to select
2. Or use "Select All" button
3. Selected influencers show checkmark and border

### Step 6: Send Offers
1. Click **"Send X Offer(s)"** button
2. Offers are sent in parallel
3. Success message appears
4. Dialog closes automatically

### Step 7: View Offers
1. Navigate to **"Offers (Influencers)"** in sidebar
2. Click **"Offers"** tab
3. Your sent offers appear here
4. Status: Pending, Accepted, Declined, Negotiating

### Step 8: View Deals (After Acceptance)
1. When influencer accepts offer
2. It moves to **"Deals"** tab
3. Track progress of accepted collaborations

---

## API Endpoints Reference

### Influencer Offers
```
POST   /api/influencer_offer/create
GET    /api/influencer_offer/offers
GET    /api/influencer_offer/offer/:id
DELETE /api/influencer_offer/offer/:id
POST   /api/influencer_offer/offer/:id/response
```

### Influencer Brand Deals
```
GET    /api/influencer_brand_deal/deals
GET    /api/influencer_brand_deal/deal/:id
PUT    /api/influencer_brand_deal/deal/:id
POST   /api/influencer_brand_deal/deal/:id/complete
POST   /api/influencer_brand_deal/deal/:id/cancel
```

### Users/Influencers
```
GET    /api/user/top-influencers
GET    /api/user/influencers/get?page=1&limit=50
```

---

## Troubleshooting

### Backend Won't Start
```bash
# Kill any running processes
pkill -f "node.*backend"

# Rebuild
cd backend
npm run build

# Start fresh
npm start
```

### Frontend Won't Start
```bash
# Clear cache
cd frontend
rm -rf .next
npm run dev
```

### 404 Errors on API Calls
1. Check backend is running: `curl http://localhost:5005/api/user/top-influencers`
2. Check routes in `backend/routes/`
3. Verify endpoints in `frontend/src/utils/network_utils.ts`
4. Rebuild backend: `npm run build`

### No Influencers Loading
1. Check MongoDB connection
2. Verify influencers exist in database:
   ```bash
   mongo influenceme
   db.users.find({ role: 'influencer' }).count()
   ```
3. Check backend logs for errors

### Filters Not Working
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify filter state updates
4. Check network requests in Network tab

---

## Environment Variables

### Backend (.env)
```env
PORT=5005
MONGODB_URI=mongodb://localhost:27017/influenceme
JWT_SECRET=your-secret-key
GOOGLE_API_KEY=AIzaSyDaBH4s0V--dDHWMpw4wNKIXiQ-EIFuSJM
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5005
```

---

## Development Workflow

### Making Backend Changes
```bash
cd backend

# Make your changes
# Then rebuild
npm run build

# Server auto-restarts if using nodemon
```

### Making Frontend Changes
```bash
cd frontend

# Make your changes
# Next.js auto-reloads
# No rebuild needed
```

---

## Ports

| Service | Port | URL |
|---------|------|-----|
| Backend | 5005 | http://localhost:5005 |
| Frontend | 3000 | http://localhost:3000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

---

## Database Collections

```
users                      # Brands, Influencers, Vendors
campaigns                  # Campaign listings
influenceroffers           # Pending offers
influencerbranddeals       # Accepted deals
```

---

**Happy Coding! 🎉**

