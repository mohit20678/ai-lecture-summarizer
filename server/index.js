const path = require("path");

// Always load server/.env, no matter which folder the server was started from.
// Starting from the repo root used to skip this file, which left MONGO_URI and
// OPENAI_API_KEY empty and made the lecture history disappear.
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Configure Passport for authentication
const passport = require("passport");
require("./config/passportConfig"); // We'll create this next

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Initialize Passport (session-based auth is not used; we use JWT)
app.use(passport.initialize());

// Health check endpoint
app.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    message: "Lecture Summarizer API is running",
    db: states[dbState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/health", require("./routes/health"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/study", require("./routes/study"));

// Auth routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/google", require("./routes/google-auth"));

// Token verification (for frontend checks)
app.get("/api/verify-token", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, require("./config/jwt").JWT_SECRET);

    const User = require("./models/User");
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

// Serve API health details
app.use("/api/health", require("./routes/health"));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "That file is over 25 MB. Please choose a smaller one." });
  }
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Database connection with improved error handling
const uri = process.env.MONGO_URI;

if (!uri || uri.includes("your_mongodb_link_here")) {
  console.warn(
    "[db] WARNING: MONGO_URI is missing in server/.env — lecture history will not load or save. " +
    "Set MONGO_URI in server/.env to use the full database features."
  );
} else {
  mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    .then(() => console.log("[db] MongoDB connected — lecture history is available"))
    .catch((err) => console.error("[db] MongoDB connection failed:", err.message));

  // Connection event listeners
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected — history features will be unavailable");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[db] MongoDB reconnected — history features restored");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB error:", err.message);
  });
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[api] API endpoints:`);
  console.log(`   GET  /              - API status`);
  console.log(`   GET /api/health    - Detailed health check`);
  console.log(`   POST /api/auth/register  - Register account`);
  console.log(`   POST /api/auth/login     - Login`);
  console.log(`   GET  /api/auth/me        - Get user profile (requires auth)`);
  console.log(`   GET  /api/google       - Google OAuth login`);
  console.log(`   GET  /api/google/callback - Google OAuth callback`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[api] Port ${PORT} is already in use. Close the other server window and start again.`
    );
    process.exit(1);
  }
  throw err;
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  // Graceful shutdown - do not crash in production
  // process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});