// src/components/Register.tsx
import { useState } from "react";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import type { RegisterFormData } from "../types/auth";
import type { User } from "../types/user";
import { registerUser } from "../api/auth";
import { setCredentials } from "../utils/authSlice";
import { useAppDispatch } from "../utils/hooks";
import { fetchWishlistCount } from "../store/wishListSlice";
import { fetchCart, mergeGuestCart } from "../store/serverCartSlice";

import "../../styles/Register.css";
import registerImage from "../assets/images/Register.jpg";

/**
 * Keep validation close to the UI:
 * it's easier to iterate on rules and error copy per screen.
 */
const schema = Yup.object({
  first_name: Yup.string().required("First name is required"),
  last_name: Yup.string().required("Last name is required"),
  phone_number: Yup.string().required("Phone number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().required("Password is required"),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSafePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

function toNonEmptyStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Runtime validation for API payloads.
 * We never trust network data blindly — keeps auth state resilient.
 */
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
  access: unknown;
  refresh?: unknown;
  user?: unknown;
};

function isRegisterResponse(v: unknown): v is RegisterResponse {
  if (!isRecord(v)) return false;
  return "access" in v;
}

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState<string | null>(null);

  const params = new URLSearchParams(location.search);
  const rawNext = params.get("next");
  const safeNext = isSafePath(rawNext) ? rawNext : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    mode: "onSubmit",
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const apiResult = await registerUser(data);

      if (!isRegisterResponse(apiResult)) {
        setServerError("Registration failed. Please try again.");
        return;
      }

      const access = toNonEmptyStringOrNull(apiResult.access);
      const refresh = toNonEmptyStringOrNull(apiResult.refresh);
      const user = toUserOrNull(apiResult.user);

      // If backend didn't return user — redirect to login (keeps flow predictable).
      if (!user) {
        const next = safeNext ?? "/dashboard";
        navigate(`/authorization?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      if (!access) {
        setServerError("Registration failed. Please try again.");
        return;
      }

      if (refresh) localStorage.setItem("refresh", refresh);

      dispatch(setCredentials({ token: access, user }));

      // Keep cart + wishlist in sync immediately after registration
      await dispatch(mergeGuestCart()).unwrap();
      await dispatch(fetchCart()).unwrap();
      dispatch(fetchWishlistCount());

      navigate(safeNext ?? "/", { replace: true });
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

  const ids = {
    firstName: errors.first_name ? "reg_first_name_error" : undefined,
    lastName: errors.last_name ? "reg_last_name_error" : undefined,
    phone: errors.phone_number ? "reg_phone_error" : undefined,
    email: errors.email ? "reg_email_error" : undefined,
    password: errors.password ? "reg_password_error" : undefined,
  };

  return (
    <section className="auth-page" aria-label="Registration">
      <div className="auth">
        <div className="auth__left">
          <h2 className="auth__title">CREATE YOUR ACCOUNT</h2>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="register-form"
            aria-label="Registration form"
            noValidate
          >
            <div className="input-group">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                autoComplete="given-name"
                autoFocus
                aria-invalid={errors.first_name ? "true" : "false"}
                aria-describedby={ids.firstName}
                {...register("first_name")}
              />
              {errors.first_name ? (
                <span id="reg_first_name_error" role="alert" aria-live="polite">
                  {errors.first_name.message}
                </span>
              ) : null}
            </div>

            <div className="input-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                autoComplete="family-name"
                aria-invalid={errors.last_name ? "true" : "false"}
                aria-describedby={ids.lastName}
                {...register("last_name")}
              />
              {errors.last_name ? (
                <span id="reg_last_name_error" role="alert" aria-live="polite">
                  {errors.last_name.message}
                </span>
              ) : null}
            </div>

            <div className="input-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                id="phone_number"
                type="text"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={errors.phone_number ? "true" : "false"}
                aria-describedby={ids.phone}
                {...register("phone_number")}
              />
              {errors.phone_number ? (
                <span id="reg_phone_error" role="alert" aria-live="polite">
                  {errors.phone_number.message}
                </span>
              ) : null}
            </div>

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={ids.email}
                {...register("email")}
              />
              {errors.email ? (
                <span id="reg_email_error" role="alert" aria-live="polite">
                  {errors.email.message}
                </span>
              ) : null}
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={ids.password}
                {...register("password")}
              />
              {errors.password ? (
                <span id="reg_password_error" role="alert" aria-live="polite">
                  {errors.password.message}
                </span>
              ) : null}
            </div>

            <button type="submit" className="auth__cta auth__cta--primary" disabled={isSubmitting}>
              {isSubmitting ? "CREATING..." : "REGISTER"}
            </button>

            {serverError ? (
              <div className="server-error" role="status" aria-live="polite">
                {serverError}
              </div>
            ) : null}
          </form>
        </div>

        {/* Decorative image. Keep it out of the accessibility tree to reduce noise. */}
        <div className="auth__right" aria-hidden="true">
          <img className="auth__image" src={registerImage} alt="" />
        </div>
      </div>
    </section>
  );
}