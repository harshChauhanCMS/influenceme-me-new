# ✅ Vendor System - Complete Backend Implementation

## 📋 Overview

Complete vendor system implementation for InfluenceMe platform, allowing vendors to list services and brands/influencers to post vendor requirements for events, exhibitions, and collaborations.

## 🎯 System Architecture

### Three Main Components:

1. **Vendors** - Service providers (photographers, event planners, caterers, etc.)
2. **Services** - Services offered by vendors
3. **Vendor Requirements** - Needs posted by brands/influencers

---

## 📊 Database Models

### 1. User Model (Extended for Vendors)

**New VendorInfo Interface:**
```typescript
interface IVendorInfo {
    vendorSince: string;
    vendorType: string;  // Photography, Event Planning, etc.
    businessName: string;
    businessRegistrationNumber: string;
    description: string;
    experience: number;  // years
    servicesOffered: string[];  // Array of service IDs
    serviceAreas: string[];  // Cities/regions
    availability: 'full-time' | 'part-time' | 'on-demand';
    rating: number;  // 0-5
    totalReviews: number;
    completedProjects: number;
    portfolio: string[];  // Image URLs
    certifications: string[];
    isVerified: boolean;
}
```

### 2. Service Model

**Purpose:** Services listed by vendors

**Fields:**
- `vendorId` - Reference to vendor user
- `serviceName` - Name of service
- `category` - Service category (photography, videography, etc.)
- `subCategory` - Optional sub-category
- `description` - Detailed description
- `price` - Service price
- `priceType` - 'fixed' | 'hourly' | 'daily' | 'package' | 'negotiable'
- `currency` - Default: INR
- `duration` - Service duration
- `images` - Array of service images
- `features` - Key features/inclusions
- `tags` - Search tags
- `isActive` - Active status
- `availability` - 'available' | 'busy' | 'unavailable'
- `location` - Service location
- `rating` - Average rating
- `reviewCount` - Number of reviews

**Indexes:**
- `vendorId + isActive`
- `category + isActive`
- `location + category`
- Text index on `serviceName + description`

### 3. Vendor Requirement Model

**Purpose:** Requirements posted by brands/influencers

**Fields:**
- `createdBy` - Brand or Influencer user ID
- `createdByRole` - 'brand' | 'influencer'
- `title` - Requirement title
- `category` - Service category needed
- `description` - Detailed description
- `eventType` - e.g., "Product Launch", "Exhibition"
- `eventDate` - Event date
- `location` - Event location with coordinates
- `budget` - Min/max budget
- `requirements` - Specific requirements array
- `duration` - Event duration
- `numberOfVendorsNeeded` - How many vendors
- `preferredVendors` - Array of preferred vendor IDs
- `status` - 'open' | 'in-progress' | 'completed' | 'cancelled' | 'closed'
- `applicants` - Array of vendor applications
- `selectedVendor` - Chosen vendor ID
- `completionDate` - When completed
- `isActive` - Active status

**Applicant Sub-schema:**
```typescript
{
    vendorId: ObjectId;
    appliedAt: Date;
    proposal: string;
    quotedPrice: number;
    status: 'pending' | 'accepted' | 'rejected';
}
```

**Indexes:**
- `createdBy + status`
- `category + status`
- `location.city + category`
- `eventDate + status`
- Text index on `title + description`

---

## 🔌 API Endpoints

### Service APIs (`/api/service`)

#### Public Endpoints

**GET /api/service/services**
- Get all active services
- Query params: page, limit, category, vendorId, location, priceMin, priceMax, search
- Returns: Paginated list of services with vendor info

**GET /api/service/service/:id**
- Get service details by ID
- Returns: Service with populated vendor information

#### Protected Endpoints (Vendor Only)

**POST /api/service/create**
- Create a new service
- Auth: Vendor only
- Body: serviceName, category, description, price, etc.
- File upload: Up to 5 images
- Returns: Created service

