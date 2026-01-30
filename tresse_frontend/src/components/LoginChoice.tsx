import { Link, useLocation } from "react-router-dom";
import "../../styles/LoginChoice.css";
import loginChoiceImage from "../assets/images/LoginChoice.jpg";

export default function LoginChoice() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const rawNext = params.get("next") || "";
  const safeNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  const nextParam = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  return (
    <section className="auth-page" aria-label="Login choice">
      <div className="auth auth--choice">
        {/* LEFT */}
        <div className="auth__left auth__left--centered">
          <h1 className="visually-hidden">Welcome to TRESSE</h1>

          <div className="auth__content">
            <h2 className="auth__title">
              ENJOY THE BEST EXPERIENCE WITH US
            </h2>

            <p className="auth__subtitle">
              Sign in to enjoy a personalized experience and get access to all our services.
            </p>

            <div className="auth__actions">
              <Link
                to={`/authorization${nextParam}`}
                className="auth__cta auth__cta--primary"
              >
                LOG IN
              </Link>

              <Link
                to={`/register${nextParam}`}
                className="auth__cta auth__cta--secondary"
              >
                REGISTER
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth__right auth__right--image" aria-hidden="true">
          <img
            className="auth__image"
            src={loginChoiceImage}
            alt=""
          />
        </div>
      </div>
    </section>
  );
}