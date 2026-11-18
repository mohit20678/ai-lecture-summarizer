const passport = require("passport");

// Simple passport initialization - we use JWT authentication instead of sessions
// This file is required to set up passport for Google OAuth

// Configure Google OAuth strategy (done in google-auth.js routes)
// This file just ensures passport is properly initialized

// Export passport instance for use elsewhere if needed
module.exports = passport;