**GET /api/service/vendor/services**
- Get vendor's own services
- Auth: Vendor only
- Query params: page, limit
- Returns: Paginated list of vendor's services

**PUT /api/service/service/:id**
- Update a service
- Auth: Vendor only (own services)
- Body: Fields to update
- File upload: Up to 5 images
- Returns: Updated service

**DELETE /api/service/service/:id**
- Delete a service
- Auth: Vendor only (own services)
- Returns: Success message

---

### Vendor Requirement APIs (`/api/vendor-requirement`)

#### Public Endpoints

**GET /api/vendor-requirement/requirements**
- Get all requirements
- Query params: page, limit, category, status, location, budgetMin, budgetMax, search
- Returns: Paginated list of requirements

**GET /api/vendor-requirement/requirement/:id**
- Get requirement details
- Returns: Requirement with populated creator and applicants

#### Protected Endpoints (Brand/Influencer)

**POST /api/vendor-requirement/create**
- Create a new vendor requirement
- Auth: Brand or Influencer
- Body: title, category, description, eventDate, location, budget, etc.
- Returns: Created requirement

**GET /api/vendor-requirement/user/requirements**
- Get user's posted requirements
- Auth: Brand or Influencer
- Query params: page, limit, status
- Returns: Paginated list of user's requirements

**PUT /api/vendor-requirement/requirement/:id**
- Update a requirement
- Auth: Requirement owner only
- Body: Fields to update
- Returns: Updated requirement

**DELETE /api/vendor-requirement/requirement/:id**
- Delete a requirement
- Auth: Requirement owner only
- Returns: Success message

**PUT /api/vendor-requirement/requirement/:id/applicant/:vendorId**
- Accept/reject vendor application
- Auth: Requirement owner only
- Body: { status: 'accepted' | 'rejected' }
- Returns: Updated requirement

#### Protected Endpoints (Vendor)

**POST /api/vendor-requirement/requirement/:id/apply**
- Apply to a requirement
- Auth: Vendor only
- Body: proposal, quotedPrice
- Returns: Updated requirement with application

**GET /api/vendor-requirement/vendor/applications**
- Get vendor's applications
- Auth: Vendor only
- Query params: page, limit
- Returns: Paginated list of applied requirements

---

## 📝 Service Categories

```typescript
enum ServiceCategory {
    PHOTOGRAPHY = 'photography',
    VIDEOGRAPHY = 'videography',
    EVENT_PLANNING = 'event-planning',
    MAKEUP_ARTIST = 'makeup-artist',
    HAIR_STYLIST = 'hair-stylist',
    CATERING = 'catering',
    DECORATION = 'decoration',
    SOUND_SYSTEM = 'sound-system',
    LIGHTING = 'lighting',
    VENUE = 'venue',
    TRANSPORTATION = 'transportation',
    SECURITY = 'security',
    PRINTING = 'printing',
    GRAPHIC_DESIGN = 'graphic-design',
    CONTENT_CREATION = 'content-creation',
    SOCIAL_MEDIA_MANAGEMENT = 'social-media-management',
    OTHER = 'other',
}
```

---

## 🌱 Seed Data

### 10 Vendors Created:

1. **Professional Photography Studio** (Mumbai)
   - Photography services
   - 6 years experience, 4.8 rating

2. **Elite Event Planners** (Bangalore)
   - Event planning services
   - 9 years experience, 4.9 rating

3. **Creative Videography Services** (Delhi)
   - Videography services
   - 5 years experience, 4.7 rating

4. **Glam Makeup & Hair Studio** (Kolkata)
   - Makeup and hair styling
   - 7 years experience, 4.9 rating

5. **Royal Catering Services** (Chennai)
   - Catering services
   - 10 years experience, 4.6 rating

6. **Decor Dreams** (Mumbai)
   - Decoration services
   - 8 years experience, 4.8 rating

7. **Premium Sound Systems** (Gurgaon)
   - Sound and lighting
   - 6 years experience, 4.7 rating

