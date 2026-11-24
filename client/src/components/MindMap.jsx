import { useState } from "react";
import "./MindMap.css";
import Visual from "./Visual";
import { downloadMindMapPNG } from "../utils/exportMindMap";

function wrap(text, max) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const COLORS = ["#7c83ff", "#35d0ba", "#f2b705", "#ef6f91"];

export default function MindMap({ note }) {
  const [view, setView] = useState("root"); // "root" | "branches" | "details"
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const topics = (note.topics || []).slice(0, 8);
  const rootTitle = note.title || "Lecture";
  const rootLines = wrap(rootTitle, 18);

  async function handleExport() {
    if (exporting) return;
    setExportError("");
    setExporting(true);
    try {
      await downloadMindMapPNG(note);
    } catch (err) {
      setExportError(err?.message || "Could not download the mind map. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  if (!topics.length) {
    return (
      <p className="st-meta">
        Mind maps need detailed topic notes. This lecture was saved without them, so summarize it again to create a map.
      </p>
    );
  }

  // Radial positions in PERCENT of the container (all stay inside the box).
  const count = topics.length;
  const branches = topics.map((topic, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const rx = 33; // horizontal radius (percent)
    const ry = 35; // vertical radius (percent)
    const x = 50 + Math.cos(angle) * rx;
    const y = 50 + Math.sin(angle) * ry;
    const color = COLORS[i % COLORS.length];
    return { topic, x, y, color };
  });

  return (
    <div className="mindmap-wrap">
      <div className="mindmap-toolbar">
        <span className="mindmap-toolbar-label">
          Download the full map with every topic's details
        </span>
        <div className="mindmap-actions">
          <button
            type="button"
            className="mm-export-btn primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Preparing image…" : "↓ Download PNG"}
          </button>
        </div>
      </div>

      {exportError && (
        <p className="mm-export-error" role="alert">
          {exportError}
        </p>
      )}

      <div className="mindmap-container">
      {/* ---------- VIEW 1: only the lesson name ---------- */}
      {view === "root" && (
        <button className="root-node" onClick={() => setView("branches")}>
          <span className="root-circle">
            <span className="root-title">
              {rootLines.map((l, i) => (
                <span key={i} className="root-line">{l}</span>
              ))}
            </span>
          </span>
          <span className="root-hint">Click to see topics</span>
        </button>
      )}

      {/* ---------- VIEW 2: radial branches ---------- */}
      {view === "branches" && (
        <>
          {/* Connector lines from centre to every branch */}
          <svg
            className="mindmap-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {branches.map((b, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={b.x}
                y2={b.y}
                stroke={b.color}
                strokeWidth="1.4"
                strokeOpacity="0.55"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Centre lesson name (click to collapse) */}
          <button
            className="root-node center"
            onClick={() => setView("root")}
            title="Click to close"
          >
            <span className="root-circle small">
              <span className="root-title">
                {rootLines.map((l, i) => (
                  <span key={i} className="root-line">{l}</span>
                ))}
              </span>
            </span>
          </button>

          {/* Branch circles */}
          {branches.map((b, i) => (
            <button
              key={i}
              className="branch-node"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                "--c": b.color,
                animationDelay: `${i * 0.07}s`,
              }}
              onClick={() => {
                setSelectedBranch(i);
                setView("details");
              }}
            >
              <span className="branch-circle">
                <span className="branch-label">{b.topic.heading}</span>
              </span>
              <span className="branch-count">
                {(b.topic.keyPoints || []).length || 1} points
              </span>
            </button>
          ))}
        </>
      )}

      {/* ---------- VIEW 3: topic details ---------- */}
      {view === "details" && selectedBranch !== null && (
        <>
          <div
            className="details-backdrop"
            onClick={() => {
              setView("branches");
              setSelectedBranch(null);
            }}
          />
          <div className="details-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="back-btn"
              onClick={() => {
                setView("branches");
                setSelectedBranch(null);
              }}
            >
              ← Back to topics
            </button>
            <h2>{topics[selectedBranch].heading}</h2>

            <div className="details-body">
              {topics[selectedBranch].explanation && (
                <>
                  <h3>Explanation</h3>
                  <div className="explanation-text">
                    {String(topics[selectedBranch].explanation)
                      .split(/\n\n+/)
                      .map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                  </div>
                </>
              )}

              {topics[selectedBranch].keyPoints?.length > 0 && (
                <>
                  <h3>Key Points</h3>
                  <ul className="keypoints-list">
                    {topics[selectedBranch].keyPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </>
              )}

              {topics[selectedBranch].example && (
                <>
                  <h3>Example</h3>
                  <div className="example-box">{topics[selectedBranch].example}</div>
                </>
              )}

              {topics[selectedBranch].visual &&
                topics[selectedBranch].visual.type !== "none" && (
                <>
                  <h3>Diagram / Visual</h3>
                  <div className="visual-wrap">
                    <Visual data={topics[selectedBranch].visual} />
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
