import React from "react";

/** When true (shop home + /products), banner is a centered capsule; otherwise full-width strip. */
export function StoreBanner({ catalogLayout = false }: { catalogLayout?: boolean }) {
  return (
    <div
      className={catalogLayout ? "store-banner store-banner--catalog" : "store-banner"}
      role="banner"
      aria-label="Promotional banner: All items in stock, we ship every Wednesday"
    >
      <div className="store-banner-inner">
        <p className="store-banner-line">ALL ITEMS ARE IN STOCK!</p>
        <span className="store-banner-divider" aria-hidden />
        <p className="store-banner-line store-banner-line-secondary">WE SHIP EVERY WEDNESDAY</p>
      </div>
    </div>
  );
}
