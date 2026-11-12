import { useEffect, useRef, useState } from "react";
import "./UploadBox.css";

const OK = [".pdf", ".mp3", ".wav", ".m4a"];
const MAX = 25 * 1024 * 1024;

export default function UploadBox({ onUpload, loading }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [secs, setSecs] = useState(0);
  const input = useRef(null);

  useEffect(() => {
    if (!loading) {
      setSecs(0);
      return;
    }
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  function pick(f) {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!OK.includes(ext)) {
      setFile(null);
      setMsg("Unsupported file. Please use PDF, MP3, WAV or M4A.");
      return;
    }
    if (f.size > MAX) {
      setFile(null);
      setMsg("That file is over 25 MB. Please choose a smaller one.");
      return;
    }
    setMsg("");
    setFile(f);
  }

  return (
    <section
      className={`upload ${drag ? "drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        pick(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        hidden
        accept=".pdf,.mp3,.wav,.m4a"
        onChange={(e) => pick(e.target.files[0])}
      />
      <div className="drop" onClick={() => !loading && input.current.click()}>
        <strong>{file ? file.name : "Drop a PDF or audio file here, or click to choose"}</strong>
        <small>
          {file ? `${(file.size / 1048576).toFixed(1)} MB` : "PDF, MP3, WAV or M4A, up to 25 MB"}
        </small>
      </div>
      <button disabled={!file || loading} onClick={() => onUpload(file)}>
        {loading ? "Working..." : "Summarize"}
      </button>
      {msg && <p className="msg">{msg}</p>}
      {loading && (
        <div className="progress">
          <div className="bar" />
          <span>
            Reading your lecture and writing notes... {secs}s. Long lectures can take a minute or two.
          </span>
        </div>
      )}
    </section>
  );
}
