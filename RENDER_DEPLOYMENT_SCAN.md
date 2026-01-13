# RENDER DEPLOYMENT SCAN - PROJECT OVERVIEW

## Project Structure
**StudyVerse** is a full-stack study planning application with:
- **Frontend**: React + Vite (TypeScript)
- **Backend**: Node.js/Express with MongoDB
- **Mobile**: React Native/Expo (separate from Render deployment)

---

## FRONTEND (study-planner-client)

### Technology Stack
- **Framework**: React 18.2.0 with Vite 5.1.0
- **Styling**: Tailwind CSS 3.4.17 (with @tailwindcss/vite)
- **Routing**: React Router DOM 6.22.0
- **UI Libraries**:
  - Lucide React (icons)
  - Radix UI components (dialog, slot, accordion)
  - React PDF (pdf viewing)
  - FullCalendar (calendar)
  - @react-pdf/renderer (PDF generation)
- **API Client**: Axios
- **Date Handling**: date-fns
- **Markdown**: marked library
- **JSON Repair**: jsonrepair

### Build Configuration
- **Build Command**: `npm run build` → `vite build`
- **Dev Server**: Runs on port `5173`
- **Output Directory**: `dist/` (standard Vite output)
- **Node Alias**: Path alias `@/` for `./src`

### Environment Variables Required
- `VITE_API_URL`: Backend API URL (defaults to `http://localhost:5000`)

### Key Files/Structure
```
src/
├── App.jsx                    (Main router setup)
├── main.jsx                   (Entry point)
├── index.css                  (Global styles)
├── components/                (Reusable components)
├── pages/                     (Route pages)
│   ├── StudyPlan.jsx
│   ├── Dashboard.jsx
│   ├── Settings.jsx
│   ├── Notebook.jsx
│   ├── Analytics.jsx
│   └── ...
├── contexts/                  (React context)
│   ├── AuthContext.jsx
│   └── SubjectContext.jsx
├── hooks/
├── utils/
│   ├── api.js                 (API client setup)
│   └── groq.js
└── assets/
```