8. **Content Creator Pro** (Bangalore)
   - Content creation
   - 4 years experience, 4.9 rating

9. **Design Studio Graphics** (Bangalore)
   - Graphic design
   - 7 years experience, 4.8 rating

10. **Luxury Transportation Services** (Gurgaon)
    - Transportation
    - 9 years experience, 4.7 rating

### Services Created:

- Event Photography (₹15,000/package)
- Product Photography (₹500/hour)
- Corporate Event Planning (₹50,000/package)
- Wedding Planning (₹1,00,000/package)
- Cinematic Wedding Video (₹25,000/package)
- Brand Campaign Video (₹2,000/hour)
- Bridal Makeup (₹8,000/package)
- Party Makeup (₹3,000/fixed)
- Corporate Catering (₹300/person)
- Wedding Catering (₹500/person)
- Social Media Content Package (₹20,000/month)

---

## 🚀 Running the Seed Script

### Step 1: Ensure MongoDB is running
```bash
# Check MongoDB connection in .env
MONGODB_URI=mongodb://localhost:27017/influenceme
```

### Step 2: Build the backend
```bash
cd backend
npm run build
```

### Step 3: Run the seed script
```bash
npm run seed:vendors
```

### Expected Output:
```
🌱 Starting database seeding...
🗑️  Clearing existing vendors...
🗑️  Clearing existing services...
👥 Creating vendors...
✅ Created vendor: Professional Photography Studio
✅ Created vendor: Elite Event Planners
... (10 vendors total)
📋 Creating services...
✅ Created 2 services for Professional Photography Studio
✅ Created 2 services for Elite Event Planners
... (services for all vendors)

🎉 Database seeding completed successfully!
📊 Created 10 vendors
📊 Created 11 services

📝 Vendor login credentials:
Email: photo@studio.com, Password: vendor123
Email: events@elite.com, Password: vendor123
... (all vendors use password: vendor123)
```

---

## 💡 Usage Flow

### For Vendors:

1. **Sign up as Vendor** (mobile app)
   - Phone number required
   - Role: 'vendor'

2. **List Services** (mobile app)
   ```
   POST /api/service/create
   {
       serviceName: "Event Photography",
       category: "photography",
       description: "...",
       price: 15000,
       priceType: "package"
   }
   ```

3. **Browse Requirements**
   ```
   GET /api/vendor-requirement/requirements?category=photography
   ```

4. **Apply to Requirements**
   ```
   POST /api/vendor-requirement/requirement/:id/apply
   {
       proposal: "I can provide...",
       quotedPrice: 12000
   }
   ```

5. **Track Applications**
   ```
   GET /api/vendor-requirement/vendor/applications
   ```

### For Brands/Influencers:

1. **Browse Services**
   ```
   GET /api/service/services?category=photography&location=Mumbai
   ```

2. **View Service Details**
   ```
   GET /api/service/service/:id
   ```

3. **Post Requirement**
   ```
   POST /api/vendor-requirement/create
   {
       title: "Photography for Product Launch",
       category: "photography",
       eventDate: "2025-11-01",
       location: { city: "Mumbai" },
       budget: { min: 10000, max: 20000 }
   }
   ```

4. **View Applications**
   ```
   GET /api/vendor-requirement/user/requirements
   ```

5. **Accept Vendor**
   ```
   PUT /api/vendor-requirement/requirement/:id/applicant/:vendorId
   {
       status: "accepted"
   }
   ```

---

## 📁 Files Created

### Models
```
✅ backend/models/service.ts
✅ backend/models/vendorRequirement.ts
✅ backend/models/user.ts (updated with vendorInfo)
```

### Controllers
```
✅ backend/controllers/serviceController.ts
✅ backend/controllers/vendorRequirementController.ts
```

### Routes
```
✅ backend/routes/serviceRoutes.ts
✅ backend/routes/vendorRequirementRoutes.ts
```

