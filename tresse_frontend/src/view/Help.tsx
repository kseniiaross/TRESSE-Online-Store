import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import "../../styles/Help.css";
import type { RootState } from "../store";

const ORDERS_PATH = "/orders";
const PROFILE_PATH = "/dashboard";
const LOGIN_CHOICE_PATH = "/login-choice";

// ✅ Your App.tsx uses RETURN policy route, not refund
const POLICY_PRIVACY = "/policies/privacy-policy";
const POLICY_TERMS = "/policies/terms-of-service";
const POLICY_RETURN = "/policies/return-policy";
const POLICY_SHIPPING = "/policies/shipping-policy";
const POLICY_ACCESSIBILITY = "/policies/accessibility-statement";

export default function Help() {
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  // If user isn't logged in, redirect to login-choice for private pages
  const goAuthOr = (path: string) => {
    navigate(isLoggedIn ? path : LOGIN_CHOICE_PATH);
  };

  return (
    <section className="help" aria-labelledby="helpTitle">
      <div className="helpWrap">
        <header className="helpHeader">
          <h1 id="helpTitle" className="helpTitle">
            HELP
          </h1>
          <p className="helpIntro">
            Quick answers about orders, shipping, returns, and payments. If you can’t find what you need — reach out to us.
          </p>
        </header>

        <nav className="helpNav" aria-label="Help sections">
          <a className="helpNavLink" href="#contact">Contact</a>
          <a className="helpNavLink" href="#orders">Orders</a>
          <a className="helpNavLink" href="#shipping">Shipping</a>
          <a className="helpNavLink" href="#returns">Returns</a>
          <a className="helpNavLink" href="#policies">Policies</a>
        </nav>

        <div className="helpLine" />

        {/* CONTACT */}
        <section id="contact" className="helpSection" aria-labelledby="contactTitle">
          <h2 id="contactTitle" className="helpH2">Contact</h2>
          <p className="helpText">Our support team replies during business hours. Most requests are answered within 24–48 hours.</p>

          <div className="helpActions">
            <a className="helpBtn" href="mailto:support@tressehandmade.com">Email support</a>
          </div>

          <p className="helpSmall">
            Email: <span className="helpMono">support@tresseknitting.com</span>
          </p>
        </section>

        <div className="helpLine" />

        {/* ORDERS */}
        <section id="orders" className="helpSection" aria-labelledby="ordersTitle">
          <h2 id="ordersTitle" className="helpH2">Orders</h2>

          <ul className="helpList">
            <li>How to check your order status</li>
            <li>How to update your address (if the order hasn’t been processed yet)</li>
            <li>Payment or confirmation issues</li>
          </ul>

          <div className="helpActions">
            <button type="button" className="helpLinkBtn" onClick={() => goAuthOr(ORDERS_PATH)}>
              Orders
            </button>
            <button type="button" className="helpLinkBtn" onClick={() => goAuthOr(PROFILE_PATH)}>
              Profile
            </button>
          </div>
        </section>

        <div className="helpLine" />

        {/* SHIPPING */}
        <section id="shipping" className="helpSection" aria-labelledby="shippingTitle">
          <h2 id="shippingTitle" className="helpH2">Shipping</h2>
          <p className="helpText">Shipping rules vary by country/region. Full details are available on our Shipping Policy page.</p>

          <dl className="helpInfo" aria-label="Shipping summary">
            <div className="helpRow"><dt>Processing</dt><dd>1–3 business days</dd></div>
            <div className="helpRow"><dt>Delivery</dt><dd>Depends on region and carrier</dd></div>
            <div className="helpRow"><dt>Tracking</dt><dd>Available if provided by the carrier</dd></div>
          </dl>

          <div className="helpActions">
            <Link className="helpLinkBtn" to={POLICY_SHIPPING}>Shipping Policy</Link>
          </div>
        </section>

        <div className="helpLine" />

        {/* RETURNS */}
        <section id="returns" className="helpSection" aria-labelledby="returnsTitle">
          <h2 id="returnsTitle" className="helpH2">Returns</h2>
          <p className="helpText">Returns depend on product type and condition. Full details are available on our Return Policy page.</p>

          <dl className="helpInfo" aria-label="Returns summary">
            <div className="helpRow"><dt>Condition</dt><dd>New, unworn, original condition</dd></div>
            <div className="helpRow"><dt>Request window</dt><dd>Typically within 14 days</dd></div>
            <div className="helpRow"><dt>Return</dt><dd>Follow the steps described in the policy</dd></div>
          </dl>

          <div className="helpActions">
            <Link className="helpLinkBtn" to={POLICY_RETURN}>Return Policy</Link>
          </div>
        </section>

        <div className="helpLine" />

        {/* POLICIES */}
        <section id="policies" className="helpSection" aria-labelledby="policiesTitle">
          <h2 id="policiesTitle" className="helpH2">Policies</h2>
          <p className="helpText">Standard pages customers expect in an e-commerce store. These routes are live so you can link to them now.</p>

          <div className="helpPolicies" role="list" aria-label="Policies list">
            <Link className="helpPolicy" to={POLICY_PRIVACY} role="listitem">Privacy Policy</Link>
            <Link className="helpPolicy" to={POLICY_TERMS} role="listitem">Terms of Service</Link>
            <Link className="helpPolicy" to={POLICY_RETURN} role="listitem">Return Policy</Link>
            <Link className="helpPolicy" to={POLICY_SHIPPING} role="listitem">Shipping Policy</Link>
            <Link className="helpPolicy" to={POLICY_ACCESSIBILITY} role="listitem">Accessibility Statement</Link>
          </div>
        </section>
      </div>
    </section>
  );
}