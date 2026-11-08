import { useEffect, useState } from "react";
import UploadBox from "./components/UploadBox";
import ResultCard from "./components/ResultCard";
import LectureList from "./components/LectureList";
import "./App.css";

const API = "http://localhost:5000";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [lectures, setLectures] = useState([]);
  const [listError, setListError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadLectures() {
    try {
      const res = await fetch(`${API}/api/notes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load lectures");
      setLectures(data);
      setListError("");
    } catch (err) {
      setListError(err.message);
    }
  }

  useEffect(() => {
    loadLectures();
  }, []);

  async function handleUpload(file) {
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API}/api/upload`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
      setStatus("done");
      loadLectures();
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function openLecture(id) {
    setError("");
    setSidebarOpen(false);
    try {
      const res = await fetch(`${API}/api/notes/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open lecture");
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function deleteLecture(id) {
    if (!window.confirm("Delete this lecture and its notes?")) return;
    try {
      const res = await fetch(`${API}/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete lecture");
      if (result && (result._id === id || result.id === id)) {
        setResult(null);
        setStatus("idle");
      }
      loadLectures();
    } catch (err) {
      setListError(err.message);
    }
  }

  function newLecture() {
    setResult(null);
    setError("");
    setStatus("idle");
    setSidebarOpen(false);
  }

  return (
    <div className="shell">
      <LectureList
        open={sidebarOpen}
        items={lectures}
        error={listError}
        activeId={result ? result._id || result.id : null}
        onOpen={openLecture}
        onDelete={deleteLecture}
        onNew={newLecture}
      />
      <div className="main">
        <div className="topbar">
          <button onClick={() => setSidebarOpen((o) => !o)} aria-label="Menu">☰</button>
        </div>
        <div className="content">
          <header>
            <h1>AI Lecture Summarizer</h1>
            <p>Upload lecture audio or PDF notes and get a summary, key points and revision questions.</p>
          </header>
          <UploadBox onUpload={handleUpload} loading={status === "loading"} />
          {status === "error" && <p className="error">{error}</p>}
          {status === "done" && <ResultCard note={result} />}
        </div>
      </div>
    </div>
  );
}
