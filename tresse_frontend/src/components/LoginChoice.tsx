import { Link, useLocation } from "react-router-dom";
import { isSafePath } from "../utils/routing";
import "../../styles/LoginChoice.css";
import loginChoiceImage from "../assets/images/LoginChoice.jpg";

export default function LoginChoice() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const rawNext = params.get("next");
  const safeNext = isSafePath(rawNext) ? rawNext : null;
  const nextParam = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  return (
    <section className="choice" aria-label="Login choice">
      <div className="choice__layout">
        <div className="choice__left">
          <div className="choice__content">
            <h2 className="choice__title">ENJOY THE BEST EXPERIENCE WITH&nbsp;US</h2>

            <p className="choice__subtitle">
              Sign in to enjoy a personalized experience and get access to all our services.
            </p>

            <div className="choice__actions">
              <Link to={`/authorization${nextParam}`} className="choice__cta choice__cta--primary">
                LOG IN
              </Link>

              <Link to={`/register${nextParam}`} className="choice__cta choice__cta--secondary">
                REGISTER
              </Link>
            </div>
          </div>
        </div>

        <div className="choice__right" aria-hidden="true">
          <div className="choice__media">
            <img className="choice__image" src={loginChoiceImage} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}