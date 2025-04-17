const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  refreshToken,
  changePassword,
  logout
} = require('../controllers/auth.controller');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');

// Public routes
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/register', authenticate, hasRole(['admin']), register);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
