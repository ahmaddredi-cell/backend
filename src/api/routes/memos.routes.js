const express = require('express');
const router = express.Router();
const { authenticate, hasRole } = require('../middlewares/auth.middleware');

// Since we don't have a dedicated controller yet, we'll create placeholder routes
// that return mock data or empty responses until the controller is implemented

// Get all memos
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      memos: [],
      total: 0,
      page: 1,
      limit: 10
    },
    message: 'Memos retrieved successfully'
  });
});

// Get a single memo by ID
router.get('/:id', authenticate, (req, res) => {
  res.json({
    success: true,
    data: null,
    message: 'Memo API is in development'
  });
});

// Create a new memo
router.post('/', authenticate, (req, res) => {
  // Log the request body for debugging
  console.log('Memo create request:', req.body);
  
  // Return a successful response with mock data
  res.status(201).json({
    success: true,
    data: {
      _id: 'temp-id-' + Date.now(),
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      memoNumber: `MEMO-${Date.now()}`
    },
    message: 'Memo created successfully'
  });
});

// Update a memo
router.put('/:id', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.params.id,
      ...req.body,
      updatedAt: new Date()
    },
    message: 'Memo updated successfully'
  });
});

// Delete a memo
router.delete('/:id', authenticate, hasRole(['admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Memo deleted successfully'
  });
});

module.exports = router;
