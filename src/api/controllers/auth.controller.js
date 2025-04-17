const { User, SystemLog } = require('../../models');
const { generateToken, generateRefreshToken, verifyToken } = require('../../utils/jwt.util');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Admin
 */
const register = async (req, res, next) => {
  try {
    const {
      username,
      password,
      fullName,
      email,
      phoneNumber,
      role,
      governorate,
      department,
      permissions
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم موجود مسبقاً'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      password,
      fullName,
      email,
      phoneNumber,
      role,
      governorate,
      department,
      permissions
    });

    // Log the action
    await SystemLog.create({
      userId: req.user?._id,
      action: 'create',
      module: 'users',
      resourceId: user._id,
      details: `تم إنشاء المستخدم: ${username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Return success without the password
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        governorate: user.governorate,
        department: user.department,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Check for username and password
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال اسم المستخدم وكلمة المرور'
      });
    }

    // Find user by username
    const user = await User.findOne({ username });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    // Debug password comparison
    console.log('Login attempt for username:', username);
    console.log('Stored password hash:', user.password);
    
    // Check if password is correct
    try {
      const isMatch = await user.comparePassword(password);
      console.log('Password match result:', isMatch);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
        });
      }
    } catch (err) {
      console.error('Error comparing passwords:', err);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من كلمة المرور'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'هذا الحساب معطل. يرجى التواصل مع المشرف'
      });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Log the action
    await SystemLog.create({
      userId: user._id,
      action: 'login',
      module: 'auth',
      details: `تم تسجيل الدخول: ${username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return success with tokens
    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          governorate: user.governorate,
          permissions: user.permissions,
          department: user.department,
          isActive: user.isActive
        },
        token,
        refreshToken // Include refreshToken in the response for client-side token renewal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged in user
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    // Get user from request (set by auth middleware)
    const user = await User.findById(req.user._id)
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
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'الرمز المحدد غير موجود'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'رمز غير صالح'
      });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو معطل'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'تم تحديث الرمز بنجاح',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز غير صالح أو منتهي الصلاحية'
      });
    }
    next(error);
  }
};

/**
 * Change password
 * @route POST /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال كلمة المرور الحالية والجديدة'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log the action
    await SystemLog.create({
      userId: user._id,
      action: 'update',
      module: 'users',
      resourceId: user._id,
      details: 'تم تغيير كلمة المرور',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
  try {
    // Log the logout action
    await SystemLog.create({
      userId: req.user._id,
      action: 'logout',
      module: 'auth',
      details: `تم تسجيل الخروج: ${req.user.username}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  changePassword,
  logout
};
