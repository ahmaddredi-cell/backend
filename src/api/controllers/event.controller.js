const { Event, DailyReport, Governorate, SystemLog } = require('../../models');

/**
 * Get all events
 * @route GET /api/events
 * @access Private
 */
const getEvents = async (req, res, next) => {
  try {
    // Handle query parameters for filtering
    const filter = {};
    
    // Filter by date range
    if (req.query.startDate) {
      filter.eventDate = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      if (filter.eventDate) {
        filter.eventDate.$lte = new Date(req.query.endDate);
      } else {
        filter.eventDate = { $lte: new Date(req.query.endDate) };
      }
    }
    
    // Filter by report
    if (req.query.reportId) {
      filter.reportId = req.query.reportId;
    }
    
    // Filter by governorate
    if (req.query.governorate) {
      filter.governorate = req.query.governorate;
    }
    
    // Filter by region
    if (req.query.region) {
      filter.region = { $regex: req.query.region, $options: 'i' };
    }
    
    // Filter by event type
    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }
    
    // Filter by severity
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    // Get events with pagination
    const events = await Event.find(filter)
      .populate('reportId', 'reportNumber reportDate reportType')
      .populate('governorate', 'name code')
      .populate('createdBy', 'username fullName')
      .sort({ eventDate: -1, eventTime: -1 })
      .skip(startIndex)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Event.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single event
 * @route GET /api/events/:id
 * @access Private
 */
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('reportId', 'reportNumber reportDate reportType')
      .populate('governorate', 'name code')
      .populate('createdBy', 'username fullName');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'الحدث غير موجود'
      });
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new event
 * @route POST /api/events
 * @access Private
 */
