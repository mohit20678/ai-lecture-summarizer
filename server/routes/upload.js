const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const { transcribeAudio, summarizeText } = require("../services/ai");
const mongoose = require("mongoose");
const Note = require("../models/Note");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const allowed = [".mp3", ".wav", ".m4a", ".pdf"];

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only mp3, wav, m4a and pdf files are allowed"));
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

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    let text;
    let pages;

    if (ext === ".pdf") {
      const pdf = await extractPdfText(req.file.path);
      text = pdf.text;
      pages = pdf.pages;
      if (text.trim().length < 50) {
        return res.status(422).json({
          error: "This PDF has no readable text. It may be scanned images.",
        });
      }
    } else {
      text = await transcribeAudio(req.file.path);
      if (!text || text.trim().length < 20) {
        return res.status(422).json({ error: "No clear speech was found in this audio." });
      }
    }

    const notes = await summarizeText(text);

    const result = {
      type: ext === ".pdf" ? "pdf" : "audio",
      filename: req.file.originalname,
      pages,
      characters: text.length,
      ...notes,
    };

    if (mongoose.connection.readyState === 1) {
      const saved = await Note.create(result);
      result.id = saved._id;
    }

    res.json(result);
  } catch (err) {
    console.error("Upload error:", err);
    const message =
      process.env.NODE_ENV === "production" ? "Could not process the file" : err.message;
    res.status(500).json({ error: message });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
