import { useState } from "react";

function load(id) {
  try {
    return JSON.parse(localStorage.getItem("revise:" + id) || "{}");
  } catch (err) {
    return {};
  }
}

function persist(id, value) {
  try {
    localStorage.setItem("revise:" + id, JSON.stringify(value));
  } catch (err) {
    console.error(err);
  }
}

export default function Revise({ note }) {
  const id = note._id || note.id;
  const topics = note.topics || [];
  const terms = note.glossary || [];
  const [done, setDone] = useState(() => load(id));
  const [hide, setHide] = useState(false);
  const [shown, setShown] = useState({});

  const reviewed = topics.filter((t, i) => done[i]).length;
  const pct = topics.length ? Math.round((reviewed / topics.length) * 100) : 0;

  function toggle(i) {
    const next = { ...done, [i]: !done[i] };
    setDone(next);
    persist(id, next);
  }

  function reset() {
    setDone({});
    persist(id, {});
  }

  return (
    <div className="rv">
      {topics.length > 0 && (
        <>
          <div className="rv-top">
            <strong>
              {reviewed} of {topics.length} topics reviewed ({pct}%)
            </strong>
            <button className="st-btn ghost" onClick={reset}>Reset progress</button>
          </div>
          <div className="rv-bar">
            <div style={{ width: pct + "%" }} />
          </div>
          {topics.map((t, i) => (
            <div className={`rv-topic ${done[i] ? "done" : ""}`} key={i}>
              <label>
                <input type="checkbox" checked={!!done[i]} onChange={() => toggle(i)} />
                <span>{i + 1}. {t.heading}</span>
              </label>
              {t.keyPoints && t.keyPoints.length > 0 && (
                <ul>{t.keyPoints.map((p, j) => <li key={j}>{p}</li>)}</ul>
              )}
            </div>
          ))}
        </>
      )}

      {terms.length > 0 && (
        <>
          <div className="rv-top">
            <h4>Key terms</h4>
            <button className="st-btn ghost" onClick={() => { setHide(!hide); setShown({}); }}>
              {hide ? "Show meanings" : "Hide meanings"}
            </button>
          </div>
          <div className="rv-terms">
            {terms.map((g, i) => (
              <button
                key={i}
                className="rv-term"
                onClick={() => setShown({ ...shown, [i]: !shown[i] })}
              >
                <b>{g.term}</b>
                <span>{hide && !shown[i] ? "Tap to reveal" : g.meaning}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {note.keyPoints && note.keyPoints.length > 0 && (
        <>
          <h4>Quick recap</h4>
          <ul className="rv-list">{note.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </>
      )}

      {note.revisionQuestions && note.revisionQuestions.length > 0 && (
        <>
          <h4>Test yourself</h4>
          <ol className="rv-list">{note.revisionQuestions.map((q, i) => <li key={i}>{q}</li>)}</ol>
        </>
      )}
    </div>
  );
}
