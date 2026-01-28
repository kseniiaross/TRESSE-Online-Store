import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import fallbackImg from "../assets/images/fallback_product.jpg";

import * as serverCart from "../store/serverCartSlice";
import { useAppDispatch, useAppSelector } from "../utils/hooks";

import {
  selectGuestCartItems,
  removeFromCart as removeGuestItem,
  updateQuantity as updateGuestQty,
} from "../utils/cartSlice";

import type { RootState } from "../store";
import type { CartItemDto, GuestCartItem } from "../types/cart";

import "../../styles/Cart.css";

/**
 * Helpers
 * Keep local because they are cart-specific and easy to audit.
 * If we reuse them later in multiple places, move to utils/number.ts.
 */
const toSafeInt = (v: unknown, fallback = 1) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
};

const clampQty = (q: number, maxQty?: number) => {
  const safe = Math.max(1, toSafeInt(q, 1));
  if (typeof maxQty === "number" && Number.isFinite(maxQty)) {
    return Math.min(safe, Math.max(1, Math.trunc(maxQty)));
  }
  return safe;
};

/**
 * Money parsing must be defensive:
 * backend often returns price as string; invalid values should not break totals.
 */
const toMoney = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Guest image field may vary depending on how the local cart is stored.
 * This helper is intentionally defensive and avoids `any`.
 */
const getFirstGuestImage = (item: GuestCartItem): string | null => {
  const list = item.images;
  if (!Array.isArray(list) || list.length === 0) return null;

  const first: unknown = list[0];
  if (!first || typeof first !== "object") return null;

  // Support both shapes: { image_url } and { image }
  const rec = first as Record<string, unknown>;
  const url = rec["image_url"];
  if (typeof url === "string" && url.trim()) return url;

  const legacy = rec["image"];
  if (typeof legacy === "string" && legacy.trim()) return legacy;

  return null;
};

