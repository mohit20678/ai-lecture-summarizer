import { useState, useEffect } from "react";

export default function Login({ onAuthSuccess, onAuthError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("login"); // "login" or "register"
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:5000/api/auth/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "omit",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      // Successful auth - store user data and token, call success callback
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div className="login-container" style={{ maxWidth: 400px, margin: "auto" }}>
        <div className="login-header" style={{ textAlign: "center", padding: "2rem 0" }}>
          <h1 style={{ margin: 0, color: "#7c83ff", fontSize: "1.8rem" }}>AI Lecture Summarizer</h1>
          <p style={{ margin: ".5rem 0 0", color: "#8b949e"}}>Sign in to your account</p>
        </div>

        {error && <p className="login-error" style={{ color: "#ff7b72", margin: "1rem 0" }}>{error}</p>}

        <div className="login-tabs" style={{ display: "flex", justifyContent: "center", gap: "1rem", margin: "1rem 0" }}>
          <button
            className={type === "login" ? "active" : ""}
            onClick={() => setType("login")}
            style={{ padding: "0.5rem 1rem", background: type === "login" ? "#7c83ff" : "transparent", color: type === "login" ? "#0d1117" : "#7c83ff", borderRadius: "6px", border: type === "login" ? "1px solid #7c83ff" : "none", cursor: "pointer" }}
          >
            Login
          </button>
          <button
            className={type === "register" ? "active" : ""}
            onClick={() => setType("register")}
            style={{ padding: "0.5rem 1rem", background: type === "register" ? "#7c83ff" : "transparent", color: type === "register" ? "#0d1117" : "#7c83ff", borderRadius: "6px", border: type === "register" ? "1px solid #7c83ff" : "none", cursor: "pointer" }}
          >
            Register
          </button>
        </div>

        <div className="login-form" style={{ margin: "auto" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "0.8rem", margin: "0.5rem 0", border: "1px solid #30363d", borderRadius: "6px", background: "#161b22", color: "#e6edf3" }}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.8rem", margin: "0.5rem 0", border: "1px solid #30363d", borderRadius: "6px", background: "#161b22", color: "#e6edf3" }}
          />

          <div style={{ margin: "1rem 0" }}>
            <button
              className="login-btn"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  background: "#7c83ff",
                  color: "#0d1117",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background .2s",
                }
                onClick={handleSubmit}
            >
              {type === "login" ? "Login" : "Register"}
            </button>
          </div>

          <p className="login-switch" style={{ textAlign: "center", margin: "1.5rem 0", fontSize: ".85rem" }}>
            <span style={{ cursor: "pointer", color: "#7c83ff", textDecoration: "underline" }} onClick={() => setType("register")}>
              Don't have an account? Register
            </span>
            <span style={{ margin: "0 0.5rem" }}>|</span>
            <span style={{ cursor: "pointer", color: "#7c83ff", textDecoration: "underline" }} onClick={() => setType("login")}>
              Already have an account? Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}