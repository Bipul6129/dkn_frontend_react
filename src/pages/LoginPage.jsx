// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost, apiGet } from "../api/client.js";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import { useAuthStore } from "../store/authStore";
import "../css/LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Log in -> get tokens
      const loginData = await apiPost("/auth/login/", {
        username,
        password,
      });

      const access = loginData.access;
      const refresh = loginData.refresh;

      if (!access || !refresh) {
        throw new Error("Login response did not contain tokens.");
      }

      // Save tokens (Zustand + localStorage)
      setTokens(access, refresh);

      // 2) Fetch profile from the CORRECT endpoint
      const profile = await apiGet("/accounts/profile/");

      // Debug: see what backend actually sends
      console.log("Profile from /accounts/profile/:", profile);

      // Expected shape: { id, username, email, role, region, ... }
      setUser(profile);

      // 3) Go to main app
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      let msg = "Login failed. Please check your credentials.";

      // Try to extract a nicer message if backend returned JSON
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
      setLoading(false);
    }
  }

  return (
    <div className="login-page-wrapper">
    <div className="login-page">
      <div className="login-box">
        <img
          src="src/assets/logo_dkn.png"
          alt="DKN Logo"
          className="login-logo"
        />

        <h2>Login to DKN</h2>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="text"
              placeholder="Your email name"
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

          <ErrorMessage message={error} />
        </form>
      </div>
    </div>
    </div>
  );
}

export default LoginPage;
