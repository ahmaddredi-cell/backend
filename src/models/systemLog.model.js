const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    trim: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create index for better search performance
systemLogSchema.index({ timestamp: -1 });
systemLogSchema.index({ userId: 1 });
systemLogSchema.index({ action: 1 });
systemLogSchema.index({ module: 1 });

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

module.exports = SystemLog;
