import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { Product } from "../types/types";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { getAccessToken } from "../types/token";
import { fetchWishlistCount } from "../store/wishListSlice";
import fallbackImg from "../assets/images/fallback_product.jpg";
import "../../styles/ProductCatalog.css";
import { addToCart } from "../utils/cartSlice";
import * as serverCart from "../store/serverCartSlice";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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
  } catch {}
};

const safeClearSessionEmail = () => {
  try {
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
  } catch {}
};

// если у тебя user хранится иначе — подстрой тут
const getAuthedEmail = (): string => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return normalizeEmail(user?.email || "");
  } catch {
    return "";
  }
};

/**
 * ✅ Кастомный порядок размеров (как в реальном магазине, не алфавит)
 * XS, S, M, L, ONE SIZE, OVER SIZE
 * Всё остальное -> в конец (и сортируем алфавитом среди "остальных")
 */
const SIZE_ORDER = ["XS", "S", "M", "L", "ONE SIZE", "OVER SIZE"] as const;

const normalizeSizeLabel = (name: string) =>
  String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " "); // "one   size" -> "ONE SIZE"

const sizeRank = (name: string) => {
  const label = normalizeSizeLabel(name);
  const idx = SIZE_ORDER.indexOf(label as (typeof SIZE_ORDER)[number]);
  return idx === -1 ? 999 : idx;
};

const compareSizes = (aName: string, bName: string) => {
  const ra = sizeRank(aName);
  const rb = sizeRank(bName);
  if (ra !== rb) return ra - rb;

  // если оба "неизвестные" или одинаковый rank — просто алфавит (стабильно)
  return normalizeSizeLabel(aName).localeCompare(normalizeSizeLabel(bName));
};

