import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { Product } from "../types/product";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/axiosInstance";
import { getAccessToken } from "../types/token";
import { fetchProducts } from "../api/products";
import { fetchWishlistCount } from "../store/wishListSlice";

import fallbackImg from "../assets/images/fallback_product.jpg";
import "../../styles/ProductCatalog.css";

import { addToCart } from "../utils/cartSlice";
import * as serverCart from "../store/serverCartSlice";

type ProductSizeItem = {
  id: number;
  quantity: number;
  size: {
    name: string;
  };
};

const CATEGORY_MAP: Record<string, string> = {
  women: "woman",
  men: "man",
  kids: "kids",
};

const SESSION_EMAIL_KEY = "notify_email";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const normalizeEmail = (email: string) => String(email || "").trim();

const safeGetSessionEmail = (): string => {
  try {
    const raw = sessionStorage.getItem(SESSION_EMAIL_KEY) || "";
    return normalizeEmail(raw);
  } catch {
    return "";
  }
};

const safeSetSessionEmail = (email: string) => {
  try {
    sessionStorage.setItem(SESSION_EMAIL_KEY, normalizeEmail(email));
  } catch {
    // Intentionally ignore storage write failures (Safari private mode, quota, etc.)
  }
};

const safeClearSessionEmail = () => {
  try {
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
  } catch {
    // Intentionally ignore
  }
};

const getAuthedEmail = (): string => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw) as { email?: string };
    return normalizeEmail(user?.email || "");
  } catch {
    return "";
  }
};

/**
 * Custom size order (real-store style, not alphabetical)
 * XS, S, M, L, ONE SIZE, OVER SIZE
 * Everything else goes to the end and is sorted alphabetically there.
 */
const SIZE_ORDER = ["XS", "S", "M", "L", "ONE SIZE", "OVER SIZE"] as const;

const normalizeSizeLabel = (name: string) =>
  String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const sizeRank = (name: string) => {
  const label = normalizeSizeLabel(name);
  const idx = SIZE_ORDER.indexOf(label as (typeof SIZE_ORDER)[number]);
  return idx === -1 ? 999 : idx;
};

const compareSizes = (aName: string, bName: string) => {
  const ra = sizeRank(aName);
  const rb = sizeRank(bName);
  if (ra !== rb) return ra - rb;
  return normalizeSizeLabel(aName).localeCompare(normalizeSizeLabel(bName));
};

const getProductSizes = (p: Product): ProductSizeItem[] => {
  const raw = (p as unknown as { sizes?: unknown }).sizes;
  if (!Array.isArray(raw)) return [];
  return raw as ProductSizeItem[];
};

type NotifyBlockProps = {
  productId: number;
  isAuthed: boolean;
  guestNotifyEmail: string;
  notifyOpenByProduct: Record<number, boolean>;
  notifyDoneByProduct: Record<number, boolean>;
  setNotifyOpenByProduct: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setNotifyDoneByProduct: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setGuestNotifyEmail: React.Dispatch<React.SetStateAction<string>>;
  notifyMe: (productId: number, email: string) => Promise<void>;
};

