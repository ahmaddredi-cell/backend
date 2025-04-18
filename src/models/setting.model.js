const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    required: true
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create index for better search performance
settingSchema.index({ key: 1 }, { unique: true });
settingSchema.index({ category: 1 });

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
