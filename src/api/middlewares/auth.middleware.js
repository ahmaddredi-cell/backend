const jwt = require('jsonwebtoken');
const { User } = require('../../models');

/**
 * Middleware to authenticate API routes
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح بالوصول. يرجى تسجيل الدخول'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'لم يتم توفير رمز المصادقة'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم المرتبط بهذا الرمز غير موجود'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'هذا الحساب معطل. يرجى التواصل مع المشرف'
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'خطأ في المصادقة',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of roles to check against
 */
const hasRole = (roles) => {
  return (req, res, next) => {
    // First run the authenticate middleware if user is not attached
    if (!req.user) {
      return authenticate(req, res, () => {
        // After authentication check roles
        checkUserRole(req, res, next, roles);
      });
    } else {
      // If user is already authenticated just check roles
      checkUserRole(req, res, next, roles);
    }
  };
};

/**
 * Middleware to check if user has required permission
 * @param {string} module - Module to check permission for
 * @param {string} action - Action to check permission for
 */
const hasPermission = (module, action) => {
  return (req, res, next) => {
    // First run the authenticate middleware if user is not attached
    if (!req.user) {
      return authenticate(req, res, () => {
        // After authentication check permission
        checkUserPermission(req, res, next, module, action);
      });
    } else {
      // If user is already authenticated just check permission
      checkUserPermission(req, res, next, module, action);
    }
  };
};

/**
 * Helper function to check user role
 */
const checkUserRole = (req, res, next, roles) => {
  // If no roles specified or user is admin allow access
  if (!roles || roles.length === 0 || req.user.role === 'admin') {
    return next();
  }

  // Check if user has one of the required roles
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
    });
  }

  next();
};

/**
 * Helper function to check user permission
 */
const checkUserPermission = (req, res, next, module, action) => {
  // If user is admin allow all permissions
  if (req.user.role === 'admin') {
    return next();
  }

  // Check specific permission
  if (!req.user.hasPermission(module, action)) {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك الإذن المطلوب للقيام بهذا الإجراء'
    });
  }

  next();
};

module.exports = {
  authenticate,
  hasRole,
  hasPermission
};
