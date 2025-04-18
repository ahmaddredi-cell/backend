const mongoose = require('mongoose');

const memoReleaseSchema = new mongoose.Schema({
  referenceNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['memo', 'release'],
    required: [true, 'نوع المستند مطلوب (مذكرة/إفراج)']
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
  location: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'الموضوع مطلوب'],
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  governorate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Governorate',
    required: [true, 'المحافظة مطلوبة']
  },
  issuedTo: {
    type: String,
    trim: true
  },
  issuedBy: {
    type: String,
    trim: true
  },
  // Fields specific to releases
  personName: {
    type: String,
    trim: true
  },
  personId: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  residencePlace: {
    type: String,
    trim: true
  },
  detentionDate: {
    type: Date
  },
  releaseDate: {
    type: Date
  },
  detentionPeriod: {
    type: String,
    trim: true
  },
  detentionReason: {
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
  status: {
    type: String,
    enum: ['draft', 'sent', 'received', 'processed'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create index for better search performance
memoReleaseSchema.index({ date: -1 });
memoReleaseSchema.index({ referenceNumber: 1 }, { unique: true });
memoReleaseSchema.index({ type: 1 });
memoReleaseSchema.index({ governorate: 1 });
memoReleaseSchema.index({ status: 1 });
memoReleaseSchema.index({ personName: 'text', subject: 'text' });

// Pre-save middleware for auto-generating reference number if not provided
memoReleaseSchema.pre('save', async function(next) {
  try {
    // Only set reference number for new documents
    if (this.isNew && !this.referenceNumber) {
      const docDate = new Date(this.date);
      const typeCode = this.type === 'memo' ? 'MEMO' : 'REL';
      
      // Format: [MEMO/REL]-YYYYMMDD-XXX
      const dateStr = docDate.toISOString().split('T')[0].replace(/-/g, '');
      
      // Get the count of documents with the same type and date
      const count = await this.constructor.countDocuments({
        type: this.type,
        date: {
          $gte: new Date(docDate.setHours(0, 0, 0, 0)),
          $lt: new Date(docDate.setHours(23, 59, 59, 999))
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
memoReleaseSchema.pre('validate', function(next) {
  // If document type is 'release', validate required release-specific fields
  if (this.type === 'release') {
    if (!this.personName) {
      this.invalidate('personName', 'اسم الشخص مطلوب للإفراجات');
    }
    if (!this.residencePlace) {
      this.invalidate('residencePlace', 'مكان السكن مطلوب للإفراجات');
    }
    if (!this.detentionDate) {
      this.invalidate('detentionDate', 'تاريخ الاعتقال مطلوب للإفراجات');
    }
  }
  
  next();
});

const MemoRelease = mongoose.model('MemoRelease', memoReleaseSchema);

module.exports = MemoRelease;
