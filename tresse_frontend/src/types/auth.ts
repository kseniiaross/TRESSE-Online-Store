import type { User } from "./user";

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface ResponseData {
  access: string;
  refresh: string;
  user: User;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
}