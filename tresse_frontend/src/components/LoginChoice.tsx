import { Link, useLocation } from "react-router-dom";
import "../../styles/LoginChoice.css";
import loginChoiceImage from "../assets/images/LoginChoice.jpg";

export default function LoginChoice() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const next = params.get("next") || "";
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "";

  const nextParam = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";

  return (
    <div className="login-container">
      <div className="login-left">
        <h1 className="visually-hidden">Welcome to TRESSE</h1>
        <h2>ENJOY THE BEST EXPERIENCE WITH US</h2>
        <p>Sign in to enjoy a personalized experience and get access to all our services.</p>

        <Link
          to={`/authorization${nextParam}`}
          className="black-button"
          aria-label="Log in to your account"
        >
          LOG IN
        </Link>

        <Link
          to={`/register${nextParam}`}
          className="white-button"
          aria-label="Register new account"
        >
          REGISTER
        </Link>
      </div>

      <div className="login-right">
        <img src={loginChoiceImage} alt="" aria-hidden="true" />
      </div>
    </div>
  );
}