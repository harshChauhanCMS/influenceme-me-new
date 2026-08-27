# InfluenceMe - Complete Project Structure

## 📁 Project Overview

This is the **InfluenceMe** monorepo containing both the **web application** (MERN stack) and the **mobile application** (Flutter).

```
influenceme-new/
├── influenceme-new/          # Web Application (MERN Stack)
│   ├── backend/              # Node.js + Express + MongoDB API
│   ├── frontend/             # Next.js 15 (React) Web App
│   ├── admin/                # Admin Panel (Vite + React)
│   ├── shared/               # Shared TypeScript types & enums
│   └── public/               # Static assets (images, uploads)
│
└── influencememobile/        # Mobile Application (Flutter)
    ├── lib/                  # Flutter source code
    ├── android/              # Android build configuration
    ├── ios/                  # iOS build configuration
    └── assets/               # Mobile app assets
```

---

## 🌐 Web Application (`influenceme-new/`)

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Material-UI v7, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based auth with role-based access control
- **File Storage**: Local file system with custom API
- **APIs**: Google Maps (Places Autocomplete), Social Media OAuth

### Directory Structure

#### 📂 `backend/` - REST API Server
```
backend/
├── config/
│   └── db.ts                 # MongoDB connection
├── controllers/              # Business logic
│   ├── campaignController.ts
│   ├── influencerBrandDealController.ts
│   ├── influencerOfferController.ts
│   ├── mapController.ts
│   ├── userController.ts
│   ├── vendorRequirementController.ts
│   ├── vendorOfferController.ts
│   ├── vendorReviewController.ts
│   ├── fileController.ts
│   └── serviceController.ts
├── middleware/
│   ├── auth.ts               # JWT authentication
│   └── fileUpload.ts         # Multer file upload
├── models/                   # Mongoose schemas
│   ├── user.ts
│   ├── campaign.ts
│   ├── influencerOffer.ts
│   ├── influencerBrandDeal.ts
│   ├── vendorRequirement.ts
│   ├── vendorOffer.ts
│   ├── vendorReview.ts
│   ├── service.ts
│   └── genre.ts
├── routes/                   # API routes
│   └── [corresponding route files]
├── scripts/                  # Utility scripts
│   ├── seedVendors.ts
│   └── fixVendorRequirementSchema.ts
├── utils/
│   ├── jwtService.ts
│   ├── responseHelper.ts
│   └── formDataParser.ts
├── server.ts                 # Main server entry
└── package.json
```

**Port**: `5005` (development), `5005` (production via PM2)

#### 📂 `frontend/` - Next.js Web Application
```
frontend/
├── src/
│   ├── app/                  # Next.js 15 App Router
│   │   ├── (routes)/
│   │   │   ├── dashboard/
│   │   │   ├── campaign/
│   │   │   ├── requirements/
│   │   │   ├── vendors/
│   │   │   ├── offers/
│   │   │   ├── vendor-offers/
│   │   │   ├── profile/
│   │   │   ├── chat/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── layout.tsx        # Root layout
│   │   ├── layout_wrapper.tsx
│   │   └── page.tsx          # Homepage
│   ├── components/           # Reusable components
│   │   ├── campaigns/
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignForm.tsx
│   │   │   ├── CampaignDetailsDialog.tsx
│   │   │   └── GoogleMapsLocationPicker.tsx
│   │   ├── requirements/
│   │   │   ├── RequirementForm.tsx
│   │   │   └── SendVendorOfferDialog.tsx
│   │   ├── vendors/
│   │   │   ├── VendorCard.tsx
│   │   │   ├── VendorProfileDialog.tsx
│   │   │   └── VendorReviewDialog.tsx
│   │   ├── offers/
│   │   │   └── EnhancedSendOfferDialog.tsx
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── NavigationDrawer.tsx
│   │   └── ...
│   ├── services/             # API service layer
│   │   ├── userService.ts
│   │   ├── campaignService.ts
│   │   ├── mapService.ts
│   │   ├── offerService.ts
│   │   ├── vendorService.ts
│   │   ├── vendorRequirementService.ts
│   │   ├── vendorOfferService.ts
│   │   └── vendorReviewService.ts
│   ├── context/
│   │   └── authContext.tsx   # Authentication context
│   ├── theme/
│   │   └── index.ts          # MUI theme (light green #8CC342)
│   ├── utils/
│   │   └── network_utils.ts  # API endpoints & config
│   └── assets/               # Images, fonts, etc.
├── public/                   # Static files
│   ├── videos/
│   ├── images/
│   └── uploads/              # User uploaded files
└── package.json
```