const ProductCatalog = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const rawCategory = params.get("category") ?? "";
  const effectiveCategory = CATEGORY_MAP[rawCategory] ?? rawCategory;

  // ✅ один источник правды
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

  // sizes
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<number, number>>({});

  // ✅ анти-даблклик/anti-spam для Add to cart по каждому продукту
  const [addBusyByProduct, setAddBusyByProduct] = useState<Record<number, boolean>>({});

  // notify state
  const [guestNotifyEmail, setGuestNotifyEmail] = useState<string>(() => safeGetSessionEmail());
  const [notifyOpenByProduct, setNotifyOpenByProduct] = useState<Record<number, boolean>>({});
  const [notifyDoneByProduct, setNotifyDoneByProduct] = useState<Record<number, boolean>>({});

  const saveGuestEmail = (email: string) => {
    const v = normalizeEmail(email);
    setGuestNotifyEmail(v);
    safeSetSessionEmail(v);
  };

  // debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [effectiveCategory]);

  // fetch products
  useEffect(() => {
    const ctrl = new AbortController();

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("page_size", String(pageSize));
    if (effectiveCategory) qs.set("category", effectiveCategory);
    if (showAvailableOnly) qs.set("in_stock", "true");
    if (ordering) qs.set("ordering", ordering);
    if (minPrice !== "" && !Number.isNaN(minPrice)) qs.set("min_price", String(minPrice));
    if (maxPrice !== "" && !Number.isNaN(maxPrice)) qs.set("max_price", String(maxPrice));
    if (debouncedSearch) qs.set("search", debouncedSearch);

    setLoading(true);
    api
      .get<Paginated<Product>>(`/products/?${qs.toString()}`, { signal: ctrl.signal })
      .then((res) => {
        setProducts(res.data.results);
        setTotal(res.data.count);
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
      dispatch(fetchWishlistCount());
      localStorage.setItem("wishlist:ping", String(Date.now()));
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_in_wishlist: !p.is_in_wishlist } : p))
      );
      localStorage.setItem("wishlist:ping", String(Date.now()));
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

    const picked = apiItem.sizes?.find((s) => s.id === productSizeId);

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

  const NotifyBlock = ({ productId }: { productId: number }) => {
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
        notifyMe(productId, authedEmail);
        return;
      }

      if (guestHasValidRememberedEmail) {
        notifyMe(productId, rememberedGuestEmail);
        return;
      }

      if (rememberedGuestEmail && !guestHasValidRememberedEmail) {
        setGuestNotifyEmail("");
        safeClearSessionEmail();
      }

      setNotifyOpenByProduct((prev) => ({ ...prev, [productId]: true }));
    };

    const onSubmitEmail = (e: React.MouseEvent) => {
      e.stopPropagation();
      notifyMe(productId, emailInput);
    };

    return (
      <div className="notify-wrap" onClick={(e) => e.stopPropagation()}>
        <button className="notify-btn" type="button" onClick={onClickNotify}>
          Notify me
        </button>

        {done && (
          <div className="notify-status">
            You’ll be notified{rememberedEmail ? ` at ${rememberedEmail}` : ""}.
          </div>
        )}

        {showEmailInput && (
          <div className="notify-inline">
            <input
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              autoComplete="email"
            />
            <button type="button" onClick={onSubmitEmail} disabled={!isValidEmail(emailInput)}>
              Confirm
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="catalog-container">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="pc-input"
        />

        <label className="pc-checkbox">
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
          className="pc-select"
        >
          <option value="-created_at">Newest first</option>
          <option value="price">Price: low → high</option>
          <option value="-price">Price: high → low</option>
          <option value="name">Name: A → Z</option>
          <option value="-name">Name: Z → A</option>
        </select>

        <div className="price-range" style={{ display: "flex", gap: 12 }}>
          <input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => {
              const v = e.target.value;
              setMinPrice(v === "" ? "" : Number(v));
              setPage(1);
            }}
            className="pc-input"
          />
          <input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => {
              const v = e.target.value;
              setMaxPrice(v === "" ? "" : Number(v));
              setPage(1);
            }}
            className="pc-input"
          />
        </div>
      </div>

      {loading && <div className="loader">Loading…</div>}
      {!loading && products.length === 0 && <div className="empty-state">No products found.</div>}

      <div className="product-grid">
        {products.map((apiItem) => {
          const imgSrc = apiItem.main_image_url ?? apiItem.images?.[0]?.image ?? fallbackImg;

          // ✅ ВОТ ЗДЕСЬ МЕНЯЕМ СОРТИРОВКУ: не алфавит, а "магазинный" порядок
          const sizes = (apiItem.sizes ?? [])
            .slice()
            .sort((a, b) => compareSizes(a.size.name, b.size.name));

          const chosenSizeId = selectedSizeByProduct[apiItem.id];
          const isOut = !apiItem.available || !apiItem.in_stock;

          const addBusy = !!addBusyByProduct[apiItem.id];

          return (
            <div key={apiItem.id} className="pc-card" onClick={() => navigate(`/product/${apiItem.id}`)}>
              <button
                className={`wishlist-btn wishlist-btn--float ${apiItem.is_in_wishlist ? "active" : ""}`}
                aria-label={apiItem.is_in_wishlist ? "Remove from wishlist" : "Add to wishlist"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWishlist(apiItem.id);
                }}
              />

              <div className="pc-thumb-wrap">
                <img
                  src={imgSrc}
                  alt={apiItem.name}
                  className="pc-thumb"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackImg;
                  }}
                />
              </div>

              {isOut && <span className="pc-badge-out">Out of stock</span>}

              <div className="pc-meta">
                <div className="pc-name">{apiItem.name}</div>
                <div className="pc-price">${apiItem.price}</div>
              </div>

              {!isOut && sizes.length > 0 && (
                <div className="pc-sizes" onClick={(e) => e.stopPropagation()}>
                  {sizes.map((s) => {
                    const disabled = s.quantity <= 0;
                    const active = chosenSizeId === s.id;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`pc-size ${active ? "is-active" : ""}`}
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={() => {
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

              <div className="product-actions" onClick={(e) => e.stopPropagation()}>
                {!isOut ? (
                  <button className="add-btn" disabled={addBusy} onClick={() => void handleAddToCart(apiItem)}>
                    {addBusy ? "Adding..." : "Add to cart"}
                  </button>
                ) : (
                  <NotifyBlock productId={apiItem.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </button>
        <span style={{ margin: "0 8px" }}>
          {page} / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
};

export default ProductCatalog;