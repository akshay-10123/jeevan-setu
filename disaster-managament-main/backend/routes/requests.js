const express = require('express');
const Request = require('../models/Request');
const User = require('../models/User');
const { resolveLocation } = require('../utils/geocoding');
const { emitNewRequest, emitRequestUpdated } = require('../socket');
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
    const { type, location, description, contact, name, priority, coordinates } = req.body;

    const hasCoordinates = coordinates?.lat != null && coordinates?.lng != null;
    const hasAddress = location && String(location).trim();

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type and description are required'
      });
    }

    if (!hasAddress && !hasCoordinates) {
      return res.status(400).json({
        success: false,
        message: 'Location or GPS coordinates are required'
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

    const resolved = await resolveLocation({
      address: hasAddress ? String(location).trim() : undefined,
      coordinates: hasCoordinates ? coordinates : undefined
    });

    const newRequest = new Request({
      victimId,
      type,
      priority: priority || 'medium',
      location: {
        type: 'Point',
        coordinates: [resolved.lng, resolved.lat]
      },
      address: resolved.address,
      description,
      contact: contact || 'Not provided',
      status: 'pending'
    });

    await newRequest.save();
    
    // Populate the response
    const populatedRequest = await Request.findById(newRequest._id)
      .populate('victimId', 'name email phone');

    const requestPayload = {
      id: populatedRequest._id,
      ...populatedRequest.toObject(),
      geocodingSource: resolved.source,
      name: populatedRequest.victimId?.name || name || 'Anonymous'
    };

    emitNewRequest(requestPayload);

    res.status(201).json({
      success: true,
      data: requestPayload,
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

    emitRequestUpdated({
      id: request._id,
      ...request.toObject(),
      name: request.victimId?.name
    });

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

