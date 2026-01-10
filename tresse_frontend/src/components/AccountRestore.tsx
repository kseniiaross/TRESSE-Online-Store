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

const schema = Yup.object({
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

export default function AccountRestore() {
  const navigate = useNavigate();
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const missingParams = useMemo(() => !uidb64 || !token, [uidb64, token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setSuccessMsg(null);

    if (!uidb64 || !token) {
      setServerError("Invalid or expired restore link.");
      return;
    }

    try {
      const resp = await confirmAccountRestore({
        uidb64,
        token,
        new_password: data.password,
      });

      setSuccessMsg(resp.message || "Account restored successfully.");

      // после восстановления: отправляем на login-choice, чтобы пользователь вошёл
      // (и дальше вернулся куда нужно через next, если ты позже это добавишь)
      window.setTimeout(() => {
        navigate("/login-choice?next=%2Fdashboard", { replace: true });
      }, 600);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setServerError(msg);
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
          <section className="accountRestore__section" aria-labelledby="invalidLink">
            <h2 id="invalidLink" className="accountRestore__h2">
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

            <form onSubmit={handleSubmit(onSubmit)} className="accountRestore__form" aria-label="Account restore form">
              <div className="accountRestore__field">
                <label htmlFor="password" className="accountRestore__label">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="accountRestore__input"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="accountRestore__error" role="alert" aria-live="polite">
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
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword ? (
                  <p className="accountRestore__error" role="alert" aria-live="polite">
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
                <p className="accountRestore__success" aria-live="polite">
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