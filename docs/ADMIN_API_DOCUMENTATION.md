# Admin API Documentation - InfluenceMe New

## Overview

The admin APIs have been successfully migrated from JavaScript to TypeScript with modern patterns and local file storage instead of Cloudinary.

## Key Features

### ✅ **Local File Storage System**
- Direct file upload/download without external dependencies
- Path-based image serving: `{base_url}/api/image/download?path={image_path}`
- Organized directory structure: `uploads/images/{type}/{filename}`
- Automatic file management (move, delete, cleanup)

### ✅ **TypeScript Implementation**
- Full type safety across all admin operations
- Comprehensive input validation with Joi
- Standardized error handling and responses
- Modern async/await patterns

### ✅ **Enhanced Security**
- Admin-only access controls
- JWT authentication required
- Path traversal attack prevention
- File type validation and size limits

## API Endpoints

Base URL: `http://localhost:5000/api`

---

## 🖼️ **Image Management APIs**

### **GET** `/api/image/download`
**Description**: Serve/download images from local storage  
**Access**: Public  
**Parameters**:
- `path` (query): Image path relative to project root
- `download` (query, optional): Set to 'true' to force download

**Examples**:
```bash
# View image in browser
GET /api/image/download?path=uploads/images/blogs/1640995200000-123456789.jpg

# Force download
GET /api/image/download?path=uploads/images/blogs/image.jpg&download=true
```

### **POST** `/api/image/upload`
**Description**: Upload temporary image  
**Access**: Private (Admin only)  
**Body**: Form data with `file` field and optional `uploadType`

### **POST** `/api/image/move`
**Description**: Move image from temp to permanent location  
**Access**: Private (Admin only)  
**Body**: 
```json
{
  "sourcePath": "uploads/images/temp/temp-image.jpg",
  "destinationType": "blogs"
}
```

### **DELETE** `/api/image/delete`
**Description**: Delete image from storage  
**Access**: Private (Admin only)  
**Body**: 
```json
{
  "path": "uploads/images/blogs/image.jpg"
}
```

### **GET** `/api/image/info`
**Description**: Get image metadata  
**Access**: Public  
**Parameters**: `path` (query)

---

## 📝 **Blog Management APIs**

### **POST** `/api/admin/blogs`
**Description**: Create new blog post  
**Access**: Private (Admin only)  
**Body**:
```json
{
  "title": "Blog Title",
  "content": "Blog content here...",
  "author": "Author Name", 
  "tags": ["tag1", "tag2"] or "tag1,tag2",
  "isPublished": true,
  "category": "technology"
}
```
**File**: Optional image upload via form data

### **GET** `/api/admin/blogs`
**Description**: Get all blogs with admin filters  
**Access**: Private (Admin only)  
**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): "published" or "draft"
- `author` (string): Filter by author name
- `tag` (string): Filter by tag

### **GET** `/api/admin/blogs/stats`
**Description**: Get blog statistics  
**Access**: Private (Admin only)  
**Response**:
```json
{
  "status": true,
  "data": {
    "stats": {
      "total": 50,
      "published": 30,
      "drafts": 20,
      "recent": 10,
      "topTags": [{"_id": "tech", "count": 15}]
    }
  }
}
```

### **GET** `/api/admin/blogs/published`
**Description**: Get published blogs (public format)  
**Access**: Private (Admin only)  
**Query**: `page`, `limit`, `tag`, `search`

### **GET** `/api/admin/blogs/:id`
**Description**: Get single blog by ID  
**Access**: Private (Admin only)

### **PUT** `/api/admin/blogs/:id`
**Description**: Update blog post  
**Access**: Private (Admin only)  
**Body**: Same as create (all fields optional)  
**File**: Optional new image

### **DELETE** `/api/admin/blogs/:id`
**Description**: Delete blog post  
**Access**: Private (Admin only)

---

## 📧 **Inquiry Management APIs**

