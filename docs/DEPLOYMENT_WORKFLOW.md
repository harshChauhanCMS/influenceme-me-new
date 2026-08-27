# 🚀 Deployment Workflow - CI/CD Best Practices

## ✅ Always Follow This Process

### 1. **Make Changes Locally First**
   - Always develop and test changes locally
   - Fix all errors and ensure builds pass
   - Test functionality thoroughly

### 2. **Commit and Push to GitHub**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

### 3. **Pull and Deploy on Server**
   ```bash
   # SSH to server
   ssh root@82.29.162.56
   
   # Navigate to project directory
   cd /var/www/Influenceme/backend  # or frontend
   
   # Pull latest changes
   git pull origin main
   
   # Install dependencies (if package.json changed)
   npm install
   
   # Build the project
   npm run build
   
   # Restart PM2 process
   pm2 restart influenceme-backend  # or influenceme-frontend
   
   # Check status
   pm2 status
   pm2 logs influenceme-backend --lines 20
   ```

## 🔧 Backend Deployment

### Directory Structure
```
/var/www/Influenceme/
├── backend/
│   ├── dist/              # Compiled JavaScript
│   ├── server.ts         # Source TypeScript
│   ├── package.json
│   └── .env
└── frontend/
    ├── .next/            # Next.js build output
    ├── package.json
    └── .env.local
```

### Backend Build Process
```bash
cd /var/www/Influenceme/backend
npm run build  # Runs: tsc && tsc-alias
```

**Important**: The build process:
1. Compiles TypeScript to JavaScript (`tsc`)
2. Resolves path aliases (`tsc-alias`)
3. Output goes to `dist/backend/`

### PM2 Configuration
```bash
# Start backend
cd /var/www/Influenceme/backend
pm2 start npm --name 'influenceme-backend' -- start

# The start script runs: node dist/backend/server.js
```

## 🎨 Frontend Deployment

### Frontend Build Process
```bash
cd /var/www/Influenceme/frontend
npm run build  # Next.js build
npm run postbuild  # Copies public and static files
```

### PM2 Configuration
```bash
# Start frontend
cd /var/www/Influenceme/frontend
pm2 start npm --name 'influenceme-frontend' -- start

# Uses Next.js standalone mode
```

## ⚠️ Common Issues and Fixes

### Issue 1: Path Alias Errors (`@/` imports)
**Error**: `Cannot find module '@/controllers/fileController'`

**Fix**: Use relative imports instead of path aliases in routes/controllers
```typescript
// ❌ Bad
import { downloadFile } from "@/controllers/fileController";

// ✅ Good
import { downloadFile } from "../controllers/fileController";
```

### Issue 2: Backend Not Starting
**Check**:
1. Build completed successfully: `npm run build`
2. `dist/backend/server.js` exists
3. Environment variables are set: `.env` file
4. MongoDB connection is working
5. Port 5005 is not in use

**Debug**:
```bash
pm2 logs influenceme-backend --lines 50
cd /var/www/Influenceme/backend
node dist/backend/server.js  # Test directly
```

### Issue 3: Frontend Build Fails
**Check**:
1. All dependencies installed: `npm install`
2. No TypeScript errors
3. Environment variables set: `.env.local`
4. Next.js config is correct

## 📋 Deployment Checklist

- [ ] Changes tested locally
- [ ] Build passes locally (`npm run build`)
- [ ] Changes committed and pushed to GitHub
- [ ] Pulled latest changes on server (`git pull`)
- [ ] Dependencies updated (`npm install`)
- [ ] Project rebuilt (`npm run build`)
- [ ] PM2 process restarted
- [ ] Status verified (`pm2 status`)
- [ ] Logs checked for errors (`pm2 logs`)
- [ ] API endpoints tested
- [ ] Frontend pages tested

## 🔄 Quick Deployment Script

```bash
#!/bin/bash
# deploy-backend.sh

cd /var/www/Influenceme/backend
git pull origin main
npm install
npm run build
pm2 restart influenceme-backend
pm2 logs influenceme-backend --lines 20
```

## 📝 Notes

- **Never edit files directly on the server** - Always make changes locally first
- **Always pull before making server changes** - Avoid merge conflicts
- **Test builds locally** - Catch errors before deploying
- **Check PM2 logs** - Monitor for runtime errors
- **Save PM2 config** - `pm2 save` after changes

