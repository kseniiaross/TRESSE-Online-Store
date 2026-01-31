import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { Product } from "../types/product";
import { Link } from "react-router-dom";

import api from "../api/axiosInstance";
import { getAccessToken } from "../types/token";
import { fetchProducts } from "../api/products";
import { fetchWishlistCount } from "../store/wishListSlice";
import { toHttps } from "../utils/images";

import fallbackImg from "../assets/images/fallback_product.jpg";
import "../../styles/ProductCatalog.css";

import { addToCart } from "../utils/cartSlice";
import * as serverCart from "../store/serverCartSlice";

type ProductSizeItem = {
  id: number;
  quantity: number;
  size: { name: string };
};

const CATEGORY_MAP: Record<string, string> = {
  women: "woman",
  men: "man",
  kids: "kids",
};

const SESSION_EMAIL_KEY = "notify_email";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const normalizeEmail = (email: string) => String(email || "").trim();

const safeGetSessionEmail = (): string => {
  try {
    return normalizeEmail(sessionStorage.getItem(SESSION_EMAIL_KEY) || "");
  } catch {
    return "";
  }
};

const safeSetSessionEmail = (email: string) => {
  try {
    sessionStorage.setItem(SESSION_EMAIL_KEY, normalizeEmail(email));
  } catch {}
};

const SIZE_ORDER = ["XS", "S", "M", "L", "ONE SIZE", "OVER SIZE"] as const;

const normalizeSizeLabel = (name: string) =>
  String(name || "").trim().toUpperCase().replace(/\s+/g, " ");

const sizeRank = (name: string) => {
  const label = normalizeSizeLabel(name);
  const idx = SIZE_ORDER.indexOf(label as (typeof SIZE_ORDER)[number]);
  return idx === -1 ? 999 : idx;
};

const compareSizes = (a: string, b: string) => {
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (ra !== rb) return ra - rb;
  return normalizeSizeLabel(a).localeCompare(normalizeSizeLabel(b));
};

const getProductSizes = (p: Product): ProductSizeItem[] => {
  const raw = (p as unknown as { sizes?: unknown }).sizes;
  if (!Array.isArray(raw)) return [];
  return raw as ProductSizeItem[];
};

