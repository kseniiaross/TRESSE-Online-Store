import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import type { Product } from "../types/product";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const normalizeEmail = (email: string) => String(email || "").trim();

const safeGetSessionEmail = () => {
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
  name.trim().toUpperCase().replace(/\s+/g, " ");

const compareSizes = (a: string, b: string) =>
  SIZE_ORDER.indexOf(normalizeSizeLabel(a) as any) -
  SIZE_ORDER.indexOf(normalizeSizeLabel(b) as any);

const getProductSizes = (p: Product): ProductSizeItem[] =>
  Array.isArray((p as any).sizes) ? ((p as any).sizes as ProductSizeItem[]) : [];

export default function ProductCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthed = !!getAccessToken();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<number, number>>({});
  const [addBusyByProduct, setAddBusyByProduct] = useState<Record<number, boolean>>({});

  const [notifyModalProduct, setNotifyModalProduct] = useState<Product | null>(null);
  const [guestNotifyEmail, setGuestNotifyEmail] = useState(() => safeGetSessionEmail());

  const [sizeModalProductId, setSizeModalProductId] = useState<number | null>(null);

  const notifyMe = async (productId: number) => {
    if (!isAuthed && !isValidEmail(guestNotifyEmail)) return;

    await api.post(`/products/${productId}/subscribe_back_in_stock/`, {
      email: isAuthed ? undefined : guestNotifyEmail,
    });

    if (!isAuthed) safeSetSessionEmail(guestNotifyEmail);
    setNotifyModalProduct(null);
  };

  return (
    <section className="catalog">
      <div className="catalog__grid">
        {products.map((apiItem) => {
          const isOut = !apiItem.available || !apiItem.in_stock;
          const sizes = getProductSizes(apiItem).sort((a, b) =>
            compareSizes(a.size.name, b.size.name)
          );

          return (
            <article key={apiItem.id} className="catalog__card">
              <Link to={`/product/${apiItem.id}`} className="catalog__link">
                <img
                  src={toHttps(apiItem.main_image_url) || fallbackImg}
                  alt={apiItem.name}
                  className="catalog__image"
                />
              </Link>

              <div className="catalog__actions">
                {!isOut ? (
                  <button
                    className="catalog__addBtn"
                    onClick={() => setSizeModalProductId(apiItem.id)}
                  >
                    Add to cart
                  </button>
                ) : (
                  <button
                    className="catalog__notify-btn"
                    onClick={() => setNotifyModalProduct(apiItem)}
                  >
                    Notify me
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* NOTIFY MODAL */}
      {notifyModalProduct && (
        <div className="sizeModal__overlay" onClick={() => setNotifyModalProduct(null)}>
          <div className="notifyModal" onClick={(e) => e.stopPropagation()}>
            <h3 className="notifyModal__title">Back in stock</h3>

            {isAuthed ? (
              <p className="notifyModal__text">
                You’ll be notified when the product is back in stock.
              </p>
            ) : (
              <input
                type="email"
                placeholder="your@email.com"
                value={guestNotifyEmail}
                onChange={(e) => setGuestNotifyEmail(e.target.value)}
              />
            )}

            <button
              className="notifyModal__primary"
              disabled={!isAuthed && !isValidEmail(guestNotifyEmail)}
              onClick={() => notifyMe(notifyModalProduct.id)}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </section>
  );
}