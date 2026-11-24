const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");
const { OpenAI } = require("openai");
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

const allowed = [".mp3", ".wav", ".m4a", ".webm", ".mp4", ".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only pdf, mp3, wav, m4a, webm, mp4, jpg, jpeg, png and webp files are allowed"));
  },
});

/** Extract text from an image file using OpenAI's vision (responses API) */
async function extractImageText(filePath) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 180000,
  });
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === ".jpg" ? "jpeg" : ext;
  const base64 = fs.readFileSync(filePath, { encoding: "base64" });
  const response = await client.responses.create({
    model: process.env.SUMMARY_MODEL || "gpt-6-luna",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Extract all text from this image. Return only the text content, do not invent or summarize. If there are formulas, write them out exactly." },
          { type: "input_image", image_url: `data:image/${mimeType};base64,${base64}` },
        ],
      },
    ],
    instructions:
      "You are a study assistant. Extract all readable text from the image. Return the text as a single block. Do not summarize, do not add analysis. If you see formulas or equations, write them out exactly as they appear.",
  });
  return response.output_text || "";
}

/** Extract text from a PDF file */
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
      } else if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") {
        try {
          text = await extractImageText(req.file.path);
          pages = 1;
          if (!text || text.trim().length < 10) {
            return res.status(422).json({ error: "No readable text was found in this image." });
          }
        } catch (err) {
          console.error("Image text extraction error:", err.message);
          return res.status(422).json({ error: "This image could not be read. It may be blurred, very small, or not a real image." });
        }
      } else {
        text = await transcribeAudio(req.file.path);
        if (!text || text.trim().length < 20) {
          return res.status(422).json({ error: "No clear speech was found in this audio." });
        }
      }

      const notes = await summarizeText(text, opts);

      const result = {
        type: ext === ".pdf" ? "pdf" : ext.match(/\.(jpg|jpeg|png|webp)$/) ? "image" : "audio",
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