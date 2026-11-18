const express = require("express");
const mongoose = require("mongoose");
const Note = require("../models/Note");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Use auth middleware for all routes
router.use(authenticateToken);

// Get all notes for the authenticated user
router.get(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user._id;

      const notes = await Note.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        notes,
        count: notes.length,
      });
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({
        error: "Failed to fetch notes. Please try again.",
      });
    }
  }
);

// Get a single note by ID (verify ownership)
router.get(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const noteId = req.params.id;
      const userId = req.user._id;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(noteId)) {
        return res.status(400).json({
          error: "Invalid note ID format",
        });
      }

      const note = await Note.findOne({
        _id: noteId,
        user: userId,
      });

      if (!note) {
        return res.status(404).json({
          error: "Note not found or you don't have permission to access it",
        });
      }

      res.json({
        success: true,
        note: note.getPublicSummary(),
      });
    } catch (error) {
      console.error("Get note error:", error);
      res.status(500).json({
        error: "Failed to fetch note. Please try again.",
      });
    }
  }
);

// Delete a note (verify ownership)
router.delete(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const noteId = req.params.id;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(noteId)) {
        return res.status(400).json({
          error: "Invalid note ID format",
        });
      }

      const note = await Note.findOneAndDelete({
        _id: noteId,
        user: userId,
      });

      if (!note) {
        return res.status(404).json({
          error: "Note not found or you don't have permission to delete it",
        });
      }

      res.json({
        success: true,
        message: "Note deleted successfully",
        deletedId: noteId,
      });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({
        error: "Failed to delete note. Please try again.",
      });
    }
  }
);

module.exports = router;