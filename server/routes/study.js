const express = require("express");
const mongoose = require("mongoose");
const { OpenAI } = require("openai");
const Note = require("../models/Note");

const router = express.Router();

function rateMessage(err) {
  const m = String((err && err.message) || "");
  const kind = (m.match(/on ([a-z ]+\((?:TPM|RPM|RPD|TPD)\))/i) || [])[1];
  const wait = (m.match(/try again in ([0-9a-z.]+)/i) || [])[1];
  return "OpenAI rate limit reached" + (kind ? " (" + kind + ")" : "") + (wait ? ". Try again in " + wait + "." : ". Please wait a few minutes and try again.");
}


function client() {
  const k = process.env.OPENAI_API_KEY;
  if (!k || k === "your_key_here") throw new Error("OPENAI_API_KEY is missing in server/.env");
  return new OpenAI({ apiKey: k, maxRetries: 0 });
}

function context(n) {
  const parts = [`Title: ${n.title || n.filename}`, `Summary: ${n.summary || ""}`];
  (n.topics || []).forEach((t) => {
    parts.push(`Topic: ${t.heading}\n${t.explanation || ""}\n${(t.keyPoints || []).join("; ")}`);
  });
  (n.glossary || []).forEach((g) => parts.push(`Term ${g.term}: ${g.meaning}`));
  if (n.keyPoints && n.keyPoints.length) parts.push(`Key points: ${n.keyPoints.join("; ")}`);
  return parts.join("\n\n").slice(0, 24000);
}

async function ask(instructions, input) {
  const r = await client().responses.create({
    model: process.env.SUMMARY_MODEL || "gpt-6-luna",
    instructions,
    input,
  });
  return r.output_text;
}

function parse(raw) {
  const c = String(raw || "").replace(/```json|```/g, "").trim();
  const s = c.indexOf("{");
  const e = c.lastIndexOf("}");
  try {
    return JSON.parse(c.slice(s, e + 1));
  } catch (err) {
    return null;
  }
}

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database is not connected" });
  }
  next();
});

const handle = (fn) => async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid lecture id" });
    }
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Lecture not found" });
    await fn(note, req, res);
  } catch (err) {
    console.error("Study error:", err);
    if (err.status === 429) {
      return res.status(429).json({
        error: rateMessage(err),
      });
    }
    res.status(500).json({ error: err.message });
  }
};

router.post(
  "/:id/flashcards",
  handle(async (note, req, res) => {
    if (note.flashcards && note.flashcards.length) return res.json({ cards: note.flashcards });
    const raw = await ask(
      'You write study flashcards. Reply with ONLY JSON: {"cards":[{"q":"question","a":"short answer"}]}. Write 10 to 12 cards covering the main ideas, definitions and facts. Use only the given notes. Do not invent facts.',
      context(note)
    );
    const data = parse(raw);
    const cards = ((data && data.cards) || []).filter((c) => c && c.q && c.a).slice(0, 15);
    if (!cards.length) throw new Error("The AI returned an unreadable answer. Please try again.");
    await Note.findByIdAndUpdate(note._id, { $set: { flashcards: cards } });
    res.json({ cards });
  })
);

router.post(
  "/:id/quiz",
  handle(async (note, req, res) => {
    const diff = ["easy", "medium", "hard"].includes(req.body.difficulty) ? req.body.difficulty : "medium";
    const saved = note.quiz && note.quiz[diff];
    if (saved && saved.length) return res.json({ questions: saved, difficulty: diff });
    const raw = await ask(
      `You write quizzes. Reply with ONLY JSON: {"questions":[{"type":"mcq","topic":"short topic name","q":"question","options":["A","B","C","D"],"answer":0,"explain":"one sentence"}]}. Write 8 questions at ${diff} difficulty: mostly multiple choice (type "mcq", 4 options) and 2 true/false (type "tf", options ["True","False"]). "answer" is the zero-based index of the correct option. Use only the given notes. Do not invent facts.`,
      context(note)
    );
    const data = parse(raw);
    const questions = ((data && data.questions) || []).filter(
      (x) =>
        x &&
        x.q &&
        Array.isArray(x.options) &&
        x.options.length >= 2 &&
        Number.isInteger(x.answer) &&
        x.answer >= 0 &&
        x.answer < x.options.length
    );
    if (questions.length < 3) throw new Error("The AI returned an unreadable answer. Please try again.");
    await Note.findByIdAndUpdate(note._id, { $set: { ["quiz." + diff]: questions } });
    res.json({ questions, difficulty: diff });
  })
);

router.post(
  "/:id/chat",
  handle(async (note, req, res) => {
    const question = String(req.body.question || "").trim().slice(0, 500);
    if (!question) return res.status(400).json({ error: "Please type a question" });
    const history = (Array.isArray(req.body.history) ? req.body.history : [])
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Student" : "Assistant"}: ${String(m.text || "").slice(0, 600)}`)
      .join("\n");
    const answer = await ask(
      "You are a study assistant. Answer the student's question using ONLY the lecture notes provided. Be clear and concise. If the notes do not contain the answer, begin with \"This isn't covered in the lecture notes.\" and then, if helpful, add a short paragraph starting with \"General background (not from the lecture):\". Never invent facts, numbers or formulas.",
      `Lecture notes:\n${context(note)}\n\nConversation so far:\n${history || "(none)"}\n\nStudent question: ${question}`
    );
    res.json({ answer: String(answer || "").trim() });
  })
);

module.exports = router;
