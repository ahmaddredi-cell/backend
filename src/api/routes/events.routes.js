const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  addAttachment,
  removeAttachment,
  getEventsByGovernorate
} = require('../controllers/event.controller');
const { authenticate, hasPermission } = require('../middlewares/auth.middleware');
const { upload, uploadFile, handleUploadErrors } = require('../middlewares/upload.middleware');

// All routes are protected
router.use(authenticate);

// General routes with permission checks
router.get('/', hasPermission('events', 'read'), getEvents);
router.get('/:id', hasPermission('events', 'read'), getEvent);
router.post('/', hasPermission('events', 'create'), createEvent);
router.put('/:id', hasPermission('events', 'update'), updateEvent);
router.delete('/:id', hasPermission('events', 'delete'), deleteEvent);

// Special route for governorate events
router.get('/by-governorate/:governorateId', hasPermission('events', 'read'), getEventsByGovernorate);

// Attachment routes with enhanced file upload handling
router.post(
  '/:id/attachments',
  hasPermission('events', 'update'),
  uploadFile('attachment'), // Use improved file upload handler
  handleUploadErrors,
  addAttachment
);

router.delete(
  '/:id/attachments/:attachmentId',
  hasPermission('events', 'update'),
  removeAttachment
);

module.exports = router;
