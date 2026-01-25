// src/components/LoginChoice.tsx
import { Link, useLocation } from "react-router-dom";
import "../../styles/LoginChoice.css";
import loginChoiceImage from "../assets/images/LoginChoice.jpg";

/**
 * LoginChoice is a "gateway" screen:
 * - user can either log in or register
 * - we preserve `next` query param so auth can redirect back
 *
 * Notes:
 * - We reuse the same layout primitives as Authorization/Register (auth-page + auth layout),
 *   so spacing and image framing stay consistent across all auth screens.
 */
export default function LoginChoice() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const rawNext = params.get("next") || "";
  const safeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  const nextParam = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  return (
    <section className="auth-page" aria-label="Login choice">
      <div className="auth">
        <div className="auth__left">
          {/* Keep h1 for SEO/semantics, but visually hide it to match design */}
          <h1 className="visually-hidden">Welcome to TRESSE</h1>

          <h2 className="auth__title">ENJOY THE BEST EXPERIENCE WITH US</h2>
          <p className="auth__subtitle">
            Sign in to enjoy a personalized experience and get access to all our services.
          </p>

          <div className="auth__actions" aria-label="Login actions">
            <Link
              to={`/authorization${nextParam}`}
              className="auth__cta auth__cta--primary"
              aria-label="Log in to your account"
            >
              LOG IN
            </Link>

            <Link
              to={`/register${nextParam}`}
              className="auth__cta auth__cta--secondary"
              aria-label="Register new account"
            >
              REGISTER
            </Link>
          </div>
        </div>

        {/* Decorative image — keep it out of the accessibility tree */}
        <div className="auth__right" aria-hidden="true">
          <img className="auth__image" src={loginChoiceImage} alt="" />
        </div>
      </div>
    </section>
  );
}