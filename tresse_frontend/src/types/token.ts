const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";
const USER_KEY = "user";

/** Access token */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_KEY, token);
}

export function removeAccessToken(): void {
  localStorage.removeItem(ACCESS_KEY);
}

/** Refresh token */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_KEY);
}

/** Simple "am I authenticated?" helper (token exists) */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

/** Clears ONLY tokens (used by axios refresh logic) */
export function clearTokens(): void {
  removeAccessToken();
  removeRefreshToken();

  // cleanup legacy keys if они остались
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
}

/** Clears tokens + user (used by UI logout flow) */
export function clearAuthStorage(): void {
  clearTokens();
  localStorage.removeItem(USER_KEY);
}