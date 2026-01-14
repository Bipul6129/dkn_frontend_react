// src/api/client.js
import { useAuthStore } from "../store/authStore";

export const API_BASE = "http://localhost:8000/api";

function getAccessToken() {
  const state = useAuthStore.getState();
  return state.accessToken;
}

function getRefreshToken() {
  const state = useAuthStore.getState();
  return state.refreshToken;
}

// ---- refresh access token ----
async function refreshAccessToken() {
  const refresh = getRefreshToken();
  const { setTokens, clearAuth } = useAuthStore.getState();

  if (!refresh) {
    clearAuth();
    throw new Error("No refresh token available");
  }

  const res = await fetch(`${API_BASE}/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearAuth();
    throw new Error(`Refresh token invalid (status ${res.status})`);
  }

  const data = await res.json();
  const newAccess = data.access;

  if (!newAccess) {
    clearAuth();
    throw new Error("No new access token in refresh response");
  }

  // keep same refresh token
  setTokens(newAccess, refresh);
  return newAccess;
}

// ---- core fetch with auth + 401 -> refresh -> retry ----
async function authorizedFetch(path, options = {}) {
  const makeRequest = async () => {
    const token = getAccessToken();

    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  };

  // first attempt
  let res = await makeRequest();

  if (res.status === 401) {
    // try refresh once
    try {
      await refreshAccessToken();
    } catch (err) {
      throw err;
    }

    res = await makeRequest();
  }

  return res;
}

// ---- JSON helpers ----

export async function apiGet(path, options = {}) {
  const res = await authorizedFetch(path, {
    method: "GET",
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API error: ${res.status}`);
  }

  return await res.json();
}

export async function apiPost(path, body, options = {}) {
  const res = await authorizedFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API error: ${res.status}`);
  }

  return await res.json();
}

// ---- FormData helper for file uploads ----

export async function apiPostForm(url, formData) {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(API_BASE + url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("apiPostForm error", res.status, text);
    throw new Error("Request failed with status " + res.status);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiDelete(path, options = {}) {
  const res = await authorizedFetch(path, {
    method: "DELETE",
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }

  // Most DELETEs return 204 or empty body, so just return nothing
  return;
}
