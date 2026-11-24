const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/auth");

// Configure JWT
const JWT_SECRET = process.env.JWT_SECRET || "lecture-summarizer-jwt-secret-key-2026-secure-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Please provide both email and password",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user without Google ID (local account)
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from output
    user.password = undefined;

    res.status(201).json({
      success: true,
      token,
      user,
      message: "Account created successfully. Please log in.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Failed to create account. Please try again.",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Please provide both email and password",
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Update login history
    user.loginHistory.push({
      loginAt: new Date(),
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    await user.save({ validateBeforeSave: false });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from output
    user.password = undefined;

    res.json({
      success: true,
      token,
      user,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed: " + (error.message || "Unknown error"),
    });
  }
});

// Logout user (invalidate token on client side)
router.get("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// Get current user (protected route - needs auth middleware)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // The user should be available from auth middleware
    const user = await User.findById(req.user._id).select(
      "-password -driveRefreshToken"
    );
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: "Failed to fetch user profile",
    });
  }
});

module.exports = router;