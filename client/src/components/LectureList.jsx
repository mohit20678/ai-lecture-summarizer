import "./LectureList.css";

export default function LectureList({ items, error, activeId, open, onOpen, onDelete, onNew }) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <button className="new" onClick={onNew}>+ New lecture</button>
      <h2>My Lectures</h2>
      {error && <p className="side-error">{error}</p>}
      {!error && items.length === 0 && <p className="empty">No saved lectures yet.</p>}
      <ul>
        {items.map((n) => (
          <li key={n._id} className={n._id === activeId ? "active" : ""}>
            <button className="item" onClick={() => onOpen(n._id)} title={n.filename}>
              {n.title || n.filename}
            </button>
            <button className="del" aria-label="Delete lecture" onClick={() => onDelete(n._id)}>✕</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