export default function Cart() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  /**
   * NOTE:
   * We keep auth check simple (storage) because App.tsx syncs auth into Redux.
   * If you decide to rely only on Redux later, replace with a selector.
   */
  const isAuthed = !!localStorage.getItem("access");

  const cart = useAppSelector((s: RootState) => s.serverCart.cart);
  const loading = useAppSelector((s: RootState) => s.serverCart.loading);

  const guestItems = useAppSelector(selectGuestCartItems) as GuestCartItem[];
  const serverItems = (cart?.items ?? []) as CartItemDto[];

  const hasGuest = guestItems.length > 0;
  const hasServer = serverItems.length > 0;

  /**
   * IMPORTANT (real-world UX):
   * - If authed -> server cart is the source of truth.
   * - While server cart is still empty/loading, we may temporarily show guest cart
   *   to avoid "empty flash" (a common e-commerce issue).
   */
  const usingServer = isAuthed && (hasServer || !hasGuest);

  const items: Array<CartItemDto | GuestCartItem> = usingServer ? serverItems : guestItems;

  useEffect(() => {
    if (!isAuthed) return;

    let alive = true;

    (async () => {
      /**
       * If guest cart exists -> merge into server once on login,
       * then fetch the server cart. After that, server is the source of truth.
       *
       * `alive` guard prevents setting state/dispatching follow-ups after unmount
       * in edge cases (fast navigation, StrictMode, etc.).
       */
      try {
        if (hasGuest) await dispatch(serverCart.mergeGuestCart());
        if (!alive) return;
        await dispatch(serverCart.fetchCart());
      } catch {
        // In a production app, you'd report this to monitoring (Sentry/Datadog),
        // but we keep UI silent here to avoid user disruption.
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAuthed, hasGuest, dispatch]);

  const total = useMemo(() => {
    return usingServer
      ? serverItems.reduce((sum, it) => sum + toMoney(it.product_size.product.price) * it.quantity, 0)
      : guestItems.reduce((sum, it) => sum + toMoney(it.price) * it.quantity, 0);
  }, [usingServer, serverItems, guestItems]);

  const handleQuantityChange = (
    id: number,
    nextQty: number,
    guestProductSizeId?: number,
    maxQty?: number
  ) => {
    const clamped = clampQty(nextQty, maxQty);

    if (usingServer) {
      // Server cart update: `id` is cart item id.
      void dispatch(serverCart.updateCartItem({ item_id: id, quantity: clamped }));
      return;
    }

    // Guest cart update: must include product_size_id to identify the variant.
    if (guestProductSizeId == null) return;
    dispatch(updateGuestQty({ id, product_size_id: guestProductSizeId, quantity: clamped }));
  };

  const handleRemove = (id: number, guestProductSizeId?: number) => {
    if (usingServer) {
      void dispatch(serverCart.removeCartItem(id));
      return;
    }

    if (guestProductSizeId == null) return;
    dispatch(removeGuestItem({ id, product_size_id: guestProductSizeId }));
  };

  const onPay = () => {
    if (!isAuthed) {
      // Preserve "return-to" navigation for login flows.
      const next = encodeURIComponent("/order");
      navigate(`/login-choice?next=${next}`);
      return;
    }
    navigate("/order");
  };

  return (
    <section className="cart" aria-label="Shopping cart">
      <h1 className="cart__title">Shopping Cart</h1>

      {isAuthed && loading ? <p className="cart__status">Loading…</p> : null}

      {items.length === 0 ? (
        <p className="cart__empty">Your cart is empty</p>
      ) : (
        <>
          <div className="cart__grid" role="list" aria-label="Cart items">
            {items.map((item) => {
              const isGuest = !usingServer;

              const key = usingServer
                ? String((item as CartItemDto).id)
                : `${(item as GuestCartItem).id}-${(item as GuestCartItem).product_size_id}`;

              const id = item.id;

              // --- Shared display fields ---
              const name = usingServer
                ? (item as CartItemDto).product_size.product.name
                : (item as GuestCartItem).name;

              const priceStr = usingServer
                ? (item as CartItemDto).product_size.product.price
                : (item as GuestCartItem).price;

              /**
               * Images strategy (real practice):
               * - Cart uses ONLY the main image to keep payload small and stable.
               * - Full gallery is loaded on ProductDetails page.
               */
              const imgSrc = usingServer
                ? ((item as CartItemDto).product_size.product.main_image_url ?? fallbackImg)
                : ((item as GuestCartItem).main_image_url ??
                    getFirstGuestImage(item as GuestCartItem) ??
                    fallbackImg);

              const guestProductSizeId = isGuest ? (item as GuestCartItem).product_size_id : undefined;

              const sizeName = usingServer ? (item as CartItemDto).product_size.size?.name ?? null : null;

              const maxQty = usingServer
                ? (item as CartItemDto).product_size.quantity
                : (item as GuestCartItem).maxQty;

              const reachedMax = typeof maxQty === "number" ? item.quantity >= maxQty : false;
              const atMin = item.quantity <= 1;

              return (
                <article key={key} className="cart-item" role="listitem">
                  <div className="cart-item__media">
                    <img
                      src={imgSrc}
                      alt={name}
                      className="cart-item__img"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImg;
                      }}
                    />
                  </div>

                  <div className="cart-item__body">
                    <div className="cart-item__meta">
                      <div className="cart-item__name" title={name}>
                        {name}
                      </div>
                      <div className="cart-item__price">${priceStr}</div>
                    </div>

                    {sizeName ? <div className="cart-item__size">Size: {sizeName}</div> : null}
                    {typeof maxQty === "number" ? <div className="cart-item__stock">In stock: {maxQty}</div> : null}

                    <div className="cart-item__controls" aria-label={`Controls for ${name}`}>
                      <div className="cart-qty" aria-label="Quantity selector">
                        <button
                          type="button"
                          className="cart-qty__btn"
                          aria-label="Decrease quantity"
                          disabled={atMin}
                          onClick={() => handleQuantityChange(id, item.quantity - 1, guestProductSizeId, maxQty)}
                        >
                          −
                        </button>

                        {/* Text + inputMode numeric avoids native spinners and keeps UI consistent across browsers. */}
                        <input
                          className="cart-qty__input"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`Quantity for ${name}`}
                          value={String(item.quantity)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d]/g, "");
                            const parsed = raw ? parseInt(raw, 10) : 1;
                            handleQuantityChange(id, parsed, guestProductSizeId, maxQty);
                          }}
                        />

                        <button
                          type="button"
                          className="cart-qty__btn"
                          aria-label="Increase quantity"
                          disabled={reachedMax}
                          onClick={() => handleQuantityChange(id, item.quantity + 1, guestProductSizeId, maxQty)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-item__remove"
                        aria-label={`Remove ${name} from cart`}
                        onClick={() => handleRemove(id, guestProductSizeId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary" aria-label="Cart summary">
            <div className="cart-summary__row">
              <span>Total:</span>
              <span className="cart-summary__total">${total.toFixed(2)}</span>
            </div>

            <button type="button" className="cart-summary__pay" onClick={onPay} disabled={!items.length}>
              Pay
            </button>
          </aside>
        </>
      )}
    </section>
  );
}