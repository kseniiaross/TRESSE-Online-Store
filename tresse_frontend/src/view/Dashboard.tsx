// src/view/Dashboard.tsx
// Comments: English (as requested)

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/Dashboard.css";
import api from "../api/axiosInstance";
import type { ProfileFormState, ProfileResponse, ProfileUpdatePayload } from "../types/profile";

import Dashboard1 from "../assets/images/Dashboard1.jpg";
import Dashboard2 from "../assets/images/Dashboard2.jpg";
import Dashboard3 from "../assets/images/Dashboard3.jpg";
import Dashboard4 from "../assets/images/Dashboard4.jpg";
import Dashboard5 from "../assets/images/Dashboard5.jpg";
import Dashboard6 from "../assets/images/Dashboard6.jpg";

const galleryImages = [Dashboard1, Dashboard2, Dashboard3, Dashboard4, Dashboard5, Dashboard6] as const;

// Local storage key: Order page can read it and prefill shipping fields.
const PROFILE_STORAGE_KEY = "tresse_profile_v1";

// axiosInstance baseURL already includes "/api".
const API_PROFILE_URL = "/accounts/profile/";
const API_DELETE_ACCOUNT_URL = "/accounts/delete-account/";

// Runtime type guard for safe JSON parsing.
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readProfileFromStorage(): ProfileFormState | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const get = (k: keyof ProfileFormState) => safeString(parsed[k]);

    return {
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      addressLine1: get("addressLine1"),
      apartment: get("apartment"),
      city: get("city"),
      state: get("state"),
      postalCode: get("postalCode"),
      country: get("country"),
    };
  } catch {
    return null;
  }
}

function writeProfileToStorage(profile: ProfileFormState) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));

  // Broadcast for other pages (e.g., Order) to react without tight coupling.
  window.dispatchEvent(new CustomEvent("tresse:profileUpdated", { detail: profile }));
}

function buildDefaultProfile(): ProfileFormState {
  // Pull user from localStorage (same pattern as in App.tsx).
  let email = "";
  let firstName = "";
  let lastName = "";

  try {
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const parsed: unknown = JSON.parse(userRaw);
      if (isRecord(parsed)) {
        email = safeString(parsed.email);
        firstName = safeString(parsed.first_name);
        lastName = safeString(parsed.last_name);
      }
    }
  } catch {
    // ignore
  }

  return {
    firstName,
    lastName,
    email,
    addressLine1: "",
    apartment: "",
    city: "",
    state: "",
    postalCode: "",
    country: "USA",
  };
}

function mapApiToForm(data: ProfileResponse): ProfileFormState {
  return {
    firstName: safeString(data.first_name),
    lastName: safeString(data.last_name),
    email: safeString(data.email),

    addressLine1: safeString(data.address_line1),
    apartment: safeString(data.apartment),
    city: safeString(data.city),
    state: safeString(data.state),
    postalCode: safeString(data.postal_code),
    country: safeString(data.country) || "USA",
  };
}

function mapFormToApi(form: ProfileFormState): ProfileUpdatePayload {
  const payload: ProfileUpdatePayload = {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    address_line1: form.addressLine1.trim(),
    apartment: form.apartment.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postal_code: form.postalCode.trim(),
    country: form.country.trim(),
  };

  const email = form.email.trim();
  if (email) payload.email = email;

  return payload;
}

function isValidEmail(v: string): boolean {
  const s = v.trim();
  if (!s) return true; // Optional email: empty is allowed.
  return s.includes("@") && s.includes(".");
}

