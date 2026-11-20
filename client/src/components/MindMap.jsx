import { useRef, useState, useEffect } from "react";

const COLORS = ["#7c83ff", "#35d0ba", "#f2b705", "#ef6f91"];
const LH = 16;
const PAD = 10;
const W = 1000;

// Simulated flashcard data structure for mind map integration
function getFlashcardsForTopic(topic) {
  const keyPoints = topic.keyPoints || [];
  return keyPoints.length > 0 ? keyPoints.map((kp, i) => ({
    id: `${topic.heading}-fp-${i}`,
    question: `${kp.substring(0, 40)}...`,
    answer: kp,
    topic: topic.heading
  })) : [];
}

// PDF-like lined background constants
const LINE_SPACING = 28;
const LINE_COLOR = "#30363d";
const MARGIN_LEFT = 50;

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

function clip(t, n) {
  const s = String(t || "");
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function curve(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

function Lines({ lines, x, y, size, weight, fill }) {
  return lines.map((l, i) => (
    <text key={i} x={x} y={y + LH * (i + 0.75)} fontSize={size} fontWeight={weight} fill={fill}>
      {l}
    </text>
  ));
}

// Enhanced mind map with new features
export default function MindMap({ note }) {
  const ref = useRef(null);
  const topics = (note.topics || []).slice(0, 8);
  const [showDetails, setShowDetails] = useState(null); // null | {topicId, topic}
  const [flashcardIndex, setFlashcardIndex] = useState(null);

  if (!topics.length) {
    return (
      <p className="st-meta">
        Mind maps need the detailed topic notes. This lecture was saved without them, so summarize it again to create a map.
      </p>
    );
  }

  // Add flashcard data to each topic
  const topicsWithFlashcards = topics.map((t) => ({
    ...t,
    flashcards: getFlashcardsForTopic(t).slice(0, 5) // Show first 5 flashcards per topic
  }));

  let y = 20;
  const rows = topicsWithFlashcards.map((t, i) => {
    const leaves = (t.keyPoints || []).slice(0, 3).map((p) => {
      const lines = wrap(p, 100);
      return { lines, h: lines.length * LH + PAD * 2 };
    });
    const tl = wrap(t.heading, 26);
    const th = tl.length * LH + PAD * 2;
    const leafTotal = leaves.reduce((s, l) => s + l.h, 0) + Math.max(0, leaves.length - 1) * 8;
    const block = Math.max(th, leafTotal);
    let ly = y + (block - leafTotal) / 2;
    const placed = leaves.map((l) => {
      const r = { ...l, y: ly };
      ly += l.h + 8;
      return r;
    });
    const row = { tl, th, ty: y + (block - th) / 2, placed, color: COLORS[i % 4], topic: t, flashcards: t.flashcards };
    y += block + 14;
    return row;
  });

  const H = y + 6;
  const rootLines = wrap(note.title || "Lecture", 18);
  const rh = Math.max(rootLines.length * LH + PAD * 2 + 10, 60);
  const ry = H / 2 - rh / 2;

  // Download function with PDF-like background
  function download() {
    const svg = ref.current.cloneNode(true);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    
    // Add PDF-like lined background
    const xml = addLinedBackground(svg);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = W * scale;
      c.height = H * scale;
      const ctx = c.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, W, H);
      c.toBlob((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = (note.title || "mind-map").replace(/[^\w ]+/g, "") + " - mind map.png";
        a.click();
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  }

  // Add lined background to SVG
  function addLinedBackground(svgElement) {
    const initialSvg = svgElement.innerHTML;
    // Add rect as background with lines
    const linesSvg = `
      <rect width="${W}" height="${H}" fill="#0d1117" />
      ${generateLinesSVG()}
      ${initialSvg}
    `;
    return initialSvg.replace(
      '<rect width="${W}" height="${H}" fill="#0d1117" />',
      linesSvg
    );
  }

  function generateLinesSVG() {
    const lines = [];
    for (let y = LINE_SPACING / 2; y < H; y += LINE_SPACING) {
      lines.push(`<line x1="${MARGIN_LEFT}" y1="${y}" x2="${W}" y2="${y}" stroke="${LINE_COLOR}" stroke-width="1" />`);
    }
    return lines.join("\n");
  }

  // Open topic details in a new overlay
  function openTopicDetails(topic) {
    setShowDetails(topic);
    // In a real implementation, this could navigate to a new page
    // or display a detailed view overlay
    setFlashcardIndex(0);
  }

  function nextFlashcard() {
    setFlashcardIndex((prev) => (prev < 4 ? prev + 1 : null));
  }

  function prevFlashcard() {
    setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : null));
  }

  return (
    <div>
      {/* PDF-like lined background overlay */}
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: 
            `linear-gradient(rgba(13, 17, 23, 0.8) 1px, transparent 1px),`
            + `linear-gradient(90deg, rgba(13, 17, 23, 0.8) 1px, transparent 1px)`,
          backgroundSize: "20px 28px",
          zIndex: 1000
        }}
      >
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ minWidth: 760, display: "block", position: "relative", zIndex: 1 }}
          fontFamily="Segoe UI, system-ui, Arial, sans-serif"
        >
          <rect width={W} height={H} fill="#0d1117" />
          {rows.map((r, i) => (
            <g key={i}>
              <path d={curve(210, ry + rh / 2, 290, r.ty + r.th / 2)} stroke={r.color} strokeWidth="2.5" fill="none" />
              {r.placed.map((l, j) => (
                <path key={j} d={curve(520, r.ty + r.th / 2, 600, l.y + l.h / 2)} stroke={r.color} strokeWidth="1.5" fill="none" opacity="0.7" />
              ))}
              <rect x="290" y={r.ty} width="230" height={r.th} rx="10" fill={r.color} />
              <Lines lines={r.tl} x={304} y={r.ty} size={13} weight={700} fill="#0d1117" />
              {r.flashcards && r.flashcards.length > 0 && (
                <div style={{
                  position: "absolute",
                  left: 300,
                  top: r.ty - 20,
                  background: "rgba(124, 131, 255, 0.1)",
                  border: "1px solid #7c83ff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "#e6edf3",
                  fontSize: "0.8rem",
                  whiteSpace: "pre-wrap"
                }}>
                  <strong>Flashcards:</strong> {r.flashcards.map((fc, fi) => 
                    `<div key={fi} style="margin-bottom: 4px; cursor: pointer;" onClick={() => setFlashcardIndex(fi)}">${fi + 1}. ${fc.question}</div>`
                  ).join("")}
                </div>
              )}
              {r.placed.map((l, j) => (
                <g key={j}>
                  <rect x="600" y={l.y} width="370" height={l.h} rx="8" fill="#161b22" stroke={r.color} strokeWidth="1.2" />
                  <Lines lines={l.lines} x={612} y={l.y} size={12} weight={400} fill="#e6edf3" />
                </g>
              ))}
            </g>
          ))}
          <rect x="20" y={ry} width="190" height={rh} rx="14" fill="#1c2333" stroke="#7c83ff" strokeWidth="2" />
          <Lines lines={rootLines} x={34} y={ry + 5} size={15} weight={700} fill="#ffffff" />
        </svg>
      </div>
      
      {/* Details overlay when clicking a topic */}
      {showDetails && showDetails.topic && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.9)",
          color: "#e6edf3",
          zIndex: 1001,
          padding: "2rem"
        }}>
          <div style={{ 
            maxWidth: 800, 
            margin: "auto", 
            padding: "2rem",
            background: "#161b22",
            borderRadius: "12px",
            marginTop: "3rem"
          }}>
            <h3 style={{ color: "#7c83ff", marginBottom: "1rem" }}>
              {showDetails.topic.heading}
            </h3>
            <p style={{ marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
              {showDetails.topic.explanation || "No explanation available"}
            </p>
            
            {/* Flashcards for this topic */}
            {showDetails.topic.flashcards && showDetails.topic.flashcards.length > 0 && (
              <div style={{ margin: "1rem 0" }}>
                <h4 style={{ color: "#35d0ba", marginBottom: "0.5rem" }}>
                  Flashcards ({showDetails.topic.flashcards.length})
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {showDetails.topic.flashcards.map((fc, i) => (
                    <div key={i} style={{ 
                      padding: "1rem", 
                      borderRadius: "8px",
                      background: "#0d1117",
                      border: "1px solid #30363d"
                    }}>
                      <strong>Q: {fc.question}</strong>
                      <p style={{ margin: "0.5rem 0", color: "#7c83ff" }}>{fc.answer}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={nextFlashcard}
                  style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", background: "#7c83ff", color: "#0d1117", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Next →
                </button>
              </div>
            )}
            
            <button
              onClick={() => setShowDetails(null)}
              style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "transparent", color: "#7c83ff", border: "1px solid #7c83ff", borderRadius: "6px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="mm-wrap">
          <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ minWidth: 760, display: "block" }}
            fontFamily="Segoe UI, system-ui, Arial, sans-serif"
          >
            <rect width={W} height={H} fill="#0d1117" />
            {rows.map((r, i) => (
              <g key={i}>
                <path d={curve(210, ry + rh / 2, 290, r.ty + r.th / 2)} stroke={r.color} strokeWidth="2.5" fill="none" />
                {r.placed.map((l, j) => (
                  <path key={j} d={curve(520, r.ty + r.th / 2, 600, l.y + l.h / 2)} stroke={r.color} strokeWidth="1.5" fill="none" opacity="0.7" />
                ))}
                <rect x="290" y={r.ty} width="230" height={r.th} rx="10" fill={r.color} />
                <Lines lines={r.tl} x={304} y={r.ty} size={13} weight={700} fill="#0d1117" />
                {r.flashcards && r.flashcards.length > 0 && (
                  <div style={{
                    position: "absolute",
                    left: 300,
                    top: r.ty - 20,
                    background: "rgba(124, 131, 255, 0.1)",
                    border: "1px solid #7c83ff",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#e6edf3",
                    fontSize: "0.8rem",
                    whiteSpace: "pre-wrap"
                  }}>
                    <strong>Flashcards:</strong> {r.flashcards.map((fc, fi) => 
                      `<div key={fi} style="margin-bottom: 4px; cursor: pointer;" onClick={() => setFlashcardIndex(fi)}">• ${fc}</div>`
                    ).join("")}
                  </div>
                )}
                <rect x="600" y={l.y} width="370" height={l.h} rx="8" fill="#161b22" stroke={r.color} strokeWidth="1.2" />
                <Lines lines={l.lines} x={612} y={l.y} size={12} weight={400} fill="#e6edf3" />
              </g>
            ))}
          </svg>
        </div>
        <div className="st-row">
          <button className="st-btn" onClick={download}>Download PNG</button>
        </div>
      </div>
    </div>
  );
}