const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const VALID_ROLES = ['victim', 'volunteer', 'admin'];

function issueToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authSuccessPayload(user, token) {
  return {
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    }
  };
}

// Email/password signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in instead.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role
    });

    const token = issueToken(user);

    res.status(201).json(authSuccessPayload(user, token));
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: error.code === 11000
        ? 'An account with this email already exists.'
        : 'Failed to create account. Please try again.'
    });
  }
});

// Email/password login — role is optional (uses account's actual role)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. If you just signed up, try again — or use demo: demouser@test.com / pass1234'
      });
    }

    const passwordMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (role && user.role !== role) {
      user.lastSeen = new Date();
      await user.save();
      const token = issueToken(user);
      return res.json({
        ...authSuccessPayload(user, token),
        roleCorrected: true,
        message: `Logged in as ${user.role} (your account role)`
      });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = issueToken(user);

    res.json(authSuccessPayload(user, token));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Google OAuth — role passed via state query param
router.get('/google', (req, res, next) => {
  const { role } = req.query;

  if (!role || !VALID_ROLES.includes(role)) {
    return res.redirect(`${FRONTEND_URL}/login.html?error=role_required`);
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role,
    session: false
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/login.html?error=auth_failed`,
    session: false
  }),
  async (req, res) => {
    try {
      const token = issueToken(req.user);
      res.redirect(`${FRONTEND_URL}/login.html?token=${token}&role=${req.user.role}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login.html?error=auth_failed`);
    }
  }
);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash -googleId');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { location, address, phone, skills, isActive } = req.body;

    const updateData = {};
    if (location) updateData.location = location;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;
    if (skills) updateData.skills = skills;

    if (typeof isActive === 'boolean') {
      const current = await User.findById(decoded.userId);
      if (current && current.role === 'volunteer') {
        updateData.isActive = isActive;
        updateData.lastSeen = new Date();
      }
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true }
    ).select('-passwordHash -googleId');

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({ success: false, message: 'Failed to update profile' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;
