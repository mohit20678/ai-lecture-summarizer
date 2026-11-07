const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["pdf", "audio"], required: true },
    filename: { type: String, required: true },
    pages: Number,
    characters: Number,
    title: String,
    summary: String,
    keyPoints: [String],
    revisionQuestions: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