export default function ProductCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthed = !!getAccessToken();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>("");

  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<number, number>>({});
  const [addBusyByProduct, setAddBusyByProduct] = useState<Record<number, boolean>>({});

  const [notifyModalProduct, setNotifyModalProduct] = useState<Product | null>(null);
  const [guestNotifyEmail, setGuestNotifyEmail] = useState<string>(() => safeGetSessionEmail());

  const [sizeModalProductId, setSizeModalProductId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setLoadError("");

        const data = await fetchProducts();

        const items: Product[] = Array.isArray(data)
          ? (data as Product[])
          : Array.isArray((data as unknown as { results?: unknown })?.results)
            ? (((data as unknown as { results: Product[] }).results) as Product[])
            : [];

        if (!cancelled) setProducts(items);

        if (isAuthed) {
          dispatch(fetchWishlistCount());
        }
      } catch (e) {
        console.error("fetchProducts failed:", e);
        if (!cancelled) {
          setProducts([]);
          setLoadError("Could not load products. Check API base URL and CORS.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isAuthed]);

  const activeSizeModalProduct = useMemo(() => {
    if (!sizeModalProductId) return null;
    return products.find((p) => p.id === sizeModalProductId) ?? null;
  }, [products, sizeModalProductId]);

  const notifyMe = async (productId: number) => {
    if (!isAuthed && !isValidEmail(guestNotifyEmail)) return;

    await api.post(`/products/${productId}/subscribe_back_in_stock/`, {
      email: isAuthed ? undefined : normalizeEmail(guestNotifyEmail),
    });

    if (!isAuthed) safeSetSessionEmail(guestNotifyEmail);
    setNotifyModalProduct(null);
  };

  const handleAddToCart = async (apiItem: Product) => {
    const sizes = getProductSizes(apiItem).slice().sort((a, b) => compareSizes(a.size.name, b.size.name));

    const pickedSizeId = selectedSizeByProduct[apiItem.id];
    const picked = sizes.find((s) => s.id === pickedSizeId) ?? null;

    if (!pickedSizeId) {
      setSizeModalProductId(apiItem.id);
      return;
    }

    if (addBusyByProduct[apiItem.id]) return;

    try {
      setAddBusyByProduct((prev) => ({ ...prev, [apiItem.id]: true }));

      if (isAuthed) {
        await dispatch(serverCart.addCartItem({ product_size_id: pickedSizeId })).unwrap();
        await dispatch(serverCart.fetchCart());
      } else {
        dispatch(
          addToCart({
            product: apiItem,
            product_size_id: pickedSizeId,
            sizeName: picked?.size?.name,
            maxQty: picked?.quantity,
          })
        );
      }
    } catch (e) {
      console.error("add to cart error:", e);
      alert("Could not add to cart.");
    } finally {
      setAddBusyByProduct((prev) => ({ ...prev, [apiItem.id]: false }));
    }
  };

  return (
    <section className="catalog" aria-label="Product catalog">
      {loading && <div className="catalog__status">Loading products…</div>}

      {!loading && loadError && (
        <div className="catalog__status catalog__status--error">{loadError}</div>
      )}

      {!loading && !loadError && products.length === 0 && (
        <div className="catalog__status">No products found (empty API response).</div>
      )}

      <div className="catalog__grid" role="list" aria-label="Product list">
        {products.map((apiItem) => {
          const isOut = !apiItem.available || !apiItem.in_stock;

          const sizes = getProductSizes(apiItem)
            .slice()
            .sort((a, b) => compareSizes(a.size.name, b.size.name));

          const rawImg = apiItem.main_image_url || apiItem.images?.[0]?.image_url || "";
          const imgSrc = toHttps(rawImg) || fallbackImg;

          const addBusy = !!addBusyByProduct[apiItem.id];

          return (
            <article key={apiItem.id} className="catalog__card" role="listitem">
              <Link to={`/product/${apiItem.id}`} className="catalog__link" aria-label={`Open product: ${apiItem.name}`}>
                {/* IMPORTANT: keep media wrapper so images behave identically across cards */}
                <div className="catalog__media">
                  <img
                    src={imgSrc}
                    alt={apiItem.name}
                    className="catalog__image"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                </div>
              </Link>

              <div className="catalog__actions" aria-label="Product actions">
                {!isOut ? (
                  <button
                    type="button"
                    className="catalog__addBtn"
                    disabled={addBusy}
                    onClick={() => void handleAddToCart(apiItem)}
                  >
                    {addBusy ? "Adding..." : "Add to cart"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="catalog__notify-btn"
                    onClick={() => setNotifyModalProduct(apiItem)}
                    aria-label="Get restock alert"
                  >
                    Get restock alert
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Notify modal */}
      {notifyModalProduct && (
        <div className="sizeModal__overlay" onClick={() => setNotifyModalProduct(null)}>
          <div className="notifyModal" onClick={(e) => e.stopPropagation()}>
            <div className="notifyModal__head">
              <h3 className="notifyModal__title">Restock alert</h3>
              <button
                type="button"
                className="notifyModal__close"
                onClick={() => setNotifyModalProduct(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {isAuthed ? (
              <p className="notifyModal__text">
                We’ll email you as soon as this item is back in stock.
              </p>
            ) : (
              <>
                <p className="notifyModal__text">
                  Enter your email — we’ll notify you when it’s available again.
                </p>

                <input
                  type="email"
                  placeholder="your@email.com"
                  value={guestNotifyEmail}
                  onChange={(e) => setGuestNotifyEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                />
              </>
            )}

            <button
              className="notifyModal__primary"
              disabled={!isAuthed && !isValidEmail(guestNotifyEmail)}
              onClick={() => void notifyMe(notifyModalProduct.id)}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* NOTE: size modal placeholder (you already have styles; logic preserved) */}
      {activeSizeModalProduct && (
        <div className="sizeModal__overlay" onClick={() => setSizeModalProductId(null)}>
          <div className="sizeModal" onClick={(e) => e.stopPropagation()}>
            <div className="sizeModal__head">
              <div className="sizeModal__title">Select size</div>
              <button type="button" className="sizeModal__close" onClick={() => setSizeModalProductId(null)}>
                ×
              </button>
            </div>

            <div className="sizeModal__body">
              <div className="sizeModal__sizes">
                {getProductSizes(activeSizeModalProduct)
                  .slice()
                  .sort((a, b) => compareSizes(a.size.name, b.size.name))
                  .map((s) => {
                    const disabled = s.quantity <= 0;
                    const active = selectedSizeByProduct[activeSizeModalProduct.id] === s.id;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`sizeModal__chip ${active ? "sizeModal__chip--active" : ""}`}
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          setSelectedSizeByProduct((prev) => ({ ...prev, [activeSizeModalProduct.id]: s.id }));
                        }}
                        title={disabled ? "Out of stock" : `In stock: ${s.quantity}`}
                      >
                        {s.size.name}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                className="sizeModal__primary"
                disabled={!selectedSizeByProduct[activeSizeModalProduct.id]}
                onClick={() => {
                  setSizeModalProductId(null);
                  void handleAddToCart(activeSizeModalProduct);
                }}
              >
                Add to cart
              </button>

              <div className="sizeModal__hint">Choose an available size to continue.</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}