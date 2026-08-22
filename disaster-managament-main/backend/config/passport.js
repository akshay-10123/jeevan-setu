const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const VALID_ROLES = ['victim', 'volunteer', 'admin'];

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  passReqToCallback: true
},
async (req, accessToken, refreshToken, profile, done) => {
  try {
    const selectedRole = VALID_ROLES.includes(req.query.state) ? req.query.state : 'victim';

    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      user.lastSeen = new Date();
      await user.save();
      return done(null, user);
    }

    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      user.googleId = profile.id;
      user.profilePicture = profile.photos?.[0]?.value;
      user.lastSeen = new Date();
      await user.save();
      return done(null, user);
    }

    user = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      profilePicture: profile.photos?.[0]?.value,
      role: selectedRole
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    console.error('Passport strategy error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
