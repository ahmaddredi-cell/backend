const { User, SystemLog } = require('../../models');

/**
 * Get all users
 * @route GET /api/users
 * @access Private (Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    // Allow filtering by role, governorate, etc.
    const filter = {};
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.governorate) {
      filter.governorate = req.query.governorate;
    }
    
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    const users = await User.find(filter)
      .select('-password')
      .populate('governorate', 'name code')
      .sort({ username: 1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user
 * @route GET /api/users/:id
 * @access Private (Admin)
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('governorate', 'name code');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user (register endpoint handles this)
 * @see auth.controller.js
 */

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Private (Admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      role,
      governorate,
      department,
      permissions,
      isActive
    } = req.body;
    
    // Find user
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // Update fields (excluding password which has its own endpoint)
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (role) user.role = role;
    if (governorate) user.governorate = governorate;
    if (department) user.department = department;
    if (permissions) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;
    
    // Save changes
    await user.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'users',
      resourceId: user._id,
      details: `تم تحديث المستخدم: ${user.username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        governorate: user.governorate,
        department: user.department,
        permissions: user.permissions,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password
 * @route PATCH /api/users/:id/reset-password
 * @access Private (Admin)
 */
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
      });
    }
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'users',
      resourceId: user._id,
      details: `تم إعادة تعيين كلمة المرور للمستخدم: ${user.username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user permissions
 * @route PATCH /api/users/:id/permissions
 * @access Private (Admin)
 */
const updatePermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'الصلاحيات المقدمة غير صالحة'
      });
    }
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // Update permissions
    user.permissions = permissions;
    await user.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'update',
      module: 'users',
      resourceId: user._id,
      details: `تم تحديث صلاحيات المستخدم: ${user.username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث الصلاحيات بنجاح',
      data: user.permissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // Instead of deleting, mark as inactive
    user.isActive = false;
    await user.save();
    
    // Log the action
    await SystemLog.create({
      userId: req.user._id,
      action: 'delete',
      module: 'users',
      resourceId: user._id,
      details: `تم تعطيل المستخدم: ${user.username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: 'تم تعطيل المستخدم بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity logs
 * @route GET /api/users/:id/logs
 * @access Private (Admin)
 */
const getUserLogs = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // Get logs for this user with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    const logs = await SystemLog.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .skip(startIndex)
      .limit(limit);
    
    const total = await SystemLog.countDocuments({ userId: user._id });
    
    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  resetPassword,
  updatePermissions,
  deleteUser,
  getUserLogs
};
