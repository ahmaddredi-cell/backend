const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyReport",
      required: true,
    },
    eventNumber: {
      type: String,
      unique: true,
      required: true,
    },
    governorate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Governorate",
      required: [true, "المحافظة مطلوبة"],
    },
    region: {
      type: String,
      required: [true, "المنطقة مطلوبة"],
      trim: true,
    },
    eventTime: {
      type: Date,
      required: [true, "وقت الحدث مطلوب"],
    },
    eventDate: {
      type: Date,
      required: [true, "تاريخ الحدث مطلوب"],
    },
    eventType: {
      type: String,
      enum: [
        "security_incident", // حادث أمني
        "arrest", // اعتقال
        "checkpoint", // حاجز
        "raid", // مداهمة
        "confrontation", // مواجهة
        "other", // أخرى
      ],
      required: [true, "نوع الحدث مطلوب"],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    description: {
      type: String,
      required: [true, "وصف الحدث مطلوب"],
      trim: true,
    },
    involvedParties: {
      type: [String],
      default: [],
    },
    palestinianIntervention: {
      type: String,
      trim: true,
    },
    israeliResponse: {
      type: String,
      trim: true,
    },
    results: {
      type: String,
      trim: true,
    },
    casualties: {
      killed: {
        type: Number,
        default: 0,
      },
      injured: {
        type: Number,
        default: 0,
      },
      arrested: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["ongoing", "finished", "monitoring"],
      default: "ongoing",
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    attachments: [
      {
        filename: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for better search performance
eventSchema.index({ reportId: 1 });
eventSchema.index({ eventDate: -1 });
eventSchema.index({ governorate: 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ severity: 1 });

// Pre-save middleware for validating and cleaning data
eventSchema.pre('save', async function(next) {
  try {
    // If the event number is already set, skip the generation
    if (this.eventNumber) {
      return next();
    }
    
    // Only set event number for new documents without an event number
    if (this.isNew) {
      // Get report information to include in event number
      const DailyReport = mongoose.model('DailyReport');
      const report = await DailyReport.findById(this.reportId);
      
      if (!report) {
        throw new Error('التقرير المرتبط غير موجود');
      }
      
      // Get the count of events for this report
      const count = await this.constructor.countDocuments({ reportId: this.reportId });
      
      // Extract date from report number (REP-YYYYMMDD-X-XXX)
      const reportParts = report.reportNumber.split('-');
      const dateStr = reportParts[1];
      const reportTypeCode = reportParts[2];
      
      // Generate the sequential number (padded with zeros)
      const seq = (count + 1).toString().padStart(3, '0');
      
      // Set the event number: EVT-YYYYMMDD-X-XXX
      this.eventNumber = `EVT-${dateStr}-${reportTypeCode}-${seq}`;
    }
    
    // Ensure status is one of the allowed values
    if (this.status && !['ongoing', 'finished', 'monitoring'].includes(this.status)) {
      this.status = 'ongoing';
    }
    
    // Ensure dates are valid
    if (this.eventDate && !(this.eventDate instanceof Date && !isNaN(this.eventDate.getTime()))) {
      throw new Error('تاريخ الحدث غير صالح');
    }
    
    if (this.eventTime && !(this.eventTime instanceof Date && !isNaN(this.eventTime.getTime()))) {
      throw new Error('وقت الحدث غير صالح');
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to update the event count in the associated report
eventSchema.post('save', async function() {
  try {
    const DailyReport = mongoose.model('DailyReport');
    
    // Count events for this report
    const eventCount = await this.constructor.countDocuments({ reportId: this.reportId });
    
    // Update the report's event count
    await DailyReport.findByIdAndUpdate(this.reportId, { eventCount });
  } catch (error) {
    console.error('Error updating event count:', error);
  }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
