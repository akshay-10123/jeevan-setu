const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const { emitRequestUpdated } = require('../socket');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get all users — victims + volunteers (Admin only)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const users = await User.find({ role: { $in: ['victim', 'volunteer'] } })
      .select('-passwordHash -googleId')
      .sort({ role: 1, name: 1 });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Admin assign request to volunteer (no manual ID needed from UI)
router.post('/admin/assign-request/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { volunteerId } = req.body;
    if (!volunteerId) {
      return res.status(400).json({ success: false, message: 'Please select a volunteer' });
    }

    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be assigned' });
    }

    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    request.status = 'assigned';
    request.assignedVolunteer = volunteer._id;
    request.assignedAt = new Date();
    await request.save();

    volunteer.workHistory.push({
      requestId: request._id,
      status: 'accepted'
    });
    await volunteer.save();

    await Notification.create({
      userId: request.victimId,
      type: 'request_accepted',
      title: 'Volunteer Assigned',
      message: `Your emergency request has been assigned to ${volunteer.name}`,
      requestId: request._id
    });

    const populated = await Request.findById(request._id)
      .populate('victimId', 'name email phone')
      .populate('assignedVolunteer', 'name phone email');

    emitRequestUpdated({ id: populated._id, ...populated.toObject(), name: populated.victimId?.name });

    res.json({
      success: true,
      data: populated,
      message: `Assigned to ${volunteer.name}`
    });
  } catch (error) {
    console.error('Admin assign request error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign request' });
  }
});

// Get all volunteers (Admin only)
router.get('/volunteers', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const volunteers = await User.find({ role: 'volunteer' })
      .select('-googleId')
      .populate('workHistory.requestId', 'type status createdAt');

    res.json({ success: true, data: volunteers });
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch volunteers' });
  }
});

// Update volunteer status
router.put('/volunteers/:id/status', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { isActive } = req.body;
    const volunteer = await User.findByIdAndUpdate(
      req.params.id,
      { isActive, lastSeen: new Date() },
      { new: true }
    ).select('-googleId');

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    res.json({ success: true, data: volunteer });
  } catch (error) {
    console.error('Update volunteer status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update volunteer status' });
  }
});

// Get nearby volunteers (for admin assignment)
router.get('/volunteers/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, maxDistance = 50000 } = req.query; // maxDistance in meters
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    const volunteers = await User.find({
      role: 'volunteer',
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).select('-googleId');

    res.json({ success: true, data: volunteers });
  } catch (error) {
    console.error('Get nearby volunteers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby volunteers' });
  }
});

// Get user's requests (Victim)
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'victim') {
      return res.status(403).json({ success: false, message: 'Victim access required' });
    }

    const requests = await Request.find({ victimId: req.user.userId })
      .populate('assignedVolunteer', 'name phone profilePicture')
      .sort({ createdAt: -1 });

    // Calculate time to resolve for completed requests
    const requestsWithTimeToResolve = requests.map(request => {
      if (request.status === 'completed' && request.completedAt) {
        const timeDiff = request.completedAt - request.createdAt;
        request.timeToResolve = Math.round(timeDiff / (1000 * 60)); // in minutes
      }
      return request;
    });

    res.json({ success: true, data: requestsWithTimeToResolve });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Get nearby emergency requests (Volunteer)
router.get('/nearby-requests', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Volunteer access required' });
    }

    if (!currentUser.location?.coordinates || currentUser.location.coordinates.length !== 2) {
      const requests = await Request.find({ status: 'pending' })
        .populate('victimId', 'name email phone')
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        data: requests,
        locationFilter: false,
        message: 'Set your location to filter nearby requests. Showing all pending requests.'
      });
    }

    const { maxDistance = 50000 } = req.query; // 50km default

    // Sort by priority rank: urgent (0), high (1), medium (2), low (3), then by createdAt
    const requests = await Request.aggregate([
      {
        $geoNear: {
          near: currentUser.location,
          distanceField: 'distance',
          maxDistance: parseInt(maxDistance),
          spherical: true,
          key: 'location'
        }
      },
      { $match: { status: 'pending' } },
      {
        $addFields: {
          priorityRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'urgent'] }, then: 0 },
                { case: { $eq: ['$priority', 'high'] }, then: 1 },
                { case: { $eq: ['$priority', 'medium'] }, then: 2 },
                { case: { $eq: ['$priority', 'low'] }, then: 3 }
              ],
              default: 4
            }
          }
        }
      },
      { $sort: { priorityRank: 1, createdAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'victimId',
          foreignField: '_id',
          as: 'victim'
        }
      },
      { $unwind: { path: '$victim', preserveNullAndEmptyArrays: true } },
      { $project: { priorityRank: 0 } }
    ]);

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get nearby requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby requests' });
  }
});

// Accept request (Volunteer)
router.post('/accept-request/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Volunteer access required' });
    }

    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already assigned' });
    }

    // Update request
    request.status = 'assigned';
    request.assignedVolunteer = req.user.userId;
    request.assignedAt = new Date();
    await request.save();

    // Add to volunteer's work history
    currentUser.workHistory.push({
      requestId: request._id,
      status: 'accepted'
    });
    await currentUser.save();

    // Create notification for victim
    await Notification.create({
      userId: request.victimId,
      type: 'request_accepted',
      title: 'Request Accepted',
      message: `Your emergency request has been accepted by ${currentUser.name}`,
      requestId: request._id
    });

    const populated = await Request.findById(request._id)
      .populate('victimId', 'name email phone')
      .populate('assignedVolunteer', 'name phone');
    emitRequestUpdated({ id: populated._id, ...populated.toObject(), name: populated.victimId?.name });

    res.json({ success: true, data: populated, message: 'Request accepted successfully' });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept request' });
  }
});

// Complete request (Volunteer)
router.post('/complete-request/:requestId', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'volunteer') {
      return res.status(403).json({ success: false, message: 'Volunteer access required' });
    }

    const request = await Request.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.assignedVolunteer.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this request' });
    }

    // Update request
    request.status = 'completed';
    request.completedAt = new Date();
    const timeDiff = request.completedAt - request.createdAt;
    request.timeToResolve = Math.round(timeDiff / (1000 * 60)); // in minutes
    await request.save();

    // Update volunteer's work history
    const workItem = currentUser.workHistory.find(item => 
      item.requestId.toString() === req.params.requestId
    );
    if (workItem) {
      workItem.status = 'completed';
      workItem.completedAt = new Date();
    }
    await currentUser.save();

    // Create notification for victim
    await Notification.create({
      userId: request.victimId,
      type: 'request_completed',
      title: 'Request Completed',
      message: `Your emergency request has been completed by ${currentUser.name}`,
      requestId: request._id
    });

    const populated = await Request.findById(request._id)
      .populate('victimId', 'name email phone')
      .populate('assignedVolunteer', 'name phone');
    emitRequestUpdated({ id: populated._id, ...populated.toObject(), name: populated.victimId?.name });

    res.json({ success: true, data: populated, message: 'Request completed successfully' });
  } catch (error) {
    console.error('Complete request error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete request' });
  }
});

// Get notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

module.exports = router;
