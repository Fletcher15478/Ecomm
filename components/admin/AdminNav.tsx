"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/batch-codes", label: "Batch codes" },
  { href: "/admin/logs", label: "Logs" },
] as const;

export function AdminNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm relative">
      <Link href="/admin" className="font-semibold text-lg flex items-center gap-2 shrink-0">
        <Image src="/images/cone-pink.svg" alt="" width={28} height={42} className="h-8 w-auto" />
        <span style={{ color: "var(--millies-pink)" }}>Admin</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-4">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-gray-600 hover:text-[var(--millies-pink)] transition-colors font-medium"
          >
            {label}
          </Link>
        ))}
        <span className="text-gray-500 text-sm border-l border-gray-200 pl-4">{email}</span>
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="text-gray-500 text-sm hover:text-[var(--millies-pink)] transition-colors"
          >
            Log out
          </button>
        </form>
      </nav>

      {/* Mobile: hamburger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="md:hidden flex flex-col justify-center gap-1.5 w-10 h-10 rounded border border-gray-300 p-2"
        aria-expanded={open}
        aria-label="Toggle menu"
      >
        <span className={`h-0.5 bg-gray-600 transition-transform ${open ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`h-0.5 bg-gray-600 transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`h-0.5 bg-gray-600 transition-transform ${open ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Mobile: dropdown nav */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 md:hidden">
          <nav className="flex flex-col p-4 gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-3 px-3 rounded text-gray-700 hover:bg-pink-50 hover:text-[var(--millies-pink)] font-medium"
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-3 text-sm text-gray-500">
              {email}
            </div>
            <form action="/api/admin/logout" method="post" className="mt-2">
              <button
                type="submit"
                className="w-full text-left py-3 px-3 rounded text-gray-600 hover:bg-gray-100"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
