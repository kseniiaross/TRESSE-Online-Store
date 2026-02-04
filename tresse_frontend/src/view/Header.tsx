import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { isAuthenticated, clearAuthStorage } from "../types/token";
import { useAppSelector, useAppDispatch } from "../utils/hooks";
import { logout } from "../utils/authSlice";

import "../../styles/Header.css";

import searchIconWhite from "../assets/icons/search-icon-white.png";
import searchIconBlack from "../assets/icons/search-icon-black.png";

import { setCount } from "../store/wishListSlice";
import { selectGuestCartCount, clearCart as clearGuestCart } from "../utils/cartSlice";
import { clearServerCart } from "../store/serverCartSlice";
import api from "../api/axiosInstance";

type SearchProduct = {
  id: number;
  name: string;
  price?: string | number;
  images?: Array<{ image: string }>;
  in_stock?: boolean;
};

const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [hovered, setHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  // =========================
  // SEARCH 
  // =========================
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const user = useAppSelector((state) => state.auth.user);

  const isAuthed = Boolean(user) && isAuthenticated();

  const serverCart = useAppSelector((s) => s.serverCart.cart);
  const serverItems = serverCart?.items ?? [];
  const serverCount = serverItems.reduce((sum, it) => sum + it.quantity, 0);

  const guestCount = useAppSelector(selectGuestCartCount);

  const cartCount = isAuthed ? serverCount : guestCount;

  const isDarkText = location.pathname !== "/";

  const menuId = "user-dropdown-menu";
  const sidebarId = "category-menu";
  const searchListId = "header-search-suggestions";

  const searchIcon = isDarkText ? searchIconBlack : searchIconWhite;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!isUserMenuOpen) return;
      const target = e.target as Node;
      if (userMenuWrapRef.current && !userMenuWrapRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isUserMenuOpen]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!isSearchOpen) return;
      const target = e.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isSearchOpen]);

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setHovered(false);
  }, [location.pathname, location.search]);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  useEffect(() => {
    if (isMenuOpen) {
      window.setTimeout(() => sidebarRef.current?.focus(), 0);
    }
  }, [isMenuOpen]);

  const handleLogout = () => {
    clearAuthStorage();

    dispatch(logout());
    dispatch(clearServerCart());
    dispatch(setCount(0));
    dispatch(clearGuestCart());

    localStorage.setItem("wishlist:ping", String(Date.now()));
    navigate("/");
  };

  const closeMenu = () => setIsMenuOpen(false);

  // =========================
  // Search API 
  // =========================
  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearchOpen(false);
      return;
    }

    setIsSearchLoading(true);
    setSearchError(null);

    const t = window.setTimeout(async () => {
      try {
        const res = await api.get("/products/", {
          params: { search: trimmed, page_size: 6 },
        });

        const list: SearchProduct[] = res.data?.results ?? res.data ?? [];
        setResults(Array.isArray(list) ? list : []);
        setIsSearchOpen(true);
      } catch {
        setResults([]);
        setSearchError("Search is temporarily unavailable.");
        setIsSearchOpen(true);
      } finally {
        setIsSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [trimmed]);

  const openSearch = () => {
    if (trimmed.length >= 2) setIsSearchOpen(true);
  };

  const submitSearchToCatalog = () => {
    const q = query.trim();
    if (!q) return;
    setIsSearchOpen(false);
    navigate(`/catalog?search=${encodeURIComponent(q)}`);
  };

  const goToProduct = (productId: number) => {
    setIsSearchOpen(false);
    setQuery("");
    navigate(`/product/${productId}`);
  };

  const getFirstImage = (p: SearchProduct) => p.images?.[0]?.image || "";

  return (
    <header className="header">
     
      <div className="left-section">
        <button
          type="button"
          className={`humburger ${hovered ? "hover-animate" : ""}`}
          onClick={toggleMenu}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label="Toggle category menu"
          aria-expanded={isMenuOpen}
          aria-controls={sidebarId}
        >
          <span className={`bar top ${isDarkText ? "dark" : ""}`} />
          <span className={`bar middle ${isDarkText ? "dark" : ""}`} />
          <span className={`bar bottom ${isDarkText ? "dark" : ""}`} />
        </button>
     

        <div className="logo-wrap">
          <Link to="/" className={`logo ${isDarkText ? "dark" : ""}`} aria-label="Go to homepage">
            T R E S S E
          </Link>
        </div>
    </div>

      <div className="right-section">
        {/* SEARCH */}
        {isMobile ? (
          <button
            type="button"
            className="search-icon-btn"
            aria-label="Search products"
            onClick={() => navigate("/catalog?focusSearch=1")}
          >
            <img src={searchIcon} alt="" className="search-icon" />
          </button>
        ) : (
          <div className="header-search" ref={searchWrapRef}>
            <label className="srOnly" htmlFor="site-search">
              Search
            </label>

            <input
              id="site-search"
              type="text"
              placeholder="SEARCH"
              className={`search-input ${isDarkText ? "dark" : ""}`}
              aria-label="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={openSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearchToCatalog();
                }
                if (e.key === "Escape") setIsSearchOpen(false);
              }}
              aria-expanded={isSearchOpen}
              aria-controls={searchListId}
              autoComplete="off"
            />

            {(isSearchOpen || isSearchLoading) && (
              <div id={searchListId} className="search-dropdown" role="listbox" aria-label="Search suggestions">
                {isSearchLoading && <div className="search-dropdown__row search-dropdown__muted">Searching…</div>}

                {!isSearchLoading && searchError && (
                  <div className="search-dropdown__row search-dropdown__error">{searchError}</div>
                )}

                {!isSearchLoading && !searchError && trimmed.length >= 2 && results.length === 0 && (
                  <div className="search-dropdown__row search-dropdown__muted">No matches</div>
                )}

                {!isSearchLoading &&
                  !searchError &&
                  results.map((p) => {
                    const img = getFirstImage(p);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="search-dropdown__item"
                        role="option"
                        onClick={() => goToProduct(p.id)}
                      >
                        <span className="search-dropdown__thumb">{img ? <img src={img} alt="" /> : null}</span>

                        <span className="search-dropdown__text">
                          <span className="search-dropdown__name">{p.name}</span>
                          {typeof p.in_stock === "boolean" ? (
                            <span className="search-dropdown__meta">{p.in_stock ? "Available" : "Out of stock"}</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}

                {!isSearchLoading && !searchError && results.length > 0 && (
                  <button type="button" className="search-dropdown__all" onClick={submitSearchToCatalog}>
                    View all results
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* USER MENU / LOGIN */}
        {user ? (
          <div className="user-menu-wrap" ref={userMenuWrapRef}>
            <button
              type="button"
              className={`user-menu__btn ${isDarkText ? "dark" : ""}`}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-controls={menuId}
              onClick={() => setIsUserMenuOpen((v) => !v)}
              onKeyDown={(e) => e.key === "Escape" && setIsUserMenuOpen(false)}
            >
              {String(user.first_name || "").toUpperCase()}
              <span className="user-menu__caret" aria-hidden>
                ▾
              </span>
            </button>

            {isUserMenuOpen && (
              <div id={menuId} className="user-menu" role="menu">
                <Link to="/dashboard" className="user-menu__item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                  PROFILE
                </Link>
                <Link to="/wishlist" className="user-menu__item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                  WISHLIST
                </Link>
                <Link to="/orders" className="user-menu__item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                  ORDERS
                </Link>
                <button type="button" className="user-menu__item user-menu__logout" role="menuitem" onClick={handleLogout}>
                  LOG OUT
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login-choice" className={`login-button ${isDarkText ? "dark" : ""}`} aria-label="Log in to your account">
            LOG IN
          </Link>
        )}

        <Link to="/help" className={`help-button ${isDarkText ? "dark" : ""}`} aria-label="Help center">
          HELP
        </Link>

        <Link
          to="/cart"
          className={`shopping-bag ${isDarkText ? "dark" : ""}`}
          aria-label={`Shopping bag with ${cartCount} items`}
        >
          SHOPPING BAG [{cartCount}]
        </Link>
      </div>

      {/* BACKDROP + SIDEBAR */}
      {isMenuOpen && (
        <div className="sidebar-backdrop" role="presentation" onClick={closeMenu}>
          <aside
            id={sidebarId}
            ref={sidebarRef}
            className="sidebar-menu"
            role="dialog"
            aria-label="Category menu"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeMenu();
            }}
          >
            <nav className="menu-content" aria-label="Categories">
              <ul>
                <li>
                  <Link to="/catalog?category=woman" onClick={closeMenu}>
                    WOMAN
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=man" onClick={closeMenu}>
                    MAN
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?category=kids" onClick={closeMenu}>
                    KIDS
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?collection=the-new" onClick={closeMenu}>
                    THE NEW
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?collection=bestsellers" onClick={closeMenu}>
                    BESTSELLERS
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?collection=exclusives" onClick={closeMenu}>
                    EXCLUSIVES
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
};

export default Header;