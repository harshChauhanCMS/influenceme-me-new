# InfluenceMe New 🚀

A modern influencer marketing platform built with MERN stack and TypeScript, featuring Material UI for a sleek user experience.

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - Modern React UI library
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe backend development
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Admin Panel
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Material-UI** - Consistent design system

## 📁 Project Structure

```
influenceme-new/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js API server
├── admin/             # React admin panel
├── package.json       # Root package.json with scripts
└── README.md         # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd /Users/devendrasingh/WebstormProjects/influenceme-new
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Setup environment variables:**
   
   Copy the example environment file in the backend:
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Update the `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret
   - Cloudinary credentials (for image uploads)
   - Firebase credentials (for notifications)

### 🏃‍♂️ Running the Project

#### Development Mode (All services)
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Admin Panel: http://localhost:5173

#### Individual Services
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Admin panel only
npm run dev:admin
```

### 🏗️ Building for Production

```bash
npm run build
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run dev:frontend` | Start frontend development server |
| `npm run dev:backend` | Start backend development server |
| `npm run dev:admin` | Start admin panel development server |
| `npm run build` | Build all applications for production |
| `npm run install:all` | Install dependencies for all modules |
| `npm start` | Start production server |

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/influenceme-new
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:5173
```

## 🌟 Features (Planned)

- [ ] User Authentication & Authorization
- [ ] Influencer Profile Management
- [ ] Campaign Creation & Management
- [ ] Real-time Notifications
- [ ] Analytics Dashboard
- [ ] Payment Integration
- [ ] Multi-platform Social Media Integration
- [ ] Advanced Search & Filtering
- [ ] Rating & Review System
- [ ] Admin Panel for Platform Management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆚 Comparison with Original

This is a TypeScript rewrite of the original `influenceme` project with the following improvements:

- **Full TypeScript**: Both frontend and backend
- **Next.js**: Modern React framework with App Router
- **Material-UI**: Consistent, modern design system
- **Improved Architecture**: Better folder structure and separation of concerns
- **Modern Dependencies**: Latest versions of all packages
- **Enhanced Developer Experience**: Better tooling and development setup

---

**Built with ❤️ using MERN Stack + TypeScript + Material-UI**