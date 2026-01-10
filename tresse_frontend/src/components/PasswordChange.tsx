import { useState, type FormEvent } from "react";
import api from "../api/axiosInstance";
import "../../styles/PasswordChange.css";

type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

function getErrorMessage(err: unknown): string {
  if (typeof err !== "object" || err === null) return "Something went wrong. Please try again.";

  const maybe = err as {
    response?: { data?: unknown };
    message?: unknown;
  };

  const data = maybe.response?.data;

  // DRF can return {detail:"..."} or field errors {field:["..."]}
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;

    if (typeof d.detail === "string") return d.detail;

    const fieldOrder = ["current_password", "new_password", "confirm_password", "non_field_errors"];
    for (const key of fieldOrder) {
      const v = d[key];
      if (Array.isArray(v) && v.length && typeof v[0] === "string") return v[0];
      if (typeof v === "string") return v;
    }
  }

  if (typeof maybe.message === "string") return maybe.message;

  return "Could not change password. Please try again.";
}

export default function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const payload: ChangePasswordPayload = {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    };

    try {
      setSubmitting(true);
      await api.post("/accounts/change-password/", payload);

      setSuccessMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pw-page">
      <div className="pw-shell">
        <header className="pw-header">
          <h2 className="pw-title">Change Password</h2>
          <p className="pw-subtitle">Update your password to keep your account secure.</p>
        </header>

        {error && (
          <div className="pw-alert pw-alert--error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="pw-alert pw-alert--success" role="status" aria-live="polite">
            {successMessage}
          </div>
        )}

        <form className="pw-form" onSubmit={handleSubmit} noValidate>
          <div className="pw-field">
            <label className="pw-label" htmlFor="current_password">
              Current Password
            </label>
            <input
              id="current_password"
              className="pw-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
              placeholder="Enter current password"
            />
          </div>

          <div className="pw-field">
            <label className="pw-label" htmlFor="new_password">
              New Password
            </label>
            <input
              id="new_password"
              className="pw-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={submitting}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="pw-field">
            <label className="pw-label" htmlFor="confirm_password">
              Confirm New Password
            </label>
            <input
              id="confirm_password"
              className="pw-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={submitting}
              placeholder="Repeat new password"
            />
          </div>

          <button className="pw-button pw-button--primary" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Change Password"}
          </button>
        </form>
      </div>
    </section>
  );
}