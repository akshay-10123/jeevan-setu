# Jeevan Setu — Disaster Management Platform

**Jeevan Setu** (जीवन सेतु — *Life Bridge*) ek role-based disaster management web application hai jahan **victims** emergency help maangte hain, **volunteers** nearby requests accept/complete karte hain, aur **admin** sab monitor karke volunteers assign karta hai.

> **One-liner (Interview):** Location-aware emergency coordination platform — MongoDB geo-queries se nearby matching, real-time Socket.io updates, guest emergency mode bina login ke, aur JWT-based role authentication.

---

## Table of Contents

1. [Features (Complete List)](#features-complete-list)
2. [Demo Accounts & Quick Start](#demo-accounts--quick-start)
3. [Tech Stack](#tech-stack)
4. [Interview Guide](#interview-guide)
5. [Architecture](#architecture)
6. [Role-wise User Flows](#role-wise-user-flows)
7. [Location System](#location-system)
8. [Real-time Updates (Socket.io)](#real-time-updates-socketio)
9. [Project Structure](#project-structure)
10. [Setup & Run](#setup--run)
11. [API Reference](#api-reference)
12. [Frontend Pages](#frontend-pages)
13. [Database Models](#database-models)
14. [Troubleshooting](#troubleshooting)
15. [Future Improvements](#future-improvements)

---

## Features (Complete List)

### Victim
- Emergency request submit — medical, rescue, food, shelter, transport, other
- **GPS auto-detect** (Browser Geolocation API) + manual address
- **Mapbox reverse geocoding** — GPS se readable address auto-fill
- Priority levels: urgent, high, medium, low
- **Guest mode** — bina login emergency submit (`victim.html?guest=1`)
- **Request tracking** — Request ID se status dekho (`track.html`) — login not required
- Logged-in victims apni saari requests dashboard par dekhte hain

### Volunteer
- Nearby **pending requests** — MongoDB `$geoNear` (default 50 km radius)
- Location na ho to **saari pending requests** fallback
- **List view** + **Map view** (Leaflet) — priority color-coded markers
- **Available / Busy toggle** — backend `isActive` sync
- Accept request → status `assigned`
- Complete request → status `completed` + `timeToResolve` calculate
- Work history dashboard
- **Real-time** — nayi request aate hi notification (Socket.io)

### Admin
- Dashboard stats — victims, volunteers, pending/assigned/completed requests
- **Saare users** — victims + volunteers filter (All / Volunteers / Victims)
- **Saari requests** table with status, priority, victim name, location
- **Easy assign** — dropdown se volunteer select (no manual ID typing)
- **Nearest volunteer auto-highlight** — distance (km) + ★ Nearest pre-selected
- Volunteer activate/deactivate
- Real-time new request alerts
- Map modal — request location + victim details

### Auth & System
- **Email + password** signup/login (bcrypt hash + JWT, 7-day expiry)
- **12 seeded demo accounts** — one-click login on login page
- Single port **5000** — frontend + API + WebSocket ek saath
- MongoDB persistence with graceful fallback if DB down
- Health check endpoint
- Mapbox geocoding with Indian city fallback (token optional)

---

## Demo Accounts & Quick Start

**Password sab ke liye:** `pass1234`

| Role | Email IDs |
|------|-----------|
| **Victim (5)** | `victim1@test.com`, `victim2@test.com`, `victim3@test.com`, `victim4@test.com`, `victim5@test.com` |
| **Volunteer (5)** | `volunteer1@test.com`, `volunteer2@test.com`, `volunteer3@test.com`, `volunteer4@test.com`, `volunteer5@test.com` |
| **Admin (2)** | `admin1@test.com`, `admin2@test.com` |

### Run in 3 steps

```powershell
cd disaster-managament-main
npm install --prefix backend
npm run dev
```

**Open:** http://localhost:5000/login.html

| Page | URL |
|------|-----|
| Login | http://localhost:5000/login.html |
| Signup | http://localhost:5000/signup.html |
| Victim (guest) | http://localhost:5000/victim.html?guest=1 |
| Track request | http://localhost:5000/track.html |
| Volunteer dashboard | http://localhost:5000/volunteer.html |
| Admin dashboard | http://localhost:5000/admin.html |

> **Important:** Live Server (port 5500) mat use karo — hamesha `localhost:5000` se kholo.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express 5, Mongoose |
| **Database** | MongoDB (GeoJSON + `2dsphere` index) |
| **Auth** | bcryptjs, jsonwebtoken (JWT Bearer) |
| **Real-time** | Socket.io |
| **Geocoding** | Mapbox Geocoding API (forward + reverse) |
| **Maps (UI)** | Leaflet + OpenStreetMap tiles |
| **Location (client)** | Browser Geolocation API |
| **Frontend** | Static HTML, Bootstrap 5, Vanilla JS |

---

## Interview Guide

### 1. Problem Statement

Disaster (flood, earthquake, fire) mein sabse badi problem **coordination** hai:
- Victim ko help chahiye lekin sahi channel nahi pata
- Volunteers available hain lekin **nearby** requests nahi dikhte
- Admin ko pata nahi kaun free hai aur kaun request handle kar raha hai
- Login barrier emergency mein problem ban sakta hai

**Jeevan Setu** in sab gaps ko ek platform se solve karta hai.

### 2. Solution — 3 Roles

| Role | Responsibility |
|------|----------------|
| **Victim** | Emergency request create (type, priority, location, contact) |
| **Volunteer** | Nearby pending requests dekho, accept karo, complete karo |
| **Admin** | Saare users/requests monitor, volunteer assign, stats |

### 3. End-to-End Flow

```
Victim (login OR guest)
    → Submit emergency request (GPS + address)
    → MongoDB: GeoJSON Point saved, status = pending
    → Socket.io: volunteers + admins ko instant alert

Volunteer
    → Set GPS location → nearby requests ($geoNear)
    → List view OR Map view (Leaflet markers)
    → Accept → status = assigned, victim notification

Admin (alternative path)
    → Pending request → Assign modal → dropdown se volunteer
    → Nearest volunteer auto-selected (distance calculation)

Volunteer
    → Complete → status = completed, timeToResolve calculated
    → Victim notification + workHistory update

Guest Victim
    → track.html?id=<requestId> → live status without login
```

**Request lifecycle:** `pending` → `assigned` → `in_progress` → `completed` | `cancelled`

### 4. 30-Second Pitch (Yaad kar lo)

> "Maine **Jeevan Setu** banaya — ek disaster management platform jahan victims GPS location ke saath emergency request raise karte hain, volunteers MongoDB geo-queries se nearby pending requests dekhte hain list aur map dono par, admin dropdown se nearest volunteer assign karta hai, aur **Socket.io** se real-time updates milte hain. Auth **email/password + JWT** hai, guest mode se bina login bhi emergency submit ho sakti hai aur Request ID se track bhi. Backend **Node.js + Express + MongoDB**, location ke liye **Mapbox Geocoding** aur **Leaflet maps**, poora app ek hi port **5000** par serve hota hai."

### 5. 2-Minute Deep Dive Points

| Topic | Kya bolna hai |
|-------|---------------|
| **Geo matching** | MongoDB `2dsphere` index on User + Request; volunteer location se `$geoNear` query; 50km default radius |
| **Guest mode** | POST `/api/requests` token optional; temp victim user create; track via GET `/api/requests/:id` |
| **Auth** | bcrypt password hash; JWT `{ userId, role, email }` 7 days; Bearer token in sessionStorage |
| **Admin assign** | POST `/api/users/admin/assign-request/:id` — volunteer workHistory + victim notification |
| **Real-time** | Socket.io rooms: `volunteers`, `admins`; events: `new_request`, `request_updated` |
| **Availability** | Volunteer `isActive` toggle via PUT `/api/auth/profile`; admin sirf active volunteers assign karta hai |
| **Geocoding** | Mapbox forward (address→coords) + reverse (coords→address); city fallback if no token |

### 6. Common Interview Q&A

**Q: Location kaise detect hoti hai?**  
A: Browser **Geolocation API** se lat/lng. Victim ke liye Mapbox **reverse geocode** se address auto-fill. Manual address ho to Mapbox **forward geocode**. MongoDB mein GeoJSON Point `[longitude, latitude]` save hota hai.

**Q: Nearby requests kaise milte hain?**  
A: Volunteer profile par location save → MongoDB **`$geoNear`** aggregation with `2dsphere` index → pending requests sorted by priority (urgent first) then distance.

**Q: Bina login emergency kaise?**  
A: Guest mode — victim page login redirect nahi karta. Backend anonymous temp user create karta hai. Submit ke baad Request ID milti hai → `track.html` par status check.

**Q: Authentication kaise hai?**  
A: Email/password signup — bcrypt hash. Login par JWT issue (7 day expiry). Har protected API par `Authorization: Bearer <token>`. Role JWT payload mein — victim/volunteer/admin dashboards alag.

**Q: Admin volunteer kaise assign karta hai?**  
A: Assign button → modal → dropdown mein saare active volunteers (name + email + distance km). Nearest volunteer ★ mark + auto-selected. Backend volunteer ke workHistory mein entry + victim ko notification.

**Q: Real-time updates?**  
A: **Socket.io** — nayi request create par `new_request` emit volunteers + admins room ko. Request update par `request_updated`. Frontend `realtime.js` listener se auto-refresh.

**Q: Mapbox vs Leaflet?**  
A: **Mapbox** = sirf geocoding (backend, token hidden in `.env`). **Leaflet + OpenStreetMap** = map display (free, volunteer map view + admin modal).

**Q: Agar Mapbox token na ho?**  
A: Backend Indian cities ka hardcoded fallback (Mumbai, Delhi, etc.). GPS coordinates direct save ho jate hain.

**Q: Main technical challenge?**  
A: (1) MongoDB geo index — incomplete GeoJSON Point index error fix (pre-save hook). (2) Single-port setup — frontend + API same server. (3) Guest + auth flows coexist without breaking security.

**Q: MongoDB down ho to?**  
A: Server start rehta hai (`db.js` non-fatal, 5s timeout). Data persist nahi hoga — production mein MongoDB required.

**Q: Aage kya improve karoge?**  
A: SMS/WhatsApp alerts, push notifications, photo upload, auto-assign nearest volunteer, admin analytics charts, forgot password, Docker Compose, PWA offline mode.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (Port 5000)                       │
│  login.html │ victim.html │ volunteer.html │ admin.html      │
│  track.html │ signup.html │ js/api.js │ js/realtime.js       │
└────────────────────────────┬─────────────────────────────────┘
                             │  REST (JWT)  +  WebSocket
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Express Backend (server.js)                 │
│  /api/auth      — signup, login, profile                     │
│  /api/requests  — CRUD + geocoding on create                 │
│  /api/users     — nearby, accept, complete, admin assign     │
│  /api/geocode   — Mapbox forward/reverse                     │
│  /health        — server status                              │
│  Socket.io      — new_request, request_updated               │
│  Static files   — serves ../frontend                         │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    MongoDB       │
                    │  users           │
                    │  requests        │
                    │  notifications   │
                    │  (2dsphere idx)  │
                    └─────────────────┘
```

---

## Role-wise User Flows

### Victim Flow
1. Login **OR** "Continue Without Login" (guest)
2. Form fill — name, contact, type, priority, location (GPS auto / manual)
3. Submit → backend geocode → request saved → Request ID show
4. Track via link ya `track.html?id=...`
5. Volunteer assign hone par status update dikhega

### Volunteer Flow
1. Login (`volunteer1@test.com` etc.)
2. Sidebar: GPS detect → Save Location
3. Toggle Available/Busy
4. Requests tab: List view (cards) ya Map view (colored markers)
5. Accept pending request → Complete when done

### Admin Flow
1. Login (`admin1@test.com` / `admin2@test.com`)
2. Overview stats dekho
3. Users table — filter victims/volunteers, activate/deactivate
4. Pending request → **Assign** → volunteer dropdown → confirm
5. Real-time alerts on new emergencies

---

## Location System

```
Victim opens form
      ↓
Browser GPS (getCurrentPosition) → lat/lng
      ↓
/api/geocode/reverse → Mapbox → address auto-fills
      ↓
Submit: { coordinates, location (address), type, priority, ... }
      ↓
Backend resolveLocation() → GeoJSON Point [lng, lat]
      ↓
MongoDB Request saved with 2dsphere index
      ↓
Volunteer saved location → $geoNear → nearby pending requests
```

| User | Location Source | Storage |
|------|-----------------|---------|
| Victim | GPS auto OR typed address | Request.location (Point) |
| Volunteer | Browser GPS → Save Location | User.location (Point) |
| Admin assign | Haversine distance (frontend) | Nearest volunteer highlight |

---

## Real-time Updates (Socket.io)

| Event | Trigger | Who receives |
|-------|---------|--------------|
| `new_request` | POST `/api/requests` success | `volunteers` + `admins` rooms |
| `request_updated` | Accept, complete, admin assign, PUT status | `volunteers` + `admins` + `victims` rooms |

Frontend: `js/realtime.js` — pages join room by role on connect.

---

## Project Structure

```
disaster-managament-main/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connect (5s timeout, non-fatal)
│   │   └── passport.js        # Google OAuth (optional, not used in UI)
│   ├── models/
│   │   ├── User.js            # victim | volunteer | admin + GeoJSON location
│   │   ├── Request.js         # emergency requests + 2dsphere
│   │   └── Notification.js    # accept/complete notifications
│   ├── routes/
│   │   ├── auth.js            # signup, login, profile (incl. isActive toggle)
│   │   ├── requests.js        # CRUD + Socket emit on create/update
│   │   ├── users.js           # nearby, accept, complete, admin assign, /all
│   │   └── geocode.js         # Mapbox proxy endpoints
│   ├── utils/
│   │   ├── geocoding.js       # Mapbox + city fallback
│   │   └── seedUsers.js       # 12 demo accounts on startup
│   ├── socket.js              # Socket.io init + emit helpers
│   ├── server.js              # Express + static frontend + HTTP server
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── index.html             # Landing page
│   ├── login.html             # Email login + 12 demo buttons
│   ├── signup.html            # Create account
│   ├── victim.html            # Emergency form + guest mode
│   ├── volunteer.html         # List/map view, availability, GPS
│   ├── admin.html             # Stats, users, assign modal
│   ├── track.html             # Guest request tracking by ID
│   ├── js/
│   │   ├── api.js             # API client (port 5000 auto-detect)
│   │   └── realtime.js        # Socket.io client
│   └── style.css              # Shared + mobile responsive styles
├── package.json               # Root: npm run dev → backend
└── README.md
```

---

## Setup & Run

### Prerequisites
- **Node.js 18+** and npm
- **MongoDB** (recommended — `mongodb://localhost:27017/jeevan-setu`)

### Installation

```bash
cd disaster-managament-main
npm install --prefix backend
```

### Environment Variables

Copy `backend/.env.example` → `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/jeevan-setu
SESSION_SECRET=replace-with-strong-secret
JWT_SECRET=replace-with-strong-jwt-secret

# Optional — Mapbox for accurate geocoding
MAPBOX_ACCESS_TOKEN=your-mapbox-access-token

# Optional — Google OAuth (backend only, not in login UI)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Run

```bash
# Development (nodemon auto-restart)
npm run dev

# Production
npm start
```

Server output:
```
🚀 Jeevan Setu running at http://localhost:5000
   Login:   http://localhost:5000/login.html
✅ MongoDB Connected: localhost
```

Demo users auto-seed on startup (`seedUsers.js`).

---

## API Reference

**Base URL:** `http://localhost:5000/api`

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | `{ status: "OK", uptime }` |

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | No | `{ name, email, password, role }` → JWT |
| POST | `/login` | No | `{ email, password }` → JWT |
| GET | `/profile` | Bearer | Current user profile |
| PUT | `/profile` | Bearer | Update `{ location, address, phone, skills, isActive }` |
| POST | `/logout` | Session | Logout |

### Requests — `/api/requests`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | All requests (admin/volunteer UI) |
| GET | `/:id` | No | Single request (guest tracking) |
| POST | `/` | Optional | Create emergency request |
| PUT | `/:id` | No | Update status / assignment |
| DELETE | `/:id` | No | Delete request |

**Create request body:**
```json
{
  "type": "medical",
  "description": "...",
  "location": "Mumbai, Andheri",
  "coordinates": { "lat": 19.076, "lng": 72.877 },
  "contact": "9876543210",
  "name": "Rahul",
  "priority": "urgent"
}
```

### Geocoding — `/api/geocode`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/forward?q=address` | Address → coordinates |
| GET | `/reverse?lat=&lng=` | Coordinates → address |

### Users — `/api/users`
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/all` | Admin | All victims + volunteers |
| GET | `/volunteers` | Admin | Volunteers list |
| PUT | `/volunteers/:id/status` | Admin | Activate/deactivate `{ isActive }` |
| POST | `/admin/assign-request/:requestId` | Admin | `{ volunteerId }` — assign pending request |
| GET | `/nearby-requests` | Volunteer | Geo-filtered pending requests |
| POST | `/accept-request/:requestId` | Volunteer | Self-accept request |
| POST | `/complete-request/:requestId` | Volunteer | Mark completed |
| GET | `/my-requests` | Victim | Own requests + timeToResolve |
| GET | `/notifications` | Auth | Recent notifications |

---

## Frontend Pages

| File | Purpose | Auth Required |
|------|---------|---------------|
| `index.html` | Landing / overview | No |
| `login.html` | Login + 12 demo one-click buttons | No |
| `signup.html` | New account registration | No |
| `victim.html` | Submit emergency request | No (guest mode) |
| `track.html` | Track request by ID | No |
| `volunteer.html` | Nearby requests, map, accept/complete | Volunteer |
| `admin.html` | Users, requests, assign, stats | Admin |

**Session storage:** Login ke baad `sessionStorage.user = { token, role, name, email }`

---

## Database Models

### User
```
email, passwordHash, name, role (victim|volunteer|admin)
location: GeoJSON Point [lng, lat]
address, phone, skills[]
isActive (boolean — volunteer availability)
workHistory[] — { requestId, status, acceptedAt, completedAt }
```

### Request
```
victimId, type, priority, description, contact, address
location: GeoJSON Point [lng, lat]
status: pending | assigned | in_progress | completed | cancelled
assignedVolunteer, assignedAt, completedAt, timeToResolve (minutes)
```

### Notification
```
userId, type, title, message, requestId, isRead
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 5000 already in use | `npx kill-port 5000` then `npm run dev` |
| Login/signup fail | Server running? Open `http://localhost:5000/login.html` (not Live Server 5500) |
| Server offline warning on login | Terminal mein `npm run dev` chalao |
| MongoDB not connected | MongoDB service start karo, restart server |
| No nearby requests (volunteer) | GPS detect → **Save Location** click karo |
| Map empty (volunteer) | Requests mein coordinates honi chahiye — victim GPS se submit kare |
| Demo login fail | Server restart → demo users re-seed hote hain |
| Wrong address | `MAPBOX_ACCESS_TOKEN` add karo in `backend/.env` |
| Hard refresh needed | `Ctrl + Shift + R` after code changes |

---

## Future Improvements

- SMS / WhatsApp alerts (Twilio / MSG91)
- Push notifications (Web Push / FCM)
- Photo upload on emergency requests
- Auto-assign nearest available volunteer
- Admin analytics charts (Chart.js)
- Forgot password flow
- Docker Compose (app + MongoDB one command)
- Hindi + English UI
- PWA for offline disaster zones

---

## License

ISC

---

**Made with ❤️ for disaster relief coordination — Jeevan Setu**
