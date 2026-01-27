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
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const [ordering, setOrdering] = useState("-created_at");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const pageSize = 12;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, searchTerm]);

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

  const handleRemove = async (id: number) => {
    try {
      await api.post(`/products/${id}/toggle_wishlist/`);
      setProducts((p) => p.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      dispatch(dec());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="wishlist">
      <h1 className="wishlist__title">
        MY WISHLIST {total ? `(${total})` : ""}
      </h1>

      {/* Filters */}
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

      <div className="wishlist__grid">
        {filtered.map((product) => {
          const imgSrc =
            product.main_image_url ||
            product.images?.[0]?.image_url ||
            fallbackImg;

          return (
            <article key={product.id} className="wishlist__card">

              {/* Heart */}
              <button
                className="wishlist__heart is-active"
                onClick={() => handleRemove(product.id)}
                aria-label="Remove from wishlist"
              />

              {/* Image → Product detail */}
              <div
                className="wishlist__media"
                onClick={() => navigate(`/products/${product.slug}`)}
              >
                <img src={imgSrc} alt={product.name} />
              </div>

              <div className="wishlist__meta">
                <span>{product.name}</span>
                <span>${product.price}</span>
              </div>

              {/* Modal only here */}
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