# Static Files & CORS Fix

## Issues Found

### 1. CORS Error
**Error**: `The 'Access-Control-Allow-Origin' header contains multiple values '*, *', but only one is allowed`

**Cause**: Nginx was setting CORS headers in multiple places, causing duplicate headers.

**Fix**: Consolidated CORS headers in one location block in API Nginx config.

### 2. Missing Public Files (Videos & Images)
**Error**: 
- `/videos/influfeed.webm:1 Failed to load resource: the server responded with a status of 404`
- `/logo.webp:1 Failed to load resource: the server responded with a status of 404`

**Cause**: The `frontend/public/` folder was never committed to git repository.

**Fix**: Added all public files to git and pushed to repository.

## Solutions Applied

### 1. Fixed API CORS Configuration

**File**: `/etc/nginx/sites-available/api.influence-me.in`

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

server {
    if ($host = api.influence-me.in) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name api.influence-me.in;
    return 404;
}
```

### 2. Added Public Files to Repository

**Files Added**:
- `frontend/public/background.webp`
- `frontend/public/logo.webp`
- `frontend/public/logo.png`
- `frontend/public/logo2.png`
- `frontend/public/file.svg`
- `frontend/public/globe.svg`
- `frontend/public/window.svg`
- `frontend/public/next.svg`
- `frontend/public/vercel.svg`
- `frontend/public/videos/brand.webm`
- `frontend/public/videos/brandfeed.webm`
- `frontend/public/videos/influ.webm`
- `frontend/public/videos/influfeed.webm`
- `frontend/public/videos/vendor.webm`

**Total Size**: ~3.1 MB of video files

### 3. Next.js Public Folder Structure

Next.js automatically serves files from the `public` folder at the root URL:

```
/public/logo.webp → accessible at https://influence-me.in/logo.webp
/public/videos/brand.webm → accessible at https://influence-me.in/videos/brand.webm
```

Nginx proxies all requests to Next.js on port 3000, which handles serving these static files.

## Verification

### Test CORS
```bash
curl -H "Origin: https://influence-me.in" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     https://api.influence-me.in/api/user/influencers/top
```

Should return `204 No Content` with proper CORS headers.

### Test API Call
```bash
curl https://api.influence-me.in/api/user/influencers/top
```

Should return JSON response without CORS errors.

### Test Static Files
- https://influence-me.in/logo.webp → Should load the logo
- https://influence-me.in/videos/brand.webm → Should load the video

## Commands Applied

```bash
# 1. Update Nginx API config
nano /etc/nginx/sites-available/api.influence-me.in

# 2. Test and reload Nginx
nginx -t
systemctl reload nginx

# 3. Pull latest code with public files
cd /var/www/Influenceme
git pull origin main

# 4. Restart frontend to pick up new files
pm2 restart influenceme-frontend
pm2 save
```

## Results

✅ **CORS Error Fixed**: API calls now work from frontend without CORS issues

✅ **Videos Loading**: All 5 video files (brand.webm, brandfeed.webm, influ.webm, influfeed.webm, vendor.webm) now load correctly

✅ **Images Loading**: Logo and other images now display properly

✅ **API Working**: Test call to `/api/user/influencers/top` returns successful response

## Browser Console

After the fix, the browser console should be clean with no 404 or CORS errors.

## Date
October 23, 2025

