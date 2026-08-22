const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  passwordHash: {
    type: String,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String
  },
  role: {
    type: String,
    enum: ['victim', 'volunteer', 'admin'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  address: {
    type: String
  },
  phone: {
    type: String
  },
  skills: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  workHistory: [{
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request'
    },
    status: {
      type: String,
      enum: ['accepted', 'completed', 'cancelled'],
      default: 'accepted'
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }]
}, {
  timestamps: true
});

// Don't save incomplete GeoJSON (breaks 2dsphere index)
userSchema.pre('save', function(next) {
  if (
    this.location &&
    (!Array.isArray(this.location.coordinates) || this.location.coordinates.length !== 2)
  ) {
    this.set('location', undefined);
  }
  next();
});

// Sparse index — only users with valid coordinates are indexed
userSchema.index({ location: '2dsphere' }, { sparse: true });
 

module.exports = mongoose.model('User', userSchema);
