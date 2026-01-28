import React, { useMemo, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import "../../styles/ProductModal.css";
import type { Product } from "../types/product";
import { addToCart as addToGuestCart } from "../utils/cartSlice";
import { getAccessToken } from "../types/token";
import * as serverCart from "../store/serverCartSlice";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();

  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  const isAuthed = !!getAccessToken();

  const availableSizes = useMemo(() => {
    const raw = product?.sizes ?? [];
    return raw
      .filter((s: any) => (s?.quantity ?? 0) > 0)
      .slice()
      .sort((a: any, b: any) =>
        String(a?.size?.name ?? "").localeCompare(String(b?.size?.name ?? ""))
      );
  }, [product]);

  const isOutOfStock = availableSizes.length === 0;

  const selectedSize = useMemo(() => {
    return availableSizes.find((s: any) => s.id === selectedSizeId);
  }, [availableSizes, selectedSizeId]);

  useEffect(() => {
    if (!product) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [product, onClose]);

  useEffect(() => {
    if (!product) return;
    setSelectedSizeId(null);
    setNotifyDone(false);
    setNotifyLoading(false);
    setAddBusy(false);
  }, [product]);

  if (!product) return null;

  const handleAdd = async () => {
    if (!selectedSizeId) return;
    if (addBusy) return;

    try {
      setAddBusy(true);

      if (isAuthed) {
        await dispatch(serverCart.addCartItem({ product_size_id: selectedSizeId })).unwrap();
        await dispatch(serverCart.fetchCart());
      } else {
        dispatch(
          addToGuestCart({
            product,
            product_size_id: selectedSizeId,
            sizeName: selectedSize?.size?.name,
            maxQty: selectedSize?.quantity,
          })
        );
      }

      onClose();
    } catch (e) {
      console.error("Add to cart (modal) error:", e);
      alert("Could not add to cart.");
    } finally {
      setAddBusy(false);
    }
  };

  const handleNotifyMe = async () => {
    if (!product || notifyLoading) return;

    try {
      setNotifyLoading(true);
      setNotifyDone(true);
      setTimeout(() => setNotifyDone(false), 2500);
    } catch (e) {
      console.error("Notify me error:", e);
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Product options"
      >
        <button className="modal-x" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="modal-head">
          <div className="modal-title" title={product.name}>
            {product.name}
          </div>
          <div className="modal-price">${product.price}</div>
        </div>

        <div className="modal-section">
          <div className="modal-label">Choose size</div>

          {isOutOfStock ? (
            <div className="modal-muted">Out of stock.</div>
          ) : (
            <div className="modal-sizes" role="listbox" aria-label="Sizes">
              {availableSizes.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={selectedSizeId === s.id}
                  className={`modal-size ${selectedSizeId === s.id ? "is-active" : ""}`}
                  onClick={() => setSelectedSizeId(s.id)}
                  title={`In stock: ${s.quantity}`}
                >
                  {s.size?.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="add-btn modal-primary"
            type="button"
            disabled={isOutOfStock || !selectedSizeId || addBusy}
            onClick={() => void handleAdd()}
          >
            {addBusy ? "ADDING..." : "ADD TO CART"}
          </button>

          {isOutOfStock && (
            <button
              className="modal-notify"
              type="button"
              onClick={handleNotifyMe}
              disabled={notifyLoading}
            >
              {notifyDone ? "SUBSCRIBED" : notifyLoading ? "SAVING..." : "NOTIFY ME"}
            </button>
          )}

          <button className="modal-secondary" type="button" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;