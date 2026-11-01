const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");

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

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    if (ext === ".pdf") {
      const bytes = new Uint8Array(fs.readFileSync(req.file.path));
      const parser = new PDFParse({ data: bytes });
      const result = await parser.getText();
      await parser.destroy();
      fs.unlink(req.file.path, () => {});

      const text = result.text || "";
      if (text.trim().length < 50) {
        return res.status(422).json({
          error: "This PDF has no readable text. It may be scanned images.",
        });
      }

      return res.json({
        type: "pdf",
        filename: req.file.filename,
        pages: result.total,
        characters: text.length,
        preview: text.slice(0, 300),
      });
    }

    res.json({
      type: "audio",
      filename: req.file.filename,
      sizeKB: Math.round(req.file.size / 1024),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Could not read the file: " + err.message });
  }
});

module.exports = router;
