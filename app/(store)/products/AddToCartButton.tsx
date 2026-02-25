"use client";

import { useCart } from "@/app/cart/CartContext";

interface AddToCartButtonProps {
  variationId: string;
  catalogObjectId: string;
  name: string;
  priceCents: number;
  currency: string;
  isFrozen: boolean;
}

export function AddToCartButton({
  variationId,
  catalogObjectId,
  name,
  priceCents,
  currency,
  isFrozen,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      className="mt-3 w-full text-white py-2 px-4 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
      style={{ background: "var(--millies-pink)" }}
      onClick={() =>
        addItem({
          catalogObjectId,
          variationId,
          name,
          priceCents,
          currency,
          isFrozen,
          quantity: 1,
        })
      }
    >
      Add to cart
    </button>
  );
}
