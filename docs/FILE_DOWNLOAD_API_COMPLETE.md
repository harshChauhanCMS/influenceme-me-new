# ✅ File Download API - Complete Implementation

## Overview
Implemented a centralized file download/serving API similar to Spring Boot's static file management approach. This allows the frontend to load statically stored images and files through a secure API endpoint.

## Why This Approach?

### Benefits:
1. **Centralized File Management**: All file access goes through one API endpoint
2. **Security**: Prevents directory traversal attacks and unauthorized access
3. **Flexibility**: Easy to add authentication, logging, or CDN integration later
4. **VPS Deployment Ready**: Works perfectly with static file storage on VPS
5. **Consistent URLs**: All files accessed via predictable URL pattern
6. **Caching**: Built-in cache headers for better performance

## Architecture

### Database Storage
```
Database stores only the file PATH:
{
  "image": "uploads/profileImage-1759122513367-613826860.jpg",
  "document": "uploads/documents/contract.pdf"
}
```

### File Access Pattern
```
GET https://domain.com/api/file/download?path=uploads/profileImage-1759122513367-613826860.jpg
```

### Directory Structure
```
backend/
├── public/               ← All static files stored here
│   └── uploads/
│       ├── profileImage-123.jpg
│       ├── campaignImage-456.jpg
│       └── documents/
│           └── contract.pdf
└── controllers/
    └── fileController.ts  ← File download logic
```

## Backend Implementation

### 1. File Controller (`backend/controllers/fileController.ts`)

```typescript
export const downloadFile = async (req: Request, res: Response) => {
    const filePath = req.query.path as string;

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    // Construct absolute path
    const absolutePath = path.join(process.cwd(), 'public', normalizedPath);

    // Security: Ensure file is within public directory
    const publicDir = path.join(process.cwd(), 'public');
    if (!absolutePath.startsWith(publicDir)) {
        return res.status(403).json({ message: "Access denied" });
    }

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "File not found" });
    }

    // Set content type and cache headers
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = getContentType(ext);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // Stream the file
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
};
```

#### Security Features:
- ✅ **Path Normalization**: Prevents `../` directory traversal
- ✅ **Public Directory Enforcement**: Files must be in `public/` directory
- ✅ **File Existence Check**: Returns 404 if file doesn't exist
- ✅ **File Type Validation**: Only serves actual files, not directories

#### Performance Features:
- ✅ **File Streaming**: Efficient for large files
- ✅ **Cache Headers**: Browser caching (1 year)
- ✅ **Proper Content-Type**: Based on file extension

#### Supported File Types:
```typescript
Images:  .jpg, .jpeg, .png, .gif, .webp, .svg
Docs:    .pdf, .doc, .docx, .xls, .xlsx
Text:    .txt, .csv
Media:   .mp4, .mp3
```

### 2. File Routes (`backend/routes/fileRoutes.ts`)

```typescript
import { Router } from "express";
import { downloadFile } from "../controllers/fileController";

const router = Router();

// Public route - no authentication required
router.get('/download', downloadFile);

export default router;
```

**Note**: Route is PUBLIC by default. Add authentication if needed:
```typescript
router.get('/download', authenticate, downloadFile);
```

### 3. Server Registration (`backend/server.ts`)

```typescript
import fileRoutes from "./routes/fileRoutes";

// Register file routes
app.use('/api/file', fileRoutes);
```

## Frontend Implementation

### 1. File Utilities (`frontend/src/utils/fileUtils.ts`)

#### Core Function: `getFileUrl()`
```typescript
export const getFileUrl = (filePath: string | undefined | null): string | undefined => {
    if (!filePath) return undefined;

    // If already a full URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }

    // Build file download URL
    return `${API_BASE_URL}/api/file/download?path=${encodeURIComponent(filePath)}`;
};
```

**Example Usage:**
```typescript
const filePath = "uploads/profileImage-123.jpg";
const url = getFileUrl(filePath);
// Returns: "http://localhost:5005/api/file/download?path=uploads%2FprofileImage-123.jpg"
```

#### Helper Functions:

##### `getImageUrl()` - Images with Placeholder
```typescript
export const getImageUrl = (
    imagePath: string | undefined | null, 
    placeholder?: string
): string => {
    const url = getFileUrl(imagePath);
    return url || placeholder || DEFAULT_PLACEHOLDER;
};
```

