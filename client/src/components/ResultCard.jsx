export default function ResultCard({ note }) {
  return (
    <article className="result">
      <h2>{note.title}</h2>
      <p>{note.summary}</p>
      <h3>Key points</h3>
      <ul>
        {note.keyPoints?.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <h3>Revision questions</h3>
      <ol>
        {note.revisionQuestions?.map((q, i) => <li key={i}>{q}</li>)}
      </ol>
    </article>
  );
}
