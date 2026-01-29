import { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";
import "../../styles/OrderHistory.css";

type OrderItem = {
  id: number;
  product_name?: string;
  size: string;
  quantity: number;
  unit_price: string;
};

type OrderStatus = "pending" | "paid" | "canceled";

type Order = {
  id: number;
  public_id?: string; 
  created_at: string;
  status: OrderStatus;
  total_amount: string;
  currency: string;
  card_brand?: string;
  card_last4?: string;
  items: OrderItem[];
};

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

const formatMoney = (value: string) => {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const getStatusLabel = (status: OrderStatus) => {
  if (status === "paid") return "Paid";
  if (status === "canceled") return "Canceled";
  return "Pending";
};

const getStatusClass = (status: OrderStatus) => {
  if (status === "paid") return "order-history__badge--paid";
  if (status === "canceled") return "order-history__badge--canceled";
  return "order-history__badge--pending";
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const now = useMemo(() => Date.now(), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErrorMsg("");
        setLoading(true);

        const { data } = await api.get("/orders/my/");
        if (!cancelled) setOrders(Array.isArray(data) ? (data as Order[]) : []);
      } catch {
        if (!cancelled) setErrorMsg("Unable to load your orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isCancelable = (o: Order) => {
    if (o.status !== "paid") return false;
    const created = new Date(o.created_at).getTime();
    return now - created <= CANCEL_WINDOW_MS;
  };

  const getPaymentText = (o: Order) => {
    const last4 = (o.card_last4 || "").trim();
    const brand = (o.card_brand || "").trim();

    if (!last4) return "Card: —";
    const brandLabel = brand ? titleCase(brand) : "Card";
    return `${brandLabel} •••• ${last4}`;
  };

  const cancelOrder = async (orderId: number) => {
    try {
      setBusyId(orderId);
      setErrorMsg("");

      const { data } = await api.post(`/orders/${orderId}/cancel/`, {});
      setOrders((prev) => prev.map((o) => (o.id === orderId ? (data as Order) : o)));
    } catch {
      setErrorMsg("Unable to cancel the order. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const goToReturns = () => {
    window.location.href = "/help";
  };

  if (loading) {
    return (
      <section className="order-history" aria-labelledby="order-history-title">
        <div className="order-history__wrap">
          <p className="order-history__loading">Loading…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="order-history" aria-labelledby="order-history-title">
      <div className="order-history__wrap">
        <header className="order-history__header">
          <h2 id="order-history-title" className="order-history__title">
            My Orders
          </h2>
          <p className="order-history__subtitle">Your order history and payment details.</p>
        </header>

        {errorMsg && <p className="order-history__error">{errorMsg}</p>}

        {!errorMsg && orders.length === 0 && (
          <div className="order-history__empty">
            <p className="order-history__empty-text">You don’t have any orders yet.</p>
          </div>
        )}

        <div className="order-history__list">
          {orders.map((o) => {
            const publicId = (o.public_id || "").trim();

            return (
              <article className="order-history__card" key={o.id}>
                <div className="order-history__top">
                  <div className="order-history__meta">
                    <div className="order-history__label">Order</div>
                    <div className="order-history__value order-history__value--strong">
                      {publicId ? publicId : `#${o.id}`}
                    </div>
                  </div>

                  <div className="order-history__meta">
                    <div className="order-history__label">Status</div>
                    <div className={`order-history__badge ${getStatusClass(o.status)}`}>
                      {getStatusLabel(o.status)}
                    </div>
                  </div>

                  <div className="order-history__meta">
                    <div className="order-history__label">Total</div>
                    <div className="order-history__value order-history__value--strong">
                      {formatMoney(o.total_amount)}
                    </div>
                  </div>

                  <div className="order-history__meta">
                    <div className="order-history__label">Date</div>
                    <div className="order-history__value order-history__value--date">
                      {formatDateTime(o.created_at)}
                    </div>
                  </div>
                </div>

                <div className="order-history__pay-row">
                  <div className="order-history__pay-text">
                    <span className="order-history__pay-label">Paid with</span>
                    <span className="order-history__pay-value">{getPaymentText(o)}</span>
                  </div>

                  <div className="order-history__actions">
                    {isCancelable(o) && (
                      <button
                        type="button"
                        className="order-history__btn order-history__btn--danger"
                        onClick={() => cancelOrder(o.id)}
                        disabled={busyId === o.id}
                      >
                        {busyId === o.id ? "Canceling…" : "Cancel"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="order-history__btn order-history__btn--secondary"
                      onClick={goToReturns}
                    >
                      Return
                    </button>
                  </div>
                </div>

                {o.items?.length > 0 && (
                  <div className="order-history__items">
                    <div className="order-history__items-title">Items</div>

                    <ul className="order-history__items-list">
                      {o.items.map((it) => {
                        const name = (it.product_name || "").trim();
                        return (
                          <li className="order-history__item" key={it.id}>
                            <span className="order-history__item-left">
                              <span className="order-history__item-qty">{it.quantity}×</span>
                              <span className="order-history__item-name">{name || "Item"}</span>
                              <span className="order-history__item-size">{it.size || "One size"}</span>
                            </span>

                            <span className="order-history__item-right">{formatMoney(it.unit_price)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}