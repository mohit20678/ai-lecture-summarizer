const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const STATES = ["disconnected", "connected", "connecting", "disconnecting"];

router.get("/", (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  res.json({
    status: "ok",
    message: "Lecture Summarizer API is running",
    db: STATES[mongoose.connection.readyState] || "unknown",
    ai: Boolean(key && key !== "your_key_here"),
    time: new Date().toISOString(),
  });
});

module.exports = router;
