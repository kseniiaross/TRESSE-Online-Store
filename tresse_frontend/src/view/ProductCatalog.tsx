import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { Product } from "../types/product";
import { Link, useLocation } from "react-router-dom";

import api from "../api/axiosInstance";
import { getAccessToken } from "../types/token";
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

/** Email helpers */
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

/** Size sorting */
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
 * URL filters (category / collection / search)
 * --------------------------------------------------------- */

type CategoryKey = "" | "woman" | "man" | "kids";
type CollectionKey = "" | "the-new" | "bestsellers" | "exclusives";

/** Normalize any string into a canonical category key */
const normalizeCategory = (v: unknown): CategoryKey => {
  const x = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-");

  if (x === "woman" || x === "women" || x === "womens" || x === "female") return "woman";
  if (x === "man" || x === "men" || x === "mens" || x === "male") return "man";
  if (x === "kids" || x === "kid" || x === "children" || x === "child") return "kids";

  return "";
};

/** Normalize any string into a canonical collection key */
const normalizeCollection = (v: unknown): CollectionKey => {
  const x = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-");

  if (x === "the-new" || x === "new" || x === "new-arrivals" || x === "new-in") return "the-new";
  if (x === "bestsellers" || x === "best-sellers" || x === "best-seller") return "bestsellers";
  if (x === "exclusives" || x === "exclusive") return "exclusives";

  return "";
};

/** Read filters from URL (query only; stable and predictable) */
const readFilters = (location: ReturnType<typeof useLocation>) => {
  const params = new URLSearchParams(location.search);

  const category = normalizeCategory(params.get("category"));
  const collection = normalizeCollection(params.get("collection"));
  const search = String(params.get("search") || "").trim().toLowerCase();

  return { category, collection, search };
};

/** Safely extract strings from any unknown value */
const toStrings = (val: unknown): string[] => {
  if (val == null) return [];
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return [String(val)];

  if (Array.isArray(val)) {
    const out: string[] = [];
    for (const item of val) {
      out.push(...toStrings(item));
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (obj.slug) out.push(String(obj.slug));
        if (obj.name) out.push(String(obj.name));
      }
    }
    return out.filter(Boolean);
  }

  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const out: string[] = [];
    if (obj.slug) out.push(String(obj.slug));
    if (obj.name) out.push(String(obj.name));
    if (obj.value) out.push(String(obj.value));
    return out.filter(Boolean);
  }

  return [];
};

/** Derive product category key from backend shape (category.name/slug, gender, etc.) */
const getProductCategoryKey = (p: Product): CategoryKey => {
  const candidates: string[] = [];

  candidates.push(...toStrings((p as unknown as { category?: unknown }).category));
  candidates.push(...toStrings((p as unknown as { category?: { name?: unknown } }).category?.name));
  candidates.push(...toStrings((p as unknown as { category?: { slug?: unknown } }).category?.slug));

  candidates.push(...toStrings((p as unknown as { gender?: unknown }).gender));
  candidates.push(...toStrings((p as unknown as { department?: unknown }).department));
  candidates.push(...toStrings((p as unknown as { section?: unknown }).section));

  candidates.push(...toStrings((p as unknown as { categories?: unknown }).categories));
  candidates.push(...toStrings((p as unknown as { tags?: unknown }).tags));

  for (const c of candidates) {
    const k = normalizeCategory(c);
    if (k) return k;
  }
  return "";
};

/** Derive product collection key from backend shape (collection OR collections array) */
const getProductCollectionKey = (p: Product): CollectionKey => {
  const candidates: string[] = [];

  // supports: collection: "the-new"
  candidates.push(...toStrings((p as unknown as { collection?: unknown }).collection));

  // supports: collections: [{slug:"the-new"}] or collections_slugs: ["the-new"]
  candidates.push(...toStrings((p as unknown as { collections?: unknown }).collections));
  candidates.push(...toStrings((p as unknown as { collections_slugs?: unknown }).collections_slugs));
  candidates.push(...toStrings((p as unknown as { collections_names?: unknown }).collections_names));

  for (const c of candidates) {
    const k = normalizeCollection(c);
    if (k) return k;
  }
  return "";
};

/** Matchers */
const matchesCategory = (p: Product, wanted: CategoryKey): boolean => {
  if (!wanted) return true;
  return getProductCategoryKey(p) === wanted;
};

const matchesCollection = (p: Product, wanted: CollectionKey): boolean => {
  if (!wanted) return true;
  return getProductCollectionKey(p) === wanted;
};