**Port**: `3000` (development), `3000` (production via PM2)

#### 📂 `admin/` - Admin Panel
```
admin/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
└── package.json
```

Vite + React admin panel for system management.

#### 📂 `shared/` - Shared TypeScript Definitions
```
shared/
├── types/
│   ├── user.ts
│   ├── campaign.ts
│   ├── influencerOffer.ts
│   ├── influencerBrandDeal.ts
│   ├── vendorRequirement.ts
│   ├── vendorOffer.ts
│   ├── vendorReview.ts
│   ├── service.ts
│   └── map.ts
└── enums/
    └── enums.ts
```

Shared between frontend, backend, and admin for type safety.

---

## 📱 Mobile Application (`influencememobile/`)

### Technology Stack
- **Framework**: Flutter 3.x
- **Language**: Dart
- **State Management**: BLoC pattern
- **Backend Integration**: REST API (same backend as web)
- **Authentication**: JWT tokens
- **Firebase**: Push notifications, Analytics
- **Platforms**: Android, iOS, Web (optional)

### Directory Structure

```
influencememobile/
├── lib/
│   ├── main.dart             # App entry point
│   ├── arc/                  # Architecture components
│   ├── base/                 # Base classes
│   ├── bloc/                 # BLoC state management
│   ├── bottom_sheets/        # Bottom sheet widgets
│   ├── components/           # Reusable UI components
│   ├── data/                 # Data layer
│   ├── enums/                # Dart enums
│   ├── models/               # Data models
│   │   ├── user_model.dart
│   │   ├── campaign_model.dart
│   │   ├── offer_model.dart
│   │   └── ...
│   ├── network/              # API integration
│   │   ├── api_client.dart
│   │   ├── endpoints.dart
│   │   └── ...
│   ├── pages/                # App screens
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── offers/
│   │   ├── profile/
│   │   ├── chat/
│   │   └── ...
│   ├── repositories/         # Data repositories
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   ├── widgets/              # Custom widgets
│   └── style/                # Theming & styles
├── assets/
│   ├── fonts/                # Custom fonts
│   ├── icons/                # App icons
│   ├── images/               # Static images
│   └── svg/                  # SVG assets
├── android/                  # Android configuration
├── ios/                      # iOS configuration
├── pubspec.yaml              # Flutter dependencies
└── README.md
```

**Supported Platforms**: Android, iOS

---

## 🔗 Shared Backend

Both web and mobile applications use the **same backend API** running on Node.js/Express.

### User Roles
1. **Brand** - Web panel (post campaigns, requirements)
2. **Influencer** - Mobile app (respond to campaigns, offers)
3. **Vendor** - Mobile app (respond to requirements, provide services)

### Key Features

#### 🎯 Campaign System
- Brands create campaigns via web
- Influencers receive and respond via mobile
- Offers → Negotiation → Deals
- Budget management, target audience, engagement tracking

#### 📋 Vendor Requirement System
- Brands/Influencers post requirements via web
- Vendors send offers via mobile
- Service categories: photography, videography, catering, etc.

#### ⭐ Review & Rating System
- Brands/Influencers review vendors
- Reviews with rating, helpfulness voting
- Average rating calculation

#### 💬 Chat System
- Real-time messaging between parties
- Message history, read receipts

#### 📍 Location Services
- Google Maps integration
- Location-based vendor/influencer search
- Address autocomplete

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** 5+ running locally or remote
- **Flutter** 3.x SDK (for mobile)
- **Android Studio** / **Xcode** (for mobile development)

### Web Application Setup

#### 1. Backend
```bash
cd influenceme-new/backend
npm install
cp .env.example .env          # Configure environment variables
npm run dev                    # Development server on port 5005
```

#### 2. Frontend
```bash
cd influenceme-new/frontend
npm install
npm run dev                    # Development server on port 3000
```

#### 3. Admin Panel
```bash
cd influenceme-new/admin
npm install
npm run dev
```

### Mobile Application Setup

```bash
cd influencememobile
flutter pub get
flutter run                    # Run on connected device/emulator
```

