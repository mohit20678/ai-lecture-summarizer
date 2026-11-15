import { useState } from "react";
import "./StudyTools.css";
import MindMap from "./MindMap";

const API = "http://localhost:5000";

async function call(id, path, body) {
  const res = await fetch(`${API}/api/study/${id}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function Flashcards({ id, saved }) {
  const [cards, setCards] = useState(saved || []);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function make() {
    setBusy(true);
    setErr("");
    try {
      setCards((await call(id, "flashcards")).cards);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  function go(n) {
    setFlip(false);
    setI(Math.max(0, Math.min(cards.length - 1, n)));
  }

  function mark(v) {
    setMarks({ ...marks, [i]: v });
    go(i + 1);
  }

  if (!cards.length) {
    return (
      <div className="st-empty">
        <button className="st-btn" disabled={busy} onClick={make}>
          {busy ? "Generating..." : "Generate flashcards"}
        </button>
        {err && <p className="st-err">{err}</p>}
      </div>
    );
  }

  const known = Object.values(marks).filter(Boolean).length;
  const need = Object.values(marks).filter((v) => !v).length;

  return (
    <div className="st-cards">
      <p className="st-meta">
        Card {i + 1} of {cards.length} · Known {known} · Needs revision {need}
      </p>
      <div className={`st-card ${flip ? "flip" : ""}`} onClick={() => setFlip(!flip)}>
        <small>{flip ? "Answer" : "Question (click to flip)"}</small>
        <p>{flip ? cards[i].a : cards[i].q}</p>
      </div>
      <div className="st-row">
        <button className="st-btn ghost" onClick={() => go(i - 1)}>Previous</button>
        <button className="st-btn bad" onClick={() => mark(false)}>Needs revision</button>
        <button className="st-btn good" onClick={() => mark(true)}>Known</button>
        <button className="st-btn ghost" onClick={() => go(i + 1)}>Next</button>
      </div>
    </div>
  );
}

function Quiz({ id, saved }) {
  const [bank, setBank] = useState(saved || {});
  const [diff, setDiff] = useState("medium");
  const [ans, setAns] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const qs = bank[diff] || [];

  async function make() {
    setBusy(true);
    setErr("");
    try {
      const d = await call(id, "quiz", { difficulty: diff });
      setBank({ ...bank, [diff]: d.questions });
      setAns({});
      setDone(false);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const score = qs.filter((q, n) => ans[n] === q.answer).length;
  const topics = {};
  qs.forEach((q, n) => {
    const t = q.topic || "General";
    topics[t] = topics[t] || [0, 0];
    topics[t][1] += 1;
    if (ans[n] === q.answer) topics[t][0] += 1;
  });

  return (
    <div className="st-quiz">
      <div className="st-row">
        {["easy", "medium", "hard"].map((d) => (
          <button
            key={d}
            className={`st-btn ${d === diff ? "" : "ghost"}`}
            onClick={() => {
              setDiff(d);
              setAns({});
              setDone(false);
            }}
          >
            {d}
          </button>
        ))}
      </div>
      {!qs.length && (
        <div className="st-empty">
          <button className="st-btn" disabled={busy} onClick={make}>
            {busy ? "Generating..." : `Generate ${diff} quiz`}
          </button>
        </div>
      )}
      {err && <p className="st-err">{err}</p>}
      {qs.map((q, n) => (
        <div className="st-q" key={n}>
          <p>
            <b>{n + 1}.</b> {q.q}
          </p>
          {q.options.map((o, k) => {
            const cls = done ? (k === q.answer ? "right" : ans[n] === k ? "wrong" : "") : ans[n] === k ? "sel" : "";
            return (
              <button key={k} className={`st-opt ${cls}`} disabled={done} onClick={() => setAns({ ...ans, [n]: k })}>
                {o}
              </button>
            );
          })}
          {done && <small className="st-exp">{q.explain}</small>}
        </div>
      ))}
      {qs.length > 0 && !done && (
        <button className="st-btn" onClick={() => setDone(true)}>Submit answers</button>
      )}
      {done && (
        <div className="st-score">
          <h4>
            Score: {score} / {qs.length}
          </h4>
          {Object.entries(topics).map(([t, v]) => (
            <p key={t}>
              {t}: {v[0]} / {v[1]}
            </p>
          ))}
          <button
            className="st-btn ghost"
            onClick={() => {
              setAns({});
              setDone(false);
            }}
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );
}

const PROMPTS = ["Explain this topic", "Give an example", "Define a key term", "Summarise this section"];

function Chat({ id }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(q) {
    const question = (q || text).trim();
    if (!question || busy) return;
    const next = [...msgs, { role: "user", text: question }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const d = await call(id, "chat", { question, history: msgs });
      setMsgs([...next, { role: "ai", text: d.answer }]);
    } catch (e) {
      setMsgs([...next, { role: "ai", text: "Error: " + e.message }]);
    }
    setBusy(false);
  }

  return (
    <div className="st-chat">
      <div className="st-row">
        {PROMPTS.map((p) => (
          <button key={p} className="st-chip" onClick={() => send(p)}>{p}</button>
        ))}
      </div>
      <div className="st-log">
        {msgs.length === 0 && <p className="st-meta">Ask anything about this lecture. Answers come from your notes.</p>}
        {msgs.map((m, n) => (
          <div key={n} className={`st-msg ${m.role}`}>{m.text}</div>
        ))}
        {busy && <div className="st-msg ai">Thinking...</div>}
      </div>
      <div className="st-row">
        <input
          className="st-input"
          value={text}
          placeholder="Ask about this lecture"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="st-btn" disabled={busy} onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}

export default function StudyTools({ note }) {
  const id = note._id || note.id;
  const [tab, setTab] = useState("cards");
  if (!id) return null;
  return (
    <section className="study">
      <div className="st-tabs">
        {[["cards", "Flashcards"], ["quiz", "Quiz"], ["chat", "Chat"], ["map", "Mind map"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "cards" && <Flashcards id={id} saved={note.flashcards} />}
      {tab === "quiz" && <Quiz id={id} saved={note.quiz} />}
      {tab === "chat" && <Chat id={id} />}
      {tab === "map" && <MindMap note={note} />}
    </section>
  );
}
