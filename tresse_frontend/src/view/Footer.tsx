// src/view/Footer.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/Footer.css";
import { subscribeNewsletter, isValidEmail } from "../utils/newsletter";

// TOP STRIP icons
import worldwideDeliveryIcon from "../assets/icons/footer/worldwide_delivery.png";
import fastDeliveryIcon from "../assets/icons/footer/fast_delivery.png";
import customerSupportIcon from "../assets/icons/footer/customer_support.png";
import securePaymentIcon from "../assets/icons/footer/secure_payment.png";

// Social icons
import instagramIcon from "../assets/icons/footer/social_media/instagram_icon.png";
import pinterestIcon from "../assets/icons/footer/social_media/pinterest_icon.png";
import tiktokIcon from "../assets/icons/footer/social_media/tiktok_icon.png";
import youtubeIcon from "../assets/icons/footer/social_media/youtube_icon.png";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const clean = email.trim();
    if (!isValidEmail(clean)) {
      setMsg("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      await subscribeNewsletter(clean, "footer");
      setEmail("");
      setMsg("Subscribed. Welcome to TRESSE.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Subscription failed. Please try again.";
      setMsg(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="footer" role="contentinfo">
      {/* TOP STRIP */}
      <section className="footerTop" aria-label="Store highlights">
        <div className="footerTopItem">
          <img className="footerTopIcon" src={worldwideDeliveryIcon} alt="" aria-hidden="true" />
          <div className="footerTopTitle">WORLDWIDE DELIVERY</div>
          <div className="footerTopText">Receive your order anywhere in the world.</div>
        </div>

        <div className="footerTopItem">
          <img className="footerTopIcon" src={fastDeliveryIcon} alt="" aria-hidden="true" />
          <div className="footerTopTitle">FAST SHIPPING</div>
          <div className="footerTopText">Shipping in 48 hours after knitting.</div>
        </div>

        <div className="footerTopItem">
          <img className="footerTopIcon" src={customerSupportIcon} alt="" aria-hidden="true" />
          <div className="footerTopTitle">CUSTOMER SERVICE</div>
          <div className="footerTopText">We respond within 24 hours. Usually much faster!</div>
        </div>

        <div className="footerTopItem">
          <img className="footerTopIcon" src={securePaymentIcon} alt="" aria-hidden="true" />
          <div className="footerTopTitle">SECURE PAYMENT</div>
          <div className="footerTopText">Your payment information is processed securely.</div>
        </div>
      </section>

      {/* MAIN */}
      <div className="footerMain">
        {/* BRAND */}
        <section className="footerBrand" aria-label="About Tresse">
          <div className="footerBrandKicker">ABOUT TRESSE</div>
          <h3 className="footerBrandTitle">
            MADE BY HAND.
            <br />
            DESIGNED FOR TIME,
            <br />
            NOT SEASONS.
            <br />
          </h3>
        </section>

        {/* NAV */}
        <nav className="footerCols" aria-label="Footer navigation">
          <div className="footerCol">
            <ul className="footerList">
              <li>
                <Link to="/about" className="footerLink">
                  ABOUT US
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className="footerLink">
                  SIZE GUIDE
                </Link>
              </li>
              <li>
                <Link to="/faq" className="footerLink">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footerLink">
                  CONTACT
                </Link>
              </li>
            </ul>
          </div>

          <div className="footerCol">
            <ul className="footerList">
              <li>
                <Link to="/catalog?category=woman" className="footerLink">
                  WOMAN
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=man" className="footerLink">
                  MAN
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=kids" className="footerLink">
                  KIDS
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=new" className="footerLink">
                  THE NEW
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=bestsellers" className="footerLink">
                  BESTSELLERS
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=exclusives" className="footerLink">
                  EXCLUSIVES
                </Link>
              </li>
            </ul>
          </div>

          <div className="footerCol">
            <ul className="footerList">
              <li>
                <Link to="/login-choice" className="footerLink">
                  LOGIN
                </Link>
              </li>
              <li>
                <Link to="/register" className="footerLink">
                  REGISTER
                </Link>
              </li>
              <li>
                <Link to="/policies/terms-of-service" className="footerLink">
                  TERMS OF USE
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy-policy" className="footerLink">
                  PRIVACY POLICY
                </Link>
              </li>
              <li>
                <Link to="/policies/return-policy" className="footerLink">
                  RETURN POLICY
                </Link>
              </li>
              <li>
                <Link to="/policies/shipping-policy" className="footerLink">
                  SHIPPING POLICY
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* NEWSLETTER */}
        <section className="footerNewsletter" aria-label="Newsletter signup">
          <div className="footerNewsletterTitle">SIGN UP TO OUR NEWSLETTER TO RECEIVE EXCLUSIVE OFFERS.</div>

          <form className="footerNewsletterForm" onSubmit={onSubmit}>
            <label className="srOnly" htmlFor="footer-email">
              Email
            </label>

            <input
              id="footer-email"
              className="footerInput"
              type="email"
              placeholder="E-MAIL"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button className="footerBtn" type="submit" disabled={busy}>
              {busy ? "..." : "SUBSCRIBE"}
            </button>
          </form>

          {msg ? <p className="footerNewsletterLegal">{msg}</p> : null}

          <p className="footerNewsletterLegal">
            BY SIGNING UP TO OUR NEWSLETTER, YOU AGREE WITH OUR{" "}
            <Link className="footerLinkInline" to="/policies/terms-of-service">
              TERMS
            </Link>{" "}
            &amp;{" "}
            <Link className="footerLinkInline" to="/policies/privacy-policy">
              PRIVACY POLICY
            </Link>
            .
          </p>
        </section>
      </div>

      {/* BOTTOM */}
      <div className="footerBottom">
        <div className="footerCopy">© {new Date().getFullYear()} — TRESSE</div>

        <div className="footerSocial" aria-label="Social links">
          <a className="footerSocialIconLink" href="#" aria-label="Instagram">
            <img className="footerSocialIcon" src={instagramIcon} alt="" aria-hidden="true" />
          </a>
          <a className="footerSocialIconLink" href="#" aria-label="Pinterest">
            <img className="footerSocialIcon" src={pinterestIcon} alt="" aria-hidden="true" />
          </a>
          <a className="footerSocialIconLink" href="#" aria-label="YouTube">
            <img className="footerSocialIcon" src={youtubeIcon} alt="" aria-hidden="true" />
          </a>
          <a className="footerSocialIconLink" href="#" aria-label="TikTok">
            <img className="footerSocialIcon" src={tiktokIcon} alt="" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}