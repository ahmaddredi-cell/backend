const mongoose = require('mongoose');

const coordinationSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    required: true
  },
  requestTime: {
    type: Date,
    required: [true, 'وقت الطلب مطلوب']
  },
  requestDate: {
    type: Date,
    required: [true, 'تاريخ الطلب مطلوب']
  },
  approvalTime: {
    type: Date
  },
  movementTime: {
    type: Date,
    required: [true, 'وقت التحرك مطلوب']
  },
  governorate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Governorate',
    required: [true, 'المحافظة مطلوبة']
  },
  fromLocation: {
    type: String,
    required: [true, 'موقع البداية مطلوب'],
    trim: true
  },
  toLocation: {
    type: String,
    required: [true, 'موقع الوصول مطلوب'],
    trim: true
  },
  routeDetails: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    enum: [
      'police',               // الشرطة
      'national_security',    // الأمن الوطني
      'civil_defense',        // الدفاع المدني
      'intelligence',         // المخابرات
      'preventive_security',  // الأمن الوقائي
      'other'                 // أخرى
    ],
    required: [true, 'الجهة المسؤولة مطلوبة']
  },
  forces: {
    type: Number,
    required: [true, 'عدد القوات مطلوب'],
    min: [1, 'يجب أن يكون عدد القوات على الأقل 1']
  },
  vehicles: {
    type: Number,
    default: 0
  },
  vehicleTypes: {
    type: [String],
    default: []
  },
  weapons: {
    type: Number,
    default: 0
  },
  weaponTypes: {
    type: [String],
    default: []
  },
  purpose: {
    type: String,
    required: [true, 'الغرض من التنسيق مطلوب'],
    trim: true
  },
  estimatedDuration: {
    type: String,
    trim: true
  },
  returnTime: {
    type: Date
  },
  status: {
    type: String,
    enum: [
      'pending',    // قيد الانتظار
      'approved',   // موافق عليه
      'rejected',   // مرفوض
      'completed',  // منجز
      'cancelled'   // ملغي
    ],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create index for better search performance
coordinationSchema.index({ requestDate: -1 });
coordinationSchema.index({ requestNumber: 1 });
coordinationSchema.index({ status: 1 });
coordinationSchema.index({ governorate: 1 });
coordinationSchema.index({ department: 1 });
coordinationSchema.index({ priority: 1 });

// Pre-save middleware for auto-generating request number if not provided
coordinationSchema.pre('save', async function(next) {
  try {
    // Only set request number for new documents
    if (this.isNew && !this.requestNumber) {
      const requestDate = new Date(this.requestDate);
      
      // Format: COORD-YYYYMMDD-XXX
      const dateStr = requestDate.toISOString().split('T')[0].replace(/-/g, '');
      
      // Get the count of coordinations for this date
      const count = await this.constructor.countDocuments({
        requestDate: {
          $gte: new Date(requestDate.setHours(0, 0, 0, 0)),
          $lt: new Date(requestDate.setHours(23, 59, 59, 999))
        }
      });
      
      // Generate the sequential number (padded with zeros)
      const seq = (count + 1).toString().padStart(3, '0');
      
      // Set the request number
      this.requestNumber = `COORD-${dateStr}-${seq}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

const Coordination = mongoose.model('Coordination', coordinationSchema);

module.exports = Coordination;