const matchesSearch = (p: Product, q: string): boolean => {
  if (!q) return true;
  const name = String((p as unknown as { name?: unknown }).name ?? "").toLowerCase();
  const desc = String((p as unknown as { description?: unknown }).description ?? "").toLowerCase();
  return name.includes(q) || desc.includes(q);
};

/** ---------------------------------------------------------
 * Pagination-safe products loader (THIS is the fix)
 * --------------------------------------------------------- */

type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

const isPaginated = <T,>(data: unknown): data is PaginatedResponse<T> => {
  return !!data && typeof data === "object" && "results" in (data as Record<string, unknown>);
};

const uniqById = (items: Product[]): Product[] => {
  const map = new Map<number, Product>();
  for (const it of items) map.set(it.id, it);
  return Array.from(map.values());
};

const buildNextUrl = (next: string): string => {
  // If API returns absolute `next`, we can use it as-is
  return next;
};

export default function ProductCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();

  const isAuthed = !!getAccessToken();
  const { category, collection, search } = useMemo(() => readFilters(location), [location.search]);

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

        // ✅ Fetch ALL pages (because API is paginated: count/next/results)
        const pageSize = 200; // if backend supports it — fewer requests
        let url = `/products/?page_size=${pageSize}`;

        const collected: Product[] = [];
        const maxPages = 20; // safety guard
        let page = 0;

        while (url && page < maxPages) {
          page += 1;

          const res = await api.get(url);
          const data = res.data as unknown;

          if (Array.isArray(data)) {
            // non-paginated API
            collected.push(...(data as Product[]));
            break;
          }

          if (isPaginated<Product>(data)) {
            const results = Array.isArray(data.results) ? data.results : [];
            collected.push(...results);

            // stop if no next
            url = data.next ? buildNextUrl(data.next) : "";
            continue;
          }

          // unknown shape -> stop
          break;
        }

        const items = uniqById(collected);

        if (!cancelled) setAllProducts(items);

        if (isAuthed) {
          dispatch(fetchWishlistCount());
        }

        // Dev-only: show what categories exist in fetched dataset
        if (!cancelled && import.meta.env.DEV) {
          const catCount = items.reduce<Record<string, number>>((acc, p) => {
            const k = getProductCategoryKey(p) || "unknown";
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {});
          const colCount = items.reduce<Record<string, number>>((acc, p) => {
            const k = getProductCollectionKey(p) || "none";
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {});
          // eslint-disable-next-line no-console
          console.log("[Catalog debug] fetched products:", items.length);
          // eslint-disable-next-line no-console
          console.log("[Catalog debug] derived categories:", catCount);
          // eslint-disable-next-line no-console
          console.log("[Catalog debug] derived collections:", colCount);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("products load failed:", e);
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
      // eslint-disable-next-line no-console
      console.error("add to cart error:", e);
      alert("Could not add to cart.");
    } finally {
      setAddBusyByProduct((prev) => ({ ...prev, [apiItem.id]: false }));
    }
  };

  return (
    <section className="catalog" aria-label="Product catalog">
      {loading && <div className="catalog__status">Loading products…</div>}

      {!loading && loadError && <div className="catalog__status catalog__status--error">{loadError}</div>}

      {!loading && !loadError && products.length === 0 && <div className="catalog__status">No products found.</div>}

      <div className="catalog__grid" role="list" aria-label="Product list">
        {products.map((apiItem) => {
          const isOut = !apiItem.available || !apiItem.in_stock;

          const rawImg = apiItem.main_image_url || apiItem.images?.[0]?.image_url || "";
          const imgSrc = toHttps(rawImg) || fallbackImg;

          const addBusy = !!addBusyByProduct[apiItem.id];

          return (
            <article key={apiItem.id} className="catalog__card" role="listitem">
              <Link to={`/product/${apiItem.id}`} className="catalog__link" aria-label={`Open product: ${apiItem.name}`}>
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
                  <button type="button" className="catalog__addBtn" disabled={addBusy} onClick={() => void handleAddToCart(apiItem)}>
                    {addBusy ? "Adding..." : "Add to cart"}
                  </button>
                ) : (
                  <button type="button" className="catalog__notify-btn" onClick={() => setNotifyModalProduct(apiItem)} aria-label="Get restock alert">
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
              <button type="button" className="notifyModal__close" onClick={() => setNotifyModalProduct(null)} aria-label="Close">
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

            <button className="notifyModal__primary" disabled={!isAuthed && !isValidEmail(guestNotifyEmail)} onClick={() => void notifyMe(notifyModalProduct.id)}>
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