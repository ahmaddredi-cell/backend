const mongoose = require('mongoose');

const meetingCallSchema = new mongoose.Schema({
  referenceNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['meeting', 'call'],
    required: [true, 'نوع النشاط مطلوب (اجتماع/مكالمة)']
  },
  date: {
    type: Date,
    required: [true, 'التاريخ مطلوب']
  },
  time: {
    type: String,
    required: [true, 'الوقت مطلوب'],
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  requestedBy: {
    type: String,
    trim: true,
    required: [true, 'الجهة الطالبة مطلوبة']
  },
  participants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      trim: true
    },
    organization: {
      type: String,
      trim: true
    }
  }],
  agenda: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    required: [true, 'الغرض مطلوب'],
    trim: true
  },
  minutes: {
    type: String,
    trim: true
  },
  decisions: {
    type: [String],
    default: []
  },
  followUpActions: [{
    action: {
      type: String,
      required: true,
      trim: true
    },
    assignedTo: {
      type: String,
      trim: true
    },
    dueDate: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'postponed', 'cancelled'],
    default: 'scheduled'
  },
  postponedTo: {
    type: Date
  },
  reason: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create index for better search performance
meetingCallSchema.index({ date: -1 });
meetingCallSchema.index({ referenceNumber: 1 }, { unique: true });
meetingCallSchema.index({ type: 1 });
meetingCallSchema.index({ status: 1 });
meetingCallSchema.index({ 'participants.name': 'text', purpose: 'text' });

// Pre-save middleware for auto-generating reference number if not provided
meetingCallSchema.pre('save', async function(next) {
  try {
    // Only set reference number for new documents
    if (this.isNew && !this.referenceNumber) {
      const activityDate = new Date(this.date);
      const typeCode = this.type === 'meeting' ? 'MTG' : 'CALL';
      
      // Format: [MTG/CALL]-YYYYMMDD-XXX
      const dateStr = activityDate.toISOString().split('T')[0].replace(/-/g, '');
      
      // Get the count of documents with the same type and date
      const count = await this.constructor.countDocuments({
        type: this.type,
        date: {
          $gte: new Date(activityDate.setHours(0, 0, 0, 0)),
          $lt: new Date(activityDate.setHours(23, 59, 59, 999))
        }
      });
      
      // Generate the sequential number (padded with zeros)
      const seq = (count + 1).toString().padStart(3, '0');
      
      // Set the reference number
      this.referenceNumber = `${typeCode}-${dateStr}-${seq}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Validation middleware
meetingCallSchema.pre('validate', function(next) {
  // Location is required for meetings but not for calls
  if (this.type === 'meeting' && !this.location) {
    this.invalidate('location', 'المكان مطلوب للاجتماعات');
  }
  
  // Validate that we have at least one participant
  if (!this.participants || this.participants.length === 0) {
    this.invalidate('participants', 'يجب إضافة مشارك واحد على الأقل');
  }
  
  next();
});

const MeetingCall = mongoose.model('MeetingCall', meetingCallSchema);

module.exports = MeetingCall;
