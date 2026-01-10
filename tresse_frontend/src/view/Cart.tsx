import { useEffect } from "react";
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
import "../../styles/ProductCatalog.css";
import "../../styles/Cart.css";

type ServerCartItem = {
  id: number;
  quantity: number;
  product_size: {
    id: number;
    quantity: number; // stock
    size?: { name?: string };
    product: {
      name: string;
      price: string;
      main_image_url?: string | null;
      images?: Array<{ image: string }>;
    };
  };
};

type GuestCartItem = {
  id: number;
  quantity: number;
  product_size_id: number;
  maxQty?: number;
  name: string;
  price: string;
  main_image_url?: string | null;
  images?: Array<{ image: string }>;
};

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

const Cart = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAuthed = !!localStorage.getItem("access");

  const cart = useAppSelector((s: RootState) => s.serverCart.cart);
  const loading = useAppSelector((s: RootState) => s.serverCart.loading);

  const guestItems = useAppSelector(selectGuestCartItems) as GuestCartItem[];
  const serverItems = (cart?.items ?? []) as ServerCartItem[];

  const hasGuest = guestItems.length > 0;
  const hasServer = serverItems.length > 0;

  // важно: если authed — показываем именно server cart,
  // а если server cart ещё пустой/не пришёл — временно показываем guest
  const usingServer = isAuthed && (hasServer || !hasGuest);

  const items: Array<ServerCartItem | GuestCartItem> = usingServer ? serverItems : guestItems;

  useEffect(() => {
    if (!isAuthed) return;

    (async () => {
      // если есть guest items — мёрджим, потом фетчим сервер
      if (hasGuest) await dispatch(serverCart.mergeGuestCart());
      await dispatch(serverCart.fetchCart());
    })();
  }, [isAuthed, hasGuest, dispatch]);

  const total = usingServer
    ? serverItems.reduce((sum, it) => sum + parseFloat(it.product_size.product.price) * it.quantity, 0)
    : guestItems.reduce((sum, it) => sum + parseFloat(it.price) * it.quantity, 0);

  const handleQuantityChange = (id: number, nextQty: number, product_size_id?: number, maxQty?: number) => {
    const clamped = clampQty(nextQty, maxQty);

    if (usingServer) {
      void dispatch(serverCart.updateCartItem({ item_id: id, quantity: clamped }));
      return;
    }

    if (product_size_id == null) return;
    dispatch(updateGuestQty({ id, product_size_id, quantity: clamped }));
  };

  const handleRemove = (id: number, product_size_id?: number) => {
    if (usingServer) {
      void dispatch(serverCart.removeCartItem(id));
      return;
    }

    if (product_size_id == null) return;
    dispatch(removeGuestItem({ id, product_size_id }));
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
    <div className="cart-page">
      <h2 className="cart-title">Shopping Cart</h2>

      {isAuthed && loading && <p>Loading…</p>}

      {items.length === 0 ? (
        <p className="cart-empty">Your cart is empty</p>
      ) : (
        <>
          <div className="product-grid">
            {items.map((item) => {
              const isGuest = !usingServer;

              const key = usingServer
                ? String((item as ServerCartItem).id)
                : `${(item as GuestCartItem).id}-${(item as GuestCartItem).product_size_id}`;

              const id = item.id;

              const name = usingServer
                ? (item as ServerCartItem).product_size.product.name
                : (item as GuestCartItem).name;

              const priceStr = usingServer
                ? (item as ServerCartItem).product_size.product.price
                : (item as GuestCartItem).price;

              const imgSrc = usingServer
                ? ((item as ServerCartItem).product_size.product.main_image_url ??
                    (item as ServerCartItem).product_size.product.images?.[0]?.image ??
                    fallbackImg)
                : ((item as GuestCartItem).main_image_url ??
                    (item as GuestCartItem).images?.[0]?.image ??
                    fallbackImg);

              const guestProductSizeId = isGuest ? (item as GuestCartItem).product_size_id : undefined;

              const sizeName = usingServer ? (item as ServerCartItem).product_size.size?.name ?? null : null;

              const maxQty = usingServer
                ? (item as ServerCartItem).product_size.quantity
                : (item as GuestCartItem).maxQty;

              const reachedMax = typeof maxQty === "number" ? item.quantity >= maxQty : false;
              const atMin = item.quantity <= 1;

              return (
                <div key={key} className="pc-card" onClick={(e) => e.stopPropagation()}>
                  <div className="pc-thumb-wrap">
                    <img
                      src={imgSrc || fallbackImg}
                      alt={name}
                      className="pc-thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImg;
                      }}
                    />
                  </div>

                  <div className="pc-meta">
                    <div className="pc-name" title={name}>
                      {name}
                    </div>
                    <div className="pc-price">${priceStr}</div>
                  </div>

                  {sizeName && <div className="cart-size">Size: {sizeName}</div>}
                  {typeof maxQty === "number" && <div className="cart-stock">In stock: {maxQty}</div>}

                  <div className="cart-controls" onClick={(e) => e.stopPropagation()}>
                    <div className="qty">
                      <button
                        className="qty-btn"
                        aria-label="Decrease quantity"
                        disabled={atMin}
                        onClick={() => handleQuantityChange(id, item.quantity - 1, guestProductSizeId, maxQty)}
                      >
                        −
                      </button>

                      {/* ✅ ВАЖНО: не number, а text → убирает вертикальные стрелки везде */}
                      <input
                        className="qty-input"
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
                        className="qty-btn"
                        aria-label="Increase quantity"
                        disabled={reachedMax}
                        onClick={() => handleQuantityChange(id, item.quantity + 1, guestProductSizeId, maxQty)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="remove-btn"
                      aria-label={`Remove ${name} from cart`}
                      onClick={() => handleRemove(id, guestProductSizeId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="cart-summary__row">
              <span>Total:</span>
              <span className="cart-summary__total">${total.toFixed(2)}</span>
            </div>
            <button className="pay-btn" onClick={onPay} disabled={!items.length}>
              Pay
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;