export default function Dashboard() {
  // -------------------------
  // Gallery
  // -------------------------
  const [activeIndex, setActiveIndex] = useState(0);
  const total = galleryImages.length;

  useEffect(() => {
    // Stable interval; cleaned up on unmount.
    const t = window.setInterval(() => {
      setActiveIndex((p) => (p + 1) % total);
    }, 5500);

    return () => window.clearInterval(t);
  }, [total]);

  const activeImage = useMemo(() => galleryImages[activeIndex], [activeIndex]);

  // -------------------------
  // Form state
  // -------------------------
  const [form, setForm] = useState<ProfileFormState>(() => {
    return readProfileFromStorage() ?? buildDefaultProfile();
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  // -------------------------
  // Delete modal (Esc close + restore focus)
  // -------------------------
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleteErr, setDeleteErr] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isDeleteOpen) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDeleteOpen(false);
    };

    document.addEventListener("keydown", onKey);

    // Autofocus the primary action for accessibility.
    window.setTimeout(() => {
      const btn = modalRef.current?.querySelector<HTMLButtonElement>('[data-autofocus="true"]');
      btn?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [isDeleteOpen]);

  // -------------------------
  // Initial sync from backend (non-blocking)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<ProfileResponse>(API_PROFILE_URL);
        if (cancelled || !data) return;

        const fromApi = mapApiToForm(data);

        // Merge: never overwrite user-entered local values.
        setForm((prev) => {
          const merged: ProfileFormState = {
            firstName: prev.firstName || fromApi.firstName,
            lastName: prev.lastName || fromApi.lastName,
            email: prev.email || fromApi.email,

            addressLine1: prev.addressLine1 || fromApi.addressLine1,
            apartment: prev.apartment || fromApi.apartment,
            city: prev.city || fromApi.city,
            state: prev.state || fromApi.state,
            postalCode: prev.postalCode || fromApi.postalCode,
            country: prev.country || fromApi.country || "USA",
          };

          writeProfileToStorage(merged);
          return merged;
        });
      } catch {
        // Silent fail: local data is still usable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------
  // Handlers
  // -------------------------
  const onField =
    (name: keyof ProfileFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaveMsg("");
      setSaveErr("");
      setForm((p) => ({ ...p, [name]: e.target.value }));
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg("");
    setSaveErr("");

    // Persist locally first for fast UX.
    writeProfileToStorage(form);

    if (!isValidEmail(form.email)) {
      setSaveErr("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const payload = mapFormToApi(form);
      await api.put(API_PROFILE_URL, payload);
      setSaveMsg("Saved.");
    } catch {
      setSaveMsg("Saved locally. (Server sync failed.)");
      setSaveErr("Server sync failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSaveMsg("");
    setSaveErr("");

    const fallback = buildDefaultProfile();
    setForm(fallback);
    writeProfileToStorage(fallback);
  };

  const openDeleteModal = () => {
    setDeleteMsg("");
    setDeleteErr("");
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setIsDeleteOpen(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteMsg("");
    setDeleteErr("");

    setDeleting(true);
    try {
      await api.post(API_DELETE_ACCOUNT_URL, { confirm: true });

      setDeleteMsg("Your account deletion request was submitted. Please check your email.");

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      setDeleteErr("Delete failed. Please try again later.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="dashboard">
      {/* Layout container keeps both columns aligned and consistent with other pages */}
      <div className="dashboard__layout">
        {/* LEFT */}
        <div className="dashboard__panel">
          <header className="dashboard__header">
            <h2 className="dashboard__title">Dashboard</h2>
            <p className="dashboard__subtitle">Manage your profile and shipping details.</p>
          </header>

          <form className="dashboard__form" onSubmit={handleSave} noValidate>
            <section className="dashboard__section">
              <h3 className="dashboard__section-title">Account</h3>

              <div className="dashboard__grid">
                <div className="dashboard__field">
                  <label className="dashboard__label" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    className="dashboard__input"
                    value={form.firstName}
                    onChange={onField("firstName")}
                    autoComplete="given-name"
                    placeholder="First name"
                  />
                </div>

                <div className="dashboard__field">
                  <label className="dashboard__label" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    className="dashboard__input"
                    value={form.lastName}
                    onChange={onField("lastName")}
                    autoComplete="family-name"
                    placeholder="Last name"
                  />
                </div>

                <div className="dashboard__field dashboard__field--full">
                  <label className="dashboard__label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="dashboard__input"
                    type="email"
                    value={form.email}
                    onChange={onField("email")}
                    autoComplete="email"
                    placeholder="Email"
                  />
                </div>
              </div>
            </section>

            <section className="dashboard__section">
              <h3 className="dashboard__section-title">Shipping address</h3>

              <div className="dashboard__grid">
                <div className="dashboard__field dashboard__field--full">
                  <label className="dashboard__label" htmlFor="addressLine1">
                    Street address
                  </label>
                  <input
                    id="addressLine1"
                    className="dashboard__input"
                    value={form.addressLine1}
                    onChange={onField("addressLine1")}
                    autoComplete="street-address"
                    placeholder="Street address"
                  />
                </div>

                <div className="dashboard__field dashboard__field--full">
                  <label className="dashboard__label" htmlFor="apartment">
                    Apt / Unit
                  </label>
                  <input
                    id="apartment"
                    className="dashboard__input"
                    value={form.apartment}
                    onChange={onField("apartment")}
                    autoComplete="address-line2"
                    placeholder="Apt / Unit"
                  />
                </div>

                <div className="dashboard__field">
                  <label className="dashboard__label" htmlFor="city">
                    City
                  </label>
                  <input
                    id="city"
                    className="dashboard__input"
                    value={form.city}
                    onChange={onField("city")}
                    autoComplete="address-level2"
                    placeholder="City"
                  />
                </div>

                <div className="dashboard__field">
                  <label className="dashboard__label" htmlFor="state">
                    State
                  </label>
                  <input
                    id="state"
                    className="dashboard__input"
                    value={form.state}
                    onChange={onField("state")}
                    autoComplete="address-level1"
                    placeholder="State"
                  />
                </div>

                <div className="dashboard__field">
                  <label className="dashboard__label" htmlFor="postalCode">
                    ZIP code
                  </label>
                  <input
                    id="postalCode"
                    className="dashboard__input"
                    value={form.postalCode}
                    onChange={onField("postalCode")}
                    autoComplete="postal-code"
                    placeholder="ZIP code"
                  />
                </div>

                <div className="dashboard__field">
                  <label className="dashboard__label" htmlFor="country">
                    Country
                  </label>
                  <input
                    id="country"
                    className="dashboard__input"
                    value={form.country}
                    onChange={onField("country")}
                    autoComplete="country-name"
                    placeholder="Country"
                  />
                </div>
              </div>
            </section>

            {/* Status messages */}
            <div className="dashboard__status" aria-live="polite">
              {saveMsg ? <div className="dashboard__status-ok">{saveMsg}</div> : null}
              {saveErr ? <div className="dashboard__status-err">{saveErr}</div> : null}
            </div>

            {/* Actions: 2x2 on desktop, 1 column on mobile */}
            <div className="dashboard__actions" aria-label="Account actions">
              <button
                className="dashboard__button dashboard__button--primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                className="dashboard__button dashboard__button--secondary"
                type="button"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </button>

              <Link to="/account/change-password" className="dashboard__button dashboard__button--secondary">
                Change password
              </Link>

              <button
                className="dashboard__button dashboard__button--danger"
                type="button"
                onClick={openDeleteModal}
                disabled={saving}
              >
                Delete account
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT */}
        <aside className="dashboard__media" aria-label="Dashboard gallery">
          <div className="dashboard__media-frame">
            <img
              className="dashboard__media-image"
              src={activeImage}
              alt={`Dashboard gallery image ${activeIndex + 1} of ${total}`}
            />

            <div className="dashboard__media-dots" role="tablist" aria-label="Gallery pagination">
              {galleryImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`dashboard__media-dot ${i === activeIndex ? "dashboard__media-dot--active" : ""}`}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  onClick={() => setActiveIndex(i)}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Delete modal */}
      {isDeleteOpen ? (
        <div className="dashboard__modalOverlay" role="presentation" onMouseDown={closeDeleteModal}>
          <div
            className="dashboard__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onMouseDown={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <h3 className="dashboard__modalTitle" id="delete-title">
              Are you sure?
            </h3>

            <p className="dashboard__modalText">
              This action will permanently delete your account. A confirmation email will be sent to you.
            </p>

            <div className="dashboard__modalStatus" aria-live="polite">
              {deleteMsg ? <div className="dashboard__status-ok">{deleteMsg}</div> : null}
              {deleteErr ? <div className="dashboard__status-err">{deleteErr}</div> : null}
            </div>

            <div className="dashboard__modalActions">
              <button
                className="dashboard__button dashboard__button--primary"
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                data-autofocus="true"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>

              <button
                className="dashboard__button dashboard__button--secondary"
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}