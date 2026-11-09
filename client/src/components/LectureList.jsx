import { useMemo, useState } from "react";
import "./LectureList.css";

const ORDER = ["Today", "Yesterday", "Previous 7 days", "Older"];

function groupLabel(dateStr) {
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((day(new Date()) - day(new Date(dateStr))) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 days";
  return "Older";
}

const Svg = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const PdfIcon = () => (
  <Svg>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </Svg>
);
const MicIcon = () => (
  <Svg>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Svg>
);
const TrashIcon = () => (
  <Svg>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Svg>
);
const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);

export default function LectureList({ items, error, activeId, width, onOpen, onDelete, onNew }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = items.filter((n) =>
      `${n.title || ""} ${n.filename || ""}`.toLowerCase().includes(q)
    );
    const map = {};
    shown.forEach((n) => {
      const label = groupLabel(n.createdAt);
      (map[label] = map[label] || []).push(n);
    });
    return ORDER.filter((l) => map[l]).map((l) => ({ label: l, list: map[l] }));
  }, [items, query]);

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="brand">
        <span className="logo">AI</span>
        <span>Lecture Summarizer</span>
      </div>

      <button className="new" onClick={onNew}>
        <span className="plus">+</span> New lecture
      </button>

      <label className="search">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lectures"
        />
      </label>

      <div className="list">
        {error && <p className="side-msg err">{error}</p>}
        {!error && items.length === 0 && (
          <p className="side-msg">No saved lectures yet. Summarize one and it will appear here.</p>
        )}
        {!error && items.length > 0 && groups.length === 0 && (
          <p className="side-msg">No lectures match your search.</p>
        )}

        {groups.map((g) => (
          <section key={g.label}>
            <h2>{g.label}</h2>
            <ul>
              {g.list.map((n) => (
                <li key={n._id} className={n._id === activeId ? "active" : ""}>
                  <button className="item" onClick={() => onOpen(n._id)} title={n.title || n.filename}>
                    <span className={`ico ${n.type === "audio" ? "audio" : "pdf"}`}>
                      {n.type === "audio" ? <MicIcon /> : <PdfIcon />}
                    </span>
                    <span className="txt">
                      <span className="ttl">{n.title || n.filename}</span>
                      <span className="sub">
                        {n.type === "audio" ? "Audio" : "PDF"} ·{" "}
                        {new Date(n.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </span>
                    </span>
                  </button>
                  <button className="del" aria-label="Delete lecture" title="Delete" onClick={() => onDelete(n._id)}>
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="foot">{items.length} saved {items.length === 1 ? "lecture" : "lectures"}</div>
    </aside>
  );
}
