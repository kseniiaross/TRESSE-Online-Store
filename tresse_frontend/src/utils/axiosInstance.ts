// src/api/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from "../utils/token";

const rawEnv =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:8000";

const normalized = String(rawEnv).replace(/\/$/, "");
const baseURL = normalized.endsWith("/api") ? normalized : `${normalized}/api`;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: false,
});

const NO_AUTH = [
  "/accounts/token/",
  "/accounts/token/refresh/",
  "/accounts/login/",
  "/accounts/register/",
];

let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (cb: (() => void) | null) => {
  onUnauthorized = cb;
};

function isNoAuthRequest(config: InternalAxiosRequestConfig): boolean {
  const url = String(config.url || "");
  // config.url может быть "/accounts/token/" или абсолютный url
  return NO_AUTH.some((p) => url.startsWith(p) || url.includes(p));
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // ✅ ВАЖНО: не добавляем Authorization на auth endpoints
  if (isNoAuthRequest(config)) return config;

  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RefreshResponse = { access: string };

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function enqueueRefresh(cb: (token: string | null) => void) {
  refreshQueue.push(cb);
}

function resolveQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");

  // ✅ чистый axios без interceptor’ов
  const resp = await axios.post<RefreshResponse>(`${baseURL}/accounts/token/refresh/`, { refresh });
  const access = resp.data?.access;

  if (!access) throw new Error("No access token in refresh response");

  setAccessToken(access);
  return access;
}

axiosInstance.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    const url = String(originalRequest?.url || "");
    const isNoAuthRoute = NO_AUTH.some((p) => url.startsWith(p) || url.includes(p));

    if (status !== 401 || !originalRequest || isNoAuthRoute) {
      return Promise.reject(error);
    }

    const anyReq = originalRequest as unknown as { _retry?: boolean };
    if (anyReq._retry) {
      clearTokens();
      onUnauthorized?.();
      return Promise.reject(error);
    }
    anyReq._retry = true;

    try {
      if (isRefreshing) {
        return await new Promise((resolve, reject) => {
          enqueueRefresh((token) => {
            if (!token) {
              clearTokens();
              onUnauthorized?.();
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      isRefreshing = true;

      const newAccess = await refreshAccessToken();
      resolveQueue(newAccess);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      return axiosInstance(originalRequest);
    } catch {
      resolveQueue(null);
      clearTokens();
      onUnauthorized?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export const getMediaRoot = () => {
  const b = String(axiosInstance.defaults.baseURL || "").replace(/\/$/, "");
  return b.endsWith("/api") ? b.slice(0, -4) : b;
};

export default axiosInstance;