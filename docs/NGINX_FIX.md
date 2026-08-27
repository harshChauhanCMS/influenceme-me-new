# Nginx Configuration Fix

## Issue

After deployment, both `api.influence-me.in` and `influence-me.in` were showing 502 errors or old content because:

1. **Backend API**: Nginx was proxying to port 8000 (old backend) instead of port 5005 (new backend)
2. **Frontend**: Nginx was serving static files from `/var/www/influence-me.in` (old React app) instead of proxying to Next.js on port 3000

## Solution

### Updated API Configuration

**File**: `/etc/nginx/sites-available/api.influence-me.in`

Changed proxy port from `8000` to `5005`:

```nginx
server {
    listen 443 ssl;
    server_name api.influence-me.in;

    ssl_certificate /etc/letsencrypt/live/api.influence-me.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.influence-me.in/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5005;
        proxy_http_version 1.1;

        # 🔥 REQUIRED FOR SOCKET.IO
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

```

### Updated Frontend Configuration

**File**: `/etc/nginx/sites-available/influence-me.in`

Changed from serving static files to proxying to Next.js:

```nginx
server {
    listen 443 ssl http2;
    server_name influence-me.in www.influence-me.in;

    # SSL config (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/influence-me.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/influence-me.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy to Next.js on port 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase buffer sizes for Next.js
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Static files from Next.js
    location /_next/static {
        proxy_pass http://localhost:3000/_next/static;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Public files
    location /public {
        proxy_pass http://localhost:3000/public;
        add_header Cache-Control "public, max-age=3600";
    }

    # Favicon and other root files
    location ~* \.(ico|png|svg|jpg|jpeg|gif|webp)$ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=86400";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name influence-me.in www.influence-me.in;

    if ($host = influence-me.in) {
        return 301 https://$host$request_uri;
    }

    if ($host = www.influence-me.in) {
        return 301 https://$host$request_uri;
    }

    return 404;
}
```

## Commands to Apply

```bash
# Test Nginx configuration
nginx -t

# Reload Nginx (no downtime)
systemctl reload nginx

# Or restart Nginx (brief downtime)
systemctl restart nginx
```

## Verification

1. **Backend API**: https://api.influence-me.in/ → Should return "Influence-Me API is running..."
2. **Frontend**: https://influence-me.in/ → Should show Next.js application (not old React app)

## Services Status

```bash
pm2 status
```

Should show:

- `influenceme-backend` on port 5005 (online)
- `influenceme-frontend` on port 3000 (online)

## Notes

- **SSL Certificates**: Managed by Certbot and Let's Encrypt
- **HTTP to HTTPS**: Automatic redirect configured
- **Next.js SSR**: All requests are proxied to Next.js for server-side rendering
- **Static Assets**: Cached appropriately for performance
- **PM2**: Auto-starts services on server reboot

## Date

October 23, 2025
