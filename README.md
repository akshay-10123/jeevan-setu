## Jeevan Setu — Disaster Management App

Jeevan Setu is a simple disaster management prototype with a Node.js/Express backend and a static HTML/JS frontend. It enables victims to raise emergency requests and volunteers/admins to manage and resolve them. Authentication supports Google OAuth and JWT.

### Features
- Victim can create emergency requests with location and details
- Volunteers can find nearby requests and accept/complete them
- Admin can view volunteers and manage their status
- Google OAuth login and JWT-protected APIs
- Health check and graceful startup even without MongoDB (falls back to in-memory behavior for basic flows)

### Tech Stack
- Backend: Node.js, Express, Mongoose, Passport (Google OAuth), express-session, JWT
- Frontend: Static HTML/CSS/JS

## Project Structure
```
disaster-managament-main/
  backend/
    config/
      db.js          # MongoDB connection (non-fatal if not available)
      passport.js    # Google OAuth strategy
    models/
      User.js        # Users: victim, volunteer, admin
      Request.js     # Emergency requests
      Notification.js# Simple notification records
    routes/
      auth.js        # OAuth callback, profile CRUD, logout
      requests.js    # CRUD for requests
      users.js       # Admin/volunteer utilities
    server.js        # Express app entry
    package.json
  frontend/
    index.html, login.html, victim.html, volunteer.html, admin.html
    app.js, js/api.js, style.css
  package.json       # Root scripts that delegate to backend
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (optional for basic local testing; app starts even if DB is unavailable)

### Installation
```bash
# From project root
npm install --prefix backend
```

### Environment Variables
Create a `.env` file in `backend/` with the following (sample values):
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/jeevan-setu
SESSION_SECRET=replace-with-strong-secret
JWT_SECRET=replace-with-strong-jwt-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## Running the App

### From the project root (recommended)
```bash
# Start in production-like mode
npm start

# Start in dev mode (auto-restart on changes)
npm run dev
```
These commands delegate to `backend/server.js` (uses nodemon in dev).

### Directly from backend (alternative)
```bash
cd backend
npm start        # node server.js
npm run dev     # nodemon server.js
```

The server runs on `http://localhost:5000` by default.

## API Overview

Base URL: `http://localhost:5000`

### Health
- GET `/health` → `{ status, timestamp, uptime }`

### Auth (`/api/auth`)
- GET `/google` → Start Google OAuth
- GET `/google/callback` → OAuth callback; redirects to `FRONTEND_URL/login.html?token=...&role=...`
- GET `/profile` (Bearer token) → Get current user
- PUT `/profile` (Bearer token) → Update `{ location, address, phone, skills }`
- POST `/logout` → Logout session

### Requests (`/api/requests`)
- GET `/` → List all requests
- GET `/:id` → Get request by id
- POST `/` → Create request
  - Accepts unauthenticated users; creates a temporary victim if no token is provided
- PUT `/:id` → Update request status/assignment
- DELETE `/:id` → Delete request

### Users/Admin (`/api/users`)
- GET `/volunteers` (admin) → List volunteers
- PUT `/volunteers/:id/status` (admin) → Update `isActive`
- GET `/volunteers/nearby?lat=..&lng=..&maxDistance=50000` (admin) → Nearby volunteers
- GET `/my-requests` (victim) → Current user’s requests with `timeToResolve`
- GET `/nearby-requests?maxDistance=50000` (volunteer) → Nearby pending requests
- POST `/accept-request/:requestId` (volunteer) → Accept a request
- POST `/complete-request/:requestId` (volunteer) → Complete a request
- GET `/notifications` (auth) → Recent notifications
- PUT `/notifications/:id/read` (auth) → Mark notification as read

## Frontend
- Static pages in `frontend/` consume the above APIs
- Update `FRONTEND_URL` in `.env` to match where you serve the static files (e.g., a simple static server or opening the HTML files directly during development)

## Development Notes
- CORS allows `FRONTEND_URL` (default `http://localhost:3000`) with credentials
- If MongoDB is not running, the server logs a warning and continues; DB-backed endpoints will not persist data
- Use strong secrets for `SESSION_SECRET` and `JWT_SECRET` before deploying

## Common Commands
```bash
# Install dependencies
npm install --prefix backend

# Start
npm start

# Dev
npm run dev
```

## Troubleshooting
- If `npm start` fails at root, ensure the root `package.json` exists with scripts and run `npm install --prefix backend`
- If MongoDB connection fails, the app will still start; start MongoDB and restart the server for persistence
- For OAuth login failures, verify Google credentials and callback URL in `.env`

## License
ISC (for now). Update as needed.


