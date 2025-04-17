const { DailyReport, Event, Governorate, SystemLog } = require('../../models');

/**
 * Get all daily reports
 * @route GET /api/reports
 * @access Private
 */
const getReports = async (req, res, next) => {
  try {
    // Handle query parameters for filtering
    const filter = {};
    
    // Filter by date range
    if (req.query.startDate) {
      filter.reportDate = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      if (filter.reportDate) {
        filter.reportDate.$lte = new Date(req.query.endDate);
      } else {
        filter.reportDate = { $lte: new Date(req.query.endDate) };
      }
    }
    
    // Filter by report type
    if (req.query.reportType) {
      filter.reportType = req.query.reportType;
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by governorate
    if (req.query.governorate) {
      filter.governorates = req.query.governorate;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    // Get reports with pagination
    const reports = await DailyReport.find(filter)
      .populate('governorates', 'name code')
      .populate('createdBy', 'username fullName')
      .populate('approvedBy', 'username fullName')
      .sort({ reportDate: -1, reportType: 1 })
      .skip(startIndex)
      .limit(limit);
    
    // Get total count for pagination
    const total = await DailyReport.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single daily report
 * @route GET /api/reports/:id
 * @access Private
 */
const getReport = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('governorates', 'name code')
      .populate('createdBy', 'username fullName')
      .populate('approvedBy', 'username fullName');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new daily report
 * @route POST /api/reports
 * @access Private
 */
const createReport = async (req, res, next) => {
  try {
    const {
      reportNumber,
      reportDate,
      reportType,
      status,
      summary,
      governorates
    } = req.body;
    
    // Validate report date and type
    if (!reportDate || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ ونوع التقرير مطلوبان'
      });
    }
    
    // Validate report number
    if (!reportNumber) {
      return res.status(400).json({
        success: false,
        message: 'رقم التقرير مطلوب'
      });
    }
    
    // Check if a report with same date and type already exists
    const existingReport = await DailyReport.findOne({
      reportDate: new Date(reportDate),
      reportType
    });
    
    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'يوجد تقرير بنفس التاريخ والنوع'
      });
    }
    
    // Validate governorates
    if (governorates && governorates.length > 0) {
      // Check if all governorates exist
      const govCount = await Governorate.countDocuments({
        _id: { $in: governorates }
      });
      
      if (govCount !== governorates.length) {
        return res.status(400).json({
          success: false,
          message: 'إحدى المحافظات المحددة غير موجودة'
        });
      }
    }
    
    // Create report
    const report = await DailyReport.create({
      reportNumber,
      reportDate: new Date(reportDate),
      reportType,
      status: status || 'draft',
      summary,
      governorates: governorates || [],
      eventCount: 0,
      createdBy: req.user._id
    });
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'create',
      module: 'reports',
      resourceId: report._id,
      details: `تم إنشاء تقرير ${reportType === 'morning' ? 'صباحي' : 'مسائي'} بتاريخ ${new Date(reportDate).toLocaleDateString()}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء التقرير بنجاح',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update daily report
 * @route PUT /api/reports/:id
 * @access Private
 */
const updateReport = async (req, res, next) => {
  try {
    const {
      reportDate,
      reportType,
      status,
      summary,
      governorates
    } = req.body;
    
    // Find report
    let report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Check if changing date and type and if it conflicts with existing report
    if ((reportDate && reportDate !== report.reportDate.toISOString().split('T')[0]) || 
        (reportType && reportType !== report.reportType)) {
      
      const newDate = reportDate ? new Date(reportDate) : report.reportDate;
      const newType = reportType || report.reportType;
      
      const existingReport = await DailyReport.findOne({
        _id: { $ne: report._id },
        reportDate: newDate,
        reportType: newType
      });
      
      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'يوجد تقرير آخر بنفس التاريخ والنوع'
        });
      }
    }
    
    // Validate governorates if provided
    if (governorates && governorates.length > 0) {
      // Check if all governorates exist
      const govCount = await Governorate.countDocuments({
        _id: { $in: governorates }
      });
      
      if (govCount !== governorates.length) {
        return res.status(400).json({
          success: false,
          message: 'إحدى المحافظات المحددة غير موجودة'
        });
      }
    }
    
    // Update fields
    if (reportDate) report.reportDate = new Date(reportDate);
    if (reportType) report.reportType = reportType;
    if (status) report.status = status;
    if (summary !== undefined) report.summary = summary;
    if (governorates) report.governorates = governorates;
    
    // If status is changed to approved, set approvedBy
    if (status === 'approved' && report.status !== 'approved') {
      report.approvedBy = req.user._id;
    }
    
    // Save changes
    await report.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'reports',
      resourceId: report._id,
      details: `تم تحديث تقرير ${report.reportType === 'morning' ? 'صباحي' : 'مسائي'} بتاريخ ${report.reportDate.toLocaleDateString()}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث التقرير بنجاح',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete daily report
 * @route DELETE /api/reports/:id
 * @access Private (Admin)
 */
const deleteReport = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Check if report has events
    const eventsCount = await Event.countDocuments({ reportId: report._id });
    
    if (eventsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف التقرير لأنه يحتوي على أحداث. قم بحذف الأحداث أولاً أو قم بأرشفة التقرير بدلاً من ذلك'
      });
    }
    
    // Delete report
    await report.remove();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'delete',
      module: 'reports',
      resourceId: report._id,
      details: `تم حذف تقرير ${report.reportType === 'morning' ? 'صباحي' : 'مسائي'} بتاريخ ${report.reportDate.toLocaleDateString()}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم حذف التقرير بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive daily report
 * @route PATCH /api/reports/:id/archive
 * @access Private
 */
const archiveReport = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Set status to archived
    report.status = 'archived';
    await report.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'reports',
      resourceId: report._id,
      details: `تم أرشفة تقرير ${report.reportType === 'morning' ? 'صباحي' : 'مسائي'} بتاريخ ${report.reportDate.toLocaleDateString()}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم أرشفة التقرير بنجاح',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get events for a daily report
 * @route GET /api/reports/:id/events
 * @access Private
 */
const getReportEvents = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Get events for this report
    const events = await Event.find({ reportId: report._id })
      .populate('governorate', 'name code')
      .populate('createdBy', 'username fullName')
      .sort({ eventDate: -1, eventTime: -1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add attachment to report
 * @route POST /api/reports/:id/attachments
 * @access Private
 */
const addAttachment = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تحميل أي ملف'
      });
    }
    
    // Add attachment to report
    report.attachments.push({
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    });
    
    await report.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'reports',
      resourceId: report._id,
      details: `تم إضافة مرفق "${req.file.filename}" إلى التقرير`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إضافة المرفق بنجاح',
      data: report.attachments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove attachment from report
 * @route DELETE /api/reports/:id/attachments/:attachmentId
 * @access Private
 */
const removeAttachment = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Find attachment
    const attachment = report.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'المرفق غير موجود'
      });
    }
    
    // Remove attachment from report
    attachment.remove();
    await report.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'reports',
      resourceId: report._id,
      details: `تم إزالة مرفق "${attachment.filename}" من التقرير`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إزالة المرفق بنجاح',
      data: report.attachments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  archiveReport,
  getReportEvents,
  addAttachment,
  removeAttachment
};
