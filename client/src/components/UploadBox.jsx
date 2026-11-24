import { useEffect, useRef, useState } from "react";
import "./UploadBox.css";

const OK = [".pdf", ".mp3", ".wav", ".m4a", ".webm", ".mp4", ".jpg", ".jpeg", ".png", ".webp"];
const MAX = 25 * 1024 * 1024;
const LANGS = ["Same as lecture", "English", "Hindi", "Marathi", "Spanish", "French", "German"];

function clock(n) {
  return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}

function formatWait(total) {
  const s = Math.max(0, Math.round(total));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function errorTitle(code) {
  if (code === "quota") return "OpenAI quota is used up";
  if (code === "rate") return "OpenAI is busy right now";
  if (code === "auth") return "API key problem";
  if (code === "model") return "AI model not available";
  if (code === "network") return "Connection problem";
  if (code === "timeout") return "The request took too long";
  return "Could not summarize this file";
}

export default function UploadBox({ onUpload, loading, error, errorInfo, onClearError }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [secs, setSecs] = useState(0);
  const [length, setLength] = useState("standard");
  const [simple, setSimple] = useState(false);
  const [language, setLanguage] = useState("Same as lecture");
  const [rec, setRec] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const input = useRef(null);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const stream = useRef(null);

  useEffect(() => {
    if (!loading) {
      setSecs(0);
      return;
    }
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (!rec) {
      setRecSecs(0);
      return;
    }
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);

  useEffect(
    () => () => {
      if (stream.current) stream.current.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // Start a visible countdown when OpenAI tells us when to try again.
  useEffect(() => {
    const wait = Number(errorInfo && errorInfo.retryAfter) || 0;
    setRetryAt(wait > 0 ? Date.now() + wait * 1000 : 0);
    setNow(Date.now());
  }, [errorInfo]);

  useEffect(() => {
    if (!retryAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [retryAt]);

  const waitLeft = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;

  function pick(f) {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!OK.includes(ext)) {
      setFile(null);
      setMsg("Unsupported file. Please use PDF, MP3, WAV, M4A, WEBM, MP4, or images (.jpg, .png, .webp).");
      return;
    }
    if (f.size > MAX) {
      setFile(null);
      setMsg("That file is over 25 MB. Please choose a smaller one.");
      return;
    }
    setMsg("");
    setFile(f);
    if (onClearError) onClearError();
  }

  async function startRec() {
    setMsg("");
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setMsg("Recording is not supported in this browser. Please use Chrome.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      chunks.current = [];
      const mr = new MediaRecorder(s);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        const type = mr.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? ".m4a" : ".webm";
        const blob = new Blob(chunks.current, { type });
        pick(new File([blob], "recording-" + Date.now() + ext, { type }));
      };
      mr.start();
      recorder.current = mr;
      setRec(true);
    } catch (err) {
      setMsg("Could not use the microphone. Allow microphone access in the browser and try again.");
    }
  }

  function stopRec() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    setRec(false);
  }

  function submit() {
    if (!file) return;
    onUpload(file, { length, simple, language });
  }

  const blocked = !file || loading || rec || waitLeft > 0;

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
        accept=".pdf,.mp3,.wav,.m4a,.webm,.mp4,.jpg,.jpeg,.png,.webp"
        onChange={(e) => pick(e.target.files[0])}
      />
      <div className="drop" onClick={() => !loading && !rec && input.current.click()}>
        <strong>{file ? file.name : "Drop a PDF, audio or video file here, or click to choose"}</strong>
        <small>
          {file ? `${(file.size / 1048576).toFixed(1)} MB` : "PDF, MP3, WAV, M4A, WEBM or MP4, up to 25 MB. Images (.jpg, .png, .webp) also supported."}
        </small>
      </div>
      <button disabled={blocked} onClick={submit}>
        {loading ? "Working..." : waitLeft > 0 ? `Wait ${formatWait(waitLeft)}` : "Summarize"}
      </button>

      <div className="opts">
        <label>
          Length
          <select value={length} onChange={(e) => setLength(e.target.value)}>
            <option value="short">Short</option>
            <option value="standard">Standard</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
        <label>
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={simple} onChange={(e) => setSimple(e.target.checked)} />
          Simple language
        </label>
      </div>

      <div className="recbar">
        {!rec ? (
          <button className="rec" disabled={loading} onClick={startRec}>Record audio</button>
        ) : (
          <button className="rec on" onClick={stopRec}>
            <span className="dot" />
            Stop {clock(recSecs)}
          </button>
        )}
        <span className="hint">Record a lecture with your microphone. Works best in Chrome.</span>
      </div>

      {msg && <p className="msg">{msg}</p>}

      {error && (
        <div className="errbox" role="alert">
          <strong>{errorTitle(errorInfo && errorInfo.code)}</strong>
          <p>{error}</p>
          {waitLeft > 0 && (
            <p className="wait">You can try again in {formatWait(waitLeft)}.</p>
          )}
          <div className="err-actions">
            <button className="retry" disabled={!file || loading || waitLeft > 0} onClick={submit}>
              {waitLeft > 0 ? `Try again in ${formatWait(waitLeft)}` : "Try again"}
            </button>
            <button
              className="ghost"
              disabled={loading}
              onClick={() => {
                if (onClearError) onClearError();
                input.current.click();
              }}
            >
              Choose another file
            </button>
          </div>
        </div>
      )}

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