### Types
```
✅ shared/types/vendor.ts
✅ shared/types/user.ts (updated with IVendorInfo)
```

### Scripts
```
✅ backend/scripts/seedVendors.ts
```

### Server
```
✅ backend/server.ts (updated with new routes)
✅ backend/package.json (updated with seed script)
```

---

## 🔒 Authentication & Authorization

### Vendor-Only Endpoints:
- Create/Update/Delete services
- Get own services
- Apply to requirements
- View applications

### Brand/Influencer-Only Endpoints:
- Create/Update/Delete requirements
- View own requirements
- Accept/reject applicants

### Public Endpoints:
- Browse all services
- Browse all requirements
- View service/requirement details

---

## 🎯 Search & Filter Capabilities

### Services:
- By category
- By vendor ID
- By location
- By price range
- Text search (name + description)

### Requirements:
- By category
- By status
- By location
- By budget range
- By event date
- Text search (title + description)

---

## ✅ Validation

### Service Creation:
- ✅ serviceName required
- ✅ category required (must be valid enum)
- ✅ description required
- ✅ Only vendors can create
- ✅ Price validation (if provided)

### Requirement Creation:
- ✅ title required
- ✅ category required (must be valid enum)
- ✅ description required
- ✅ Only brands/influencers can create
- ✅ Budget validation (min < max)

### Application:
- ✅ Only vendors can apply
- ✅ Requirement must be 'open'
- ✅ Cannot apply twice
- ✅ Proposal/quoted price optional

---

## 📊 Statistics & Analytics (Future)

### For Vendors:
- Total services listed
- Total applications sent
- Acceptance rate
- Average project value
- Ratings and reviews

### For Brands/Influencers:
- Total requirements posted
- Total applications received
- Average response time
- Successful collaborations
- Vendor ratings

---

## 🔄 Workflow Example

```
1. Brand posts requirement:
   "Need photographer for product launch on Nov 1st in Mumbai"
   Budget: ₹10,000 - ₹20,000
   Status: OPEN

2. Vendors browse and see requirement

3. Vendor applies:
   "I can provide 8 hours photography with 300+ edited photos"
   Quoted Price: ₹15,000
   Status: PENDING

4. Brand reviews applications

5. Brand accepts vendor:
   Status: ACCEPTED
   Requirement Status: IN-PROGRESS
   Selected Vendor: Set

6. After event:
   Requirement Status: COMPLETED
   Vendor gets review/rating
```

---

## 🧪 Testing APIs

### Test Service Creation
```bash
curl -X POST http://localhost:5005/api/service/create \
  -H "Authorization: Bearer VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "Test Service",
    "category": "photography",
    "description": "Test description",
    "price": 5000,
    "priceType": "package"
  }'
```

### Test Get Services
```bash
curl http://localhost:5005/api/service/services?category=photography
```

### Test Create Requirement
```bash
curl -X POST http://localhost:5005/api/vendor-requirement/create \
  -H "Authorization: Bearer BRAND_TOKEN" \
  -H "Content-Type": application/json" \
  -d '{
    "title": "Test Requirement",
    "category": "photography",
    "description": "Need photographer for event"
  }'
```

---

## ✅ Status

**COMPLETE** - Backend vendor system fully implemented!

### What's Working:
✅ Vendor model with vendorInfo
✅ Service model with all fields
✅ Vendor requirement model with applicants
✅ All CRUD operations
✅ Search and filtering
✅ Pagination
✅ Authentication & authorization
✅ File uploads for services
✅ Application workflow
✅ Seed script with 10 vendors + services
✅ No compilation errors
✅ Follows project structure

### Ready For:
- Frontend implementation
- Mobile app integration
- Production deployment
- Real vendor onboarding

---

**Built with:** Node.js, Express, TypeScript, MongoDB, Mongoose
**Last Updated:** October 23, 2025
**Status:** ✅ Backend Complete

