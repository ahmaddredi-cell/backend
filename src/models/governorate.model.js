const mongoose = require('mongoose');

const governorateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم المحافظة مطلوب'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'رمز المحافظة مطلوب'],
    unique: true,
    trim: true
  },
  regions: {
    type: [String],
    default: []
  },
  contactInfo: {
    address: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create index for better search performance
governorateSchema.index({ name: 1 });
governorateSchema.index({ code: 1 });

const Governorate = mongoose.model('Governorate', governorateSchema);

module.exports = Governorate;
