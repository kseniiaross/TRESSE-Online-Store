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

  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");

  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const pageSize = 12;

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) => p.name.toLowerCase().includes(t));
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
          min_price: minPrice === "" ? undefined : minPrice,
          max_price: maxPrice === "" ? undefined : maxPrice,
        },
        signal: ctrl.signal,
      })
      .then((res) => {
        setProducts(res.data.results);
        setTotal(res.data.count);
      })
      .catch((err) => {
        console.error("Wishlist fetch error:", err);
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [ordering, categoryParam, minPrice, maxPrice]);

  const handleRemove = async (id: number) => {
    try {
      await api.post(`/products/${id}/toggle_wishlist/`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      dispatch(dec());
      localStorage.setItem("wishlist:ping", String(Date.now()));
    } catch (e) {
      console.error("Remove wishlist error:", e);
    }
  };

  const openProductDetail = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  return (
    <section className="wishlist" aria-label="Wishlist">
      <div className="wishlist__top">
        <h1 className="wishlist__title">
          MY WISHLIST {total ? `(${total})` : ""}
        </h1>

        <div className="wishlist__filters" aria-label="Wishlist filters">
          <label className="srOnly" htmlFor="wishlist_search">
            Search in wishlist
          </label>

          <input
            id="wishlist_search"
            className="wishlist__input"
            placeholder="Search in wishlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="wishlist__select"
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            aria-label="Sort wishlist"
          >
            <option value="-created_at">Newest first</option>
            <option value="price">Price: low → high</option>
            <option value="-price">Price: high → low</option>
            <option value="name">Name: A → Z</option>
            <option value="-name">Name: Z → A</option>
          </select>

          <div className="wishlist__price" role="group" aria-label="Price range">
            <label className="srOnly" htmlFor="wishlist_min_price">
              Minimum price
            </label>
            <input
              id="wishlist_min_price"
              type="number"
              placeholder="Min price"
              value={minPrice}
              onChange={(e) => {
                const v = e.target.value;
                setMinPrice(v === "" ? "" : Number(v));
              }}
              className="wishlist__input wishlist__input--price"
            />

            <label className="srOnly" htmlFor="wishlist_max_price">
              Maximum price
            </label>
            <input
              id="wishlist_max_price"
              type="number"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => {
                const v = e.target.value;
                setMaxPrice(v === "" ? "" : Number(v));
              }}
              className="wishlist__input wishlist__input--price"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="wishlist__loader" role="status" aria-live="polite">
          Loading…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="wishlist__empty" role="status" aria-live="polite">
          No items in wishlist.
        </div>
      )}

      <div className="wishlist__grid" role="list" aria-label="Wishlist items">
        {filtered.map((product) => {
          const imgSrc =
            product.main_image_url || product.images?.[0]?.image_url || fallbackImg;

          return (
            <article key={product.id} className="wishlist__card" role="listitem">
              <button
                type="button"
                className="catalog__wishlist-btn catalog__wishlist-btn--active wishlist__wishlistBtn"
                aria-label="Remove from wishlist"
                aria-pressed={true}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemove(product.id);
                }}
              >
                <span className="srOnly">Remove from wishlist</span>
              </button>

              <div
                className="wishlist__media"
                onClick={() => openProductDetail(product.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open product: ${product.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openProductDetail(product.id);
                  }
                }}
              >
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
                <span className="wishlist__name" title={product.name}>
                  {product.name}
                </span>
                <span className="wishlist__priceValue">${product.price}</span>
              </div>

              <button
                type="button"
                className="wishlist__addBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalProduct(product);
                }}
              >
                ADD TO CART
              </button>
            </article>
          );
        })}
      </div>

      <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
    </section>
  );
}