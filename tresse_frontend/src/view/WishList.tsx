import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";

import api from "../api/axiosInstance";
import type { Product } from "../types/product";
import ProductModal from "../components/ProductModal";
import fallbackImg from "../assets/images/fallback_product.jpg";

import { dec } from "../store/wishListSlice";
import "../../styles/WishList.css";

/** Generic paginated API response */
type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export default function WishList() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const categoryParam = params.get("category");

  /** Wishlist data */
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  /** Sorting + pagination */
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("-created_at");

  /** UI state */
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  /** Cross-tab refresh */
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const pageSize = 12;

  /** Client-side search */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, searchTerm]);

  /** Reset page on filters */
  useEffect(() => {
    setPage(1);
  }, [ordering, categoryParam]);

  /** Sync wishlist between tabs */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wishlist:ping") bumpRefresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Fetch wishlist */
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
        if (!ctrl.signal.aborted) {
          console.error("Wishlist fetch error:", err);
          setProducts([]);
          setTotal(0);
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [page, ordering, categoryParam, refreshKey]);

  /** Remove from wishlist (heart toggle) */
  const handleRemove = async (id: number) => {
    try {
      await api.post(`/products/${id}/toggle_wishlist/`);
      setProducts((p) => p.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      dispatch(dec());
      localStorage.setItem("wishlist:ping", String(Date.now()));
    } catch (e) {
      console.error("Remove wishlist error:", e);
    }
  };

  return (
    <section className="wishlist" aria-label="Wishlist">
      <div className="wishlist__container">

        {/* Title */}
        <h1 className="wishlist__title">
          MY WISHLIST {total ? `(${total})` : ""}
        </h1>

        {/* Filters — identical to Product Catalog */}
        <div className="wishlist__filters">
          <input
            type="text"
            className="wishlist__input"
            placeholder="Search in wishlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="wishlist__select"
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
          >
            <option value="-created_at">Newest first</option>
            <option value="price">Price: low → high</option>
            <option value="-price">Price: high → low</option>
            <option value="name">Name: A → Z</option>
            <option value="-name">Name: Z → A</option>
          </select>
        </div>

        {loading && <div className="wishlist__loader">Loading…</div>}

        {/* Grid */}
        <div className="wishlist__grid">
          {filtered.map((product) => {
            const imgSrc =
              product.main_image_url ||
              product.images?.[0]?.image_url ||
              fallbackImg;

            return (
              <article key={product.id} className="wishlist__card">

                {/* Heart — same as product catalog */}
                <button
                  className="wishlist__heart is-active"
                  aria-label="Remove from wishlist"
                  onClick={() => handleRemove(product.id)}
                />

                {/* Image → Product details */}
                <div
                  className="wishlist__media"
                  onClick={() => navigate(`/products/${product.slug}`)}
                >
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className="wishlist__image"
                  />
                </div>

                <div className="wishlist__meta">
                  <span className="wishlist__name">{product.name}</span>
                  <span className="wishlist__price">${product.price}</span>
                </div>

                {/* Modal only from Add to cart */}
                <button
                  className="wishlist__addBtn"
                  onClick={() => setModalProduct(product)}
                >
                  ADD TO CART
                </button>
              </article>
            );
          })}
        </div>

        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
        />
      </div>
    </section>
  );
}