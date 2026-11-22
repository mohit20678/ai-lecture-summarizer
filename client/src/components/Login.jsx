import { useState } from "react";
import "./Login.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function Login({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("login");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (type === "register" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>AI Lecture Summarizer</h1>
        <p className="login-sub">
          {type === "login" ? "Sign in to your account" : "Create your account"}
        </p>

        <div className="login-tabs">
          <button type="button" className={type === "login" ? "on" : ""} onClick={() => setType("login")}>
            Login
          </button>
          <button type="button" className={type === "register" ? "on" : ""} onClick={() => setType("register")}>
            Register
          </button>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder={type === "register" ? "Password (at least 8 characters)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="login-error">{error}</p>}

        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? "Please wait..." : type === "login" ? "Login" : "Register"}
        </button>
      </form>
    </div>
  );
}
