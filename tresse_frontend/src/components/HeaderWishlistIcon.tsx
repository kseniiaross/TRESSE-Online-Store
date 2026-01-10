
import { useSelector } from "react-redux";
import type { RootState } from "../store";

export default function HeaderWishlistIcon() {
  const count = useSelector((s: RootState) => s.wishlist.count);

  return (
    <div style={{ position: "relative" }}>
      <svg width="24" height="24" aria-label="Wishlist">{/* ... */}</svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute", top: -4, right: -6,
            minWidth: 16, height: 16, borderRadius: 999,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, padding: "0 4px", background: "black", color: "white"
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
