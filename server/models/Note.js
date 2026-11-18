const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["pdf", "audio"],
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
    },
    pages: Number,
    characters: Number,
    title: {
      type: String,
      default: "",
    },
    summary: {
      type: String,
    },
    topics: [
      {
        heading: {
          type: String,
          required: true,
        },
        explanation: {
          type: String,
          default: "",
        },
        visual: {
          type: String,
          enum: ["flow", "compare", "concept", "none"],
          default: "none",
        },
        keyPoints: {
          type: [String],
          default: [],
        },
        example: {
          type: String,
          default: "",
        },
      },
    ],
    glossary: [
      {
        term: {
          type: String,
          required: true,
        },
        meaning: {
          type: String,
          required: true,
        },
      },
    ],
    formulas: [
      {
        name: {
          type: String,
        },
        expression: {
          type: String,
          required: true,
        },
        meaning: {
          type: String,
        },
      },
    ],
    importantTopics: [
      {
        topic: {
          type: String,
        },
        why: {
          type: String,
        },
      },
    ],
    keyPoints: {
      type: [String],
      default: [],
    },
    revisionQuestions: {
      type: [String],
      default: [],
    },
    flashcards: {
      type: [],
      default: [],
    },
    quiz: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Google Drive reference
    driveFileId: {
      type: String,
    },
    driveFolderId: {
      type: String,
    },

    // Chat history for this note
    chat: [
      {
        role: {
          type: String,
          enum: ["user", "ai"],
        },
        text: {
          type: String,
        },
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster user-specific queries
noteSchema.index({ user: 1, createdAt: -1 });

// Method to get public summary (without user ID)
noteSchema.methods.getPublicSummary = function () {
  const note = this.toObject();
  delete note.user;
  delete note.__v;
  return note;
};

module.exports = mongoose.model("Note", noteSchema);