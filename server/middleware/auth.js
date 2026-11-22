const jwt = require("jsonwebtoken");

/**
 * Authorization middleware that verifies a JWT token from the Authorization header
 * and attaches the user to req.user for use in route handlers.
 * 
 * Expected header: Authorization: Bearer <token>
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the token
    const secret = require("../config/jwt").JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    // Fetch user from database, excluding sensitive fields
    const User = require("../models/User");
    const user = await User.findById(decoded.userId).select(
      "-password -driveRefreshToken -loginHistory"
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Access denied. User not found or account disabled.",
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Access denied. Invalid token.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access denied. Token expired.",
      });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      error: "Authentication server error.",
    });
  }
};

/**
 * Optional authentication middleware - user is attached if token provided,
 * but request proceeds even without token.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, require("../config/jwt").JWT_SECRET);
      
      const User = require("../models/User");
      const user = await User.findById(decoded.userId).select(
        "-password -driveRefreshToken -loginHistory"
      );
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};