### **POST** `/api/inquiries/create`
**Description**: Create new inquiry (public endpoint)  
**Access**: Public  
**Body**:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "mobile": "+1234567890",
  "message": "Your inquiry message here...",
  "category": "general"
}
```

### **GET** `/api/admin/inquiries`
**Description**: Get all inquiries with filters  
**Access**: Private (Admin only)  
**Query Parameters**:
- `page`, `limit`: Pagination
- `status`: "open", "resolved", "closed"
- `priority`: "low", "medium", "high"
- `category`: Filter by category
- `assignedTo`: Filter by assigned admin ID
- `search`: Search in name, email, message

### **GET** `/api/admin/inquiries/stats`
**Description**: Get inquiry statistics  
**Access**: Private (Admin only)  
**Response**:
```json
{
  "status": true,
  "data": {
    "stats": {
      "total": 150,
      "byStatus": {"open": 50, "resolved": 80, "closed": 20},
      "byPriority": {"high": 10, "medium": 100, "low": 40},
      "recent": 25,
      "unassigned": 15,
      "avgResponseTime": 2.5,
      "byCategory": [{"_id": "general", "count": 100}]
    }
  }
}
```

### **GET** `/api/admin/inquiries/my-assigned`
**Description**: Get inquiries assigned to current admin  
**Access**: Private (Admin only)  
**Query**: `page`, `limit`, `status`

### **GET** `/api/admin/inquiries/:id`
**Description**: Get single inquiry by ID  
**Access**: Private (Admin only)

### **PUT** `/api/admin/inquiries/:id/status`
**Description**: Update inquiry status  
**Access**: Private (Admin only)  
**Body**:
```json
{
  "status": "resolved",
  "responseMessage": "We have addressed your concern..."
}
```

### **PUT** `/api/admin/inquiries/:id/assign`
**Description**: Assign inquiry to admin  
**Access**: Private (Admin only)  
**Body**:
```json
{
  "assignedTo": "admin_user_id"
}
```

### **PUT** `/api/admin/inquiries/:id/priority`
**Description**: Update inquiry priority  
**Access**: Private (Admin only)  
**Body**:
```json
{
  "priority": "high"
}
```

### **DELETE** `/api/admin/inquiries/:id`
**Description**: Delete inquiry  
**Access**: Private (Admin only)

---

## 👥 **User Management APIs**

### **GET** `/api/admin/dashboard`
**Description**: Get admin dashboard overview  
**Access**: Private (Admin only)  
**Response**:
```json
{
  "status": true,
  "data": {
    "stats": {
      "users": {
        "total": 1000,
        "influencers": 600,
        "brands": 300,
        "vendors": 100,
        "active": 950,
        "inactive": 50,
        "recent": 150
      },
      "growth": [{"_id": {"year": 2025, "month": 1}, "count": 50}]
    },
    "user": {
      "id": "admin_id",
      "name": "Admin Name", 
      "role": "admin"
    }
  }
}
```

### **GET** `/api/admin/users`
**Description**: Get all users with filters  
**Access**: Private (Admin only)  
**Query Parameters**:
- `page`, `limit`: Pagination
- `role`: Filter by user role
- `isActive`: Filter by active status ("true"/"false")
- `search`: Search in name, email

### **PUT** `/api/admin/users/:id/status`
**Description**: Update user active status  
**Access**: Private (Admin only)  
**Body**:
```json
{
  "isActive": true,
  "reason": "Account reactivated after verification"
}
```

---

## 🏥 **Health Check APIs**

### **GET** `/api/admin/health`
**Description**: Admin service health check  
**Access**: Private (Admin only)

### **GET** `/api/image/health`
**Description**: Image service health check  
**Access**: Public

---

## 🔒 **Authentication Requirements**

All admin endpoints require:

**Header**:
```
Authorization: Bearer <jwt-token>
```

**User Role**: Must be `admin`

**Example Authentication Flow**:
1. Login as admin: `POST /api/auth/login`
2. Get JWT token from response
3. Include token in Authorization header for admin APIs

---

## 📊 **Response Format**

All APIs use standardized response format:

**Success Response**:
```json
{
  "status": true,
  "code": 200,
  "message": "Operation successful",
  "data": { ... },
  "pagination": { ... } // For paginated responses
}
```

**Error Response**:
```json
{
  "status": false,
  "code": 400,
  "message": "Error description",
  "data": { "errors": [...] } // For validation errors
}
```

---

## 🚀 **Key Improvements Over Original**

### **File Storage**
- ❌ **Before**: Cloudinary dependency
- ✅ **Now**: Local storage with direct serving

### **Type Safety**
- ❌ **Before**: JavaScript with potential runtime errors
- ✅ **Now**: Full TypeScript with compile-time validation

### **Validation**
- ❌ **Before**: Basic validation
- ✅ **Now**: Comprehensive Joi schemas with detailed error messages

### **Architecture**
- ❌ **Before**: Mixed patterns and inconsistent responses
- ✅ **Now**: Standardized patterns, middleware, and response helpers

### **Security**
- ❌ **Before**: Basic security measures
- ✅ **Now**: Enhanced security with path traversal prevention, file type validation

### **Image Handling**
- ❌ **Before**: `{cloudinary_url}`
- ✅ **Now**: `{base_url}/api/image/download?path={local_path}`

### **Database Schema**
- ❌ **Before**: Basic Blog/Inquiry models
- ✅ **Now**: Enhanced models with virtuals, indexing, and advanced features

---

## 📁 **File Structure**

```
backend/src/
├── controllers/admin/
│   ├── blogController.ts       # Blog CRUD operations
│   └── inquiryController.ts    # Inquiry management
├── controllers/
│   └── imageController.ts      # Image serving & management
├── models/
│   ├── Blog.ts                 # Enhanced blog model
│   └── Inquiry.ts              # Enhanced inquiry model
├── routes/admin/
│   ├── index.ts                # Main admin routes
│   ├── blogRoutes.ts           # Blog-specific routes
│   └── inquiryRoutes.ts        # Inquiry-specific routes
├── routes/
│   └── imageRoutes.ts          # Image management routes
├── middleware/
│   └── adminValidation.ts      # Validation schemas
└── utils/
    └── fileUpload.ts           # File handling utilities
```

---

## 🧪 **Testing Examples**

### Create Admin User (via auth API):
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "securepassword",
    "role": "admin"
  }'
```

### Login & Get Token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword"
  }'
```

### Create Blog Post:
```bash
curl -X POST http://localhost:5000/api/admin/blogs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Blog Post",
    "content": "This is the content of my first blog post...",
    "author": "Admin User",
    "tags": ["technology", "programming"],
    "isPublished": true
  }'
```

### Submit Public Inquiry:
```bash
curl -X POST http://localhost:5000/api/inquiries/create \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "mobile": "+1234567890", 
    "message": "I need help with my account setup",
    "category": "support"
  }'
```

---

The admin API migration is now **complete** with full TypeScript implementation, local file storage, comprehensive validation, and all the patterns you requested! 🎉