// src/components/Authorization.tsx
import { useState } from "react";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { loginUser } from "../api/auth";
import { setCredentials } from "../utils/authSlice";
import { useAppDispatch } from "../utils/hooks";
import { fetchWishlistCount } from "../store/wishListSlice";
import { fetchCart, mergeGuestCart } from "../store/serverCartSlice";
import type { LoginFormData, User } from "../types";
import "../../styles/Authorization.css";
import loginImage from "../assets/images/Login.jpg";

const schema = Yup.object({
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

type LoginResponse = {
  access: string;
  refresh?: string;
  user: unknown;
};

export default function Authorization() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState<string | null>(null);

  const params = new URLSearchParams(location.search);
  const rawNext = params.get("next");
  const nextParam = rawNext ? `?next=${encodeURIComponent(rawNext)}` : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      const response = (await loginUser(data)) as LoginResponse;

      const user = toUserOrNull(response.user);
      if (!user || typeof response.access !== "string" || !response.access.trim()) {
        setServerError("Login failed. Please try again.");
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
    } catch {
      setServerError("Invalid email or password.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <h2>ENJOY THE BEST EXPERIENCE WITH US</h2>
        <p>Sign in to enjoy a personalized experience and get access to all our services.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form" aria-label="Login form">
          <div className="input-group">
            <label htmlFor="login_email">Email</label>
            <input id="login_email" type="email" autoComplete="email" {...register("email")} />

            {errors.email ? (
              <div className="form-message" role="alert" aria-live="polite">
                {errors.email.message}
              </div>
            ) : null}
          </div>

          <div className="input-group">
            <label htmlFor="login_password">Password</label>
            <input id="login_password" type="password" autoComplete="current-password" {...register("password")} />

            {errors.password ? (
              <div className="form-message" role="alert" aria-live="polite">
                {errors.password.message}
              </div>
            ) : null}
          </div>

          <div className="form-actions">
            <button type="submit" className="black-button" disabled={isSubmitting}>
              {isSubmitting ? "LOGGING IN..." : "LOG IN"}
            </button>

            <Link to={`/register${nextParam}`} className="register-link" aria-label="Go to registration">
              REGISTER
            </Link>
          </div>

          {serverError ? (
            <div className="form-message form-message--server" role="status" aria-live="polite">
              {serverError}
            </div>
          ) : null}
        </form>
      </div>

      <div className="login-right">
        <img src={loginImage} alt="Login visual" />
      </div>
    </div>
  );
}