import { useState } from "react";

export default function Settings({ count, onDeleteAll }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="page">
      <h1 className="page-title">Settings and privacy</h1>
      <section className="panel">
        <h3>What is stored</h3>
        <ul>
          <li>Your notes: title, summary, topics, key terms, flashcards and quizzes, saved in MongoDB Atlas.</li>
          <li>Uploaded PDF and audio files are deleted from the server right after processing.</li>
          <li>Chat conversations are not saved. They disappear when you leave the page.</li>
        </ul>
      </section>
      <section className="panel">
        <h3>Which services receive your data</h3>
        <ul>
          <li>OpenAI receives lecture text or audio to transcribe it and to write notes, flashcards, quizzes and chat answers.</li>
          <li>MongoDB Atlas stores your generated notes.</li>
        </ul>
      </section>
      <section className="panel danger-zone">
        <h3>Delete my data</h3>
        <p className="muted">You have {count} saved {count === 1 ? "lecture" : "lectures"}. Deleting removes the notes, flashcards and quizzes for all of them. This cannot be undone.</p>
        <button
          className="danger"
          disabled={busy || count === 0}
          onClick={async () => {
            setBusy(true);
            await onDeleteAll();
            setBusy(false);
          }}
        >
          {busy ? "Deleting..." : "Delete all lectures"}
        </button>
      </section>
    </div>
  );
}
