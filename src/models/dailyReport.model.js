const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    unique: true,
    required: true
  },
  reportDate: {
    type: Date,
    required: [true, 'تاريخ التقرير مطلوب']
  },
  reportType: {
    type: String,
    enum: ['morning', 'evening'],
    required: [true, 'نوع التقرير مطلوب (صباحي/مسائي)']
  },
  status: {
    type: String,
    enum: ['draft', 'complete', 'approved', 'archived'],
    default: 'draft'
  },
  summary: {
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
  eventCount: {
    type: Number,
    default: 0
  },
  governorates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Governorate'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create index for better search performance
dailyReportSchema.index({ reportDate: -1 });
dailyReportSchema.index({ reportNumber: 1 });
dailyReportSchema.index({ status: 1 });
dailyReportSchema.index({ reportType: 1 });
dailyReportSchema.index({ createdBy: 1 });
dailyReportSchema.index({ 'governorates': 1 });

// Pre-save middleware for auto-generating report number if not provided
dailyReportSchema.pre('save', async function(next) {
  try {
    // Only set report number for new documents
    if (this.isNew && !this.reportNumber) {
      const reportDate = new Date(this.reportDate);
      const reportTypeCode = this.reportType === 'morning' ? 'M' : 'E';
      
      // Format: REP-YYYYMMDD-[M/E]-XXX
      const dateStr = reportDate.toISOString().split('T')[0].replace(/-/g, '');
      
      // Get the count of reports with the same date and type
      const count = await this.constructor.countDocuments({
        reportDate: {
          $gte: new Date(reportDate.setHours(0, 0, 0, 0)),
          $lt: new Date(reportDate.setHours(23, 59, 59, 999))
        },
        reportType: this.reportType
      });
      
      // Generate the sequential number (padded with zeros)
      const seq = (count + 1).toString().padStart(3, '0');
      
      // Set the report number
      this.reportNumber = `REP-${dateStr}-${reportTypeCode}-${seq}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);

module.exports = DailyReport;