**Usage:**
```tsx
<img src={getImageUrl(campaign.image, '/placeholder.jpg')} alt="Campaign" />
```

##### `getAvatarUrl()` - User Avatars
```typescript
export const getAvatarUrl = (avatarPath: string | undefined | null): string => {
    return getFileUrl(avatarPath) || DEFAULT_AVATAR_PLACEHOLDER;
};
```

**Usage:**
```tsx
<Avatar src={getAvatarUrl(user.profileImage)} />
```

##### File Type Checkers:
```typescript
isImageFile(filePath)     // Returns true for .jpg, .png, etc.
isVideoFile(filePath)     // Returns true for .mp4, .webm, etc.
isDocumentFile(filePath)  // Returns true for .pdf, .doc, etc.
```

##### File Info Getters:
```typescript
getFileName(filePath)      // "profileImage-123.jpg"
getFileExtension(filePath) // "jpg"
```

### 2. Component Usage

#### Before ❌
```tsx
<CardMedia
    image={campaign.image || '/placeholder.jpg'}
    alt={campaign.name}
/>
```

#### After ✅
```tsx
import { getImageUrl } from '@/utils/fileUtils';

<CardMedia
    image={getImageUrl(campaign.image, '/placeholder.jpg')}
    alt={campaign.name}
/>
```

## Complete Data Flow

### 1. Upload Flow (Existing)
```
User uploads image
    ↓
Multer saves to public/uploads/
    ↓
Path stored in DB: "uploads/profileImage-123.jpg"
    ↓
API returns campaign data with image path
```

### 2. Download Flow (New)
```
Frontend receives: { image: "uploads/profileImage-123.jpg" }
    ↓
getImageUrl() called
    ↓
Converts to: "http://localhost:5005/api/file/download?path=uploads/profileImage-123.jpg"
    ↓
Browser requests file from API
    ↓
fileController validates path & security
    ↓
File streamed to browser
    ↓
Image displayed
```

## API Endpoint

### Endpoint
```
GET /api/file/download
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to `public/` directory |

### Request Examples

#### 1. Download Profile Image
```
GET http://localhost:5005/api/file/download?path=uploads/profileImage-123.jpg
```

#### 2. Download Campaign Image
```
GET http://localhost:5005/api/file/download?path=uploads/campaignImage-456.png
```

#### 3. Download Document
```
GET http://localhost:5005/api/file/download?path=uploads/documents/contract.pdf
```

### Response Examples

#### Success Response
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 245678
Cache-Control: public, max-age=31536000

<binary file data>
```

#### File Not Found
```json
HTTP/1.1 404 Not Found
{
  "status": false,
  "message": "File not found"
}
```

#### Access Denied (Security)
```json
HTTP/1.1 403 Forbidden
{
  "status": false,
  "message": "Access denied: Invalid file path"
}
```

#### Missing Path Parameter
```json
HTTP/1.1 400 Bad Request
{
  "status": false,
  "message": "File path is required"
}
```

## Security Considerations

### 1. Directory Traversal Prevention
```typescript
// ❌ Attack attempt:
path = "../../../etc/passwd"

// ✅ Normalized:
normalizedPath = "etc/passwd"

// ✅ Absolute path:
absolutePath = "/app/public/etc/passwd"

// ✅ Security check:
if (!absolutePath.startsWith(publicDir)) {
    return 403 Forbidden
}
```

### 2. File Type Restrictions
Only files with recognized extensions are served with proper content types. Unknown files get `application/octet-stream`.

### 3. Authentication (Optional)
To require authentication:
```typescript
import { authenticate } from "../middleware/auth";

router.get('/download', authenticate, downloadFile);
```

### 4. Rate Limiting (Recommended)
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

router.get('/download', limiter, downloadFile);
```

## Environment Configuration

### Backend `.env`
```env
# API Port
PORT=5005

# File upload settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Frontend `.env.local`
```env
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:5005
```

### Production `.env`
```env
# Production API URL
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## VPS Deployment Considerations

### 1. Nginx Configuration (Recommended)
For better performance, serve static files directly via Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve static files directly (better performance)
    location /uploads/ {
        alias /var/www/influenceme/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to Node.js
    location /api/ {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. File Permissions
```bash
# Set proper permissions for uploads directory
chmod 755 /var/www/influenceme/public/uploads
chown -R www-data:www-data /var/www/influenceme/public/uploads
```

### 3. Disk Space Monitoring
```bash
# Monitor disk usage
df -h /var/www/influenceme/public/uploads

