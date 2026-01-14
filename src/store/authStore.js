// src/store/authStore.js
import { create } from "zustand";

const initialAccess = localStorage.getItem("access_token");
const initialRefresh = localStorage.getItem("refresh_token");
const initialUserJson = localStorage.getItem("user");
let initialUser = null;

if (initialUserJson) {
  try {
    initialUser = JSON.parse(initialUserJson);
  } catch {
    initialUser = null;
  }
}

export const useAuthStore = create((set) => ({
  accessToken: initialAccess,
  refreshToken: initialRefresh,
  user: initialUser, // { id, username, email, role, region, ... }
  isAuthenticated: !!initialAccess,

  setTokens: (access, refresh) => {
    if (access) {
      localStorage.setItem("access_token", access);
    } else {
      localStorage.removeItem("access_token");
    }

    if (refresh) {
      localStorage.setItem("refresh_token", refresh);
    } else {
      localStorage.removeItem("refresh_token");
    }

    set({
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: !!access,
    });
  },

  clearAuth: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    set({ user });
  },
}));
