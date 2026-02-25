import Link from "next/link";
import Image from "next/image";
import type { CatalogItemDisplay } from "@/app/products/catalog";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export function ProductGrid({ items }: { items: CatalogItemDisplay[] }) {
  if (items.length === 0) {
    return <p className="text-gray-500">No products available.</p>;
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {items.map((item) => (
        <li
          key={item.variationId}
          className="rounded-xl overflow-hidden bg-white border border-[var(--millies-pink)]/40 shadow-sm hover:shadow-md hover:border-[var(--millies-pink)] transition-all duration-200 max-w-[280px] mx-auto sm:mx-0 sm:max-w-none"
        >
          <Link href={`/products/${item.id}`} className="block group">
            <div className="h-28 sm:h-32 bg-gray-50 relative flex items-center justify-center">
              {(item.isFeatured || item.isSeasonal) && (
                <div className="absolute left-2 top-2 z-20 flex gap-1.5">
                  {item.isFeatured && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide text-white shadow"
                      style={{ background: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
                    >
                      Featured
                    </span>
                  )}
                  {item.isSeasonal && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shadow"
                      style={{
                        background: "#fff",
                        color: "var(--millies-pink)",
                        border: "1px solid var(--millies-pink)",
                        fontFamily: "var(--font-program-narrow)",
                      }}
                    >
                      Seasonal
                    </span>
                  )}
                </div>
              )}
              {item.isOutOfStock && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/60 rounded-t-xl"
                  style={{ fontFamily: "var(--font-program-narrow)" }}
                >
                  <span className="text-white font-semibold uppercase tracking-wide text-sm">
                    Out of stock
                  </span>
                </div>
              )}
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-contain p-3 group-hover:scale-[1.02] transition-transform duration-200"
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 220px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{ fontFamily: "var(--font-program-narrow)" }}>
                  No image
                </div>
              )}
            </div>
            <div className="p-3 sm:p-4">
              <div
                className="font-semibold text-gray-900 group-hover:text-[var(--millies-pink)] transition-colors text-sm uppercase tracking-wide"
                style={{ fontFamily: "var(--font-program-narrow)" }}
              >
                {item.name}
              </div>
              {item.description && (
                <p
                  className="text-xs text-gray-600 mt-1 line-clamp-2"
                  style={{ fontFamily: "var(--font-program-narrow)" }}
                >
                  {item.description}
                </p>
              )}
              <div
                className="mt-2 font-semibold text-sm text-[var(--millies-pink)]"
                style={{ fontFamily: "var(--font-program-narrow)" }}
              >
                {formatMoney(item.priceCents, item.currency)}
                {item.isFrozen && (
                  <span className="ml-1.5 text-[10px] text-blue-600 font-normal">Frozen</span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
