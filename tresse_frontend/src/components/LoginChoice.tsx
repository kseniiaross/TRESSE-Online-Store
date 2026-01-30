import { Link, useLocation } from "react-router-dom";
import "../../styles/LoginChoice.css";
import loginChoiceImage from "../assets/images/LoginChoice.jpg";

function isSafePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function LoginChoice() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const rawNext = params.get("next");
  const safeNext = isSafePath(rawNext) ? rawNext : null;

  const nextParam = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  return (
    <section className="choice-page" aria-label="Login choice">
      <div className="choice-layout">
        {/* LEFT */}
        <div className="choice-left">
          <h1 className="choice-visually-hidden">Welcome to TRESSE</h1>

          <div className="choice-content">
            <h2 className="choice-title">ENJOY THE BEST EXPERIENCE WITH US</h2>

            <p className="choice-subtitle">
              Sign in to enjoy a personalized experience and get access to all our services.
            </p>

            <div className="choice-actions">
              <Link
                to={`/authorization${nextParam}`}
                className="choice-cta choice-cta--primary"
              >
                LOG IN
              </Link>

              <Link
                to={`/register${nextParam}`}
                className="choice-cta choice-cta--secondary"
              >
                REGISTER
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="choice-right" aria-hidden="true">
          <img className="choice-image" src={loginChoiceImage} alt="" />
        </div>
      </div>
    </section>
  );
}