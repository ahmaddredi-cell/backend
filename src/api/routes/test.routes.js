const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../../models');

/**
 * Test password hash utility
 * @route POST /api/test/hash-password
 * @access Public (for testing only)
 */
router.post('/hash-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);
    
    res.status(200).json({
      success: true,
      originalPassword: password,
      hashedPassword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error hashing password',
      error: error.message
    });
  }
});

/**
 * Test password compare utility
 * @route POST /api/test/compare-password
 * @access Public (for testing only)
 */
router.post('/compare-password', async (req, res) => {
  try {
    const { password, hash } = req.body;
    
    if (!password || !hash) {
      return res.status(400).json({
        success: false,
        message: 'Password and hash are required'
      });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, hash);
    
    res.status(200).json({
      success: true,
      isMatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error comparing password',
      error: error.message
    });
  }
});

/**
 * Test password for specific user
 * @route POST /api/test/check-user-password
 * @access Public (for testing only)
 */
router.post('/check-user-password', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    
    res.status(200).json({
      success: true,
      username,
      passwordHash: user.password,
      isMatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking password',
      error: error.message
    });
  }
});

/**
 * Reset admin password
 * @route POST /api/test/reset-admin-password
 * @access Public (for testing only)
 */
router.post('/reset-admin-password', async (req, res) => {
  try {
    // Find admin user
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }
    
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', salt);
    
    // Update admin's password directly
    admin.password = hashedPassword;
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: 'Admin password reset successfully',
      username: admin.username,
      newPasswordHash: admin.password
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting admin password',
      error: error.message
    });
  }
});

/**
 * Create new admin user
 * @route POST /api/test/create-admin
 * @access Public (for testing only)
 */
router.post('/create-admin', async (req, res) => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists',
        user: {
          id: existingAdmin._id,
          username: existingAdmin.username,
          passwordHash: existingAdmin.password,
          role: existingAdmin.role,
          isActive: existingAdmin.isActive
        }
      });
    }
    
    // Create admin user with raw password (will be hashed by pre-save hook)
    const admin = new User({
      username: 'admin',
      password: 'Admin@123',
      fullName: 'مدير النظام',
      email: 'admin@example.com',
      role: 'admin',
      permissions: [
        { module: 'reports', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'events', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'coordinations', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'memos', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'meetings', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'users', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'settings', actions: ['read', 'update'] }
      ],
      isActive: true
    });
    
    await admin.save();
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: admin._id,
        username: admin.username,
        passwordHash: admin.password,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    });
  }
});

module.exports = router;
