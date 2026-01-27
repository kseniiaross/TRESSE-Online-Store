import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";

import api from "../api/axiosInstance";
import type { Product } from "../types/product";
import ProductModal from "../components/ProductModal";
import fallbackImg from "../assets/images/fallback_product.jpg";

import { dec } from "../store/wishListSlice";
import "../../styles/WishList.css";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export default function WishList() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const categoryParam = params.get("category");

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("-created_at");

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // refetch trigger (wishlist:ping)
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [categoryParam, ordering]);

  // sync updates between tabs + refocus
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wishlist:ping") {
        setPage(1);
        bumpRefresh();
      }
    };
    const onFocus = () => bumpRefresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // fetch wishlist
  useEffect(() => {
    const ctrl = new AbortController();

    setLoading(true);
    api
      .get<Paginated<Product>>("/products/wishlist/", {
        params: {
          page,
          page_size: pageSize,
          ordering,
          category: categoryParam || undefined,
        },
        signal: ctrl.signal,
      })
      .then((res) => {
        setProducts(res.data.results);
        setTotal(res.data.count);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error("Error fetching wishlist:", err);
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [page, ordering, categoryParam, refreshKey]);

  const handleRemove = async (id: number) => {
    try {
      await api.post(`/products/${id}/toggle_wishlist/`);

      setProducts((p) => p.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      dispatch(dec());

      localStorage.setItem("wishlist:ping", String(Date.now()));
    } catch (e) {
      console.error("Remove from wishlist error:", e);
    }
  };

  // Add to cart from wishlist -> open modal
  const handleAddToCart = (product: Product) => {
    setModalProduct(product);
  };

  return (
    <section className="wishlist" aria-label="Wishlist">
      <div className="wishlist__container">
        <div className="wishlist__filters" aria-label="Wishlist filters">
          <label className="srOnly" htmlFor="wishlist_search">
            Search in wishlist
          </label>
          <input
            id="wishlist_search"
            type="text"
            placeholder="Search in wishlist..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="wishlist__input"
          />

          <select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
            className="wishlist__select"
            aria-label="Sort wishlist"
          >
            <option value="-created_at">Newest first</option>
            <option value="price">Price: low → high</option>
            <option value="-price">Price: high → low</option>
            <option value="name">Name: A → Z</option>
            <option value="-name">Name: Z → A</option>
          </select>
        </div>

        <h1 className="wishlist__title">MY WISHLIST {total ? `(${total})` : ""}</h1>

        {loading && (
          <div className="wishlist__loader" role="status" aria-live="polite">
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="wishlist__empty" role="status" aria-live="polite">
            No items in your wishlist.
          </div>
        )}

        <div className="wishlist__grid" role="list" aria-label="Wishlist products">
          {filtered.map((product) => {
            const imgSrc = product.main_image_url || product.images?.[0]?.image_url || fallbackImg;

            return (
              <article
                key={product.id}
                className="wishlist__card"
                role="listitem"
                onClick={() => setModalProduct(product)}
              >
                <button
                  type="button"
                  className="wishlist__remove"
                  aria-label={`Remove ${product.name} from wishlist`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(product.id);
                  }}
                >
                  ×
                </button>

                <div className="wishlist__media">
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className="wishlist__image"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                </div>

                <div className="wishlist__meta">
                  <div className="wishlist__name">{product.name}</div>
                  <div className="wishlist__price">${product.price}</div>
                </div>

                <div className="wishlist__actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="wishlist__addBtn"
                    type="button"
                    onClick={() => handleAddToCart(product)}
                  >
                    ADD TO CART
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <nav className="wishlist__pagination" aria-label="Wishlist pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Back
          </button>
          <span className="wishlist__pageInfo">
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Forward →
          </button>
        </nav>

        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      </div>
    </section>
  );
}