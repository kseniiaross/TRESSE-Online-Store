import { isAxiosError } from "axios";
import api from "./axiosInstance";
import type { LoginRequest, RegisterRequest, ResponseData } from "../types/auth";

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;

  const data = error.response?.data;


  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;

    const detail = record.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();

    const firstKey = Object.keys(record)[0];
    const firstVal = firstKey ? record[firstKey] : undefined;
    if (Array.isArray(firstVal) && typeof firstVal[0] === "string" && firstVal[0].trim()) {
      return firstVal[0].trim();
    }
  }

  if (typeof error.message === "string" && error.message.trim()) return error.message.trim();
  return fallback;
}

export async function loginUser(data: LoginRequest): Promise<ResponseData> {
  try {
    const response = await api.post<ResponseData>("/accounts/token/", {
      email: data.email,
      password: data.password,
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Login failed"));
  }
}

export async function registerUser(data: RegisterRequest): Promise<ResponseData> {
  try {
    const response = await api.post<ResponseData>("/accounts/register/", data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Registration failed"));
  }
}

/**
 * Request account restore email (generic response - does not leak existence)
 * Backend: POST /api/accounts/restore/request/
 */
export async function requestAccountRestore(email: string): Promise<{ message: string }> {
  try {
    const response = await api.post<{ message: string }>("/accounts/restore/request/", {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Restore request failed"));
  }
}

/**
 * Confirm account restore (activate + optionally set new password)
 * Backend: POST /api/accounts/restore/confirm/
 */
export async function confirmAccountRestore(params: {
  uidb64: string;
  token: string;
  new_password: string;
}): Promise<{ message: string }> {
  try {
    const response = await api.post<{ message: string }>("/accounts/restore/confirm/", {
      uidb64: params.uidb64,
      token: params.token,
      new_password: params.new_password,
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Restore confirmation failed"));
  }
}