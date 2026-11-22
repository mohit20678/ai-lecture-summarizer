const mongoose = require("mongoose");

const { Mixed } = mongoose.Schema.Types;

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["pdf", "audio"], required: true },
    filename: { type: String, required: true },
    originalName: String,
    pages: Number,
    characters: Number,
    title: { type: String, default: "" },
    summary: String,
    topics: [Mixed],
    glossary: [Mixed],
    formulas: [Mixed],
    importantTopics: [Mixed],
    keyPoints: [String],
    revisionQuestions: [String],
    flashcards: [Mixed],
    quiz: { type: Mixed, default: {} },
    chat: [
      {
        role: { type: String, enum: ["user", "ai"] },
        text: String,
        at: { type: Date, default: Date.now },
      },
    ],
    driveFileId: String,
    driveFolderId: String,
  },
  { timestamps: true, minimize: false }
);

noteSchema.index({ user: 1, createdAt: -1 });

noteSchema.methods.getPublicSummary = function () {
  const note = this.toObject();
  delete note.user;
  delete note.__v;
  return note;
};

module.exports = mongoose.model("Note", noteSchema);
