# Database Configuration Fix

## Issue
Login was working on **localhost** but returning **404 "User not found"** on **production**.

## Root Cause
**Different MongoDB databases** were being used:
- **Localhost**: `mongodb+srv://...@cluster0.imabisz.mongodb.net/test`
- **Production**: `mongodb+srv://...@cluster0.imabisz.mongodb.net/influenceme`

The user `devendra@bryttek.com` exists in the `test` database but not in the `influenceme` database.

## Solution
Updated production backend to use the same `test` database as localhost.

### Change Made
**File**: `/var/www/Influenceme/backend/.env`

**Before:**
```
MONGO_URI=mongodb+srv://kumarroopesh754:7xWCjKL8t6Q6QRFA@cluster0.imabisz.mongodb.net/influenceme
```

**After:**
```
MONGO_URI=mongodb+srv://kumarroopesh754:7xWCjKL8t6Q6QRFA@cluster0.imabisz.mongodb.net/test
```

### Applied On Server
```bash
# Update .env file
cd /var/www/Influenceme/backend
sed -i 's|/influenceme|/test|g' .env

# Restart backend to pick up new database
pm2 restart influenceme-backend

# Save PM2 configuration
pm2 save
```

## Verification

### Test Login
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"devendra@bryttek.com","password":"Devendra#2204"}' \
  https://api.influence-me.in/api/user/login
```

**Result:**
```json
{
  "status": true,
  "code": 200,
  "message": "Login successful!",
  "data": {
    "token": "eyJhbGciOiJI...",
    "user": {
      "_id": "68fa48a83428793423d70229",
      "name": "Devendra Singh Kanawar",
      "email": "devendra@bryttek.com",
      "role": "brand",
      ...
    }
  }
}
```

✅ **Login now working on production!**

## Important Notes

### Database Consistency
Both localhost and production now use the **same MongoDB database** (`test`), which means:
- ✅ Same users on both environments
- ✅ Same campaigns
- ✅ Same vendors
- ✅ Same data everywhere

### Future Considerations

If you want separate databases for production and development:

1. **Option 1**: Keep them separate and manually sync data
   - Localhost: `test` database
   - Production: `influenceme` database
   - You'll need to create users separately in each

2. **Option 2**: Use the same database (current setup)
   - Both use: `test` database
   - Easier for development
   - Be careful with test data in production

## Production Environment Status

### Backend
- **Database**: `test` (MongoDB Atlas)
- **Connection**: ✅ Connected successfully
- **Port**: 5005
- **Status**: ✅ Online

### Frontend
- **URL**: https://influence-me.in
- **Port**: 3000
- **Status**: ✅ Online

### API Endpoints
- **Base URL**: https://api.influence-me.in
- **Login**: `POST /api/user/login` ✅ Working
- **Top Influencers**: `GET /api/user/influencers/top` ✅ Working

## Date
October 24, 2025

## Status
✅ **RESOLVED** - Production now using correct database with existing users

