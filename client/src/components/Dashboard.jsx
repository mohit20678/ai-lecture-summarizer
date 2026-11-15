export default function Dashboard({ items, error, onOpen, onUpload }) {
  const now = Date.now();
  const week = items.filter((n) => now - new Date(n.createdAt).getTime() < 7 * 86400000).length;
  const pdfs = items.filter((n) => n.type !== "audio").length;
  const stats = [
    ["Saved lectures", items.length],
    ["Added this week", week],
    ["PDF notes", pdfs],
    ["Audio lectures", items.length - pdfs],
  ];
  return (
    <div className="page">
      <h1 className="page-title">Welcome back</h1>
      <p className="muted">Turn lectures into notes, then revise with flashcards, quizzes and chat.</p>
      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="cta-card">
        <div>
          <h3>Upload a new lecture</h3>
          <p className="muted">Add a PDF or an audio recording and get detailed notes.</p>
        </div>
        <button className="primary" onClick={onUpload}>Upload lecture</button>
      </div>
      <h2 className="sec">Recent lectures</h2>
      {error && <p className="error">{error}</p>}
      {!error && items.length === 0 && <p className="muted">No lectures yet. Upload your first one above.</p>}
      <ul className="recent">
        {items.slice(0, 5).map((n) => (
          <li key={n._id}>
            <button onClick={() => onOpen(n._id)}>
              <span className="r-title">{n.title || n.filename}</span>
              <span className="r-sub">
                {n.type === "audio" ? "Audio" : "PDF"} · {new Date(n.createdAt).toLocaleDateString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
