const express = require('express');
const router = express.Router();
const { authenticate, hasRole } = require('../middlewares/auth.middleware');

// Since we don't have a dedicated controller yet, we'll create placeholder routes
// that return mock data or empty responses until the controller is implemented

// Get all coordinations
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      coordinations: [],
      total: 0,
      page: 1,
      limit: 10
    },
    message: 'Coordinations retrieved successfully'
  });
});

// Get a single coordination by ID
router.get('/:id', authenticate, (req, res) => {
  res.json({
    success: true,
    data: null,
    message: 'Coordination API is in development'
  });
});

// Create a new coordination
router.post('/', authenticate, (req, res) => {
  // Log the request body for debugging
  console.log('Coordination create request:', req.body);
  
  // Return a successful response with mock data
  res.status(201).json({
    success: true,
    data: {
      _id: 'temp-id-' + Date.now(),
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      requestNumber: `COORD-${Date.now()}`
    },
    message: 'Coordination request created successfully'
  });
});

// Update a coordination
router.put('/:id', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.params.id,
      ...req.body,
      updatedAt: new Date()
    },
    message: 'Coordination updated successfully'
  });
});

// Delete a coordination
router.delete('/:id', authenticate, hasRole(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Coordination deleted successfully'
  });
});

module.exports = router;
