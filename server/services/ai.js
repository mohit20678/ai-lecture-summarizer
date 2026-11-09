const fs = require("fs");
const { OpenAI } = require("openai");

const SYSTEM_PROMPT = `You are a study assistant for university students.
You receive lecture text (a transcript or notes) and turn it into detailed study notes, topic by topic.
Reply with ONLY a JSON object and no other text, in exactly this shape:
{"title":"short title","summary":"overview in 3 to 4 sentences","topics":[{"heading":"topic name","explanation":"clear, detailed explanation in 2 to 4 short paragraphs separated by \\n\\n","keyPoints":["3 to 6 short points"],"example":"one example from the text, or an empty string","visual":{"type":"none"}}],"glossary":[{"term":"term","meaning":"short meaning"}],"keyPoints":["5 to 8 overall key points"],"revisionQuestions":["4 to 6 self-test questions"]}
Cover every major topic in the text (4 to 8 topics), in the order they appear.
For each topic, replace the visual with the best fit:
{"type":"flow","title":"...","steps":["3 to 6 short steps"]} for a process or sequence,
{"type":"compare","title":"...","columns":["Item","Feature A","Feature B"],"rows":[["...","...","..."]]} for comparing things (2 to 5 rows),
{"type":"concept","title":"...","center":"main idea","branches":["3 to 6 short parts"]} for one idea with parts,
{"type":"none"} when no visual fits.
Keep every visual label under 8 words.
Use only information from the text. Do not invent facts, numbers or formulas. If something is unclear in the source, say it is unclear. Reply in the same language as the text.`;

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

function repairJson(text) {
  const stack = [];
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of text) {
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
      out += ch;
      continue;
    }
    if (ch === "}" || ch === "]") {
      const want = ch === "}" ? "{" : "[";
      if (stack[stack.length - 1] === want) {
        stack.pop();
        out += ch;
      }
      continue;
    }
    out += ch;
  }
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}

function parseNotes(raw) {
  const cleaned = String(raw || "").replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const body = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  for (const candidate of [body, repairJson(body)]) {
    try {
      const data = JSON.parse(candidate);
      if (data && typeof data === "object" && !Array.isArray(data)) return data;
    } catch (err) {}
  }
  return null;
}

async function summarizeText(text) {
  const client = getClient();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await client.responses.create({
      model: process.env.SUMMARY_MODEL || "gpt-6-luna",
      instructions: SYSTEM_PROMPT,
      input: text.slice(0, 30000),
    });
    const notes = parseNotes(response.output_text);
    if (notes && notes.title) return notes;
    console.error("Attempt " + attempt + ": the AI answer was not valid JSON");
  }
  throw new Error("The AI returned an unreadable answer. Please try again.");
}

module.exports = { transcribeAudio, summarizeText };
