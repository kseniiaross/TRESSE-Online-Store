// src/api/axiosInstance.ts
import axios from "axios";
import { getAccessToken } from "../utils/token";

// Единственный источник правды:
// VITE_API_URL должен быть вида:
// - http://127.0.0.1:8000/api   (локально)
// - https://<railway-domain>/api (прод)
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // В проде это спасает от тихого падения на localhost
  throw new Error(
    "VITE_API_URL is missing. Set it in Vercel Environment Variables (Production/Preview/Development)."
  );
}

const normalized = String(API_URL).replace(/\/$/, "");
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