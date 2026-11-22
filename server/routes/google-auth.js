const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const passport = require("passport");

// Configure JWT
const { JWT_SECRET } = require("../config/jwt");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Google OAuth20 setup - only if credentials are provided
let passportGoogleInitialized = false;

try {
  const passport = require("passport");
  const GoogleStrategy = require("passport-google-oauth20").Strategy;

  // Passport Google Strategy configuration - only if credentials exist
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/google/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already has Google account
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
              // User exists, update tokens and return
              user.driveRefreshToken = refreshToken;
              await user.save({ validateBeforeSave: false });
              return done(null, user);
            }

            // Create new user from Google profile
            user = await User.create({
              googleId: profile.id,
              email: profile.emails ? profile.emails[0].value : "",
              displayName: profile.displayName,
              profilePhoto: profile.photos ? profile.photos[0].value : "",
              driveRefreshToken: refreshToken,
            });

            done(null, user);
          } catch (error) {
            console.error("Google OAuth error:", error);
            done(error, null);
          }
        }
      )
    );
    passportGoogleInitialized = true;
  }
} catch (e) {
  console.error("Failed to initialize Google OAuth:", e);
}

// Google Login Initiation (only if Google strategy is initialized)
if (passportGoogleInitialized) {
  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );
}

// Google OAuth Callback (only if Google strategy is initialized)
if (passportGoogleInitialized) {
  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: process.env.FRONTEND_URL || "http://localhost:5173" }),
    async (req, res) => {
      try {
        // Generate JWT for the user
        const token = jwt.sign(
          { userId: req.user._id, email: req.user.email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove sensitive data
        req.user.password = undefined;
        req.user.driveRefreshToken = undefined;

        // Redirect to frontend with token, or return JSON
        // For API usage, return JSON
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}?token=${token}`);
      } catch (error) {
        console.error("Google callback error:", error);
        res.status(500).json({ error: "Authentication failed" });
      }
    }
  );
}

// Verify JWT token (for frontend validation) - always available
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const User = require("../models/User");
    const user = await User.findById(decoded.userId).select(
      "-password -driveRefreshToken"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user,
      valid: true,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Export passport status endpoint
router.get("/google/status", (req, res) => {
  res.json({
    googleOAuthEnabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    strategyInitialized: passportGoogleInitialized,
  });
});

module.exports = router;