#### For Android
```bash
flutter build apk --release    # Build release APK
```

#### For iOS
```bash
flutter build ios --release    # Build for iOS
```

---

## 🌍 Environment Variables

### Backend (`.env`)
```env
PORT=5005
MONGO_URI=mongodb://localhost:27017/influenceme
JWT_SECRET=your-jwt-secret
GOOGLE_MAPS_API_KEY=your-google-maps-key
NODE_ENV=development
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5005
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Mobile (`lib/network/endpoints.dart`)
```dart
static const String baseUrl = 'http://localhost:5005/api';
// Or production: 'https://api.influence-me.in/api'
```

---

## 📦 Deployment

### Web (Production Server)
- **Backend**: PM2 process manager on port 5005
- **Frontend**: PM2 + Next.js standalone on port 3000
- **Nginx**: Reverse proxy
  - `api.influence-me.in` → Backend
  - `influence-me.in` → Frontend
- **SSL**: Let's Encrypt certificates

### Mobile
- **Android**: Google Play Store
- **iOS**: Apple App Store

---

## 📚 Documentation Files

The project includes extensive documentation:
- `API_DOCUMENTATION.md` - Backend API reference
- `CAMPAIGN_SYSTEM_COMPLETE.md` - Campaign feature docs
- `VENDOR_REQUIREMENT_SYSTEM.md` - Vendor requirement docs
- `DEPLOYMENT_COMPLETE.md` - Deployment guide
- `START_SERVERS.md` - Quick start guide
- And many more...

---

## 🛠️ Tech Stack Summary

### Web
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 18, TypeScript |
| UI Framework | Material-UI v7, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| File Upload | Multer (local storage) |
| Maps | Google Maps API |

### Mobile
| Layer | Technology |
|-------|-----------|
| Framework | Flutter 3.x |
| Language | Dart |
| State Management | BLoC |
| Backend API | Same Express API |
| Authentication | JWT tokens |
| Push Notifications | Firebase Cloud Messaging |

---

## 👥 User Flows

### Brand (Web)
1. Sign up / Login
2. Complete profile
3. Create campaigns
4. Send offers to influencers
5. Post vendor requirements
6. Send offers to vendors
7. Review vendors
8. Chat with influencers/vendors

### Influencer (Mobile)
1. Sign up / Login
2. Complete profile
3. Browse campaigns
4. Receive offers from brands
5. Accept/Decline/Negotiate offers
6. Manage deals
7. Review vendors
8. Chat with brands

### Vendor (Mobile)
1. Sign up / Login
2. Complete profile
3. List services
4. Browse requirements
5. Receive offers from brands
6. Accept/Decline/Negotiate offers
7. Manage bookings
8. Chat with brands/influencers

---

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting
- File type validation
- Secure file uploads

---

## 🎨 Design System

### Color Palette
- **Primary**: `#8CC342` (Light Green)
- **Secondary**: `#9c27b0` (Purple)
- **Background**: `#ffffff` (White - Light Mode)
- **Paper**: `#f8f9fa` (Light Gray)

### Typography
- **Font**: Inter (sans-serif)

---

## 📊 Database Schema

Key Collections:
- `users` - All users (brands, influencers, vendors)
- `campaigns` - Campaign listings
- `influenceroffers` - Offers sent to influencers
- `influencerbranddeals` - Accepted deals
- `vendorrequirements` - Requirements posted by brands
- `vendoroffers` - Offers sent to vendors
- `vendorreviews` - Vendor reviews and ratings
- `services` - Services offered by vendors
- `genres` - Campaign/content genres

---

## 🧪 Testing

### Backend
```bash
cd influenceme-new/backend
npm test
```

### Frontend
```bash
cd influenceme-new/frontend
npm test
```

### Mobile
```bash
cd influencememobile
flutter test
```

---

## 📝 License

Proprietary - All rights reserved

---

## 👨‍💻 Development Team

**Project**: InfluenceMe  
**Platform**: Web + Mobile  
**Architecture**: MERN + Flutter  

---

## 🔄 Version Control

This is a monorepo structure with:
- Git repository root at `/influenceme-new/`
- Separate `package.json` for backend, frontend, and admin
- Shared types in `shared/` directory
- Mobile app as a separate Flutter project

---

## 📞 Support

For issues or questions, please refer to the documentation files or contact the development team.

**Last Updated**: October 24, 2025

