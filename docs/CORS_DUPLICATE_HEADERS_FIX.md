# CORS Duplicate Headers Fix - Final Solution

## Problem

After deployment, API calls from the frontend were failing with:

```
Access to XMLHttpRequest at 'https://api.influence-me.in/api/user/login' 
from origin 'https://influence-me.in' has been blocked by CORS policy: 
The 'Access-Control-Allow-Origin' header contains multiple values '*, *', 
but only one is allowed.
```

## Root Cause

**Duplicate CORS headers** were being set by both:
1. **Nginx** - Reverse proxy server adding CORS headers
2. **Express Backend** - Using `cors()` middleware adding its own CORS headers

When a request went through Nginx → Backend, both were adding the same headers, resulting in:
```
Access-Control-Allow-Origin: *, *  ← DUPLICATE!
```

This violates the CORS specification which allows only **one** value per header.

## Solution

Since **Nginx is the entry point** for all requests and already handles CORS properly, we disabled CORS in the Express backend to prevent duplication.

### Changes Made

#### 1. Backend Changes (`backend/server.ts`)

**Before:**
```typescript
import cors = require("cors");

// Enable Cross-Origin Resource Sharing
app.use(cors());
```

**After:**
```typescript
// import cors = require("cors"); // Disabled: CORS is handled by Nginx

// Enable Cross-Origin Resource Sharing
// app.use(cors()); // Disabled: CORS is handled by Nginx
```

#### 2. Nginx Configuration (Already Correct)

**File:** `/etc/nginx/sites-available/api.influence-me.in`

```nginx
server {
    server_name api.influence-me.in;

    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        
        # CORS headers - only set once here
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.influence-me.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.influence-me.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

## Deployment Steps

```bash
# 1. Pull latest code
cd /var/www/Influenceme
git pull origin main

# 2. Rebuild backend (to pick up server.ts changes)
cd backend
npm run build

# 3. Restart backend
pm2 restart influenceme-backend

# 4. Save PM2 configuration
pm2 save
```

## Verification

### Test CORS Headers

```bash
curl -I -H "Origin: https://influence-me.in" \
     https://api.influence-me.in/api/user/influencers/top 2>&1 | \
     grep -i 'access-control'
```

**Expected Output (Single values only):**
```
access-control-allow-origin: *
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-allow-headers: Authorization, Content-Type, Accept
access-control-allow-credentials: true
```

### Test API Call from Browser

Open browser console on https://influence-me.in and run:
```javascript
fetch('https://api.influence-me.in/api/user/influencers/top')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

Should return data without CORS errors.

## Why This Approach?

### Option 1: Handle CORS in Backend Only ❌
- Requires removing Nginx CORS headers
- Less flexible for multiple backends
- Backend must handle all CORS logic

### Option 2: Handle CORS in Nginx Only ✅ (Chosen)
- **Single point of CORS management**
- Works for any backend (Node.js, Python, etc.)
- Easier to update CORS policies
- Better for microservices architecture
- Backend code stays cleaner

## Important Notes

1. **Never use both Nginx and Backend CORS** - Always choose one or the other
2. **Nginx is preferred** when using a reverse proxy setup
3. **Backend CORS is preferred** when deploying backend directly without reverse proxy
4. **For production**, consider replacing `*` with specific origins:
   ```nginx
   add_header Access-Control-Allow-Origin "https://influence-me.in" always;
   ```

## Testing Checklist

- [x] No CORS errors in browser console
- [x] API calls work from frontend
- [x] Login functionality works
- [x] Only one `Access-Control-Allow-Origin` header present
- [x] OPTIONS (preflight) requests return 204
- [x] Both GET and POST requests work

## Related Files

- `backend/server.ts` - Backend server configuration
- `/etc/nginx/sites-available/api.influence-me.in` - Nginx API proxy config
- `/etc/nginx/sites-available/influence-me.in` - Nginx frontend proxy config

## Status

✅ **Issue Resolved** - CORS now works correctly with single header values

## Date
October 24, 2025