### API Usage
- Frontend uses environment variable `VITE_API_URL` in all API calls
- Fallback to `http://localhost:5000` if not set
- Example: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/study-sessions`

### Public Routes (accessible without authentication)
- `/login`, `/register`, `/forgot-password`, `/reset-password/:token`
- `/auth/callback`
- `/shared-plan/:shareId`

### Protected Routes
All other routes require authentication via ProtectedRoute wrapper

---

## BACKEND (study-planner-server)

### Technology Stack
- **Server**: Express.js 4.18.2
- **Database**: MongoDB (with Mongoose 8.1.1)
- **Authentication**: 
  - Passport.js 0.7.0 (with Google OAuth 2.0)
  - JWT (jsonwebtoken)
  - bcryptjs
- **Session**: express-session + connect-mongo
- **File Upload**: Multer
- **PDF Processing**: pdf-parse, pdfjs-dist
- **Email**: Nodemailer
- **CORS**: Enabled with dynamic configuration
- **AI Integration**: 
  - Google Gemini (@google/generative-ai)
  - Supabase (@supabase/supabase-js)

### Server Configuration
- **Port**: Environment variable `PORT` (defaults to `5000`)
- **Listening**: `0.0.0.0:PORT` (all interfaces)
- **Startup**: `npm start` → `node server.js`
- **Dev Mode**: `npm run dev` → `nodemon server.js`

### Environment Variables Required
```
MONGODB_URI              - MongoDB connection string
GOOGLE_CLIENT_ID         - Google OAuth Client ID
GOOGLE_CLIENT_SECRET     - Google OAuth Client Secret
CLIENT_URL               - Frontend URL (defaults to http://localhost:5173)
SERVER_URL               - Server URL (defaults to http://localhost:5000)
PORT                     - Server port (defaults to 5000)
GEMINI_API_KEY          - Google Gemini API key
SUPABASE_URL            - Supabase project URL
SUPABASE_KEY            - Supabase API key
GROQ_API_KEY            - Groq API key (for AI features)
EMAIL_USER              - Nodemailer sender email
EMAIL_PASS              - Nodemailer app password
NODE_ENV                - Environment (development/production)
```

### API Routes Mounted
```
/api/auth                  - Authentication (Google OAuth, JWT)
/api/study-sessions        - Study session CRUD
/api/notes                 - Notes management
/api/diagnostics           - Diagnostics/debugging
/api/groq                  - Groq AI integration
/api/gemini-studyplan      - Gemini study plan generation
/api/session-data          - Session data management
/api/shared-plans          - Shared study plans
/uploads                   - Static file serving for uploads
```

### CORS Configuration
Dynamic origin validation with:
- Frontend URL (from CLIENT_URL env var)
- Localhost variants
- Mobile app origins (expo, hardcoded IPs for backward compatibility)

### Database
- **MongoDB** with connection pooling (5-10 connections)
- Automatic retry logic (5 attempts, 5-second intervals)
- Health check heartbeat every 5 seconds
- Graceful shutdown on SIGINT

### Static Files
- Serves `/uploads` directory for user-uploaded files (PDFs, etc.)
- Multer handles file uploads
- PDF downloads via `/view-pdf/` and `/download/` endpoints

### Special Features
- **IP Monitor**: Real-time IP detection (dev environment)
- **Session Data Cleanup**: Automatic scheduler for data cleanup
- **Error Handling**: Comprehensive error middleware with MongoDB-specific handlers

---

## DEPLOYMENT REQUIREMENTS FOR RENDER

### Frontend (Client)
1. **Build Artifacts**: Need to build and serve static files from `dist/` directory
2. **Environment Setup**: Set `VITE_API_URL` to backend URL
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: Static file server (e.g., `npm install -g serve && serve -s dist`)
   - Or use Render's Static Site feature
5. **Node Version**: Node.js v14+
6. **Port**: Render assigns automatically

### Backend (Server)
1. **Start Command**: `npm install && npm start`
2. **Environment Variables**: All listed above (especially MONGODB_URI, GOOGLE_CLIENT_ID, etc.)
3. **Port**: Must respect `PORT` environment variable
4. **Listening**: Already set to `0.0.0.0` (good for containerized env)
5. **Node Version**: Node.js v14+
6. **Database**: MongoDB Atlas (or compatible MongoDB service)

### Critical Configuration
- **CORS Origins**: Must include Render frontend URL
- **Authentication Redirects**: Must use Render backend/frontend URLs
- **MongoDB**: Must be accessible from Render (not local)
- **File Uploads**: Render has ephemeral file system - consider cloud storage alternatives for production

### Health Checks
- Backend: GET `/` returns `{ message: 'Study Planner API is running' }`
- Server logs connection status and startup confirmation

---

## MOBILE APP (Not for Render, but in workspace)
- **Framework**: React Native with Expo
- **Type**: TypeScript
- **Not part of Render deployment** (uses Expo's own deployment)

---

## DEPLOYMENT CHECKLIST PREPARATION

### Before Deployment
- [ ] Create MongoDB Atlas account and connection string
- [ ] Set up Google OAuth (create credentials, add Render URLs)
- [ ] Prepare all environment variables
- [ ] Configure CORS origins for Render URLs
- [ ] (Optional) Set up S3/cloud storage for file uploads
- [ ] Test backend API locally with Render-like environment variables
- [ ] Test frontend build and serving locally

### On Render Dashboard
- [ ] Create two new services:
  - Backend: Node.js Web Service
  - Frontend: Static Site or Node.js Web Service
- [ ] Set environment variables for backend
- [ ] Set build/start commands as specified
- [ ] Configure healthchecks
- [ ] Link services (frontend knows backend URL)

---

## Current Local Configuration
- **Client Port**: 5173
- **Server Port**: 5000
- **Proxy**: Vite dev server proxies `/api` requests to localhost:5000

