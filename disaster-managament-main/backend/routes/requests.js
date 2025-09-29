const express = require('express');
const Request = require('../models/Request');
const User = require('../models/User');
const router = express.Router();

// GET all requests
router.get('/', async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('victimId', 'name email')
      .populate('assignedVolunteer', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
});

// GET single request by ID
router.get('/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('victimId', 'name email')
      .populate('assignedVolunteer', 'name phone');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
});

// POST new request
router.post('/', async (req, res) => {
  try {
    const { type, location, description, contact, name, priority } = req.body;
    
    if (!type || !location || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type, location, and description are required'
      });
    }

    // For emergency requests, we'll create a temporary victim user if not authenticated
    let victimId = null;
    
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        victimId = decoded.userId;
      } catch (error) {
        console.log('Invalid token, creating anonymous request');
      }
    }

    // If no authenticated user, create a temporary victim user
    if (!victimId) {
      const tempUser = new User({
        email: `temp_${Date.now()}@emergency.com`,
        name: name || 'Anonymous',
        role: 'victim',
        phone: contact
      });
      await tempUser.save();
      victimId = tempUser._id;
    }

    // Simple geocoding for location (in production, use proper geocoding service)
    const coordinates = geocodeLocation(location);

    const newRequest = new Request({
      victimId,
      type,
      priority: priority || 'medium',
      location: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat]
      },
      address: location,
      description,
      contact: contact || 'Not provided',
      status: 'pending'
    });

    await newRequest.save();
    
    // Populate the response
    const populatedRequest = await Request.findById(newRequest._id)
      .populate('victimId', 'name email');
    
    res.status(201).json({
      success: true,
      data: {
        id: populatedRequest._id,
        ...populatedRequest.toObject()
      },
      message: 'Request created successfully'
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create request'
    });
  }
});

// Simple geocoding function (in production, use proper geocoding service)
function geocodeLocation(location) {
  // Simple coordinate mapping for common locations
  const locations = {
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'noida': { lat: 28.5355, lng: 77.3910 },
    'gurgaon': { lat: 28.4595, lng: 77.0266 }
  };

  const locationLower = location.toLowerCase();
  for (const [key, coords] of Object.entries(locations)) {
    if (locationLower.includes(key)) {
      return coords;
    }
  }

  // Default to Delhi if no match
  return { lat: 28.6139, lng: 77.2090 };
}

// PUT update request status
router.put('/:id', async (req, res) => {
  try {
    const { status, assignedVolunteer, assignedAt } = req.body;
    
    const updateData = {};
    if (status && ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      updateData.status = status;
    }
    if (assignedVolunteer) {
      updateData.assignedVolunteer = assignedVolunteer;
    }
    if (assignedAt) {
      updateData.assignedAt = assignedAt;
    }
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const request = await Request.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('victimId', 'name email')
     .populate('assignedVolunteer', 'name phone');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      data: request,
      message: 'Request updated successfully'
    });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update request'
    });
  }
});

// DELETE request
router.delete('/:id', async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete request'
    });
  }
});

module.exports = router;

