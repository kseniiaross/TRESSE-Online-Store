import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axiosInstance";

type ResetConfirmPayload = {
  uidb64: string;
  token: string;
  new_password: string;
  confirm_password: string;
};

export default function PasswordResetConfirm() {
  const navigate = useNavigate();
  const params = useParams<{ uidb64?: string; token?: string }>();

  const uidb64 = useMemo(() => (params.uidb64 ?? "").trim(), [params.uidb64]);
  const token = useMemo(() => (params.token ?? "").trim(), [params.token]);

  const missingLink = !uidb64 || !token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    if (missingLink) {
      setError("Invalid or missing reset link. Please request a new password reset email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const payload: ResetConfirmPayload = {
      uidb64,
      token,
      new_password: password,
      confirm_password: confirmPassword,
    };

    try {
      setSubmitting(true);

      await api.post("/accounts/reset-password/confirm/", payload);

      setSuccessMessage("Password has been reset successfully. Redirecting to login…");
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => navigate("/login"), 900);
    } catch {
      setError("Could not reset password. The link may be invalid or expired. Please request a new reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Reset Password</h2>

      {missingLink && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          Invalid or missing reset link. Please request a new password reset email.
        </div>
      )}

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{ color: "green", marginBottom: 12 }} role="status" aria-live="polite">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={submitting || missingLink}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={submitting || missingLink}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <button type="submit" disabled={submitting || missingLink} style={{ padding: "10px 14px" }}>
          {submitting ? "Saving…" : "Change Password"}
        </button>
      </form>
    </div>
  );
}