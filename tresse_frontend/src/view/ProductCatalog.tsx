import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { Product } from "../types/product";
import { Link, useLocation } from "react-router-dom";

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

/** ---------------------------------------------------------
 * Filters (category / collection / search)
 * --------------------------------------------------------- */

/** Normalize category values coming from URL or backend */
const normalizeCategory = (v: string) => {
  const x = String(v || "").trim().toLowerCase();
  if (x === "women" || x === "woman") return "woman";
  if (x === "men" || x === "man") return "man";
  if (x === "kids" || x === "kid") return "kids";
  return "";
};

/** Only allow known collections to avoid filtering everything by accident */
const normalizeCollection = (v: string) => {
  const x = String(v || "").trim().toLowerCase();
  if (x === "the-new" || x === "bestsellers" || x === "exclusives") return x;
  return "";
};

/**
 * Reads filters from URL:
 * - /catalog?category=woman|man|kids
 * - /catalog?collection=the-new|bestsellers|exclusives
 * - /catalog?search=query
 * Also supports path: /catalog/woman (optional)
 * Backward-compat: if someone uses collection=kids -> treat as category kids.
 */
const readFilters = (location: ReturnType<typeof useLocation>) => {
  const params = new URLSearchParams(location.search);

  const queryCategory = normalizeCategory(params.get("category") || "");
  const rawCollection = String(params.get("collection") || "").trim().toLowerCase();
  const querySearch = String(params.get("search") || "").trim().toLowerCase();

  // Try path-based category (e.g. /catalog/woman) if you use such routes
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1] || "";
  const pathCategory = normalizeCategory(lastPart);

  // Backward compatibility: collection=kids should behave like category=kids
  const collectionAsCategory = normalizeCategory(rawCollection);

  const category = pathCategory || queryCategory || collectionAsCategory;

  // If category is set -> ignore collection so we don't "double-filter" into empty results
  const collection = category ? "" : normalizeCollection(rawCollection);

  const search = querySearch;

  return { category, collection, search };
};

/** Matches category against multiple possible backend fields */
const matchesCategory = (p: Product, categoryKey: string): boolean => {
  if (!categoryKey) return true;
  const k = categoryKey.toLowerCase();

  // Use safe access without `any` if possible
  const categoryName = String((p as unknown as { category?: { name?: unknown } })?.category?.name ?? "")
    .trim()
    .toLowerCase();

  const categorySlug = String((p as unknown as { category?: { slug?: unknown } })?.category?.slug ?? "")
    .trim()
    .toLowerCase();

  const gender = String((p as unknown as { gender?: unknown })?.gender ?? "")
    .trim()
    .toLowerCase();

  const collection = String((p as unknown as { collection?: unknown })?.collection ?? "")
    .trim()
    .toLowerCase();

  // Direct matches
  if (categoryName === k) return true;
  if (categorySlug === k) return true;
  if (gender === k) return true;

  // Sometimes backend stores plural values
  if (k === "man" && (categoryName === "men" || categorySlug === "men" || gender === "men")) return true;
  if (k === "woman" && (categoryName === "women" || categorySlug === "women" || gender === "women")) return true;

  // Fallback: some backends mistakenly put category into `collection`
  if (collection === k) return true;

  return false;
};

/** Matches collection against backend field `collection` (extend later if needed) */
const matchesCollection = (p: Product, collectionKey: string): boolean => {
  if (!collectionKey) return true;
  const c = collectionKey.toLowerCase();

  const collection = String((p as unknown as { collection?: unknown })?.collection ?? "")
    .trim()
    .toLowerCase();

  return collection === c;
};

/** Simple client-side search (name + description) */
const matchesSearch = (p: Product, q: string): boolean => {
  if (!q) return true;

  const name = String((p as unknown as { name?: unknown })?.name ?? "").toLowerCase();
  const desc = String((p as unknown as { description?: unknown })?.description ?? "").toLowerCase();

  return name.includes(q) || desc.includes(q);
};

export default function ProductCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();

  const isAuthed = !!getAccessToken();

  const { category, collection, search } = useMemo(
    () => readFilters(location),
    [location.pathname, location.search]
  );

  const [allProducts, setAllProducts] = useState<Product[]>([]);
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

        // Load once without server-side filters (most stable)
        const data = await fetchProducts();

        const items: Product[] = Array.isArray(data)
          ? (data as Product[])
          : Array.isArray((data as unknown as { results?: unknown })?.results)
            ? (((data as unknown as { results: Product[] }).results) as Product[])
            : [];

        if (!cancelled) setAllProducts(items);

        if (isAuthed) {
          dispatch(fetchWishlistCount());
        }
      } catch (e) {
        console.error("fetchProducts failed:", e);
        if (!cancelled) {
          setAllProducts([]);
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

  // Apply URL filters (category OR collection) + search
  const products = useMemo(() => {
    return allProducts
      .filter((p) => matchesCategory(p, category))
      .filter((p) => matchesCollection(p, collection))
      .filter((p) => matchesSearch(p, search));
  }, [allProducts, category, collection, search]);

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
    const sizes = getProductSizes(apiItem)
      .slice()
      .sort((a, b) => compareSizes(a.size.name, b.size.name));

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
        <div className="catalog__status">No products found.</div>
      )}

      <div className="catalog__grid" role="list" aria-label="Product list">
        {products.map((apiItem) => {
          const isOut = !apiItem.available || !apiItem.in_stock;

          const rawImg = apiItem.main_image_url || apiItem.images?.[0]?.image_url || "";
          const imgSrc = toHttps(rawImg) || fallbackImg;

          const addBusy = !!addBusyByProduct[apiItem.id];

          return (
            <article key={apiItem.id} className="catalog__card" role="listitem">
              <Link
                to={`/product/${apiItem.id}`}
                className="catalog__link"
                aria-label={`Open product: ${apiItem.name}`}
              >
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
              <h3 className="notifyModal__title">Notify me</h3>
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
              <p className="notifyModal__text">We’ll email you as soon as this item is back in stock.</p>
            ) : (
              <>
                <p className="notifyModal__text">Enter your email — we’ll notify you when it’s available again.</p>
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

      {/* Size modal */}
      {activeSizeModalProduct && (
        <div className="sizeModal__overlay" onClick={() => setSizeModalProductId(null)}>
          <div className="sizeModal" onClick={(e) => e.stopPropagation()}>
            <div className="sizeModal__head">
              <div className="sizeModal__title">Select size</div>
              <button
                type="button"
                className="sizeModal__close"
                onClick={() => setSizeModalProductId(null)}
              >
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
                          setSelectedSizeByProduct((prev) => ({
                            ...prev,
                            [activeSizeModalProduct.id]: s.id,
                          }));
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