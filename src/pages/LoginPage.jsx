// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost, apiGet } from "../api/client.js";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import { useAuthStore } from "../store/authStore";
import "../css/LoginPage.css";
import logoDkn from "../assets/logo_dkn.png";

// Demo users for examiner
const DEMO_PASSWORD = "admin123456@";

const DEMO_USERS = [
  {
    key: "employee_steve",
    label: "Employee (EU) – steve",
    username: "steve",
  },
  {
    key: "employee_bipul",
    label: "Employee (Asia-Pacific) – bipul",
    username: "bipul",
  },
  {
    key: "champion",
    label: "Champion (EU) – champ1",
    username: "champ1",
  },
  {
    key: "officer",
    label: "Regional Officer (EU) – officer1",
    username: "officer1",
  },
  {
    key: "council",
    label: "Governance Council (EU) – council1",
    username: "council1",
  },
];

function LoginPage() {
  const navigate = useNavigate();

  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStarting, setBackendStarting] = useState(false);
  const [error, setError] = useState("");

  // Shared login logic used by both normal login + quick demo login
  async function performLogin(loginUsername, loginPassword) {
    setError("");
    setBackendStarting(false);
    setLoading(true);

    // show “backend waking up” message if it takes longer than 3s
    const backendStartTimer = setTimeout(() => {
      setBackendStarting(true);
    }, 3000);

    try {
      // 1) Log in -> get tokens
      const loginData = await apiPost("/auth/login/", {
        username: loginUsername, // backend expects username
        password: loginPassword,
      });

      const access = loginData.access;
      const refresh = loginData.refresh;

      if (!access || !refresh) {
        throw new Error("Login response did not contain tokens.");
      }

      // Save tokens (Zustand + localStorage)
      setTokens(access, refresh);

      // 2) Fetch profile
      const profile = await apiGet("/accounts/profile/");
      console.log("Profile from /accounts/profile/:", profile);

      setUser(profile);

      // 3) Go to main app
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      let msg = "Login failed. Please check your credentials.";

      if (typeof err.message === "string") {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.detail) msg = parsed.detail;
        } catch {
          // ignore parse failure
        }
      }

      setError(msg);
    } finally {
      clearTimeout(backendStartTimer);
      setLoading(false);
      setBackendStarting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await performLogin(username, password);
  }

  async function handleQuickLogin(user) {
    await performLogin(user.username, DEMO_PASSWORD);
  }

  return (
    <div className="login-page-wrapper">
      <div className="login-page">
        <div className="login-box">
          <img src={logoDkn} alt="DKN Logo" className="login-logo" />

          <h2>Login to DKN</h2>

          {/* Normal credentials login */}
          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Email / Username
              <input
                type="text"
                placeholder="Your username (e.g. steve, champ1)"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Your password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div className="login-extras">
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember me</label>
              </div>

              <a href="#" style={{ textDecoration: "none", color: "#1e293b" }}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "LOGIN"}
            </button>

            {backendStarting && (
              <div className="backend-starting-msg">
                <span className="spinner" />
                <div>
                  Waking up backend service on Render...
                  <br />
                  This first login can take about 20–60 seconds.
                </div>
              </div>
            )}

            <ErrorMessage message={error} />
          </form>

          {/* Quick demo login for examiner */}
          <div className="demo-login">
            <h3>Quick demo login</h3>
            <p className="demo-hint">
              For the examiner: click one of these to log in as a pre-created role
              (no typing needed).
            </p>

            <div className="demo-buttons">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.key}
                  type="button"
                  className="demo-button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(user)}
                >
                  {user.label}
                </button>
              ))}
            </div>

            <p className="demo-hint">
              All demo accounts use the same password:{" "}
              <code>{DEMO_PASSWORD}</code>, but clicking a button logs you in
              automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