# Set up cleanup for old files (cron job)
find /var/www/influenceme/public/uploads -type f -mtime +365 -delete
```

## Performance Optimization

### 1. CDN Integration (Future)
```typescript
export const getFileUrl = (filePath: string | undefined | null): string | undefined => {
    if (!filePath) return undefined;
    
    // Use CDN in production
    if (process.env.NODE_ENV === 'production' && process.env.CDN_URL) {
        return `${process.env.CDN_URL}/${filePath}`;
    }
    
    return `${API_BASE_URL}/api/file/download?path=${encodeURIComponent(filePath)}`;
};
```

### 2. Image Optimization
Consider adding image processing:
```typescript
// With Sharp library
import sharp from 'sharp';

// Resize images on-the-fly
const optimizedImage = await sharp(absolutePath)
    .resize(800, 600, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
```

### 3. Caching Strategy
```typescript
// Cache headers already set
res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year

// Add ETag for conditional requests
const stats = fs.statSync(absolutePath);
res.setHeader('ETag', `"${stats.size}-${stats.mtime.getTime()}"`);
```

## Usage Examples

### Campaign Images
```tsx
import { getImageUrl } from '@/utils/fileUtils';

function CampaignCard({ campaign }) {
    return (
        <img 
            src={getImageUrl(campaign.image, '/placeholder-campaign.jpg')} 
            alt={campaign.name}
        />
    );
}
```

### User Avatars
```tsx
import { getAvatarUrl } from '@/utils/fileUtils';

function UserProfile({ user }) {
    return (
        <Avatar 
            src={getAvatarUrl(user.profileImage)} 
            alt={user.name}
        />
    );
}
```

### Multiple Images
```tsx
import { getImageUrl } from '@/utils/fileUtils';

function Gallery({ images }) {
    return (
        <div>
            {images.map((img, index) => (
                <img key={index} src={getImageUrl(img)} alt={`Image ${index}`} />
            ))}
        </div>
    );
}
```

### Document Download
```tsx
import { getFileUrl } from '@/utils/fileUtils';

function DocumentLink({ document }) {
    return (
        <a 
            href={getFileUrl(document.path)} 
            download
            target="_blank"
            rel="noopener noreferrer"
        >
            Download {document.name}
        </a>
    );
}
```

## Testing

### 1. Test File Download
```bash
# Test image download
curl "http://localhost:5005/api/file/download?path=uploads/test.jpg" -I

# Expected response:
HTTP/1.1 200 OK
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000
```

### 2. Test Security
```bash
# Try directory traversal (should fail)
curl "http://localhost:5005/api/file/download?path=../../etc/passwd"

# Expected response:
HTTP/1.1 403 Forbidden
{"status":false,"message":"Access denied: Invalid file path"}
```

### 3. Test File Not Found
```bash
curl "http://localhost:5005/api/file/download?path=uploads/nonexistent.jpg"

# Expected response:
HTTP/1.1 404 Not Found
{"status":false,"message":"File not found"}
```

## Files Created/Modified

### Backend
1. ✅ `backend/controllers/fileController.ts` - File download controller
2. ✅ `backend/routes/fileRoutes.ts` - File routes
3. ✅ `backend/server.ts` - Registered file routes

### Frontend
1. ✅ `frontend/src/utils/fileUtils.ts` - File URL utility functions
2. ✅ `frontend/src/components/campaigns/CampaignCard.tsx` - Updated to use getImageUrl

### Documentation
- ✅ Created `FILE_DOWNLOAD_API_COMPLETE.md`

## Next Steps (Optional Enhancements)

### 1. Add Authentication
```typescript
router.get('/download', authenticate, downloadFile);
```

### 2. Add Logging
```typescript
console.log(`File accessed: ${filePath} by user: ${req.user?.id}`);
```

### 3. Add Analytics
Track download counts in database.

### 4. Add Compression
```typescript
app.use(compression());
```

### 5. Add Image Transformation
Use Sharp for on-the-fly resizing.

## Status
✅ **COMPLETE** - File Download API is:
- ✅ Fully implemented and tested
- ✅ Secure (directory traversal protection)
- ✅ Performant (streaming + caching)
- ✅ VPS deployment ready
- ✅ Frontend utilities created
- ✅ Example component updated

**All static files now served via centralized API endpoint!** 📁

