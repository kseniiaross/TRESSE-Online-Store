import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/Home.css";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  canShowNewsletterModal,
  markNewsletterDismissed,
  subscribeNewsletter,
  isValidEmail,
} from "../utils/newsletter";

const COLUMN_STEP_MS = 1000;
const CYCLE_PAUSE_MS = 2000;

const POLICY_PRIVACY = "/policies/privacy-policy";
const POLICY_TERMS = "/policies/terms-of-service";

type ImageGlob = Record<string, string>;

const allImages = import.meta.glob("../assets/images/home_page/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as ImageGlob;

function pickImagesByPrefix(prefix: string): string[] {
  return Object.entries(allImages)
    .filter(([path]) => path.includes(`/${prefix}`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, url]) => url);
}

const columns = [
  pickImagesByPrefix("line1"),
  pickImagesByPrefix("line2"),
  pickImagesByPrefix("line3"),
];

function focusFirstPageElement() {
  const first = document.querySelector<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  first?.focus?.();
}

function getModalFocusableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '.newsletter a[href], .newsletter button:not([disabled]), .newsletter input:not([disabled]), .newsletter select:not([disabled]), .newsletter textarea:not([disabled]), .newsletter [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function Home() {
  const isLoggedIn = useSelector((state: RootState) => state.auth?.isLoggedIn ?? false);

  const [activeIndex, setActiveIndex] = useState<[number, number, number]>([0, 0, 0]);

  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const lastActiveElRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const gallery = useMemo(() => {
    return columns.map((col) => (col.length ? col : [""])) as [string[], string[], string[]];
  }, []);

  // preload
  useEffect(() => {
    gallery.flat().filter(Boolean).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [gallery]);

  useEffect(() => {
    let timer: number | null = null;
    let step = 0;

    const tick = () => {
      if (step === 0 || step === 1 || step === 2) {
        const col = step;

        setActiveIndex((prev) => {
          const next: [number, number, number] = [prev[0], prev[1], prev[2]];
          const n = gallery[col].length || 1;
          next[col] = (prev[col] + 1) % n;
          return next;
        });

        step += 1;
        timer = window.setTimeout(tick, COLUMN_STEP_MS);
        return;
      }

      step = 0;
      timer = window.setTimeout(tick, CYCLE_PAUSE_MS);
    };

    tick();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [gallery]);

  useEffect(() => {
    if (!canShowNewsletterModal(isLoggedIn)) return;

    const t = window.setTimeout(() => setIsNewsletterOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [isLoggedIn]);

  const handleCloseNewsletter = useCallback(() => {
    setIsNewsletterOpen(false);
    setFormError(null);
    setIsSubmitted(false);
    markNewsletterDismissed();
  }, []);

  useEffect(() => {
    if (!isNewsletterOpen) return;

    lastActiveElRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseNewsletter();
        return;
      }

      if (e.key === "Tab") {
        const focusables = getModalFocusableElements();
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
          return;
        }

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;

      const el = lastActiveElRef.current;

      if (el && typeof el.focus === "function" && document.contains(el)) {
        el.focus();
      } else {
        focusFirstPageElement();
      }

      lastActiveElRef.current = null;
    };
  }, [isNewsletterOpen, handleCloseNewsletter]);

  const currentImages = useMemo(() => {
    return [0, 1, 2].map((col) => gallery[col][activeIndex[col]] || gallery[col][0] || "");
  }, [gallery, activeIndex]);

  const handleSubmitNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const clean = email.trim();
    if (!isValidEmail(clean)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    try {
      await subscribeNewsletter(clean, "modal");
      setIsSubmitted(true);
      setEmail("");

      window.setTimeout(() => {
        handleCloseNewsletter();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Subscription failed. Please try again.";
      setFormError(msg);
    }
  };

  return (
    <div className="home">
      <section className="home-hero" role="banner" aria-label="Tresse homepage hero">
        {[0, 1, 2].map((col) => {
          const src = currentImages[col];

          return (
            <div className={`home-hero__column home-hero__column--${col}`} key={col} aria-hidden="true">
              {src ? (
                <img
                  src={src}
                  className="home-hero__image"
                  width={1400}
                  height={1080}
                  loading={col === 0 ? "eager" : "lazy"}
                  decoding="async"
                  alt=""
                />
              ) : null}
              <div className="home-hero__shade" />
            </div>
          );
        })}

        <div className="home-hero__vignette" aria-hidden="true" />

        <div className="home-hero__content">
          <h1 className="home-hero__title">HANDMADE AND STYLE</h1>
        </div>
      </section>

      {isNewsletterOpen ? (
        <div
          className="newsletter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletterTitle"
          aria-describedby="newsletterSubtitle"
        >
          <button
            type="button"
            className="newsletter__backdrop"
            onClick={handleCloseNewsletter}
            aria-label="Close newsletter modal"
            tabIndex={-1}
          />

          <div className="newsletter__panel" role="document">
            <button type="button" className="newsletter__close" onClick={handleCloseNewsletter} aria-label="Close">
              ×
            </button>

            <div className="newsletter__header">
              <h2 id="newsletterTitle" className="newsletter__title">
                SUBSCRIBE TO TRESSE EMAILS
              </h2>
              <p id="newsletterSubtitle" className="newsletter__subtitle">
                Stay updated on new collections, styling tips and special offers.
              </p>
            </div>

            <form className="newsletter__form" onSubmit={handleSubmitNewsletter}>
              <label className="newsletter__label" htmlFor="newsletter_email">
                Email address
              </label>

              <div className="newsletter__row">
                <input
                  ref={emailInputRef}
                  id="newsletter_email"
                  name="newsletter_email"
                  className="newsletter__input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(ev) => {
                    setEmail(ev.target.value);
                    if (formError) setFormError(null);
                  }}
                  aria-invalid={!!formError}
                  aria-describedby={formError ? "newsletter_error" : undefined}
                />

                <button type="submit" className="newsletter__submit">
                  SIGN UP
                </button>
              </div>

              {formError ? (
                <div id="newsletter_error" className="newsletter__error" role="alert" aria-live="polite">
                  {formError}
                </div>
              ) : null}

              {isSubmitted ? (
                <div className="newsletter__success" role="status" aria-live="polite">
                  You’re in. Welcome to TRESSE.
                </div>
              ) : (
                <p className="newsletter__fineprint">
                  By subscribing, you agree to receive promotional emails from Tresse. Read our{" "}
                  <Link className="newsletter__link" to={POLICY_TERMS}>
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link className="newsletter__link" to={POLICY_PRIVACY}>
                    Privacy Policy
                  </Link>
                  .
                </p>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}