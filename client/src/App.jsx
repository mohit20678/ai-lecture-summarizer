import { useState } from "react";
import UploadBox from "./components/UploadBox";
import ResultCard from "./components/ResultCard";
import "./App.css";

const API = "http://localhost:5000";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <main className="app">
      <header>
        <h1>AI Lecture Summarizer</h1>
        <p>Upload lecture audio or PDF notes and get a summary, key points and revision questions.</p>
      </header>
      <UploadBox onUpload={handleUpload} loading={status === "loading"} />
      {status === "error" && <p className="error">{error}</p>}
      {status === "done" && <ResultCard note={result} />}
    </main>
  );
}
