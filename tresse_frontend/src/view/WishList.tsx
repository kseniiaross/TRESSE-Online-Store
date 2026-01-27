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

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const pageSize = 12;

  /* client-side search (как просила) */
  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) => p.name.toLowerCase().includes(t));
  }, [products, searchTerm]);

  /* fetch wishlist */
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    api
      .get<Paginated<Product>>("/products/wishlist/", {
        params: {
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
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [ordering, categoryParam]);

  /* toggle wishlist (heart) */
  const handleRemove = async (id: number) => {
    try {
      await api.post(`/products/${id}/toggle_wishlist/`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      dispatch(dec());
    } catch (e) {
      console.error("wishlist toggle error", e);
    }
  };

  return (
    <section className="wishlist" aria-label="Wishlist">
      {/* TITLE */}
      <h1 className="wishlist__title">
        MY WISHLIST {total ? `(${total})` : ""}
      </h1>

      {/* FILTERS — SAME LOGIC AS CATALOG */}
      <div className="wishlist__filters">
        <input
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

      {/* GRID */}
      <div className="wishlist__grid">
        {filtered.map((product) => {
          const imgSrc =
            product.main_image_url ||
            product.images?.[0]?.image_url ||
            fallbackImg;

          return (
            <article key={product.id} className="wishlist__card">
              {/* HEART — SAME AS PRODUCT CATALOG */}
              <button
                type="button"
                className="wishlist__heart is-active"
                aria-label="Remove from wishlist"
                onClick={() => handleRemove(product.id)}
              />

              {/* IMAGE → PRODUCT DETAIL */}
              <div
                className="wishlist__media"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <img src={imgSrc} alt={product.name} />
              </div>

              <div className="wishlist__meta">
                <span className="wishlist__name">{product.name}</span>
                <span className="wishlist__price">${product.price}</span>
              </div>

              {/* MODAL ONLY HERE */}
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
    </section>
  );
}