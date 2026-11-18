export default function Formulas({ note }) {
  const formulas = note.formulas || [];
  const important = note.importantTopics || [];

  if (!formulas.length && !important.length) {
    return (
      <p className="st-meta">
        No formulas or important topics are saved for this lecture. New summaries include them, so summarize older lectures again to get them.
      </p>
    );
  }

  return (
    <div className="fm">
      {important.length > 0 && (
        <>
          <h4>Likely important topics</h4>
          <p className="st-meta">
            Based on what the lecture repeats or stresses. These are likely important, not guaranteed exam questions.
          </p>
          <ul className="fm-list">
            {important.map((t, i) => (
              <li key={i}>
                {typeof t === "string" ? (
                  t
                ) : (
                  <>
                    <b>{t.topic}</b>
                    {t.why ? ": " + t.why : ""}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {formulas.length > 0 && (
        <>
          <h4>Formulas and notation</h4>
          {formulas.map((f, i) => (
            <div className="fm-card" key={i}>
              {typeof f === "string" ? (
                <code>{f}</code>
              ) : (
                <>
                  {f.name && <b>{f.name}</b>}
                  <code>{f.expression}</code>
                  {f.meaning && <span>{f.meaning}</span>}
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
