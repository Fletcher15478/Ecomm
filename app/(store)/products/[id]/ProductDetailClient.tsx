"use client";

import { useState } from "react";
import { useCart } from "@/app/cart/CartContext";

const PLACEHOLDER = "";
const FLAVORS = [
  "Best Chocolate",
  "Chad's Vanilla (GF)",
  "Coffee Break (GF)",
  "Backyard S'mores",
  "Cookie Dough",
  "Cookies 'n' Cream",
  "Nutty Pistachio",
  "Peanut Butter Buckeye",
  "Dairy-free Mint Chip (GF/V)",
  "Dairy-free Very Mango (GF/V)",
];

interface ProductDetailClientProps {
  item: {
    id: string;
    name: string;
    variationId: string;
    priceCents: number;
    currency: string;
    isFrozen: boolean;
    isOutOfStock?: boolean;
  };
  /** In-stock flavor names for Pick 4 / Pick 6 dropdowns (optional). */
  availableFlavors?: string[];
  /** In-stock sizes for this product (optional). */
  availableSizes?: string[];
}

function getPintCount(name: string): number {
  const n = name.toLowerCase();
  // "Pick 6", "pick 6", "pick six", "pick-6", etc.
  if (/pick\s*6|pick-6|pick\s*six/.test(n)) return 6;
  // "4 pack", "4-pack", etc.
  if (/4\s*pack|4-pack/.test(n)) return 4;
  return 0;
}

/** Size options for kids tees. Returns null if not a tee that needs size. */
function getTeeSizes(name: string): string[] | null {
  const n = name.toLowerCase();
  if (n.includes("green kids tee")) return ["2T", "3T", "XS", "S", "M", "L", "XL"];
  if (n.includes("tan kids tee")) return ["XS", "M", "L", "XL"];
  if (n.includes("pink kids tee")) return ["2T", "3T", "4T", "M", "L", "XL"];
  return null;
}

export function ProductDetailClient({ item, availableFlavors, availableSizes }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const isOutOfStock = item.isOutOfStock ?? false;
  const pintCount = getPintCount(item.name);
  const teeSizes = availableSizes && availableSizes.length > 0 ? availableSizes : getTeeSizes(item.name);
  const flavorOptions = availableFlavors && availableFlavors.length > 0 ? availableFlavors : FLAVORS;
  const [quantity, setQuantity] = useState(1);
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [flavors, setFlavors] = useState<string[]>(() =>
    Array.from({ length: Math.max(pintCount || 4, 4) }, () => PLACEHOLDER)
  );
  const [selectedSize, setSelectedSize] = useState("");

  const slotCount = pintCount || 4;
  const slots = Array.from({ length: slotCount }, (_, i) => flavors[i] ?? PLACEHOLDER);

  const isMultiPint = pintCount > 0;
  const allPintsSelected = isMultiPint
    ? slots.every((f) => f !== PLACEHOLDER && f.trim() !== "")
    : true;
  const sizeSelected = !teeSizes || selectedSize !== "";
  const canAddToCart =
    !isOutOfStock &&
    (isMultiPint ? allPintsSelected : true) &&
    (!teeSizes || sizeSelected);

  const handleAddToCart = () => {
    if (isMultiPint && !allPintsSelected) return;
    if (teeSizes && !sizeSelected) return;
    const parts: string[] = [];
    if (isMultiPint && allPintsSelected)
      parts.push(slots.map((f, i) => `Pint ${i + 1}: ${f}`).join("; "));
    if (teeSizes && selectedSize) parts.push(`Size: ${selectedSize}`);
    const note = parts.length > 0 ? parts.join(" | ") : undefined;
    addItem({
      catalogObjectId: item.id,
      variationId: item.variationId,
      name: item.name,
      priceCents: item.priceCents,
      currency: item.currency,
      isFrozen: item.isFrozen,
      quantity,
      ...(note && { note }),
    });
    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 3000);
  };

  return (
    <>
      {teeSizes && (
        <div className="mb-6 space-y-3 border-t border-b border-dashed border-pink-200 py-4">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            Size
          </h3>
          <label className="block">
            <span className="sr-only">Size</span>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 bg-white"
            >
              <option value="">Choose a size</option>
              {teeSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {!sizeSelected && (
            <p className="text-sm text-amber-600">Please select a size.</p>
          )}
        </div>
      )}

      {isMultiPint && (
        <div className="mb-6 space-y-3 border-t border-b border-dashed border-pink-200 py-4">
          <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
            Your choice of {slotCount} pints
          </h3>
          {slots.map((_, i) => (
            <label key={i} className="block">
              <span className="sr-only">Pint {i + 1}</span>
              <select
                value={slots[i]}
                onChange={(e) => {
                  const next = [...slots];
                  next[i] = e.target.value;
                  setFlavors(next);
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 bg-white"
              >
                <option value={PLACEHOLDER}>Choose a flavor</option>
                {flavorOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {!allPintsSelected && (
            <p className="text-sm text-amber-600">
              Please select all {slotCount} pint flavors to add to cart.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {isOutOfStock ? (
          <p className="text-lg font-semibold text-gray-600">Out of stock — check back later.</p>
        ) : (
          <>
        <div className="flex items-center gap-2">
          <label htmlFor="qty" className="text-sm font-medium text-gray-700">
            Quantity
          </label>
          <input
            id="qty"
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-16 rounded border border-gray-300 px-2 py-2 text-center"
          />
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--millies-pink)" }}
        >
          Add to cart
        </button>
        {showAddedMessage && (
          <span
            className="text-sm font-medium transition-opacity"
            style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
          >
            Successfully added to cart
          </span>
        )}
          </>
        )}
      </div>
    </>
  );
}
