// src/utils/authSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../types/types";

type AuthState = {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
};

const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";
const USER_KEY = "user";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeUser(input: unknown): User | null {
  if (!isRecord(input)) return null;

  const id = input.id;
  const email = input.email;

  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) return null;
  if (typeof email !== "string" || !email.includes("@")) return null;

  const first =
    typeof input.first_name === "string"
      ? input.first_name
      : typeof input.firstName === "string"
        ? input.firstName
        : "";

  const last =
    typeof input.last_name === "string"
      ? input.last_name
      : typeof input.lastName === "string"
        ? input.lastName
        : "";

  return {
    id,
    email: email.trim().toLowerCase(),
    first_name: first,
    last_name: last,
  };
}

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

const initialToken = localStorage.getItem(ACCESS_KEY);
const initialUser = readStoredUser();

const initialState: AuthState = {
  token: initialToken,
  user: initialUser,
  isLoggedIn: Boolean(initialToken && initialUser),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token: string; user: User; refresh?: string }>) => {
      const { token, user, refresh } = action.payload;

      const safeUser = normalizeUser(user);
      if (!safeUser || !token) {
        state.token = null;
        state.user = null;
        state.isLoggedIn = false;

        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        return;
      }

      state.token = token;
      state.user = safeUser;
      state.isLoggedIn = true;

      localStorage.setItem(ACCESS_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser));

      if (typeof refresh === "string" && refresh) {
        localStorage.setItem(REFRESH_KEY, refresh);
      }

      // cleanup legacy keys
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isLoggedIn = false;

      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);

      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;