const { Governorate, SystemLog } = require('../../models');

/**
 * Get all governorates
 * @route GET /api/governorates
 * @access Public
 */
const getGovernorates = async (req, res, next) => {
  try {
    const governorates = await Governorate.find({ isActive: true }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: governorates.length,
      data: governorates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single governorate
 * @route GET /api/governorates/:id
 * @access Public
 */
const getGovernorate = async (req, res, next) => {
  try {
    const governorate = await Governorate.findById(req.params.id);
    
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    res.status(200).json({
      success: true,
      data: governorate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new governorate
 * @route POST /api/governorates
 * @access Private (Admin)
 */
const createGovernorate = async (req, res, next) => {
  try {
    const { name, code, regions, contactInfo } = req.body;
    
    // Check if governorate with same code already exists
    const exists = await Governorate.findOne({ code });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'رمز المحافظة مستخدم بالفعل'
      });
    }
    
    // Create governorate
    const governorate = await Governorate.create({
      name,
      code,
      regions: regions || [],
      contactInfo: contactInfo || {},
      isActive: true
    });
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'create',
      module: 'governorates',
      resourceId: governorate._id,
      details: `تم إنشاء محافظة: ${name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المحافظة بنجاح',
      data: governorate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update governorate
 * @route PUT /api/governorates/:id
 * @access Private (Admin)
 */
const updateGovernorate = async (req, res, next) => {
  try {
    const { name, code, regions, contactInfo, isActive } = req.body;
    
    // Find governorate
    let governorate = await Governorate.findById(req.params.id);
    
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    // If changing code, check uniqueness
    if (code && code !== governorate.code) {
      const exists = await Governorate.findOne({ code, _id: { $ne: req.params.id } });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'رمز المحافظة مستخدم بالفعل'
        });
      }
    }
    
    // Update fields
    governorate.name = name || governorate.name;
    governorate.code = code || governorate.code;
    governorate.regions = regions || governorate.regions;
    governorate.contactInfo = contactInfo || governorate.contactInfo;
    
    // Only update isActive if provided (could be false)
    if (isActive !== undefined) {
      governorate.isActive = isActive;
    }
    
    // Save changes
    await governorate.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'governorates',
      resourceId: governorate._id,
      details: `تم تحديث محافظة: ${governorate.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث المحافظة بنجاح',
      data: governorate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete governorate
 * @route DELETE /api/governorates/:id
 * @access Private (Admin)
 */
const deleteGovernorate = async (req, res, next) => {
  try {
    const governorate = await Governorate.findById(req.params.id);
    
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    // Instead of deleting, mark as inactive
    governorate.isActive = false;
    await governorate.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'delete',
      module: 'governorates',
      resourceId: governorate._id,
      details: `تم حذف محافظة: ${governorate.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم حذف المحافظة بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get governorate regions
 * @route GET /api/governorates/:id/regions
 * @access Public
 */
const getGovernorateRegions = async (req, res, next) => {
  try {
    const governorate = await Governorate.findById(req.params.id);
    
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    res.status(200).json({
      success: true,
      data: governorate.regions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add region to governorate
 * @route POST /api/governorates/:id/regions
 * @access Private (Admin)
 */
const addRegion = async (req, res, next) => {
  try {
    const { region } = req.body;
    
    if (!region) {
      return res.status(400).json({
        success: false,
        message: 'اسم المنطقة مطلوب'
      });
    }
    
    const governorate = await Governorate.findById(req.params.id);
    
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    // Check if region already exists
    if (governorate.regions.includes(region)) {
      return res.status(400).json({
        success: false,
        message: 'المنطقة موجودة بالفعل'
      });
    }
    
    // Add region
    governorate.regions.push(region);
    await governorate.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'governorates',
      resourceId: governorate._id,
      details: `تمت إضافة منطقة "${region}" إلى محافظة ${governorate.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تمت إضافة المنطقة بنجاح',
      data: governorate.regions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove region from governorate
 * @route DELETE /api/governorates/:id/regions/:region
 * @access Private (Admin)
 */
const removeRegion = async (req, res, next) => {
  try {
    const governorate = await Governorate.findById(req.params.id);
    
    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: 'المحافظة غير موجودة'
      });
    }
    
    const regionName = decodeURIComponent(req.params.region);
    
    // Remove region
    governorate.regions = governorate.regions.filter(r => r !== regionName);
    await governorate.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'governorates',
      resourceId: governorate._id,
      details: `تمت إزالة منطقة "${regionName}" من محافظة ${governorate.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تمت إزالة المنطقة بنجاح',
      data: governorate.regions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGovernorates,
  getGovernorate,
  createGovernorate,
  updateGovernorate,
  deleteGovernorate,
  getGovernorateRegions,
  addRegion,
  removeRegion
};
