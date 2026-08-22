const express = require('express');
const { geocodeAddress, reverseGeocode } = require('../utils/geocoding');

const router = express.Router();

router.get('/forward', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required'
      });
    }

    const result = await geocodeAddress(String(q).trim());

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Forward geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address'
    });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Query parameters "lat" and "lng" are required'
      });
    }

    const result = await reverseGeocode(lat, lng);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reverse geocode coordinates'
    });
  }
});

module.exports = router;
