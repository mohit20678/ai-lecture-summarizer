import Visual from "./Visual";
import { exportHandwritten, exportPlain } from "../exportHandwritten";
import "./ResultCard.css";

function Paragraphs({ text }) {
  return String(text || "")
    .split(/\n+/)
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);
}

export default function ResultCard({ note }) {
  const topics = note.topics || [];

  function exportPdf() {
    const node = document.getElementById("notes-export");
    if (!node) return;
    const clone = node.cloneNode(true);
    clone.querySelectorAll(".export-bar").forEach((el) => el.remove());
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join("\n");
    const title = note.title || "Lecture notes";
    const oldTitle = document.title;

    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;";
    document.body.appendChild(frame);

    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' + styles +
      '</head><body><main class="content">' + clone.outerHTML + "</main></body></html>"
    );
    doc.close();
    doc.title = title;
    document.title = title;

    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      document.title = oldTitle;
      frame.remove();
    }, 400);
  }
  return (
    <article className="result" id="notes-export">
      <h2>{note.title}</h2>
      {note.summary && <p className="overview">{note.summary}</p>}

      {topics.map((t, i) => (
        <section className="topic" key={i}>
          <h3>
            <span className="idx">{i + 1}</span>
            {t.heading}
          </h3>
          <Paragraphs text={t.explanation} />
          <Visual data={t.visual} />
          {t.keyPoints?.length > 0 && (
            <ul>{t.keyPoints.map((p, j) => <li key={j}>{p}</li>)}</ul>
          )}
          {t.example && (
            <div className="example">
              <strong>Example</strong>
              <p>{t.example}</p>
            </div>
          )}
        </section>
      ))}

      {note.glossary?.length > 0 && (
        <section className="topic">
          <h3>Key terms</h3>
          <dl className="glossary">
            {note.glossary.map((g, i) => (
              <div key={i}>
                <dt>{g.term}</dt>
                <dd>{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="topic">
        <h3>{topics.length ? "Quick recap" : "Key points"}</h3>
        <ul>{note.keyPoints?.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </section>

      <section className="topic">
        <h3>Revision questions</h3>
        <ol>{note.revisionQuestions?.map((q, i) => <li key={i}>{q}</li>)}</ol>
      </section>

      <div className="export-bar">
        <button className="export-btn" onClick={() => exportPlain(note)}>Download PDF</button>
        <button className="export-btn alt" onClick={() => exportHandwritten(note)}>Handwritten PDF</button>
      </div>
    </article>
  );
}
