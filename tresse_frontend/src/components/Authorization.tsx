import { useState } from "react";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { LoginFormData } from "../types/auth";
import { loginUser } from "../api/auth";
import { setCredentials } from "../utils/authSlice";
import { useAppDispatch } from "../utils/hooks";
import { fetchWishlistCount } from "../store/wishListSlice";
import { fetchCart, mergeGuestCart } from "../store/serverCartSlice";
import type { User } from "../types/user";
import "../../styles/Authorization.css";
import loginImage from "../assets/images/Login.jpg";


const schema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().required("Password is required"),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}


function isSafePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
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
  access: unknown;
  refresh?: unknown;
  user: unknown;
};

function isLoginResponse(v: unknown): v is LoginResponse {
  if (!isRecord(v)) return false;
  return "access" in v && "user" in v;
}

function toNonEmptyStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export default function Authorization() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState<string | null>(null);

  // Preserve `next` so user can return to the page that required auth.
  const params = new URLSearchParams(location.search);
  const rawNext = params.get("next");
  const safeNext = isSafePath(rawNext) ? rawNext : null;
  const nextParam = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    mode: "onSubmit",
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      const apiResult = await loginUser(data);

      // No unsafe casting: validate runtime shape.
      if (!isLoginResponse(apiResult)) {
        setServerError("Login failed. Please try again.");
        return;
      }

      const access = toNonEmptyStringOrNull(apiResult.access);
      const refresh = toNonEmptyStringOrNull(apiResult.refresh);
      const user = toUserOrNull(apiResult.user);

      if (!access || !user) {
        setServerError("Login failed. Please try again.");
        return;
      }

      if (refresh) localStorage.setItem("refresh", refresh);

      dispatch(setCredentials({ token: access, user }));

      // Immediately merge guest cart into user cart after auth.
      await dispatch(mergeGuestCart()).unwrap();
      await dispatch(fetchCart()).unwrap();
      dispatch(fetchWishlistCount());

      navigate(safeNext ?? "/", { replace: true });
    } catch {
      // Avoid leaking details; keep consistent message for security.
      setServerError("Invalid email or password.");
    }
  };

  // WCAG: connect inputs to error text.
  const emailErrorId = errors.email ? "login_email_error" : undefined;
  const passwordErrorId = errors.password ? "login_password_error" : undefined;

  return (
    <section className="auth-page" aria-label="Authorization">
      <div className="auth">
        <div className="auth__left">
          <h2 className="auth__title">ENJOY THE BEST EXPERIENCE WITH US</h2>
          <p className="auth__subtitle">
            Sign in to enjoy a personalized experience and get access to all our services.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="auth__form"
            aria-label="Login form"
            noValidate
          >
            <div className="auth__field">
              <label className="auth__label" htmlFor="login_email">
                Email
              </label>
              <input
                className="auth__input"
                id="login_email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={emailErrorId}
                {...register("email")}
              />

              {errors.email ? (
                <div
                  className="auth__message auth__message--error"
                  id="login_email_error"
                  role="alert"
                  aria-live="polite"
                >
                  {errors.email.message}
                </div>
              ) : null}
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="login_password">
                Password
              </label>
              <input
                className="auth__input"
                id="login_password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={passwordErrorId}
                {...register("password")}
              />

              {errors.password ? (
                <div
                  className="auth__message auth__message--error"
                  id="login_password_error"
                  role="alert"
                  aria-live="polite"
                >
                  {errors.password.message}
                </div>
              ) : null}
            </div>

            <div className="auth__actions" aria-label="Authentication actions">
              <button type="submit" className="auth__cta auth__cta--primary" disabled={isSubmitting}>
                {isSubmitting ? "LOGGING IN..." : "LOG IN"}
              </button>

              <Link
                to={`/register${nextParam}`}
                className="auth__cta auth__cta--secondary"
                aria-label="Go to registration"
              >
                REGISTER
              </Link>
            </div>

            {serverError ? (
              <div className="auth__message auth__message--server" role="status" aria-live="polite">
                {serverError}
              </div>
            ) : null}
          </form>
        </div>

        <div className="auth__right" aria-hidden="true">
          <img className="auth__image" src={loginImage} alt="" />
        </div>
      </div>
    </section>
  );
}