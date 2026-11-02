const fs = require("fs");
const { OpenAI } = require("openai");

const SYSTEM_PROMPT = `You are a study assistant for university students.
You receive lecture text (a transcript or notes).
Reply with ONLY a JSON object and no other text, in exactly this shape:
{"title": "short title", "summary": "clear summary in 4 to 6 sentences", "keyPoints": ["5 to 8 short points"], "revisionQuestions": ["3 to 5 self-test questions"]}
Use only information from the text. Do not invent facts. Reply in the same language as the text.`;

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "your_key_here") {
    throw new Error("OPENAI_API_KEY is missing in server/.env");
  }
  return new OpenAI({ apiKey: key });
}

async function transcribeAudio(filePath) {
  const client = getClient();
  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: process.env.TRANSCRIBE_MODEL || "gpt-transcribe",
  });
  return result.text;
}

function parseNotes(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return { title: "Lecture notes", summary: raw, keyPoints: [], revisionQuestions: [] };
  }
}

async function summarizeText(text) {
  const client = getClient();
  const response = await client.responses.create({
    model: process.env.SUMMARY_MODEL || "gpt-6-luna",
    instructions: SYSTEM_PROMPT,
    input: text.slice(0, 60000),
  });
  return parseNotes(response.output_text);
}

module.exports = { transcribeAudio, summarizeText };