function NotifyBlock({
  productId,
  isAuthed,
  guestNotifyEmail,
  notifyOpenByProduct,
  notifyDoneByProduct,
  setNotifyOpenByProduct,
  setNotifyDoneByProduct,
  setGuestNotifyEmail,
  notifyMe,
}: NotifyBlockProps) {
  const done = !!notifyDoneByProduct[productId];
  const open = !!notifyOpenByProduct[productId];

  const authedEmail = isAuthed ? getAuthedEmail() : "";
  const rememberedGuestEmail = !isAuthed ? normalizeEmail(guestNotifyEmail) : "";
  const rememberedEmail = isAuthed ? authedEmail : rememberedGuestEmail;

  const [emailInput, setEmailInput] = useState("");

  const guestHasValidRememberedEmail = isValidEmail(rememberedGuestEmail);
  const showEmailInput = !isAuthed && open && !done && !guestHasValidRememberedEmail;

  const onClickNotify = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (done) return;

    if (isAuthed) {
      if (!isValidEmail(authedEmail)) {
        alert("We couldn't detect your email. Please log in again.");
        return;
      }
      void notifyMe(productId, authedEmail);
      return;
    }

    if (guestHasValidRememberedEmail) {
      void notifyMe(productId, rememberedGuestEmail);
      return;
    }

    // If we have a remembered but invalid email, clear it to avoid bad UX loops.
    if (rememberedGuestEmail && !guestHasValidRememberedEmail) {
      setGuestNotifyEmail("");
      safeClearSessionEmail();
    }

    setNotifyOpenByProduct((prev) => ({ ...prev, [productId]: true }));
  };

  const onSubmitEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    void notifyMe(productId, emailInput);
  };

  return (
    <div className="catalog__notify" onClick={(e) => e.stopPropagation()}>
      <button className="catalog__notify-btn" type="button" onClick={onClickNotify} aria-expanded={open}>
        Notify me
      </button>

      {done && (
        <div className="catalog__notify-status" role="status" aria-live="polite">
          You’ll be notified{rememberedEmail ? ` at ${rememberedEmail}` : ""}.
        </div>
      )}

      {showEmailInput && (
        <div className="catalog__notify-inline" role="group" aria-label="Email notification signup">
          <label className="srOnly" htmlFor={`notify_email_${productId}`}>
            Email address
          </label>

          <input
            id={`notify_email_${productId}`}
            type="email"
            placeholder="your@email.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />

          <button type="button" onClick={onSubmitEmail} disabled={!isValidEmail(emailInput)}>
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const rawCategory = params.get("category") ?? "";
  const effectiveCategory = CATEGORY_MAP[rawCategory] ?? rawCategory;

  // Single source of truth for auth status in the catalog.
  const isAuthed = !!getAccessToken();

  const [ordering, setOrdering] = useState("-created_at");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Size selection per product
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<number, number>>({});

  // Anti double-click per product (prevents duplicate add requests)
  const [addBusyByProduct, setAddBusyByProduct] = useState<Record<number, boolean>>({});

  // Notify state
  const [guestNotifyEmail, setGuestNotifyEmail] = useState<string>(() => safeGetSessionEmail());
  const [notifyOpenByProduct, setNotifyOpenByProduct] = useState<Record<number, boolean>>({});
  const [notifyDoneByProduct, setNotifyDoneByProduct] = useState<Record<number, boolean>>({});

  const saveGuestEmail = (email: string) => {
    const v = normalizeEmail(email);
    setGuestNotifyEmail(v);
    safeSetSessionEmail(v);
  };

  // Debounce search term to avoid flooding the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [effectiveCategory]);

  // Fetch products (AbortController prevents race conditions when filters change fast)
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    fetchProducts(
      {
        page,
        page_size: pageSize,
        category: effectiveCategory || undefined,
        in_stock: showAvailableOnly ? true : undefined,
        ordering: ordering || undefined,
        min_price: minPrice === "" ? undefined : minPrice,
        max_price: maxPrice === "" ? undefined : maxPrice,
        search: debouncedSearch || undefined,
      },
      ctrl.signal
    )
      .then((data) => {
        setProducts(data.results);
        setTotal(data.count);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error("Error fetching products:", err);
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [effectiveCategory, showAvailableOnly, minPrice, maxPrice, ordering, page, pageSize, debouncedSearch]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const handleToggleWishlist = async (productId: number) => {
    if (!isAuthed) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login-choice?next=${next}`);
      return;
    }

    try {
      await api.post(`/products/${productId}/toggle_wishlist/`);

      // Sync global header counter + local card state.
      dispatch(fetchWishlistCount());
      localStorage.setItem("wishlist:ping", String(Date.now()));

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_in_wishlist: !p.is_in_wishlist } : p))
      );
    } catch (e) {
      console.error("toggle_wishlist error:", e);
    }
  };

  const handleAddToCart = async (apiItem: Product) => {
    const productSizeId = selectedSizeByProduct[apiItem.id];
    if (!productSizeId) {
      alert("Please select a size.");
      return;
    }

    if (addBusyByProduct[apiItem.id]) return;

    const sizes = getProductSizes(apiItem);
    const picked = sizes.find((s) => s.id === productSizeId);

    try {
      setAddBusyByProduct((prev) => ({ ...prev, [apiItem.id]: true }));

      if (isAuthed) {
        await dispatch(serverCart.addCartItem({ product_size_id: productSizeId })).unwrap();
        await dispatch(serverCart.fetchCart());
      } else {
        dispatch(
          addToCart({
            product: apiItem,
            product_size_id: productSizeId,
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

  const notifyMe = async (productId: number, email: string) => {
    const finalEmail = normalizeEmail(email);
    if (!isValidEmail(finalEmail)) {
      alert("Please enter a valid email.");
      return;
    }

    try {
      await api.post(`/products/${productId}/subscribe_back_in_stock/`, { email: finalEmail });

      setNotifyDoneByProduct((prev) => ({ ...prev, [productId]: true }));
      setNotifyOpenByProduct((prev) => ({ ...prev, [productId]: false }));

      if (!isAuthed) saveGuestEmail(finalEmail);
    } catch (e) {
      console.error("subscribe_back_in_stock error:", e);
      alert("Failed to subscribe. Check email and try again.");
    }
  };

  return (
    <section className="catalog" aria-label="Product catalog">
      <div className="catalog__filters" aria-label="Catalog filters">
        <label className="srOnly" htmlFor="catalog_search">
          Search products
        </label>
        <input
          id="catalog_search"
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="catalog__input"
        />

        <label className="catalog__checkbox">
          <input
            type="checkbox"
            checked={showAvailableOnly}
            onChange={(e) => {
              setShowAvailableOnly(e.target.checked);
              setPage(1);
            }}
          />
          Only available
        </label>

        <select
          value={ordering}
          onChange={(e) => {
            setOrdering(e.target.value);
            setPage(1);
          }}
          className="catalog__select"
          aria-label="Sort products"
        >
          <option value="-created_at">Newest first</option>
          <option value="price">Price: low → high</option>
          <option value="-price">Price: high → low</option>
          <option value="name">Name: A → Z</option>
          <option value="-name">Name: Z → A</option>
        </select>

        <div className="catalog__price" role="group" aria-label="Price range">
          <label className="srOnly" htmlFor="min_price">
            Minimum price
          </label>
          <input
            id="min_price"
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => {
              const v = e.target.value;
              setMinPrice(v === "" ? "" : Number(v));
              setPage(1);
            }}
            className="catalog__input catalog__input--price"
          />

          <label className="srOnly" htmlFor="max_price">
            Maximum price
          </label>
          <input
            id="max_price"
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => {
              const v = e.target.value;
              setMaxPrice(v === "" ? "" : Number(v));
              setPage(1);
            }}
            className="catalog__input catalog__input--price"
          />
        </div>
      </div>

      {loading && (
        <div className="catalog__loader" role="status" aria-live="polite">
          Loading…
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="catalog__empty" role="status" aria-live="polite">
          No products found.
        </div>
      )}

      <div className="catalog__grid" role="list" aria-label="Product list">
        {products.map((apiItem) => {
          const imgSrc = apiItem.main_image_url || apiItem.images?.[0]?.image_url || fallbackImg;

          const sizes = getProductSizes(apiItem)
            .slice()
            .sort((a, b) => compareSizes(a.size.name, b.size.name));

          const chosenSizeId = selectedSizeByProduct[apiItem.id];
          const isOut = !apiItem.available || !apiItem.in_stock;
          const addBusy = !!addBusyByProduct[apiItem.id];

          return (
            <article key={apiItem.id} className="catalog__card" role="listitem">
              <button
                type="button"
                className={`catalog__wishlist-btn ${apiItem.is_in_wishlist ? "catalog__wishlist-btn--active" : ""}`}
                aria-label={apiItem.is_in_wishlist ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={!!apiItem.is_in_wishlist}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleToggleWishlist(apiItem.id);
                }}
              >
                <span className="srOnly">
                  {apiItem.is_in_wishlist ? "Remove from wishlist" : "Add to wishlist"}
                </span>
              </button>

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

                {isOut && <span className="catalog__badge">Out of stock</span>}

                <div className="catalog__meta">
                  <div className="catalog__name" title={apiItem.name}>
                    {apiItem.name}
                  </div>
                  <div className="catalog__priceValue">${apiItem.price}</div>
                </div>
              </Link>

              {!isOut && sizes.length > 0 && (
                <div className="catalog__sizes" aria-label={`Select size for ${apiItem.name}`}>
                  {sizes.map((s) => {
                    const disabled = s.quantity <= 0;
                    const active = chosenSizeId === s.id;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`catalog__size ${active ? "catalog__size--active" : ""}`}
                        disabled={disabled}
                        aria-disabled={disabled}
                        aria-pressed={active}
                        aria-label={`Size ${s.size.name}${disabled ? ", out of stock" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (disabled) return;
                          setSelectedSizeByProduct((prev) => ({ ...prev, [apiItem.id]: s.id }));
                        }}
                        title={disabled ? "Out of stock" : `In stock: ${s.quantity}`}
                      >
                        {s.size.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="catalog__actions" aria-label="Product actions">
                {!isOut ? (
                  <button
                    type="button"
                    className="catalog__addBtn"
                    disabled={addBusy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAddToCart(apiItem);
                    }}
                  >
                    {addBusy ? "Adding..." : "Add to cart"}
                  </button>
                ) : (
                  <NotifyBlock
                    productId={apiItem.id}
                    isAuthed={isAuthed}
                    guestNotifyEmail={guestNotifyEmail}
                    notifyOpenByProduct={notifyOpenByProduct}
                    notifyDoneByProduct={notifyDoneByProduct}
                    setNotifyOpenByProduct={setNotifyOpenByProduct}
                    setNotifyDoneByProduct={setNotifyDoneByProduct}
                    setGuestNotifyEmail={setGuestNotifyEmail}
                    notifyMe={notifyMe}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <nav className="catalog__pagination" aria-label="Pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
          ← Prev
        </button>

        <span className="catalog__pageInfo" aria-label="Current page">
          {page} / {totalPages}
        </span>

        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
          Next →
        </button>
      </nav>
    </section>
  );
}