const createEvent = async (req, res, next) => {
  try {
    const {
      reportId,
      governorate,
      region,
      eventTime,
      eventDate,
      eventType,
      severity,
      description,
      involvedParties,
      palestinianIntervention,
      israeliResponse,
      results,
      casualties,
      status,
      coordinates
    } = req.body;
    
    // Validate required fields
    if (!reportId || !governorate || !region || !eventTime || 
        !eventDate || !eventType || !description) {
      return res.status(400).json({
        success: false,
        message: 'يرجى توفير جميع الحقول المطلوبة'
      });
    }
    
    // Check if report exists
    const report = await DailyReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود'
      });
    }
    
    // Check if governorate exists
    const gov = await Governorate.findById(governorate);
    if (!gov) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    // Check if region belongs to governorate
    if (!gov.regions.includes(region)) {
      return res.status(400).json({
        success: false,
        message: 'المنطقة غير موجودة في هذه المحافظة'
      });
    }
    
    // Format the date and time to ensure they're valid
    let formattedEventTime, formattedEventDate;
    
    try {
      formattedEventTime = new Date(eventTime);
      formattedEventDate = new Date(eventDate);
      
      // Validate that dates are valid
      if (isNaN(formattedEventTime.getTime()) || isNaN(formattedEventDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'تاريخ أو وقت الحدث غير صالح'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في تنسيق التاريخ أو الوقت'
      });
    }
    
    // Generate event number based on report
    const reportParts = report.reportNumber.split('-');
    const dateStr = reportParts[1];
    const reportTypeCode = reportParts[2];
    
    // Get the count of events for this report
    const count = await Event.countDocuments({ reportId });
    
    // Generate the sequential number (padded with zeros)
    const seq = (count + 1).toString().padStart(3, '0');
    
    // Set the event number: EVT-YYYYMMDD-X-XXX
    const eventNumber = `EVT-${dateStr}-${reportTypeCode}-${seq}`;
    
    // Create event with explicit eventNumber
    const event = await Event.create({
      reportId,
      eventNumber, // Explicitly set event number
      governorate,
      region,
      eventTime: formattedEventTime,
      eventDate: formattedEventDate,
      eventType,
      severity: severity || 'medium',
      description,
      involvedParties: involvedParties || [],
      palestinianIntervention,
      israeliResponse,
      results,
      casualties: casualties || { killed: 0, injured: 0, arrested: 0 },
      status: status || 'ongoing', // Default to 'ongoing' if not provided
      coordinates,
      createdBy: req.user._id
    });
    
    // Update report event count
    await DailyReport.findByIdAndUpdate(reportId, {
      $inc: { eventCount: 1 }
    });
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'create',
      module: 'events',
      resourceId: event._id,
      details: `تم إنشاء حدث جديد في ${gov.name} - ${region}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحدث بنجاح',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event
 * @route PUT /api/events/:id
 * @access Private
 */
const updateEvent = async (req, res, next) => {
  try {
    const {
      governorate,
      region,
      eventTime,
      eventDate,
      eventType,
      severity,
      description,
      involvedParties,
      palestinianIntervention,
      israeliResponse,
      results,
      casualties,
      status,
      coordinates
    } = req.body;
    
    // Find event
    let event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'الحدث غير موجود'
      });
    }
    
    // If governorate is changed, validate the new one and check if region belongs to it
    if (governorate && governorate !== event.governorate.toString()) {
      const gov = await Governorate.findById(governorate);
      if (!gov) {
        return res.status(404).json({
          success: false,
          message: 'المحافظة غير موجودة'
        });
      }
      
      // If region is not updated, check if current region belongs to the new governorate
      const regionToCheck = region || event.region;
      if (!gov.regions.includes(regionToCheck)) {
        return res.status(400).json({
          success: false,
          message: 'المنطقة غير موجودة في هذه المحافظة'
        });
      }
    } else if (region && region !== event.region) {
      // If only region is changed, check if it belongs to the current governorate
      const gov = await Governorate.findById(event.governorate);
      if (!gov.regions.includes(region)) {
        return res.status(400).json({
          success: false,
          message: 'المنطقة غير موجودة في هذه المحافظة'
        });
      }
    }
    
    // Update fields
    if (governorate) event.governorate = governorate;
    if (region) event.region = region;
    if (eventTime) event.eventTime = new Date(eventTime);
    if (eventDate) event.eventDate = new Date(eventDate);
    if (eventType) event.eventType = eventType;
    if (severity) event.severity = severity;
    if (description) event.description = description;
    if (involvedParties) event.involvedParties = involvedParties;
    if (palestinianIntervention !== undefined) event.palestinianIntervention = palestinianIntervention;
    if (israeliResponse !== undefined) event.israeliResponse = israeliResponse;
    if (results !== undefined) event.results = results;
    if (casualties) event.casualties = casualties;
    if (status) event.status = status;
    if (coordinates) event.coordinates = coordinates;
    
    // Save changes
    await event.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'events',
      resourceId: event._id,
      details: `تم تحديث الحدث: ${event.eventNumber}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث الحدث بنجاح',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete event
 * @route DELETE /api/events/:id
 * @access Private
 */
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'الحدث غير موجود'
      });
    }
    
    // Get report for event count update
    const reportId = event.reportId;
    
    // Delete event
    await event.remove();
    
    // Update report event count
    await DailyReport.findByIdAndUpdate(reportId, {
      $inc: { eventCount: -1 }
    });
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'delete',
      module: 'events',
      resourceId: event._id,
      details: `تم حذف الحدث: ${event.eventNumber}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم حذف الحدث بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add attachment to event
 * @route POST /api/events/:id/attachments
 * @access Private
 */
const addAttachment = async (req, res, next) => {
  try {
    console.log("addAttachment called for event ID:", req.params.id);
    console.log("Request file:", req.file);
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      console.error(`Event with ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'الحدث غير موجود'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      console.error("No file found in request");
      return res.status(400).json({
        success: false,
        message: 'لم يتم تحميل أي ملف'
      });
    }
    
    console.log("Current event attachments:", event.attachments);
    
    // Create the attachment object
    const newAttachment = {
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };
    
    console.log("Adding new attachment:", newAttachment);
    
    // Add attachment to event
    if (!event.attachments) {
      event.attachments = [];
    }
    
    event.attachments.push(newAttachment);
    
    // Save the event with explicit options to ensure proper save
    const updatedEvent = await event.save({ new: true });
    
    console.log("Event after save:", updatedEvent);
    console.log("Attachments after save:", updatedEvent.attachments);
    
    // Verify the save worked by re-fetching the event
    const verifiedEvent = await Event.findById(req.params.id);
    console.log("Verified event attachments:", verifiedEvent.attachments);
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'events',
      resourceId: event._id,
      details: `تم إضافة مرفق "${req.file.filename}" إلى الحدث`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إضافة المرفق بنجاح',
      data: verifiedEvent.attachments
    });
  } catch (error) {
    console.error("Error adding attachment:", error);
    next(error);
  }
};

/**
 * Remove attachment from event
 * @route DELETE /api/events/:id/attachments/:attachmentId
 * @access Private
 */
const removeAttachment = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'الحدث غير موجود'
      });
    }
    
    // Find attachment
    const attachment = event.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'المرفق غير موجود'
      });
    }
    
    // Remove attachment from event
    attachment.remove();
    await event.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'events',
      resourceId: event._id,
      details: `تم إزالة مرفق "${attachment.filename}" من الحدث`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إزالة المرفق بنجاح',
      data: event.attachments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get events by governorate
 * @route GET /api/events/by-governorate/:governorateId
 * @access Private
 */
const getEventsByGovernorate = async (req, res, next) => {
  try {
    const governorateId = req.params.governorateId;
    
    // Verify governorate exists
    const governorate = await Governorate.findById(governorateId);
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    // Filter params
    const filter = { governorate: governorateId };
    
    // Date range
    if (req.query.startDate) {
      filter.eventDate = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      if (filter.eventDate) {
        filter.eventDate.$lte = new Date(req.query.endDate);
      } else {
        filter.eventDate = { $lte: new Date(req.query.endDate) };
      }
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    // Get events
    const events = await Event.find(filter)
      .populate('reportId', 'reportNumber reportDate reportType')
      .populate('createdBy', 'username fullName')
      .sort({ eventDate: -1, eventTime: -1 })
      .skip(startIndex)
      .limit(limit);
    
    // Get total count
    const total = await Event.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: events
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  addAttachment,
  removeAttachment,
  getEventsByGovernorate
};
