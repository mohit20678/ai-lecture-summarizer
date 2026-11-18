const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");
const { transcribeAudio, summarizeText } = require("../services/ai");
const { describeAiError } = require("../services/aiError");
const Note = require("../models/Note");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowed = [".mp3", ".wav", ".m4a", ".webm", ".mp4", ".pdf"];

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only pdf, mp3, wav, m4a, webm and mp4 files are allowed"));
  },
});

async function extractPdfText(filePath) {
  const bytes = new Uint8Array(fs.readFileSync(filePath));
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return { text: result.text || "", pages: result.total };
  } finally {
    await parser.destroy();
  }
}

router.post(
  "/",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const user = req.user;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const body = req.body || {};
    const opts = {
      length: ["short", "standard", "detailed"].includes(body.length)
        ? body.length
        : "standard",
      simple: body.simple === "true",
      language: String(body.language || "").replace(/[^\p{L} ]/gu, "").trim().slice(0, 30),
    };

    try {
      let text;
      let pages;

      if (ext === ".pdf") {
        let pdf;
        try {
          pdf = await extractPdfText(req.file.path);
        } catch (err) {
          console.error("PDF read error:", err.message);
          return res.status(422).json({
            error: "This PDF could not be read. It may be damaged, password-protected or not a real PDF.",
          });
        }
        text = pdf.text;
        pages = pdf.pages;
        if (text.trim().length < 50) {
          return res.status(422).json({
            error: "This PDF has no readable text. It may be a scan of paper — try a text-based PDF.",
          });
        }
      } else {
        text = await transcribeAudio(req.file.path);
        if (!text || text.trim().length < 20) {
          return res.status(422).json({ error: "No clear speech was found in this audio." });
        }
      }

      const notes = await summarizeText(text, opts);

      const result = {
        type: ext === ".pdf" ? "pdf" : "audio",
        filename: req.file.originalname,
        originalName: req.file.originalname,
        userId: user._id,
        pages,
        characters: text.length,
        ...notes,
        user: user._id, // Associate with user
      };

      // Save to database with user association
      let savedNote = null;
      if (mongoose.connection.readyState === 1) {
        try {
          const saved = await Note.create({
            ...result,
            user: user._id,
          });
          savedNote = saved;
          result.id = saved._id;
          result.saved = true;
        } catch (err) {
          console.error("Could not save note:", err.message);
          result.saved = false;
          result.saveWarning =
            "The summary is ready, but it could not be saved to your history. Check the database connection.";
        }
      } else {
        result.saved = false;
        result.saveWarning =
          "The summary is ready, but the database is not connected, so it is not in your history.";
      }

      res.json(result);
    } catch (err) {
      console.error("Upload error:", err);
      const friendly = describeAiError(err);
      if (friendly) {
        if (friendly.retryAfter) res.set("Retry-After", String(friendly.retryAfter));
        return res.status(friendly.status).json({
          error: friendly.message,
          code: friendly.code,
          retryAfter: friendly.retryAfter || 0,
        });
      }
      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Could not process the file"
            : err.message || "Could not process the file",
      });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  }
);

module.exports = router;