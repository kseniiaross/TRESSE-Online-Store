// src/App.tsx
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";

import Authorization from "./components/Authorization";
import Register from "./components/Register";
import LoginChoice from "./components/LoginChoice";
import PasswordChange from "./components/PasswordChange";
import PasswordResetConfirm from "./components/PasswordResetConfirm";
import AccountRestore from "./components/AccountRestore";

import Home from "./view/Home";
import Help from "./view/Help";
import Cart from "./view/Cart";
import Dashboard from "./view/Dashboard";
import Footer from "./view/Footer";
import Header from "./view/Header";
import ProductCatalog from "./view/ProductCatalog";
import ProductDetail from "./view/ProductDetails";
import Order from "./view/Order";
import OrderHistory from "./view/OrderHistory";
import OrderSuccess from "./view/OrderSuccess";
import WishList from "./view/WishList";
import FAQ from "./view/FAQ";
import About from "./view/About";
import Contact from "./view/Contact";
import SizeGuide from "./view/SizeGuide";

import PrivateRoute from "./utils/PrivateRoute";
import useAuthStorageSync from "./hooks/useAuthStorageSync";
import { setCredentials, logout } from "./utils/authSlice";

import type { AppDispatch } from "./store";
import { fetchCart } from "./store/serverCartSlice";
import { fetchWishlistCount } from "./store/wishListSlice";

import type { User } from "./types/user";
import { setOnUnauthorized } from "./api/axiosInstance";

import TermsOfService from "./view/policies/TermsOfService";
import PrivacyPolicy from "./view/policies/PrivacyPolicy";
import ReturnPolicy from "./view/policies/ReturnPolicy";
import ShippingPolicy from "./view/policies/ShippingPolicy";
import AccessibilityStatement from "./view/policies/AccessibilityStatement";

import "./App.css";
import "../styles/Policy.css";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toUserOrNull(v: unknown): User | null {
  if (!isRecord(v)) return null;

  const id = v.id;
  const email = v.email;

  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) return null;
  if (typeof email !== "string" || !email.includes("@")) return null;

  const first_name = typeof v.first_name === "string" ? v.first_name : "";
  const last_name = typeof v.last_name === "string" ? v.last_name : "";

  return {
    id,
    email: email.trim().toLowerCase(),
    first_name,
    last_name,
  };
}

function isSafeNextPath(p: string): boolean {
  return p.startsWith("/") && !p.startsWith("//");
}

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  return null;
}

/**
 * Loads Stripe ONLY when the /order route is rendered.
 * This prevents hidden Stripe iframes from appearing on other pages
 * and breaking keyboard tab navigation.
 */
function OrderRouteWithStripe() {
  // Stripe.js is loaded by loadStripe(), which returns Promise<Stripe | null>
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Dynamic import ensures Stripe code is not executed on app startup
      const mod = await import("./features/payments/stripe");
      if (!mounted) return;

      // getStripePromise() should internally cache the promise
      setStripePromise(mod.getStripePromise());
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // While Stripe is loading, show the page shell (or a loader)
  if (!stripePromise) {
    return <div style={{ padding: 24 }}>Loading checkout…</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <Order />
    </Elements>
  );
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  useAuthStorageSync();

  useEffect(() => {
    const token = localStorage.getItem("access");
    const userRaw = localStorage.getItem("user");

    if (token && userRaw) {
      try {
        const parsed: unknown = JSON.parse(userRaw);
        const user = toUserOrNull(parsed);

        if (user) {
          dispatch(setCredentials({ token, user }));
          dispatch(fetchCart());
          dispatch(fetchWishlistCount());
        } else {
          dispatch(logout());
        }
      } catch {
        dispatch(logout());
      }
    }

    setOnUnauthorized(() => {
      dispatch(logout());

      const next = window.location.pathname + window.location.search;
      const safeNext = isSafeNextPath(next) ? next : "/";

      const path = window.location.pathname;
      const onAuthPage =
        path.startsWith("/authorization") ||
        path.startsWith("/register") ||
        path.startsWith("/login-choice") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/login") ||
        path.startsWith("/account/restore");

      if (!onAuthPage) {
        window.location.assign(`/login-choice?next=${encodeURIComponent(safeNext)}`);
      }
    });

    return () => setOnUnauthorized(null);
  }, [dispatch]);

  return (
    <Router>
      <ScrollToTop />

      <div className="layout">
        <Header />

        <main role="main" className="layout-main">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/help" element={<Help />} />

            {/* Policies */}
            <Route path="/policies/terms-of-service" element={<TermsOfService />} />
            <Route path="/policies/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/policies/return-policy" element={<ReturnPolicy />} />
            <Route path="/policies/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/policies/accessibility-statement" element={<AccessibilityStatement />} />

            <Route path="/size-guide" element={<SizeGuide />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />

            <Route path="/catalog" element={<ProductCatalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />

            {/* Account restore */}
            <Route path="/account/restore/:uidb64/:token" element={<AccountRestore />} />

            {/* Auth */}
            <Route path="/login-choice" element={<LoginChoice />} />
            <Route path="/login" element={<Authorization />} />
            <Route path="/authorization" element={<Authorization />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:uidb64/:token" element={<PasswordResetConfirm />} />

            {/* Private */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/account/change-password"
              element={
                <PrivateRoute>
                  <PasswordChange />
                </PrivateRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <PrivateRoute>
                  <OrderHistory />
                </PrivateRoute>
              }
            />

            <Route path="/order/success" element={<OrderSuccess />} />

            {/* ✅ Stripe only here */}
            <Route
              path="/order"
              element={
                <PrivateRoute>
                  <OrderRouteWithStripe />
                </PrivateRoute>
              }
            />

            <Route
              path="/wishlist"
              element={
                <PrivateRoute>
                  <WishList />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}