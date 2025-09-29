const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: function() {
        return this.role === 'volunteer';
      }
    }
  },
  address: {
    type: String,
    required: function() {
      return this.role === 'volunteer';
    }
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

// Create index for location-based queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
