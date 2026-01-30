import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../../styles/ProductDetail.css";

import api from "../api/axiosInstance";
import fallbackImg from "../assets/images/fallback_product.jpg";

import { isAuthenticated } from "../types/token";
import { useAppDispatch } from "../utils/hooks";

import type { Product } from "../types/product";
import type { GuestCartItem } from "../types/cart";

import { fetchWishlistCount } from "../store/wishListSlice";
import * as serverCart from "../store/serverCartSlice";
import { toHttps } from "../utils/images";

const GUEST_CART_KEY = "guest_cart_items_v1";

function safeNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function makeLocalId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export default function ProductDetails() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { id } = useParams();
  const productId = safeNumber(id);

  const authed = isAuthenticated();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>(fallbackImg);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartBusy, setCartBusy] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [uiMessage, setUiMessage] = useState<string | null>(null);

  const sizes = useMemo(() => {
    const list = product?.sizes ?? [];
    return [...list].sort((a, b) => a.size.name.localeCompare(b.size.name));
  }, [product]);

  const selectedSize = useMemo(
    () => sizes.find((s) => s.id === selectedSizeId) ?? null,
    [sizes, selectedSizeId]
  );

  const isOut = useMemo(() => {
    const available = product?.available ?? true;
    const inStock = product?.in_stock ?? true;
    return !available || !inStock;
  }, [product]);

  const needsSize = sizes.length > 0;
  const canAddToCart = !cartBusy && !isOut && (!needsSize || Boolean(selectedSizeId));

  const formatPrice = (value: string | number) => {
    const n = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(n)) return String(value ?? "");
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  };

  useEffect(() => {
    if (!productId) {
      setError("Invalid product id.");
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setUiMessage(null);

        const res = await api.get<Product>(`/products/${productId}/`);
        if (!alive) return;

        const data = res.data;

        setProduct(data);
        setSelectedSizeId(null);
        setActiveImageIndex(0);

        const firstFromImages = data.images?.[0]?.image_url ?? undefined;
        const nextImg = toHttps(data.main_image_url ?? firstFromImages) ?? fallbackImg;

        setImgSrc(nextImg);
      } catch {
        if (!alive) return;
        setError("Could not load product details.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [productId]);

  const imagesForGallery = useMemo<string[]>(() => {
    const mainCandidate = toHttps(product?.main_image_url ?? undefined);
    const main = mainCandidate ? [mainCandidate] : [];

    const rest = (product?.images ?? [])
      .map((x) => toHttps(x.image_url ?? undefined))
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    const uniq = Array.from(new Set([...main, ...rest]));
    return uniq.length ? uniq : [fallbackImg];
  }, [product]);

  useEffect(() => {
    const idx = Math.min(Math.max(activeImageIndex, 0), imagesForGallery.length - 1);
    setImgSrc(imagesForGallery[idx] ?? fallbackImg);
  }, [activeImageIndex, imagesForGallery]);

  const readGuestCart = (): GuestCartItem[] => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
    } catch {
      return [];
    }
  };

  const writeGuestCart = (items: GuestCartItem[]) => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    localStorage.setItem("guest_cart:ping", String(Date.now()));
  };

  const addToCartGuest = () => {
    if (!product) return;

    if (needsSize && !selectedSizeId) {
      setUiMessage("Please select a size.");
      return;
    }
    if (!selectedSizeId) return;

    const sizeLabel = selectedSize?.size?.name ?? "Size";

    const nextItem: GuestCartItem = {
      id: makeLocalId(),
      quantity: 1,

      product_id: product.id,
      product_size_id: selectedSizeId,
      size_label: sizeLabel,

      name: product.name,
      price: product.price,
      main_image_url: imgSrc || toHttps(product.main_image_url ?? undefined) || fallbackImg,
      images: undefined,
    };

    const cart = readGuestCart();

    const idx = cart.findIndex((x) => x.product_size_id === nextItem.product_size_id);
    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + 1 };
    } else {
      cart.push(nextItem);
    }

    writeGuestCart(cart);
    setUiMessage("Added to bag.");
  };

  const addToCartServer = async () => {
    if (!product) return;

    if (needsSize && !selectedSizeId) {
      setUiMessage("Please select a size.");
      return;
    }
    if (!selectedSizeId) return;

    setCartBusy(true);
    setUiMessage(null);

    try {
      await dispatch(serverCart.addCartItem({ product_size_id: selectedSizeId })).unwrap();
      await dispatch(serverCart.fetchCart());
      setUiMessage("Added to bag.");
    } catch {
      setUiMessage("Could not add to cart.");
    } finally {
      setCartBusy(false);
    }
  };

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    if (authed) void addToCartServer();
    else addToCartGuest();
  };

  const handleWishlist = async () => {
    if (!product || wishBusy) return;

    if (!authed) {
      const next = location.pathname + location.search;
      navigate(`/login-choice?next=${encodeURIComponent(next)}`);
      return;
    }

    setWishBusy(true);
    setUiMessage(null);

    try {
      await api.post(`/products/${product.id}/toggle_wishlist/`);

      setProduct((prev) => {
        if (!prev) return prev;
        return { ...prev, is_in_wishlist: !Boolean(prev.is_in_wishlist) };
      });

      dispatch(fetchWishlistCount());
      setUiMessage("Wishlist updated.");
    } catch {
      setUiMessage("Could not update wishlist.");
    } finally {
      setWishBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="product-detail">
        <div className="product-detail__wrap">
          <div className="product-detail__skeleton product-detail__skeleton-media" />
          <div className="product-detail__skeleton product-detail__skeleton-panel" />
        </div>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="product-detail">
        <div className="product-detail__error">
          <h2 className="product-detail__error-title">Something went wrong</h2>
          <p className="product-detail__error-text">{error ?? "Product not found."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="product-detail">
      <div className="product-detail__wrap">
        <div className="product-detail__media">
          <div className="product-detail__main-image">
            <img
              src={imgSrc}
              alt={product.name}
              onError={(e) => {
                e.currentTarget.src = fallbackImg;
              }}
            />
            {isOut ? <span className="product-detail__badge">Out of stock</span> : null}
          </div>

          {imagesForGallery.length > 1 ? (
            <div className="product-detail__thumbs" aria-label="Product images">
              {imagesForGallery.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  className={`product-detail__thumb ${i === activeImageIndex ? "is-active" : ""}`}
                  onClick={() => setActiveImageIndex(i)}
                  aria-label={`Open image ${i + 1}`}
                >
                  <img src={url} alt="" onError={(e) => (e.currentTarget.src = fallbackImg)} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="product-detail__panel">
          <div className="product-detail__top">
            <h1 className="product-detail__title">{product.name}</h1>
            <div className="product-detail__price">{formatPrice(product.price)}</div>
          </div>

          {product.category?.name ? (
            <div className="product-detail__meta">{String(product.category.name).toUpperCase()}</div>
          ) : null}

          {product.description ? (
            <div className="product-detail__desc">
              <h2 className="product-detail__section-title">Description</h2>
              <p className="product-detail__desc-text">{product.description}</p>
            </div>
          ) : null}

          {sizes.length > 0 ? (
            <div className="product-detail__sizes">
              <h2 className="product-detail__section-title">Size</h2>

              <div className="product-detail__size-grid" role="listbox" aria-label="Select size">
                {sizes.map((s) => {
                  const disabled = s.quantity <= 0;
                  const selected = selectedSizeId === s.id;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`product-detail__size ${selected ? "is-selected" : ""}`}
                      onClick={() => {
                        if (disabled) return;
                        setSelectedSizeId(s.id);
                        setUiMessage(null);
                      }}
                      disabled={disabled}
                      aria-disabled={disabled}
                      aria-selected={selected}
                      role="option"
                      title={disabled ? "Out of stock" : `In stock: ${s.quantity}`}
                    >
                      {s.size.name}
                    </button>
                  );
                })}
              </div>

              <div className="product-detail__hint">
                {selectedSize ? (
                  selectedSize.quantity > 0 ? (
                    <span>Selected size is available.</span>
                  ) : (
                    <span>Selected size is out of stock.</span>
                  )
                ) : (
                  <span>Please select a size.</span>
                )}
              </div>
            </div>
          ) : null}

          <div className="product-detail__actions">
            <button
              type="button"
              className="product-detail__btn product-detail__btn--primary"
              onClick={handleAddToCart}
              disabled={!canAddToCart}
            >
              {cartBusy ? "Adding..." : "Add to cart"}
            </button>

            <button
              type="button"
              className="product-detail__btn product-detail__btn--secondary"
              onClick={handleWishlist}
              disabled={wishBusy}
            >
              {wishBusy ? "Saving..." : "Add to wishlist"}
            </button>

            {uiMessage ? <div className="product-detail__message">{uiMessage}</div> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}