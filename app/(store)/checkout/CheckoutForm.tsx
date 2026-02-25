"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/app/cart/CartContext";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

interface SquareCardInstance {
  tokenize: (opts?: { verificationDetails?: unknown }) => Promise<{ status: string; token?: string; errors?: unknown[] }>;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => {
        card: () => Promise<{ attach: (selector: string) => Promise<void>; tokenize: SquareCardInstance["tokenize"] }>;
      };
    };
  }
}

interface CheckoutFormProps {
  items: CartItem[];
  shippingState: string;
  setShippingState: (s: string) => void;
  shippingBreakdown: {
    allowed: boolean;
    blockedReason?: string;
    total: number;
    currency: string;
  } | null;
  loadingShipping: boolean;
  totalCents: number;
  currency: string;
  onSuccess: () => void;
  canPay: boolean;
  squareReady?: boolean;
}

export function CheckoutForm({
  items,
  shippingState,
  setShippingState,
  shippingBreakdown,
  loadingShipping,
  totalCents,
  currency,
  onSuccess,
  canPay,
  squareReady = false,
}: CheckoutFormProps) {
  const router = useRouter();
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [couponCode, setCouponCode] = useState("");
  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    company: "",
    country: "US",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    referralShop: "",
  });
  const [shipToDifferent, setShipToDifferent] = useState(false);
  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    company: "",
    country: "US",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
  });
  const [orderNote, setOrderNote] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [cardStatus, setCardStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardInstanceRef = useRef<SquareCardInstance | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

  // Sync shipping state for API (2-letter) from billing or shipping
  const effectiveState = shipToDifferent ? shipping.state : billing.state;
  useEffect(() => {
    if (effectiveState.length <= 2) setShippingState(effectiveState.toUpperCase().slice(0, 2));
  }, [effectiveState, setShippingState]);

  // Attach Square card when step 2 is visible (Square needs a visible container with real size)
  useEffect(() => {
    if (step !== 2 || !appId || !locationId) return;
    setCardStatus("loading");
    setError(null);
    let mounted = true;
    const SQUARE_WAIT_MS = 15000;

    const init = async () => {
      if (!window.Square) {
        const start = Date.now();
        await new Promise<void>((resolve, reject) => {
          const check = () => {
            if (!mounted) return resolve();
            if (window.Square) return resolve();
            if (Date.now() - start > SQUARE_WAIT_MS) {
              reject(new Error("Payment script did not load in time."));
              return;
            }
            setTimeout(check, 200);
          };
          check();
        });
      }
      if (!mounted) return;
      await new Promise((r) => setTimeout(r, 250));
      if (!mounted || !cardContainerRef.current) return;

      try {
        const payments = window.Square!.payments(appId, locationId);
        const card = await payments.card();
        if (!mounted || !cardContainerRef.current) return;
        await card.attach("#card-container");
        if (!mounted) return;
        cardInstanceRef.current = card;
        setCardStatus("ready");
      } catch (e) {
        if (!mounted) return;
        setCardStatus("error");
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("did not load")) {
          setError("Payment form is still loading. Please wait a moment and try again.");
        } else {
          setError("Payment form could not be loaded. Please try again.");
        }
      }
    };

    init();
    return () => {
      mounted = false;
      cardInstanceRef.current = null;
      if (step === 2) setCardStatus("idle");
    };
  }, [appId, locationId, step]);

  const goToPayment = () => {
    setStep(2);
    setError(null);
    setTimeout(() => paymentSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!billing.email.trim()) {
        setError("Email is required.");
        return;
      }
      const card = cardInstanceRef.current;
      if (!card) {
        setError("Payment form is not ready yet. Please wait for the card fields to appear, then try again.");
        return;
      }
      const stateForApi = shipToDifferent ? shipping.state.trim().toUpperCase().slice(0, 2) : billing.state.trim().toUpperCase().slice(0, 2);
      if (!stateForApi || stateForApi.length !== 2) {
        setError("Please enter a valid state.");
        return;
      }

      setSubmitting(true);
      try {
        const tokenResult = await card.tokenize();
        if (tokenResult.status !== "OK" || !tokenResult.token) {
          const errMsg = Array.isArray(tokenResult.errors)
            ? (tokenResult.errors as Array<{ message?: string }>).map((e) => e.message).join("; ")
            : "Failed to tokenize card.";
          setError(errMsg || "Invalid card.");
          setSubmitting(false);
          return;
        }

        const idempotencyKey = crypto.randomUUID();
        const shippingAddress = (shipToDifferent
          ? { firstName: shipping.firstName, lastName: shipping.lastName, addressLine1: shipping.address1, locality: shipping.city, administrativeDistrictLevel1: shipping.state, postalCode: shipping.zip }
          : { firstName: billing.firstName, lastName: billing.lastName, addressLine1: billing.address1, locality: billing.city, administrativeDistrictLevel1: billing.state, postalCode: billing.zip }
        );

        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey,
            cart: items.map((i) => ({
              catalogObjectId: i.catalogObjectId,
              quantity: i.quantity,
              variationId: i.variationId,
              ...(i.note && { note: i.note }),
            })),
            shippingState: stateForApi,
            email: billing.email.trim(),
            paymentNonce: tokenResult.token,
            shippingAddress: billing.address1.trim() ? shippingAddress : undefined,
            ...(orderNote.trim() && { orderNote: orderNote.trim() }),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.error ?? "Checkout failed.");
          setSubmitting(false);
          return;
        }

        onSuccess();
        router.push(`/checkout/success?orderId=${encodeURIComponent(data.orderId ?? "")}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
    [billing, shipping, shipToDifferent, items, orderNote, onSuccess, router]
  );

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[var(--millies-pink)] focus:border-[var(--millies-pink)] outline-none";
  const labelClass = "checkout-label block mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Coupons */}
      <section>
        <h2 className="checkout-section-title mb-3">Coupons</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Code"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            className="px-4 py-2.5 rounded-lg font-semibold text-white whitespace-nowrap"
            style={{ background: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
          >
            Apply
          </button>
        </div>
      </section>

      {/* Billing details */}
      <section>
        <h2 className="checkout-section-title mb-4">Billing details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First name *</label>
            <input
              type="text"
              required
              value={billing.firstName}
              onChange={(e) => setBilling((b) => ({ ...b, firstName: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Last name *</label>
            <input
              type="text"
              required
              value={billing.lastName}
              onChange={(e) => setBilling((b) => ({ ...b, lastName: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Company name (optional)</label>
          <input
            type="text"
            value={billing.company}
            onChange={(e) => setBilling((b) => ({ ...b, company: e.target.value }))}
            className={inputClass}
            placeholder="Company name (optional)"
          />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Country / Region *</label>
          <select
            value={billing.country}
            onChange={(e) => setBilling((b) => ({ ...b, country: e.target.value }))}
            className={inputClass}
          >
            <option value="US">United States (US)</option>
          </select>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Street address *</label>
          <input
            type="text"
            required
            value={billing.address1}
            onChange={(e) => setBilling((b) => ({ ...b, address1: e.target.value }))}
            className={inputClass}
            placeholder="House number and street name"
          />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Apartment, suite, unit, etc. (optional)</label>
          <input
            type="text"
            value={billing.address2}
            onChange={(e) => setBilling((b) => ({ ...b, address2: e.target.value }))}
            className={inputClass}
            placeholder="Apartment, suite, unit, etc. (optional)"
          />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Town / City *</label>
          <input
            type="text"
            required
            value={billing.city}
            onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>State *</label>
            <select
              required
              value={billing.state}
              onChange={(e) => setBilling((b) => ({ ...b, state: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select an option…</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>ZIP Code *</label>
            <input
              type="text"
              required
              value={billing.zip}
              onChange={(e) => setBilling((b) => ({ ...b, zip: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Phone *</label>
          <input
            type="tel"
            required
            value={billing.phone}
            onChange={(e) => setBilling((b) => ({ ...b, phone: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Email address *</label>
          <input
            type="email"
            required
            value={billing.email}
            onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="mt-4">
          <label className={labelClass}>Which shop referred you *</label>
          <select
            value={billing.referralShop}
            onChange={(e) => setBilling((b) => ({ ...b, referralShop: e.target.value }))}
            className={inputClass}
          >
            <option value="">Please select</option>
            <option value="website">Website</option>
            <option value="social">Social media</option>
            <option value="friend">Friend / family</option>
            <option value="other">Other</option>
          </select>
        </div>
      </section>

      {/* Shipping details */}
      <section>
        <h2 className="checkout-section-title mb-4">Shipping details</h2>
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={shipToDifferent}
            onChange={(e) => setShipToDifferent(e.target.checked)}
            className="rounded border-gray-300 text-[var(--millies-pink)] focus:ring-[var(--millies-pink)]"
          />
          <span className="checkout-label">Ship to a different address?</span>
        </label>
        {shipToDifferent && (
          <div className="space-y-4 pl-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First name *</label>
                <input
                  type="text"
                  required
                  value={shipping.firstName}
                  onChange={(e) => setShipping((s) => ({ ...s, firstName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Last name *</label>
                <input
                  type="text"
                  required
                  value={shipping.lastName}
                  onChange={(e) => setShipping((s) => ({ ...s, lastName: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Company name (optional)</label>
              <input
                type="text"
                value={shipping.company}
                onChange={(e) => setShipping((s) => ({ ...s, company: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country / Region *</label>
              <select
                value={shipping.country}
                onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                className={inputClass}
              >
                <option value="US">United States (US)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Street address *</label>
              <input
                type="text"
                required={shipToDifferent}
                value={shipping.address1}
                onChange={(e) => setShipping((s) => ({ ...s, address1: e.target.value }))}
                className={inputClass}
                placeholder="House number and street name"
              />
            </div>
            <div>
              <label className={labelClass}>Apartment, suite, unit, etc. (optional)</label>
              <input
                type="text"
                value={shipping.address2}
                onChange={(e) => setShipping((s) => ({ ...s, address2: e.target.value }))}
                className={inputClass}
                placeholder="Apartment, suite, unit, etc. (optional)"
              />
            </div>
            <div>
              <label className={labelClass}>Town / City *</label>
              <input
                type="text"
                required={shipToDifferent}
                value={shipping.city}
                onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>State *</label>
                <select
                  required={shipToDifferent}
                  value={shipping.state}
                  onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select an option…</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ZIP Code *</label>
                <input
                  type="text"
                  required={shipToDifferent}
                  value={shipping.zip}
                  onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Order note */}
      <section>
        <label className={labelClass}>Order Note / gift note (optional)</label>
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Notes about your order, e.g. special notes for delivery."
        />
      </section>

      {/* Step 1: show only the continue button */}
      {step === 1 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={goToPayment}
            className="w-full text-white py-3.5 rounded-full font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity"
            style={{ background: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
          >
            Continue to payment
          </button>
        </div>
      )}

      {/* Step 2: payment – card container only mounted when visible so Square can render */}
      {step === 2 && (
        <div ref={paymentSectionRef} className="pt-4 border-t border-gray-200 mt-8">
          <section className="pt-4">
            <h2 className="checkout-section-title mb-2">Credit Card</h2>
            <p className="text-gray-500 text-sm mb-2">visa · mastercard · amex · jcb</p>
            <p className="text-gray-600 text-sm mb-4">Pay securely using your credit card.</p>
            <div className="min-h-[120px] mb-4 w-full relative">
              {cardStatus === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-sm z-10">
                  Loading payment form…
                </div>
              )}
              <div id="card-container" ref={cardContainerRef} className="min-h-[120px] w-full" />
            </div>
          </section>

          <p className="text-gray-500 text-xs mt-4">
            Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
          </p>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !canPay}
            className="w-full text-white py-3.5 rounded-full font-semibold uppercase tracking-wide hover:opacity-90 disabled:opacity-50 transition-opacity mt-4"
            style={{ background: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
          >
            {submitting ? "Processing…" : `Place order · ${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(totalCents / 100)}`}
          </button>
        </div>
      )}
    </form>
  );
}
