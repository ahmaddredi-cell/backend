const express = require('express');
const router = express.Router();
const {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  archiveReport,
  getReportEvents,
  addAttachment,
  removeAttachment
} = require('../controllers/dailyReport.controller');
const { authenticate, hasRole, hasPermission } = require('../middlewares/auth.middleware');
const { upload, handleUploadErrors } = require('../middlewares/upload.middleware');

// All routes are protected
router.use(authenticate);

// Routes with permission checks
router.get('/', hasPermission('reports', 'read'), getReports);
router.get('/:id', hasPermission('reports', 'read'), getReport);
router.post('/', hasPermission('reports', 'create'), createReport);
router.put('/:id', hasPermission('reports', 'update'), updateReport);
router.delete('/:id', hasRole(['admin', 'supervisor']), deleteReport);
router.patch('/:id/archive', hasPermission('reports', 'update'), archiveReport);
router.get('/:id/events', hasPermission('reports', 'read'), getReportEvents);

// Attachment routes with file upload
router.post(
  '/:id/attachments',
  hasPermission('reports', 'update'),
  upload.single('attachment'),
  handleUploadErrors,
  addAttachment
);

router.delete(
  '/:id/attachments/:attachmentId',
  hasPermission('reports', 'update'),
  removeAttachment
);

module.exports = router;
