const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  resetPassword,
  updatePermissions,
  deleteUser,
  getUserLogs
} = require('../controllers/user.controller');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');

// All routes are protected and require admin role
router.use(authenticate);
router.use(hasRole(['admin']));

// Routes
router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.patch('/:id/reset-password', resetPassword);
router.patch('/:id/permissions', updatePermissions);
router.delete('/:id', deleteUser);
router.get('/:id/logs', getUserLogs);

module.exports = router;
