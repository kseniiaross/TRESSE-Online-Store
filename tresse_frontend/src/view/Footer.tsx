import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/Footer.css";

import { subscribeNewsletter, isValidEmail } from "../utils/newsletter";

// Top strip icons (decorative)
import worldwideDeliveryIcon from "../assets/icons/footer/worldwide_delivery.png";
import fastDeliveryIcon from "../assets/icons/footer/fast_delivery.png";
import customerSupportIcon from "../assets/icons/footer/customer_support.png";
import securePaymentIcon from "../assets/icons/footer/secure_payment.png";

// Social icons (decorative images, links have accessible names)
import instagramIcon from "../assets/icons/footer/social_media/instagram_icon.png";
import pinterestIcon from "../assets/icons/footer/social_media/pinterest_icon.png";
import tiktokIcon from "../assets/icons/footer/social_media/tiktok_icon.png";
import youtubeIcon from "../assets/icons/footer/social_media/youtube_icon.png";

type NewsletterStatus = "idle" | "success" | "error";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<NewsletterStatus>("idle");
  const [busy, setBusy] = useState(false);
  const isInvalid = useMemo(() => status === "error" && Boolean(msg), [status, msg]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMsg(null);
    setStatus("idle");

    const clean = email.trim();

    if (!isValidEmail(clean)) {
      setStatus("error");
      setMsg("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      await subscribeNewsletter(clean, "footer");
      setEmail("");
      setStatus("success");
      setMsg("Subscribed. Welcome to TRESSE.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Subscription failed. Please try again.";
      setStatus("error");
      setMsg(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="footer" role="contentinfo">
      {/* ------------------------------------------------------------------
         Top strip: trust signals (icons are decorative)
         ------------------------------------------------------------------ */}
      <section className="footer__top" aria-label="Store highlights">
        <div className="footer__top-item">
          <img className="footer__top-icon" src={worldwideDeliveryIcon} alt="" aria-hidden="true" />
          <div className="footer__top-title">WORLDWIDE DELIVERY</div>
          <div className="footer__top-text">Receive your order anywhere in the world.</div>
        </div>

        <div className="footer__top-item">
          <img className="footer__top-icon" src={fastDeliveryIcon} alt="" aria-hidden="true" />
          <div className="footer__top-title">FAST SHIPPING</div>
          <div className="footer__top-text">Shipping in 48 hours after knitting.</div>
        </div>

        <div className="footer__top-item">
          <img className="footer__top-icon" src={customerSupportIcon} alt="" aria-hidden="true" />
          <div className="footer__top-title">CUSTOMER SERVICE</div>
          <div className="footer__top-text">We respond within 24 hours. Usually much faster!</div>
        </div>

        <div className="footer__top-item">
          <img className="footer__top-icon" src={securePaymentIcon} alt="" aria-hidden="true" />
          <div className="footer__top-title">SECURE PAYMENT</div>
          <div className="footer__top-text">Your payment information is processed securely.</div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
         Main: brand + navigation + newsletter
         ------------------------------------------------------------------ */}
      <div className="footer__main">
        <section className="footer__brand" aria-label="About TRESSE">
          <div className="footer__brand-kicker">ABOUT TRESSE</div>
          <h3 className="footer__brand-title">
            MADE BY HAND.
            <br />
            DESIGNED FOR TIME,
            <br />
            NOT SEASONS.
          </h3>
        </section>

        <nav className="footer__cols" aria-label="Footer navigation">
          <div className="footer__col">
            <ul className="footer__list">
              <li className="footer__list-item">
                <Link to="/about" className="footer__link">
                  ABOUT US
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/size-guide" className="footer__link">
                  SIZE GUIDE
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/faq" className="footer__link">
                  FAQ
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/contact" className="footer__link">
                  CONTACT
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <ul className="footer__list">
              <li className="footer__list-item">
                <Link to="/catalog?category=woman" className="footer__link">
                  WOMAN
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/catalog?category=man" className="footer__link">
                  MAN
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/catalog?category=kids" className="footer__link">
                  KIDS
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/catalog?category=new" className="footer__link">
                  THE NEW
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/catalog?category=bestsellers" className="footer__link">
                  BESTSELLERS
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/catalog?category=exclusives" className="footer__link">
                  EXCLUSIVES
                </Link>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <ul className="footer__list">
              <li className="footer__list-item">
                <Link to="/login-choice" className="footer__link">
                  LOGIN
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/register" className="footer__link">
                  REGISTER
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/policies/terms-of-service" className="footer__link">
                  TERMS OF SERVICE
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/policies/privacy-policy" className="footer__link">
                  PRIVACY POLICY
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/policies/return-policy" className="footer__link">
                  RETURN POLICY
                </Link>
              </li>
              <li className="footer__list-item">
                <Link to="/policies/shipping-policy" className="footer__link">
                  SHIPPING POLICY
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <section className="footer__newsletter" aria-label="Newsletter signup">
          <div className="footer__newsletter-title">
            SIGN UP TO OUR NEWSLETTER TO RECEIVE EXCLUSIVE OFFERS.
          </div>

          <form className="footer__newsletter-form" onSubmit={onSubmit} noValidate>
            <label className="srOnly" htmlFor="footer-email">
              Email
            </label>

            <input
              id="footer-email"
              className="footer__input"
              type="email"
              placeholder="E-MAIL"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={msg ? "footer-newsletter-msg" : undefined}
              aria-invalid={isInvalid ? true : undefined}
              required
            />

            <button className="footer__button" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? "..." : "SUBSCRIBE"}
            </button>
          </form>

          {/* Announce status changes to assistive tech */}
          {msg ? (
            <p
              id="footer-newsletter-msg"
              className={`footer__legal ${status === "error" ? "footer__legal--error" : ""}`}
              aria-live="polite"
            >
              {msg}
            </p>
          ) : null}

          <p className="footer__legal">
            BY SIGNING UP TO OUR NEWSLETTER, YOU AGREE WITH OUR{" "}
            <Link className="footer__link-inline" to="/policies/terms-of-service">
              TERMS OF SERVICE
            </Link>{" "}
            &amp;{" "}
            <Link className="footer__link-inline" to="/policies/privacy-policy">
              PRIVACY POLICY
            </Link>
            .
          </p>
        </section>
      </div>

      {/* ------------------------------------------------------------------
         Bottom: copyright + social links
         - Avoid href="#" to prevent focus jumps / scroll-to-top issues
         ------------------------------------------------------------------ */}
      <div className="footer__bottom">
        <div className="footer__copy">© {new Date().getFullYear()} — TRESSE</div>

        <div className="footer__social" aria-label="Social links">
          <a
            className="footer__social-link"
            href="https://www.instagram.com/tressehandmade/"
            aria-label="Instagram (opens in a new tab)"
            target="_blank"
            rel="noreferrer"
          >
            <img className="footer__social-icon" src={instagramIcon} alt="" aria-hidden="true" />
          </a>

          <a
            className="footer__social-link"
            href="https://..."
            aria-label="Pinterest (opens in a new tab)"
            target="_blank"
            rel="noreferrer"
          >
            <img className="footer__social-icon" src={pinterestIcon} alt="" aria-hidden="true" />
          </a>

          <a
            className="footer__social-link"
            href="https://..."
            aria-label="YouTube (opens in a new tab)"
            target="_blank"
            rel="noreferrer"
          >
            <img className="footer__social-icon" src={youtubeIcon} alt="" aria-hidden="true" />
          </a>

          <a
            className="footer__social-link"
            href="https://..."
            aria-label="TikTok (opens in a new tab)"
            target="_blank"
            rel="noreferrer"
          >
            <img className="footer__social-icon" src={tiktokIcon} alt="" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}