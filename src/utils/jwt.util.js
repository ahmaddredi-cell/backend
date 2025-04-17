const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration time (default: '1d')
 * @returns {string} JWT token
 */
const generateToken = (user, expiresIn = '1d') => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate refresh token for a user
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration time (default: '7d')
 * @returns {string} Refresh token
 */
const generateRefreshToken = (user, expiresIn = '7d') => {
  return jwt.sign(
    {
      id: user._id
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken
};
