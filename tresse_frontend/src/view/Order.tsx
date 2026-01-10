import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import api from "../api/axiosInstance";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import type { RootState } from "../store";
import * as serverCart from "../store/serverCartSlice";
import "../../styles/Order.css";

const PROFILE_STORAGE_KEY = "tresse_profile_v1";

// ✅ store public order number (not DB id)
const LAST_ORDER_ID_KEY = "tresse_last_order_id_v1";

type StoredProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  addressLine1?: string;
  apartment?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readProfileFromStorage(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    return {
      firstName: safeString(parsed.firstName),
      lastName: safeString(parsed.lastName),
      email: safeString(parsed.email),
      addressLine1: safeString(parsed.addressLine1),
      apartment: safeString(parsed.apartment),
      city: safeString(parsed.city),
      state: safeString(parsed.state),
      postalCode: safeString(parsed.postalCode),
      country: safeString(parsed.country),
    };
  } catch {
    return null;
  }
}

type ServerCartItem = {
  id: number;
  quantity: number;
  product_size: {
    product: { id: number; name: string; price: string };
  };
};

type NominatimItem = {
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

type CheckoutFormData = {
  fullName: string;
  cardholderName: string;
  addressLine1: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const toTitle = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const normalizeCountryForStripe = (value: string) => {
  const v = value.trim().toUpperCase();
  if (["USA", "US", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(v)) return "US";
  return v;
};

const genAttemptId = () => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `att_${Math.random().toString(16).slice(2)}_${Date.now()}`;
};

function saveLastOrderId(orderId: string) {
  try {
    const clean = (orderId || "").trim();
    if (!clean) return;
    localStorage.setItem(LAST_ORDER_ID_KEY, clean);
  } catch {
    // ignore
  }
}

function extractOrderId(data: unknown): string {
  if (!isRecord(data)) return "";

  // ✅ prefer public_id (safe)
  const publicId = data.public_id;
  if (typeof publicId === "string" && publicId.trim()) return publicId.trim();

  // fallback to id
  const raw = data.id;
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw.trim();

  return "";
}

export default function Order() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const serverItems = useAppSelector(
    (s: RootState) => (s.serverCart.cart?.items ?? []) as ServerCartItem[]
  );

  const cartLines = useMemo(
    () =>
      serverItems.map((it) => ({
        productId: it.product_size.product.id,
        name: it.product_size.product.name,
        price: Number(it.product_size.product.price ?? 0),
        quantity: Number(it.quantity ?? 1),
      })),
    [serverItems]
  );

  const totalAmount = useMemo(
    () => cartLines.reduce((acc, x) => acc + x.price * x.quantity, 0),
    [cartLines]
  );

  const cartIsEmpty = cartLines.length === 0 || totalAmount <= 0;

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: "",
    cardholderName: "",
    addressLine1: "",
    apartment: "",
    city: "",
    state: "",
    postalCode: "",
    country: "USA",
  });

  const [clientSecret, setClientSecret] = useState<string>("");
  const [intentLoading, setIntentLoading] = useState<boolean>(false);
  const [intentError, setIntentError] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");

  const [cardNumberError, setCardNumberError] = useState<string>("");
  const [cardExpiryError, setCardExpiryError] = useState<string>("");
  const [cardCvcError, setCardCvcError] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);

  const [needsFinalize, setNeedsFinalize] = useState<boolean>(false);
  const [succeededIntentId, setSucceededIntentId] = useState<string>("");

  const confirmingRef = useRef(false);

  const attemptIdRef = useRef<string>("");

  const [addressQuery, setAddressQuery] = useState<string>("");
  const [addressOpen, setAddressOpen] = useState<boolean>(false);
  const [addressLoading, setAddressLoading] = useState<boolean>(false);
  const [addressItems, setAddressItems] = useState<NominatimItem[]>([]);
  const lastQueryRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const applyProfileToForm = (profile: StoredProfile | null) => {
    if (!profile) return;

    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();

    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || fullName,
      cardholderName: prev.cardholderName || fullName,

      addressLine1: prev.addressLine1 || (profile.addressLine1 ?? ""),
      apartment: prev.apartment || (profile.apartment ?? ""),
      city: prev.city || (profile.city ?? ""),
      state: prev.state || (profile.state ?? ""),
      postalCode: prev.postalCode || (profile.postalCode ?? ""),
      country: prev.country || (profile.country ?? "USA"),
    }));

    const addr = (profile.addressLine1 ?? "").trim();
    if (addr && !addressQuery) setAddressQuery(addr);
  };

  useEffect(() => {
    applyProfileToForm(readProfileFromStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUpdated = () => {
      applyProfileToForm(readProfileFromStorage());
    };

    window.addEventListener("tresse:profileUpdated", onUpdated as EventListener);
    window.addEventListener("storage", onUpdated);

    return () => {
      window.removeEventListener("tresse:profileUpdated", onUpdated as EventListener);
      window.removeEventListener("storage", onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressQuery]);

  useEffect(() => {
    const key = "tresse_checkout_attempt_id";
    const stored = sessionStorage.getItem(key);
    if (stored) {
      attemptIdRef.current = stored;
    } else {
      const fresh = genAttemptId();
      attemptIdRef.current = fresh;
      sessionStorage.setItem(key, fresh);
    }
  }, []);

  useEffect(() => {
    dispatch(serverCart.fetchCart());
  }, [dispatch]);

  const applySuggestion = (item: NominatimItem) => {
    const a = item.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ") || a.road || item.display_name;

    const city = a.city || a.town || a.village || "";
    const state = a.state || "";
    const postalCode = a.postcode || "";
    const country = a.country ? toTitle(a.country) : formData.country;

    setFormData((p) => ({
      ...p,
      addressLine1: street,
      city,
      state,
      postalCode,
      country,
    }));

    setAddressQuery(street);
    setAddressOpen(false);
  };

  const fetchSuggestions = async (q: string) => {
    const query = q.trim();
    if (query.length < 3) {
      setAddressItems([]);
      return;
    }
    if (lastQueryRef.current === query) return;
    lastQueryRef.current = query;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setAddressLoading(true);

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          format: "json",
          addressdetails: "1",
          limit: "6",
          countrycodes: "us",
          q: query,
        });

      const res = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { "Accept-Language": "en" },
      });

      if (!res.ok) throw new Error("Nominatim error");
      const data = (await res.json()) as NominatimItem[];
      setAddressItems(Array.isArray(data) ? data : []);
    } catch {
      setAddressItems([]);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (addressOpen) fetchSuggestions(addressQuery);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressQuery, addressOpen]);

  useEffect(() => {
    if (cartIsEmpty) {
      setClientSecret("");
      setIntentError("");
      setIntentLoading(false);
      setNeedsFinalize(false);
      setSucceededIntentId("");
      return;
    }

    if (needsFinalize) return;

    let cancelled = false;

    (async () => {
      setIntentLoading(true);
      setIntentError("");
      setErrorMsg("");

      try {
        const { data } = await api.post("/orders/create-intent/", {
          attempt_id: attemptIdRef.current,
        });

        if (cancelled) return;

        const secret = String(data?.client_secret || "");
        setClientSecret(secret);

        if (!secret) {
          setIntentError("Payment could not be prepared. Please refresh the page.");
        }
      } catch {
        if (cancelled) return;
        setClientSecret("");
        setIntentError("Payment could not be prepared. Please refresh the page.");
      } finally {
        if (!cancelled) setIntentLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cartIsEmpty, needsFinalize]);

  const onField =
    (name: keyof CheckoutFormData) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setFormData((p) => ({ ...p, [name]: e.target.value }));
    };

  const stripeStyle = {
    style: {
      base: {
        fontSize: "16px",
        color: "#111",
        "::placeholder": { color: "#9e9e9e" },
      },
      invalid: { color: "#b00020" },
    },
  } as const;

  const buildBillingLine1 = () => {
    const line = formData.addressLine1.trim();
    const apt = formData.apartment.trim();
    return apt ? `${line}, ${apt}` : line;
  };

  const createOrderOnBackend = async (intentId: string): Promise<string> => {
    const billingLine1 = buildBillingLine1();

    const res = await api.post("/orders/", {
      full_name: formData.fullName.trim(),
      address: billingLine1,
      city: formData.city.trim(),
      state: formData.state.trim(),
      postal_code: formData.postalCode.trim(),
      country: formData.country.trim(),
      payment_method: "card",
      payment_intent_id: intentId,
    });

    return extractOrderId(res?.data);
  };

  const goToSuccessWithOrderId = (orderId: string) => {
    const clean = (orderId || "").trim();
    if (clean) saveLastOrderId(clean);
    sessionStorage.removeItem("tresse_checkout_attempt_id");
    navigate(clean ? `/order/success?order=${encodeURIComponent(clean)}` : "/order/success");
  };

  const handleFinalize = async () => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      if (!succeededIntentId) {
        setErrorMsg("Payment reference is missing. Please reload the checkout page.");
        return;
      }

      const orderId = await createOrderOnBackend(succeededIntentId);
      await dispatch(serverCart.fetchCart());

      goToSuccessWithOrderId(orderId);
    } catch {
      setErrorMsg("Payment succeeded, but we couldn't finalize the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setErrorMsg("");

    if (submitting) return;
    setSubmitting(true);

    try {
      if (cartIsEmpty) {
        setErrorMsg("Your cart is empty.");
        return;
      }

      if (intentLoading) {
        setErrorMsg("Payment is still initializing. Please wait a moment.");
        return;
      }

      if (!stripe || !elements) {
        setErrorMsg("Payment service is still loading. Please wait.");
        return;
      }

      if (needsFinalize) {
        await handleFinalize();
        return;
      }

      if (!clientSecret) {
        setErrorMsg(intentError || "Payment is not ready yet. Please refresh the page.");
        return;
      }

      if (cardNumberError || cardExpiryError || cardCvcError) {
        setErrorMsg("Please fix the card details.");
        return;
      }

      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) {
        setErrorMsg("Card number field not found.");
        return;
      }

      if (confirmingRef.current) return;
      confirmingRef.current = true;

      const billingLine1 = buildBillingLine1();
      const countryForStripe = normalizeCountryForStripe(formData.country);

      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: (formData.cardholderName || formData.fullName).trim(),
            address: {
              line1: billingLine1,
              city: formData.city.trim(),
              state: formData.state.trim(),
              postal_code: formData.postalCode.trim(),
              country: countryForStripe,
            },
          },
        },
      });

      confirmingRef.current = false;

      if (error) {
        setErrorMsg(error.message || "Payment failed. Please try again.");
        return;
      }

      if (!paymentIntent) {
        setErrorMsg("Payment was not completed.");
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        setErrorMsg(`Payment status: ${paymentIntent.status}`);
        return;
      }

      setSucceededIntentId(paymentIntent.id);

      let orderId = "";
      try {
        orderId = await createOrderOnBackend(paymentIntent.id);
      } catch {
        setNeedsFinalize(true);
        setErrorMsg("Payment succeeded, but the order could not be saved. Click “Finalize order” to complete.");
        return;
      }

      await dispatch(serverCart.fetchCart());
      goToSuccessWithOrderId(orderId);
    } catch {
      confirmingRef.current = false;
      setErrorMsg("Something went wrong while placing your order.");
    } finally {
      setSubmitting(false);
    }
  };

  const disableSubmit = submitting || intentLoading || cartIsEmpty || !stripe;

  return (
    <div className="checkout">
      <div className="checkout__container">
        <h2 className="checkout__title">Place your order</h2>

        <div className="checkout__grid">
          <aside className="summary">
            <h3 className="summary__title">Order Summary</h3>

            {cartIsEmpty ? (
              <p className="summary__empty">Your cart is empty</p>
            ) : (
              <ul className="summary__list">
                {cartLines.map((item) => (
                  <li className="summary__item" key={`${item.productId}-${item.name}`}>
                    <span className="summary__name">{item.name}</span>
                    <span className="summary__qty">{item.quantity} ×</span>
                    <span className="summary__price">${item.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="summary__total">
              <span className="summary__totalLabel">Total:</span>
              <span className="summary__totalValue">${totalAmount.toFixed(2)}</span>
            </div>
          </aside>

          <section className="panel">
            <form onSubmit={handleSubmit} className="form" noValidate>
              <div className="field field--full">
                <label className="label">Full name</label>
                <input
                  className="input"
                  placeholder="Full name"
                  value={formData.fullName}
                  onChange={onField("fullName")}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field field--full">
                <label className="label">Street address</label>
                <div className="address">
                  <input
                    className="input"
                    placeholder="Street address"
                    value={addressQuery || formData.addressLine1}
                    onChange={(e) => {
                      setAddressQuery(e.target.value);
                      setFormData((p) => ({ ...p, addressLine1: e.target.value }));
                      setAddressOpen(true);
                    }}
                    onFocus={() => setAddressOpen(true)}
                    onBlur={() => setTimeout(() => setAddressOpen(false), 160)}
                    autoComplete="street-address"
                    required
                  />

                  {addressOpen && (addressItems.length > 0 || addressLoading) && (
                    <div className="address__list" role="listbox">
                      {addressLoading && <div className="address__hint">Searching…</div>}

                      {!addressLoading &&
                        addressItems.map((it, idx) => (
                          <button
                            key={`${it.display_name}-${idx}`}
                            type="button"
                            className="address__item"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => applySuggestion(it)}
                          >
                            {it.display_name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="label">Apt / Unit</label>
                <input
                  className="input"
                  placeholder="Apt / Unit"
                  value={formData.apartment}
                  onChange={onField("apartment")}
                  autoComplete="address-line2"
                />
              </div>

              <div className="field">
                <label className="label">City</label>
                <input
                  className="input"
                  placeholder="City"
                  value={formData.city}
                  onChange={onField("city")}
                  autoComplete="address-level2"
                  required
                />
              </div>

              <div className="field">
                <label className="label">State</label>
                <input
                  className="input"
                  placeholder="State"
                  value={formData.state}
                  onChange={onField("state")}
                  autoComplete="address-level1"
                  required
                />
              </div>

              <div className="field">
                <label className="label">ZIP code</label>
                <input
                  className="input"
                  placeholder="ZIP code"
                  value={formData.postalCode}
                  onChange={onField("postalCode")}
                  autoComplete="postal-code"
                  required
                />
              </div>

              <div className="field field--full">
                <label className="label">Country</label>
                <input
                  className="input"
                  placeholder="Country"
                  value={formData.country}
                  onChange={onField("country")}
                  autoComplete="country-name"
                  required
                />
              </div>

              <div className="field field--full">
                <label className="label">Cardholder name</label>
                <input
                  className="input"
                  placeholder="Name on card"
                  value={formData.cardholderName}
                  onChange={onField("cardholderName")}
                  autoComplete="cc-name"
                  required
                />
              </div>

              <div className="field field--full">
                <label className="label">Card details</label>

                <div className="cardFields">
                  <div className="cardField cardField--full">
                    <div className="stripeInput">
                      <CardNumberElement
                        options={stripeStyle}
                        onChange={(e) => setCardNumberError(e.error?.message || "")}
                      />
                    </div>
                  </div>

                  <div className="cardField">
                    <div className="stripeInput">
                      <CardExpiryElement
                        options={stripeStyle}
                        onChange={(e) => setCardExpiryError(e.error?.message || "")}
                      />
                    </div>
                  </div>

                  <div className="cardField">
                    <div className="stripeInput">
                      <CardCvcElement
                        options={stripeStyle}
                        onChange={(e) => setCardCvcError(e.error?.message || "")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="actions field--full">
                <button className="button" type="submit" disabled={disableSubmit}>
                  {submitting
                    ? needsFinalize
                      ? "Finalizing…"
                      : "Placing order…"
                    : intentLoading
                    ? "Preparing payment…"
                    : needsFinalize
                    ? "Finalize order"
                    : "Place order"}
                </button>
              </div>

              {errorMsg && !intentLoading && (
                <p className="message message--error" role="alert" aria-live="assertive">
                  {errorMsg}
                </p>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}