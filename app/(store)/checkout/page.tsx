"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/app/cart/CartContext";
import { CheckoutForm } from "./CheckoutForm";

const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export default function CheckoutPage() {
  const { items, subtotalCents, clearCart } = useCart();
  const [squareReady, setSquareReady] = useState(false);
  const [shippingState, setShippingState] = useState("");
  const [shippingBreakdown, setShippingBreakdown] = useState<{
    allowed: boolean;
    blockedReason?: string;
    subtotal: number;
    heatSurcharge: number;
    icePackFee: number;
    insulatedPackagingFee: number;
    total: number;
    currency: string;
  } | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const currency = items[0]?.currency ?? "USD";

  const fetchShipping = useCallback(async () => {
    if (!shippingState.trim() || items.length === 0) {
      setShippingBreakdown(null);
      return;
    }
    setLoadingShipping(true);
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: items.map((i) => ({
            catalogObjectId: i.catalogObjectId,
            quantity: i.quantity,
            isFrozen: i.isFrozen,
            name: i.name,
          })),
          state: shippingState.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) setShippingBreakdown(data);
      else setShippingBreakdown(null);
    } catch {
      setShippingBreakdown(null);
    } finally {
      setLoadingShipping(false);
    }
  }, [items, shippingState]);

  useEffect(() => {
    const t = setTimeout(fetchShipping, 300);
    return () => clearTimeout(t);
  }, [fetchShipping]);

  const squareScriptUrl =
    process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  // Load Square Web Payments SDK (must run before any early return so hooks order is stable)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { Square?: unknown };
    if (win.Square) {
      setSquareReady(true);
      return;
    }
    const id = "square-web-payments-sdk";
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = squareScriptUrl;
    script.async = true;
    script.onload = () => {
      if ((window as unknown as { Square?: unknown }).Square) setSquareReady(true);
    };
    document.body.appendChild(script);
  }, [squareScriptUrl]);

  if (items.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto w-full text-center py-12">
        <h1 className="checkout-section-title text-2xl mb-4">
          Your cart is empty
        </h1>
        <Link href="/products" className="text-[var(--millies-pink)] font-semibold hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const shippingTotalCents = shippingBreakdown?.allowed ? shippingBreakdown.total : 0;
  const totalCents = subtotalCents + shippingTotalCents;
  const canPay = shippingBreakdown?.allowed && APP_ID && LOCATION_ID;

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 lg:py-10">
          <Link
            href="/cart"
            className="inline-block mb-6 text-sm hover:underline"
            style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
          >
            ← Back to cart
          </Link>
          <h1
            className="text-2xl lg:text-3xl font-bold uppercase tracking-tight mb-8"
            style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
          >
            Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: form */}
            <div className="lg:col-span-2">
              <CheckoutForm
                items={items}
                shippingState={shippingState.trim()}
                setShippingState={setShippingState}
                shippingBreakdown={shippingBreakdown}
                loadingShipping={loadingShipping}
                totalCents={totalCents}
                currency={currency}
                onSuccess={clearCart}
                canPay={!!canPay}
                squareReady={squareReady}
              />
            </div>

            {/* Right: order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h2 className="checkout-section-title mb-4">Your order</h2>
                <ul className="space-y-3 border-b border-gray-100 pb-4 mb-4">
                  {items.map((item) => (
                    <li key={item.variationId} className="text-sm">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.quantity > 1 && (
                        <span className="text-gray-500"> × {item.quantity}</span>
                      )}
                      {item.note && (
                        <div className="text-gray-500 text-xs mt-0.5 whitespace-pre-wrap">
                          {item.note}
                        </div>
                      )}
                      <div className="text-gray-600 mt-0.5">
                        {formatMoney(item.priceCents * item.quantity, currency)}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="checkout-label">Subtotal</span>
                    <span>{formatMoney(subtotalCents, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="checkout-label">Express Ice Cream Shipping</span>
                    <span>
                      {loadingShipping && shippingState.length === 2
                        ? "…"
                        : shippingBreakdown?.allowed
                          ? formatMoney(shippingTotalCents, currency)
                          : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-base mt-4 pt-4 border-t border-gray-200">
                  <span className="checkout-section-title">Total</span>
                  <span>{formatMoney(totalCents, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 bg-white py-10 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-2xl font-bold uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-program-narrow)", color: "var(--millies-pink)" }}>
              Get the Scoop!
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Sign up for our newsletter to get up-to-date info on new events, flavors, and all things Millie&apos;s.
            </p>
            <a
              href="https://www.millieshomemade.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold underline"
              style={{ color: "var(--millies-pink)" }}
            >
              Signup Here
            </a>
            <p className="text-gray-500 text-xs mt-6">
              @Millies · Employee Portal · Copyright 2026 © Millie&apos;s Homemade LLC. Refunds &amp; Returns. 412.924.0040.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
