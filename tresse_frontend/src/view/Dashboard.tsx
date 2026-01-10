// src/view/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/Dashboard.css";

import api from "../api/axiosInstance";

import Dashboard1 from "../assets/images/Dashboard1.jpg";
import Dashboard2 from "../assets/images/Dashboard2.jpg";
import Dashboard3 from "../assets/images/Dashboard3.jpg";
import Dashboard4 from "../assets/images/Dashboard4.jpg";
import Dashboard5 from "../assets/images/Dashboard5.jpg";
import Dashboard6 from "../assets/images/Dashboard6.jpg";

const galleryImages = [Dashboard1, Dashboard2, Dashboard3, Dashboard4, Dashboard5, Dashboard6];

// ✅ localStorage key: Order сможет читать это и автозаполнять
const PROFILE_STORAGE_KEY = "tresse_profile_v1";

// ✅ baseURL у axiosInstance уже содержит /api
const API_PROFILE_URL = "/accounts/profile/";
const API_DELETE_ACCOUNT_URL = "/accounts/delete-account/";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;

  addressLine1: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ProfileResponse = {
  email?: string;

  first_name?: string;
  last_name?: string;

  address_line1?: string;
  apartment?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

type ProfileUpdatePayload = {
  email?: string;

  first_name: string;
  last_name: string;

  address_line1: string;
  apartment: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

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
  window.dispatchEvent(new CustomEvent("tresse:profileUpdated", { detail: profile }));
}

function buildDefaultProfile(): ProfileFormState {
  // подтянем user из localStorage (как у тебя в App.tsx)
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
  if (!s) return true; // email необязателен — если пустой, ок
  return s.includes("@") && s.includes(".");
}

export default function Dashboard() {
  // -------------------------
  // Gallery
  // -------------------------
  const [activeIndex, setActiveIndex] = useState(0);
  const total = galleryImages.length;

  useEffect(() => {
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
  const [saveMsg, setSaveMsg] = useState<string>("");
  const [saveErr, setSaveErr] = useState<string>("");

  // -------------------------
  // Delete modal
  // -------------------------
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string>("");
  const [deleteErr, setDeleteErr] = useState<string>("");

  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!deleteOpen) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteOpen(false);
    };

    document.addEventListener("keydown", onKey);

    window.setTimeout(() => {
      const btn = modalRef.current?.querySelector<HTMLButtonElement>('[data-autofocus="true"]');
      btn?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [deleteOpen]);

  // -------------------------
  // ✅ Initial sync from backend (non-blocking)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get<ProfileResponse>(API_PROFILE_URL);
        if (cancelled || !data) return;

        const fromApi = mapApiToForm(data);

        // не затираем то, что уже есть локально (если пользователь уже вводил)
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

          // ✅ обновим localStorage (чтобы Order сразу видел)
          writeProfileToStorage(merged);
          return merged;
        });
      } catch {
        // тихо игнорим: локальные данные всё равно есть
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

    // ✅ локально сохраняем всегда — чтобы Order мог сразу использовать
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
    } catch (err: unknown) {
      // локально уже сохранили — UX не ломаем
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
    setDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteOpen(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteMsg("");
    setDeleteErr("");

    setDeleting(true);
    try {
      await api.post(API_DELETE_ACCOUNT_URL, { confirm: true });

      setDeleteMsg("Your account deletion request was submitted. Please check your email.");

      // ✅ очищаем локальное (и профиль тоже)
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
    <section className="dashboard-page">
      <div className="dashboard-layout">
        {/* LEFT */}
        <div className="dashboard-panel">
          <header className="dashboard-header">
            <h2 className="dashboard-title">Dashboard</h2>
            <p className="dashboard-subtitle">Manage your profile and shipping details.</p>
          </header>

          <form className="dashboard-form" onSubmit={handleSave} noValidate>
            <section className="dashboard-section">
              <h3 className="dashboard-section-title">Account</h3>

              <div className="dashboard-grid">
                <div className="dashboard-field">
                  <label className="dashboard-label" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    className="dashboard-input"
                    value={form.firstName}
                    onChange={onField("firstName")}
                    autoComplete="given-name"
                    placeholder="First name"
                  />
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-label" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    className="dashboard-input"
                    value={form.lastName}
                    onChange={onField("lastName")}
                    autoComplete="family-name"
                    placeholder="Last name"
                  />
                </div>

                <div className="dashboard-field dashboard-field--full">
                  <label className="dashboard-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="dashboard-input"
                    type="email"
                    value={form.email}
                    onChange={onField("email")}
                    autoComplete="email"
                    placeholder="Email"
                  />
                </div>
              </div>
            </section>

            <section className="dashboard-section">
              <h3 className="dashboard-section-title">Shipping address</h3>

              <div className="dashboard-grid">
                <div className="dashboard-field dashboard-field--full">
                  <label className="dashboard-label" htmlFor="addressLine1">
                    Street address
                  </label>
                  <input
                    id="addressLine1"
                    className="dashboard-input"
                    value={form.addressLine1}
                    onChange={onField("addressLine1")}
                    autoComplete="street-address"
                    placeholder="Street address"
                  />
                </div>

                <div className="dashboard-field dashboard-field--full">
                  <label className="dashboard-label" htmlFor="apartment">
                    Apt / Unit
                  </label>
                  <input
                    id="apartment"
                    className="dashboard-input"
                    value={form.apartment}
                    onChange={onField("apartment")}
                    autoComplete="address-line2"
                    placeholder="Apt / Unit"
                  />
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-label" htmlFor="city">
                    City
                  </label>
                  <input
                    id="city"
                    className="dashboard-input"
                    value={form.city}
                    onChange={onField("city")}
                    autoComplete="address-level2"
                    placeholder="City"
                  />
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-label" htmlFor="state">
                    State
                  </label>
                  <input
                    id="state"
                    className="dashboard-input"
                    value={form.state}
                    onChange={onField("state")}
                    autoComplete="address-level1"
                    placeholder="State"
                  />
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-label" htmlFor="postalCode">
                    ZIP code
                  </label>
                  <input
                    id="postalCode"
                    className="dashboard-input"
                    value={form.postalCode}
                    onChange={onField("postalCode")}
                    autoComplete="postal-code"
                    placeholder="ZIP code"
                  />
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-label" htmlFor="country">
                    Country
                  </label>
                  <input
                    id="country"
                    className="dashboard-input"
                    value={form.country}
                    onChange={onField("country")}
                    autoComplete="country-name"
                    placeholder="Country"
                  />
                </div>
              </div>
            </section>

            {/* status messages */}
            <div className="dashboard-status" aria-live="polite">
              {saveMsg ? <div className="dashboard-status__ok">{saveMsg}</div> : null}
              {saveErr ? <div className="dashboard-status__err">{saveErr}</div> : null}
            </div>

            <div className="dashboard-actions">
              <button className="dashboard-button dashboard-button--primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                className="dashboard-button dashboard-button--secondary"
                type="button"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </button>

              <Link to="/account/change-password" className="dashboard-button dashboard-button--secondary">
                Change password
              </Link>

              <button
                className="dashboard-button dashboard-button--danger"
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
        <aside className="dashboard-media" aria-label="Dashboard gallery">
          <div className="dashboard-media-frame">
            <img className="dashboard-media-image" src={activeImage} alt={`Dashboard ${activeIndex + 1}`} />

            <div className="dashboard-media-dots" aria-label="Gallery pagination">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`dashboard-media-dot ${i === activeIndex ? "dashboard-media-dot--active" : ""}`}
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => setActiveIndex(i)}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Delete modal */}
      {deleteOpen ? (
        <div className="dashboard-modalOverlay" role="presentation" onMouseDown={closeDeleteModal}>
          <div
            className="dashboard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onMouseDown={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <h3 className="dashboard-modalTitle" id="delete-title">
              Are you sure?
            </h3>

            <p className="dashboard-modalText">
              This action will permanently delete your account. A confirmation email will be sent to you.
            </p>

            <div className="dashboard-modalStatus" aria-live="polite">
              {deleteMsg ? <div className="dashboard-status__ok">{deleteMsg}</div> : null}
              {deleteErr ? <div className="dashboard-status__err">{deleteErr}</div> : null}
            </div>

            <div className="dashboard-modalActions">
              <button
                className="dashboard-button dashboard-button--primary"
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                data-autofocus="true"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>

              <button
                className="dashboard-button dashboard-button--secondary"
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