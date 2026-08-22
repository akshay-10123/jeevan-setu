const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('./config/passport');
const requestRoutes = require('./routes/requests');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const geocodeRoutes = require('./routes/geocode');
const { initSocket } = require('./socket');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const frontendPath = path.join(__dirname, '../frontend');

// Middleware
app.use(express.json());
app.use(cors({
  origin(origin, callback) {
    // Allow same-origin and any localhost dev port (Live Server, etc.)
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, FRONTEND_URL);
    }
  },
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/geocode', geocodeRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend (same port as API — one command to run everything)
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Database connection (optional)
const connectDB = require('./config/db');
const seedDefaultUsers = require('./utils/seedUsers');

connectDB()
  .then(async (conn) => {
    if (conn) {
      await seedDefaultUsers();
    }
  })
  .catch(() => {
    console.log('📝 Continuing without database connection...');
  });

const server = http.createServer(app);
initSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process or run: npx kill-port ${PORT}`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`🚀 Jeevan Setu running at ${FRONTEND_URL}`);
  console.log(`   App:     ${FRONTEND_URL}/index.html`);
  console.log(`   Login:   ${FRONTEND_URL}/login.html`);
  console.log(`   API:     ${FRONTEND_URL}/api`);
  console.log(`   Live:    WebSocket enabled for instant request updates`);
});
