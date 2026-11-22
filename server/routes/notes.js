const express = require("express");
const mongoose = require("mongoose");
const Note = require("../models/Note");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database is not connected" });
  }
  next();
});

router.get("/", async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }, "title filename type createdAt")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notes);
  } catch (err) {
    console.error("List notes error:", err);
    res.status(500).json({ error: "Could not load lectures" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid lecture id" });
    }
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ error: "Lecture not found" });
    res.json(note.getPublicSummary());
  } catch (err) {
    console.error("Open note error:", err);
    res.status(500).json({ error: "Could not open lecture" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid lecture id" });
    }
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ error: "Lecture not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ error: "Could not delete lecture" });
  }
});

module.exports = router;
