const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["pdf", "audio"], required: true },
    filename: { type: String, required: true },
    pages: Number,
    characters: Number,
    title: String,
    summary: String,
    topics: [mongoose.Schema.Types.Mixed],
    glossary: [{ term: String, meaning: String }],
    keyPoints: [String],
    revisionQuestions: [String],
    flashcards: [mongoose.Schema.Types.Mixed],
    quiz: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
