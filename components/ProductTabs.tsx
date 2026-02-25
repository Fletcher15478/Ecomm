"use client";

import { useState } from "react";
import type { CatalogItemDisplay } from "@/app/products/catalog";
import { ProductGrid } from "@/components/ProductGrid";
import type { ProductType } from "@/lib/square";

const TABS: { id: ProductType; label: string; description: string }[] = [
  { id: "ice_cream", label: "Ice Cream", description: "Pints, 4-packs & more" },
  { id: "merchandise", label: "Merchandise", description: "Apparel & gear" },
  { id: "gift_cards", label: "Gift Cards", description: "Give the gift of Millie's" },
];

const SQUARE_GIFT_CARD_URL = "https://squareup.com/gift/MLDG58HCNKRJZ/order";

export function ProductTabs({ items }: { items: CatalogItemDisplay[] }) {
  const [active, setActive] = useState<ProductType>("ice_cream");
  const filtered = items.filter((i) => i.productType === active);
  const featured = filtered.filter((i) => !!i.isFeatured);
  const seasonal = filtered.filter((i) => !i.isFeatured && !!i.isSeasonal);
  const regular = filtered.filter((i) => !i.isFeatured && !i.isSeasonal);

  return (
    <div className="space-y-8">
      <div className="product-tabs flex flex-wrap justify-center gap-6 sm:gap-10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`
              group relative flex flex-col items-center rounded-2xl border-2 px-8 py-5 min-w-[140px] sm:min-w-[160px]
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-300
              ${active === tab.id
                ? "border-[var(--millies-pink)] bg-[var(--millies-pink)]/10 shadow-md"
                : "border-gray-200 bg-white hover:border-pink-200 hover:bg-pink-50/50"
              }
            `}
            aria-selected={active === tab.id}
            role="tab"
          >
            <span
              className={`font-semibold text-sm sm:text-base uppercase tracking-wide ${active === tab.id ? "text-[var(--millies-pink)]" : "text-gray-700 group-hover:text-gray-900"}`}
            >
              {tab.label}
            </span>
            <span className="text-xs text-gray-500 mt-1 hidden sm:block">
              {tab.description}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={TABS.find((t) => t.id === active)?.label}>
        {active === "gift_cards" ? (
          <div className="flex justify-center">
            <a
              href={SQUARE_GIFT_CARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl overflow-hidden bg-white border-2 border-gray-100 shadow-md hover:shadow-lg hover:border-[var(--millies-pink)]/40 transition-all duration-200 max-w-sm w-full group"
            >
              <div className="aspect-[4/3] bg-gray-50 relative">
                <img
                  src="/uploads/gift_cards.svg"
                  alt="Order Millie's eGift Cards"
                  className="w-full h-full object-contain p-6 group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-5 text-center">
                <span
                  className="font-semibold text-gray-900 group-hover:text-[var(--millies-pink)] transition-colors text-lg"
                  style={{ fontFamily: "var(--font-program-narrow)" }}
                >
                  Order eGift Cards
                </span>
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-program-narrow)" }}>
                  Give the gift of Millie&apos;s
                </p>
              </div>
            </a>
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-10">
            {featured.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
                  >
                    Featured
                  </h2>
                </div>
                <ProductGrid items={featured} />
              </section>
            )}
            {seasonal.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
                  >
                    Seasonal
                  </h2>
                </div>
                <ProductGrid items={seasonal} />
              </section>
            )}
            {regular.length > 0 && (
              <section className="space-y-4">
                {(featured.length > 0 || seasonal.length > 0) && (
                  <h2
                    className="text-lg font-semibold text-gray-800"
                    style={{ fontFamily: "var(--font-program-narrow)" }}
                  >
                    All
                  </h2>
                )}
                <ProductGrid items={regular} />
              </section>
            )}
          </div>
        ) : (
          <div className="product-tabs text-center py-16 px-4 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
            <p className="text-gray-600 font-medium uppercase tracking-wide">
              No {TABS.find((t) => t.id === active)?.label.toLowerCase()} yet
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Check back soon or browse our other tabs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
