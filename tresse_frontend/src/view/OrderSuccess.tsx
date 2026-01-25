import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppDispatch } from "../utils/hooks";
import { clearCart as clearGuestCart } from "../utils/cartSlice";
import { clearServerCart, fetchCart } from "../store/serverCartSlice";
import "../../styles/OrderSuccess.css";

const LAST_ORDER_ID_KEY = "tresse_last_order_id_v1";

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function readLastOrderIdFromStorage(): string {
  try {
    const v = localStorage.getItem(LAST_ORDER_ID_KEY);
    return (v || "").trim();
  } catch {
    return "";
  }
}

function writeLastOrderIdToStorage(orderId: string) {
  try {
    const clean = (orderId || "").trim();
    if (!clean) return;
    localStorage.setItem(LAST_ORDER_ID_KEY, clean);
  } catch {
  }
}

export default function OrderSuccess() {
  const dispatch = useAppDispatch();
  const q = useQueryParams();

  const orderIdFromQuery = (q.get("order") || "").trim();

  useEffect(() => {
    if (orderIdFromQuery) writeLastOrderIdToStorage(orderIdFromQuery);
  }, [orderIdFromQuery]);

  const orderId = orderIdFromQuery || readLastOrderIdFromStorage();

  useEffect(() => {
    dispatch(clearGuestCart());
    dispatch(clearServerCart());
    dispatch(fetchCart());
  }, [dispatch]);

  return (
    <section className="order-success" aria-labelledby="order-success-title">
      <div className="order-success__card">
        <header className="order-success__header">
          <h1 id="order-success-title" className="order-success__title">
            Thank you for your purchase!
          </h1>

          <p className="order-success__subtitle">
            Payment successful. A receipt will be sent to your email.
          </p>
        </header>

        <div className="order-success__summary" aria-labelledby="order-summary-title">
          <h2 id="order-summary-title" className="srOnly">
            Order summary
          </h2>

          <div className="order-success__row">
            <span className="order-success__label">Status</span>
            <span className="order-success__value order-success__value--status">Paid</span>
          </div>

          {orderId ? (
            <div className="order-success__row" aria-live="polite">
              <span className="order-success__label">Order number</span>
              <span className="order-success__value order-success__value--mono">{orderId}</span>
            </div>
          ) : null}
        </div>

        <nav className="order-success__actions" aria-label="Next actions">
          <Link to="/orders" className="order-success__btn order-success__btn--primary">
            View my orders
          </Link>

          <Link to="/catalog" className="order-success__btn order-success__btn--secondary">
            Continue shopping
          </Link>
        </nav>
      </div>
    </section>
  );
}