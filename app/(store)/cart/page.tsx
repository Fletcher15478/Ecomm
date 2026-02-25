"use client";

import Link from "next/link";
import { useCart } from "@/app/cart/CartContext";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotalCents } = useCart();
  const currency = items[0]?.currency ?? "USD";

  if (items.length === 0) {
    return (
      <div className="cart-page p-6 max-w-2xl mx-auto w-full text-center py-16 px-8">
        <h1
          className="cart-page-title text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-6"
          style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
        >
          Your cart is empty
        </h1>
        <Link
          href="/products"
          className="inline-block text-lg font-semibold uppercase tracking-wide hover:underline"
          style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page p-6 sm:p-8 max-w-3xl mx-auto w-full">
      <h1
        className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-10"
        style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
      >
        Your Cart
      </h1>

      <ul className="space-y-6 sm:space-y-8 mb-10">
        {items.map((item) => (
          <li
            key={item.variationId}
            className="cart-item bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div
                  className="font-semibold text-gray-900 text-lg"
                  style={{ fontFamily: "var(--font-program-narrow)" }}
                >
                  {item.name}
                </div>
                {item.note && (
                  <div className="text-gray-500 text-sm mt-1.5 whitespace-pre-wrap">{item.note}</div>
                )}
                <div className="text-gray-600 text-sm mt-1">
                  {formatMoney(item.priceCents, item.currency)} each
                  {item.isFrozen && " · Frozen"}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full border-2 border-gray-200 text-gray-600 hover:border-[var(--millies-pink)] hover:text-[var(--millies-pink)] transition-colors flex items-center justify-center text-lg font-medium"
                    onClick={() => updateQuantity(item.variationId, -1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span
                    className="w-10 text-center text-gray-900 font-semibold"
                    style={{ fontFamily: "var(--font-program-narrow)" }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full border-2 border-gray-200 text-gray-600 hover:border-[var(--millies-pink)] hover:text-[var(--millies-pink)] transition-colors flex items-center justify-center text-lg font-medium"
                    onClick={() => updateQuantity(item.variationId, 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div
                  className="font-semibold text-gray-900 text-lg"
                  style={{ fontFamily: "var(--font-program-narrow)" }}
                >
                  {formatMoney(item.priceCents * item.quantity, item.currency)}
                </div>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-red-600 hover:underline transition-colors"
                  onClick={() => removeItem(item.variationId)}
                  style={{ fontFamily: "var(--font-program-narrow)" }}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex justify-between items-baseline mb-4">
          <span
            className="text-gray-600 uppercase tracking-wide text-sm"
            style={{ fontFamily: "var(--font-program-narrow)" }}
          >
            Subtotal (items only)
          </span>
          <span
            className="font-bold text-xl text-gray-900"
            style={{ fontFamily: "var(--font-program-narrow)" }}
          >
            {formatMoney(subtotalCents, currency)}
          </span>
        </div>
        <p
          className="text-sm text-gray-500 mb-6"
          style={{ fontFamily: "var(--font-program-narrow)" }}
        >
          Shipping and any surcharges are calculated at checkout.
        </p>
        <Link
          href="/checkout"
          className="block w-full text-white py-4 rounded-full text-center font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity text-lg"
          style={{ background: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
