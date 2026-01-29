import { useEffect, useMemo, useRef } from "react";
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

/** Defensive price parsing: invalid values must not break totals. */
const toMoney = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Guest image field may vary depending on how local cart was stored.
 * Support both shapes: { image_url } and legacy { image }.
 */
const getFirstGuestImage = (item: GuestCartItem): string | null => {
  const list = item.images;
  if (!Array.isArray(list) || list.length === 0) return null;

  const first: unknown = list[0];
  if (!first || typeof first !== "object") return null;

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

 
  const isAuthed = !!localStorage.getItem("access");

  const cart = useAppSelector((s: RootState) => s.serverCart.cart);
  const loading = useAppSelector((s: RootState) => s.serverCart.loading);

  const guestItems = useAppSelector(selectGuestCartItems) as GuestCartItem[];
  const serverItems = (cart?.items ?? []) as CartItemDto[];

  const hasGuest = guestItems.length > 0;
  const hasServer = serverItems.length > 0;

  const usingServer = isAuthed && (hasServer || !hasGuest);
  const items: Array<CartItemDto | GuestCartItem> = usingServer ? serverItems : guestItems;

  const didInitRef = useRef(false);

  useEffect(() => {
    if (!isAuthed) return;

    if (didInitRef.current) return;
    didInitRef.current = true;

    let alive = true;

    (async () => {
      try {
        if (hasGuest) await dispatch(serverCart.mergeGuestCart());
        if (!alive) return;
        await dispatch(serverCart.fetchCart());
      } catch {
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
      void dispatch(serverCart.updateCartItem({ item_id: id, quantity: clamped }));
      return;
    }

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
      const next = encodeURIComponent("/order");
      navigate(`/login-choice?next=${next}`);
      return;
    }
    navigate("/order");
  };

  return (
    <section className="cart" aria-label="Shopping cart">
      <header className="cart__head">
        <h1 className="cart__title">Shopping Cart</h1>
        {isAuthed && loading ? <p className="cart__status">Loading…</p> : null}
      </header>

      {items.length === 0 ? (
        <div className="cart__empty" role="status" aria-live="polite">
          <p className="cart__emptyText">Your cart is empty.</p>
        </div>
      ) : (
        <>
          <div className="cart__grid" role="list" aria-label="Cart items">
            {items.map((item) => {
              const isGuest = !usingServer;

              const key = usingServer
                ? String((item as CartItemDto).id)
                : `${(item as GuestCartItem).id}-${(item as GuestCartItem).product_size_id}`;

              const id = item.id;

              const name = usingServer
                ? (item as CartItemDto).product_size.product.name
                : (item as GuestCartItem).name;

              const priceStr = usingServer
                ? (item as CartItemDto).product_size.product.price
                : (item as GuestCartItem).price;

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
                  <div className="cart-item__media" aria-hidden="true">
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
                    <div className="cart-item__row cart-item__row--top">
                      <div className="cart-item__name" title={name}>
                        {name}
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

                    {(sizeName || typeof maxQty === "number") && (
                      <div className="cart-item__meta">
                        {sizeName ? <span className="cart-item__sub">Size: {sizeName}</span> : null}
                        {typeof maxQty === "number" ? (
                          <span className="cart-item__sub">In stock: {maxQty}</span>
                        ) : null}
                      </div>
                    )}

                    <div className="cart-item__row cart-item__row--bottom">
                      <div className="cart-item__price">${priceStr}</div>

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
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary" aria-label="Cart summary">
            <div className="cart-summary__row">
              <span className="cart-summary__label">Total</span>
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