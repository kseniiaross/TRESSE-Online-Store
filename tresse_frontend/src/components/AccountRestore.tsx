// src/view/AccountRestore.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as Yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { confirmAccountRestore } from "../api/auth";
import "../../styles/AccountRestore.css";

type FormData = {
  password: string;
  confirmPassword: string;
};

// Typed schema: prevents TS/Yup mismatch and makes validation predictable.
const schema: Yup.ObjectSchema<FormData> = Yup.object({
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password") as unknown as string], "Passwords do not match")
    .required("Please confirm your password"),
}).required();

/**
 * Extracts a user-friendly message from unknown API errors.
 * - Works with Fetch/Axios-like error shapes without importing Axios types.
 * - Prevents showing "[object Object]" or generic "Something went wrong".
 */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;

  if (typeof e === "object" && e !== null) {
    const maybe = e as Record<string, unknown>;

    // Common REST error shapes: { detail }, { message }, { error }, { errors: [...] }
    const detail = maybe["detail"];
    if (typeof detail === "string" && detail.trim()) return detail;

    const message = maybe["message"];
    if (typeof message === "string" && message.trim()) return message;

    const error = maybe["error"];
    if (typeof error === "string" && error.trim()) return error;

    // Axios-like: error.response.data.message / error.response.data.detail
    const response = maybe["response"];
    if (typeof response === "object" && response !== null) {
      const r = response as Record<string, unknown>;
      const data = r["data"];
      if (typeof data === "object" && data !== null) {
        const d = data as Record<string, unknown>;
        const dm = d["message"];
        if (typeof dm === "string" && dm.trim()) return dm;
        const dd = d["detail"];
        if (typeof dd === "string" && dd.trim()) return dd;
      }
    }
  }

  return "Something went wrong. Please try again.";
}

export default function AccountRestore() {
  const navigate = useNavigate();
  const { uidb64, token } = useParams<{ uidb64?: string; token?: string }>();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Derived state: avoids duplicated checks and keeps render logic clean.
  const missingParams = useMemo(() => !uidb64 || !token, [uidb64, token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setSuccessMsg(null);

    // Guard clause: prevents pointless API calls and improves UX.
    if (!uidb64 || !token) {
      setServerError("Invalid or expired restore link.");
      return;
    }

    try {
      // Single responsibility: UI triggers a single API call with strict payload shape.
      const resp = await confirmAccountRestore({
        uidb64,
        token,
        new_password: data.password,
      });

      setSuccessMsg(resp?.message || "Account restored successfully.");

      window.setTimeout(() => {
        navigate("/login-choice?next=%2Fdashboard", { replace: true });
      }, 600);
    } catch (e: unknown) {
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <section className="accountRestore" aria-labelledby="accountRestoreTitle">
      <div className="accountRestore__content">
        <header className="accountRestore__header">
          <h1 id="accountRestoreTitle" className="accountRestore__title">
            Account Reactivation
          </h1>
          <p className="accountRestore__text">
            Set a new password to restore access to your TRESSE account.
          </p>
        </header>

        {missingParams ? (
          <section className="accountRestore__section" aria-labelledby="invalidLinkTitle">
            <h2 id="invalidLinkTitle" className="accountRestore__h2">
              Link issue
            </h2>
            <p className="accountRestore__text">This restore link is invalid or incomplete.</p>
            <p className="accountRestore__text">
              Go to{" "}
              <Link className="accountRestore__link" to="/login-choice">
                Login
              </Link>{" "}
              or{" "}
              <Link className="accountRestore__link" to="/help">
                Help
              </Link>
              .
            </p>
          </section>
        ) : (
          <section className="accountRestore__section" aria-labelledby="restoreFormTitle">
            <h2 id="restoreFormTitle" className="accountRestore__h2">
              New password
            </h2>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="accountRestore__form"
              aria-label="Account restore form"
              noValidate
            >
              <div className="accountRestore__field">
                <label htmlFor="password" className="accountRestore__label">
                  New Password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="accountRestore__input"
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "passwordError" : undefined}
                  autoFocus
                  {...register("password")}
                />

                {errors.password ? (
                  <p id="passwordError" className="accountRestore__error" role="alert" aria-live="polite">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="accountRestore__field">
                <label htmlFor="confirmPassword" className="accountRestore__label">
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="accountRestore__input"
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={errors.confirmPassword ? "confirmPasswordError" : undefined}
                  {...register("confirmPassword")}
                />

                {errors.confirmPassword ? (
                  <p
                    id="confirmPasswordError"
                    className="accountRestore__error"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="accountRestore__actions">
                <button type="submit" className="black-button" disabled={isSubmitting}>
                  {isSubmitting ? "RESTORING..." : "RESTORE ACCOUNT"}
                </button>
              </div>

              {serverError ? (
                <p className="accountRestore__error" role="alert" aria-live="polite">
                  {serverError}
                </p>
              ) : null}

              {successMsg ? (
                <p className="accountRestore__success" role="status" aria-live="polite">
                  {successMsg}
                </p>
              ) : null}

              <p className="accountRestore__text" style={{ marginTop: 18 }}>
                Need help?{" "}
                <Link className="accountRestore__link" to="/help">
                  Contact support
                </Link>
                .
              </p>
            </form>
          </section>
        )}
      </div>
    </section>
  );
}