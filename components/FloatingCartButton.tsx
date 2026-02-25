"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/app/cart/CartContext";

export function FloatingCartButton() {
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Link
      href="/cart"
      className="floating-cart-button fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 bg-white"
      aria-label={count > 0 ? `Cart: ${count} item${count !== 1 ? "s" : ""}` : "Cart"}
    >
      <span className="relative inline-flex items-center justify-center w-14 h-14 p-1.5">
        <Image
          src="/images/cone-pink.svg"
          alt=""
          width={32}
          height={48}
          className="object-contain h-8 w-auto"
          aria-hidden
        />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-white border-2 px-1 text-xs font-bold"
            style={{ borderColor: "var(--millies-pink)", color: "var(--millies-pink)" }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
    </Link>
  );
}
