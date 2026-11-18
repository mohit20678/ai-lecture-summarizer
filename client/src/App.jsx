import { useEffect, useState } from "react";
import Login from "./components/Login";
import ResultCard from "./components/ResultCard";
import LectureList from "./components/LectureList";
import StudyTools from "./components/StudyTools";
import "./App.css";
import "./print.css";

// API base path - override with VITE_API_URL if needed
const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [listError, setListError] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 760);
  const [width, setWidth] = useState(300);
  const [dragging, setDragging] = useState(false);
  const [errorInfo, setErrorInfo] = useState({ message: "", code: "", retryAfter: 0 });
  const [notice, setNotice] = useState("");

  // Initialize auth - check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("lecture_summarizer_token");
    if (savedToken) {
      setToken(savedToken);
      verifyAuthToken(savedToken);
    } else {
      // No saved token - user not logged in
      setLoadingAuth(false);
    }
  }, []);

  // Verify JWT token with server
  const verifyAuthToken = async (token) => {
    try {
      const res = await fetch(`${API}/api/verify-token`, {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.valid && data.user) {
        setUser(data.user);
        setToken(token);
        // Load lectures for this user
        await loadUserLectures();
        // Show main app, hide login
        const loginRoot = document.getElementById("login-root");
        const appRoot = document.getElementById("app-root");
        if (loginRoot) loginRoot.style.display = "none";
        if (appRoot) appRoot.style.display = "block";
      } else {
        // Invalid token - clear it
        localStorage.removeItem("lecture_summarizer_token");
        setToken(null);
        setUser(null);
        // Show login form
        const loginRoot = document.getElementById("login-root");
        const appRoot = document.getElementById("app-root");
        if (loginRoot) loginRoot.style.display = "block";
        if (appRoot) appRoot.style.display = "none";
      }
    } catch (err) {
      console.error("Auth verification error:", err);
      localStorage.removeItem("lecture_summarizer_token");
      setToken(null);
      setUser(null);
    }
    setLoadingAuth(false);
  };

  // Load lectures for the authenticated user
  const loadUserLectures = async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${API}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "omit",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load lectures");
      setLectures(data);
      setListError("");
    } catch (err) {
      setListError(err.message || "Failed to load lectures");
    } finally {
      setListLoading(false);
    }
  };

  // Handle auth success (login or signup)
  const handleAuthSuccess = async (userData, token) => {
    setToken(token);
    localStorage.setItem("lecture_summarizer_token", token);
    setUser(userData);
    setLoadingAuth(false);
    await loadUserLectures();
    // Hide login form, show app
    const loginRoot = document.getElementById("login-root");
    const appRoot = document.getElementById("app-root");
    if (loginRoot) loginRoot.style.display = "none";
    if (appRoot) appRoot.style.display = "block";
  };

  // User logout
  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, { credentials: "same-origin" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("lecture_summarizer_token");
    setToken(null);
    setUser(null);
    setLectures([]);
    setResult(null);
    setStatus("idle");
    setListError("");
    setListLoading(false);
    // Show login form, hide app
    const loginRoot = document.getElementById("login-root");
    const appRoot = document.getElementById("app-root");
    if (loginRoot) loginRoot.style.display = "block";
    if (appRoot) appRoot.style.display = "none";
  };

  // Upload handler
  const handleUpload = async (file, opts = {}) => {
    setStatus("loading");
    setResult(null);
    setErrorInfo({ message: "", code: "", retryAfter: 0 });
    setNotice("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6 * 60 * 1000);

    try {
      const formData = new FormData();
      formData.append("length", opts.length || "standard");
      formData.append("simple", opts.simple ? "true" : "false");
      formData.append("language", opts.language && opts.language !== "Same as lecture" ? opts.language : "");
      formData.append("file", file);

      const res = await fetch(`${API}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: "omit",
      });
      const data = await res.json();

      if (!res.ok) {
        // Server returns friendly error messages
        setErrorInfo({ message: data.error || "Could not process the file", code: data.code || "", retryAfter: data.retryAfter || 0 });
        setStatus("error");
      } else {
        setResult(data);
        setStatus("done");
        setNotice(data.saveWarning || "");
        await loadUserLectures(); // Refresh lecture list
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorInfo({ message: err.message || "Could not process the file", code: "", retryAfter: 0 });
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  };

  // Open lecture handler
  const openLecture = async (id) => {
    setErrorInfo({ message: "", code: "", retryAfter: 0 });
    setNotice("");
    if (window.innerWidth < 760) setCollapsed(true);
    try {
      const res = await fetch(`${API}/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "omit",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not open lecture");
      setResult(data);
      setStatus("done");
    } catch (err) {
      setErrorInfo({ message: err.message || "Could not open lecture", code: "", retryAfter: 0 });
      setStatus("error");
    }
  };

  // Delete lecture handler
  const deleteLecture = async (id) => {
    if (!window.confirm("Delete this lecture and its notes?")) return;
    try {
      const res = await fetch(`${API}/api/notes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete lecture");
      if (result && (result._id === id || result.id === id)) {
        setResult(null);
        setStatus("idle");
      }
      await loadUserLectures();
    } catch (err) {
      setListError(err.message || "Could not delete lecture");
    }
  };

  // New lecture handler
  const newLecture = () => {
    setResult(null);
    setErrorInfo({ message: "", code: "", retryAfter: 0 });
    setNotice("");
    setStatus("idle");
    if (window.innerWidth < 760) setCollapsed(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Auth area - shown when not logged in */}
      <div id="login-root" style={{ display: user ? "none" : "block" }}>
        <Login onAuthSuccess={handleAuthSuccess} />
      </div>

      {/* Main application area - shown when logged in */}
      <div id="app-root" style={{ display: user ? "block" : "none" }}>
        <header style={{ padding: "1rem 2rem", background: "#0d1117", borderBottom: "1px solid #30363d" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>AI Lecture Summarizer</h1>
          <button
            style={{ marginLeft: "auto", background: "none", border: "1px solid #30363d", color: "#e6edf3", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <div className="shell">
          <div
            className={`side-wrap ${dragging ? "dragging" : ""} ${collapsed ? "collapsed" : ""}`}
            style={{ width: collapsed ? 0 : width }}
          >
            <LectureList
              width={width}
              items={lectures}
              loading={listLoading}
              error={listError}
              activeId={result ? result._id || result.id : null}
              onOpen={openLecture}
              onDelete={deleteLecture}
              onNew={newLecture}
            />
            <div className="resizer" onPointerDown={startDrag} title="Drag to resize" />
          </div>
          <div className="main">
            <div className="topbar">
              <button onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">☰</button>
            </div>
            <div className="content">
              <header>
                <h1>AI Lecture Summarizer</h1>
                <p>Upload lecture audio or PDF notes and get a summary, key points and revision questions.</p>
              </header>
              <UploadBox
                onUpload={handleUpload}
                loading={status === "loading"}
                error={status === "error" ? errorInfo.message : ""}
                errorInfo={errorInfo}
              />
              {notice && <p className="notice">{notice}</p>}
              {status === "done" && result && <ResultCard note={result} />}
              {status === "done" && result && user && <StudyTools key={result._id || result.id} note={result} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}