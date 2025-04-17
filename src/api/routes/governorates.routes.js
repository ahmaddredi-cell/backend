const express = require('express');
const router = express.Router();
const {
  getGovernorates,
  getGovernorate,
  createGovernorate,
  updateGovernorate,
  deleteGovernorate,
  getGovernorateRegions,
  addRegion,
  removeRegion
} = require('../controllers/governorate.controller');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getGovernorates);
router.get('/:id', getGovernorate);
router.get('/:id/regions', getGovernorateRegions);

// Admin routes
router.post('/', authenticate, hasRole(['admin']), createGovernorate);
router.put('/:id', authenticate, hasRole(['admin']), updateGovernorate);
router.delete('/:id', authenticate, hasRole(['admin']), deleteGovernorate);
router.post('/:id/regions', authenticate, hasRole(['admin']), addRegion);
router.delete('/:id/regions/:region', authenticate, hasRole(['admin']), removeRegion);

module.exports = router;
