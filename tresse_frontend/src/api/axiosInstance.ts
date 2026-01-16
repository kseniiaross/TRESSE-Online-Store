// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
} from "../utils/token";

const rawEnv =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

// ✅ IMPORTANT: remove spaces + trailing slashes
const normalized = String(rawEnv).trim().replace(/\/+$/, "");

// ✅ avoid double "/api"
const baseURL = normalized.endsWith("/api") ? normalized : `${normalized}/api`;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: false,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const NO_AUTH = [
  "/token/",
  "/token/refresh/",
  "/accounts/login/",
  "/accounts/register/",
  "/accounts/restore/request/",
  "/accounts/restore/confirm/",
];

let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (cb: (() => void) | null) => {
  onUnauthorized = cb;
};

axiosInstance.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status;
    const url = String(err?.config?.url || "");

    if (status === 401 && !NO_AUTH.some((p) => url.startsWith(p))) {
      onUnauthorized?.();
    }

    return Promise.reject(err);
  }
);

export const getMediaRoot = () => {
  const b = String(axiosInstance.defaults.baseURL || "").replace(/\/$/, "");
  return b.endsWith("/api") ? b.slice(0, -4) : b;
};

export default axiosInstance;