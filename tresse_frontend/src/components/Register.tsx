// src/components/Register.tsx
import { useState } from "react";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import type { RegisterFormData, User } from "../types";
import { registerUser } from "../api/auth";
import { setCredentials } from "../utils/authSlice";
import { useAppDispatch } from "../utils/hooks";

import { fetchWishlistCount } from "../store/wishListSlice";
import { fetchCart, mergeGuestCart } from "../store/serverCartSlice";

import "../../styles/Register.css";
import registerImage from "../assets/images/Register.jpg";

const schema = Yup.object({
  first_name: Yup.string().required("First name is required"),
  last_name: Yup.string().required("Last name is required"),
  phone_number: Yup.string().required("Phone number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().required("Password is required"),
});

function isSafePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toUserOrNull(v: unknown): User | null {
  if (!isRecord(v)) return null;

  const id = v.id;
  const email = v.email;

  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) return null;
  if (typeof email !== "string" || !email.includes("@")) return null;

  const first_name = typeof v.first_name === "string" ? v.first_name : "";
  const last_name = typeof v.last_name === "string" ? v.last_name : "";

  return {
    id,
    email: email.trim().toLowerCase(),
    first_name,
    last_name,
  };
}

type RegisterResponse = {
  access: string;
  refresh?: string;
  user?: unknown;
};

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState<string | null>(null);

  const params = new URLSearchParams(location.search);
  const rawNext = params.get("next");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const response = (await registerUser(data)) as RegisterResponse;

      // If backend didn't return user — redirect to login
      if (!response.user) {
        const next = isSafePath(rawNext) ? rawNext : "/dashboard";
        navigate(`/authorization?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      const user = toUserOrNull(response.user);
      if (!user || typeof response.access !== "string" || !response.access.trim()) {
        setServerError("Registration failed. Please try again.");
        return;
      }

      if (typeof response.refresh === "string" && response.refresh.trim()) {
        localStorage.setItem("refresh", response.refresh.trim());
      }

      dispatch(setCredentials({ token: response.access.trim(), user }));

      await dispatch(mergeGuestCart()).unwrap();
      await dispatch(fetchCart()).unwrap();
      dispatch(fetchWishlistCount());

      const next = isSafePath(rawNext) ? rawNext : "/";
      navigate(next, { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 400) setServerError("Please check the form fields and try again.");
        else setServerError("Registration failed. Please try again.");
      } else {
        setServerError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="register-container">
      <div className="register-left">
        <h2>CREATE YOUR ACCOUNT</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="register-form" aria-label="Registration form">
          <div className="input-group">
            <label htmlFor="first_name">First Name</label>
            <input id="first_name" autoComplete="given-name" {...register("first_name")} autoFocus />
            {errors.first_name ? (
              <span role="alert" aria-live="polite">
                {errors.first_name.message}
              </span>
            ) : null}
          </div>

          <div className="input-group">
            <label htmlFor="last_name">Last Name</label>
            <input id="last_name" autoComplete="family-name" {...register("last_name")} />
            {errors.last_name ? (
              <span role="alert" aria-live="polite">
                {errors.last_name.message}
              </span>
            ) : null}
          </div>

          <div className="input-group">
            <label htmlFor="phone_number">Phone Number</label>
            <input id="phone_number" type="text" autoComplete="tel" {...register("phone_number")} />
            {errors.phone_number ? (
              <span role="alert" aria-live="polite">
                {errors.phone_number.message}
              </span>
            ) : null}
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? (
              <span role="alert" aria-live="polite">
                {errors.email.message}
              </span>
            ) : null}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <span role="alert" aria-live="polite">
                {errors.password.message}
              </span>
            ) : null}
          </div>

          <button type="submit" className="black-button" disabled={isSubmitting}>
            {isSubmitting ? "CREATING..." : "REGISTER"}
          </button>

          {serverError ? <div className="server-error">{serverError}</div> : null}
        </form>
      </div>

      <div className="register-right">
        <img src={registerImage} alt="Register visual" />
      </div>
    </div>
  );
}