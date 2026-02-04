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

const toMoney = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getFirstGuestImage = (item: GuestCartItem): string | null => {
  const list = item.images;
  if (!Array.isArray(list) || list.length === 0) return null;

  const first = list[0] as Record<string, unknown>;
  if (typeof first?.image_url === "string") return first.image_url;
  if (typeof first?.image === "string") return first.image;

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

  // Cart source strategy:
  // - Guests use local (Redux) cart for instant UX.
  // - Signed-in users prefer server cart (single source of truth).
  // - If guest cart exists, we merge it once after login and then rely on server cart.
  const hasGuest = guestItems.length > 0;
  const hasServer = serverItems.length > 0;

  const usingServer = isAuthed && (hasServer || !hasGuest);
  const items = usingServer ? serverItems : guestItems;

  // Prevent double-merge:
  // React StrictMode can run effects twice in dev, so we guard mergeGuestCart()
  // to avoid duplicate server items or repeated network calls.
  const didMergeRef = useRef(false);

  useEffect(() => {
    if (!isAuthed) return;
    dispatch(serverCart.fetchCart());
  }, [isAuthed, dispatch]);

  useEffect(() => {
    if (!isAuthed || !hasGuest || didMergeRef.current) return;

    didMergeRef.current = true;

    (async () => {
      try {
        // Best-effort merge: if it fails, we keep guest cart working and don't block the user.
        await dispatch(serverCart.mergeGuestCart());
        await dispatch(serverCart.fetchCart());
      } catch {
        // silent
      }
    })();
  }, [isAuthed, hasGuest, dispatch]);

  const total = useMemo(() => {
    return usingServer
      ? serverItems.reduce(
          (sum, it) => sum + toMoney(it.product_size.product.price) * it.quantity,
          0
        )
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
      dispatch(serverCart.updateCartItem({ item_id: id, quantity: clamped }));
      return;
    }

    if (guestProductSizeId == null) return;
    dispatch(updateGuestQty({ id, product_size_id: guestProductSizeId, quantity: clamped }));
  };

  const handleRemove = (id: number, guestProductSizeId?: number) => {
    if (usingServer) {
      dispatch(serverCart.removeCartItem(id));
      return;
    }

    if (guestProductSizeId == null) return;
    dispatch(removeGuestItem({ id, product_size_id: guestProductSizeId }));
  };

  const onPay = () => {
    // Preserve intended destination after auth.
    if (!isAuthed) {
      navigate(`/login-choice?next=${encodeURIComponent("/order")}`);
      return;
    }
    navigate("/order");
  };

  return (
    <section className="cart" aria-label="Shopping cart">
      <header className="cart__head">
        <h1 className="cart__title">Shopping Cart</h1>
        {isAuthed && loading && <p className="cart__status">Loading…</p>}
      </header>

      {items.length === 0 && !(isAuthed && loading) ? (
        <div className="cart__empty" role="status" aria-live="polite">
          <p className="cart__emptyText">Your cart is empty.</p>
        </div>
      ) : (
        <>
          <div className="cart__grid" role="list">
            {items.map((item) => {
              const isGuest = !usingServer;

              const key = usingServer
                ? String(item.id)
                : `${item.id}-${(item as GuestCartItem).product_size_id}`;

              const name = usingServer
                ? (item as CartItemDto).product_size.product.name
                : (item as GuestCartItem).name;

              const price = usingServer
                ? (item as CartItemDto).product_size.product.price
                : (item as GuestCartItem).price;

              const imgSrc = usingServer
                ? (item as CartItemDto).product_size.product.main_image_url ?? fallbackImg
                : (item as GuestCartItem).main_image_url ??
                  getFirstGuestImage(item as GuestCartItem) ??
                  fallbackImg;

              const sizeName = usingServer
                ? (item as CartItemDto).product_size.size?.name
                : null;

              const maxQty = usingServer
                ? (item as CartItemDto).product_size.quantity
                : (item as GuestCartItem).maxQty;

              const guestProductSizeId = isGuest
                ? (item as GuestCartItem).product_size_id
                : undefined;

              return (
                <article key={key} className="cart-item" role="listitem">
                  <div className="cart-item__media">
                    <img
                      src={imgSrc}
                      alt={name}
                      className="cart-item__img"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImg;
                      }}
                    />
                  </div>

                  <div className="cart-item__body">
                    <div className="cart-item__row">
                      <div className="cart-item__name">{name}</div>
                      <button
                        type="button"
                        className="cart-item__remove"
                        onClick={() => handleRemove(item.id, guestProductSizeId)}
                      >
                        Remove
                      </button>
                    </div>

                    {(sizeName || typeof maxQty === "number") && (
                      <div className="cart-item__meta">
                        {sizeName && <span className="cart-item__sub">Size: {sizeName}</span>}
                        {typeof maxQty === "number" && (
                          <span className="cart-item__sub">In stock: {maxQty}</span>
                        )}
                      </div>
                    )}

                    <div className="cart-item__row cart-item__row--bottom">
                      <div className="cart-item__price">${price}</div>

                      <div className="cart-qty">
                        <button
                          type="button"
                          className="cart-qty__btn"
                          aria-label={`Decrease quantity for ${name}`}
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            handleQuantityChange(
                              item.id,
                              item.quantity - 1,
                              guestProductSizeId,
                              maxQty
                            )
                          }
                        >
                          −
                        </button>

                        <input
                          className="cart-qty__input"
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          aria-label={`Quantity for ${name}`}
                          value={item.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw.trim() === "") {
                              handleQuantityChange(item.id, 1, guestProductSizeId, maxQty);
                              return;
                            }
                            const digitsOnly = raw.replace(/[^\d]/g, "");
                            handleQuantityChange(
                              item.id,
                              digitsOnly === "" ? 1 : Number(digitsOnly),
                              guestProductSizeId,
                              maxQty
                            )
                          }}
                        />

                        <button
                          type="button"
                          className="cart-qty__btn"
                          aria-label={`Increase quantity for ${name}`}
                          disabled={typeof maxQty === "number" && item.quantity >= maxQty}
                          onClick={() =>
                            handleQuantityChange(
                              item.id,
                              item.quantity + 1,
                              guestProductSizeId,
                              maxQty
                            )
                          }
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

          <aside className="cart-summary">
            <span className="cart-summary__label">Total</span>
            <span className="cart-summary__total">${total.toFixed(2)}</span>
            <button className="cart-summary__pay" type="button" onClick={onPay}>
              Pay
            </button>
          </aside>
        </>
      )}
    </section>
  );
}