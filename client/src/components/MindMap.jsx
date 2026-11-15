import { useRef } from "react";

const COLORS = ["#7c83ff", "#35d0ba", "#f2b705", "#ef6f91"];
const LH = 16;
const PAD = 10;
const W = 1000;

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
    <text key={i} x={x} y={y + PAD + LH * (i + 0.75)} fontSize={size} fontWeight={weight} fill={fill}>
      {l}
    </text>
  ));
}

export default function MindMap({ note }) {
  const ref = useRef(null);
  const topics = (note.topics || []).slice(0, 8);

  if (!topics.length) {
    return (
      <p className="st-meta">
        Mind maps need the detailed topic notes. This lecture was saved without them, so summarize it again to create a map.
      </p>
    );
  }

  let y = 20;
  const rows = topics.map((t, i) => {
    const leaves = (t.keyPoints || []).slice(0, 3).map((p) => {
      const lines = wrap(clip(p, 100), 44);
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
    const row = { tl, th, ty: y + (block - th) / 2, placed, color: COLORS[i % 4] };
    y += block + 14;
    return row;
  });

  const H = y + 6;
  const rootLines = wrap(note.title || "Lecture", 18);
  const rh = Math.max(rootLines.length * LH + PAD * 2 + 10, 60);
  const ry = H / 2 - rh / 2;

  function download() {
    const svg = ref.current.cloneNode(true);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    const xml = new XMLSerializer().serializeToString(svg);
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

  return (
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
      <div className="st-row">
        <button className="st-btn" onClick={download}>Download PNG</button>
      </div>
    </div>
  );
}
