import React from "react";

export function StoreBanner() {
  return (
    <div
      className="store-banner"
      role="banner"
      aria-label="Promotional banner: All items in stock, we ship every Wednesday"
    >
      <div className="store-banner-inner">
        <p className="store-banner-line">ALL ITEMS ARE IN STOCK!</p>
        <p className="store-banner-line">WE SHIP EVERY WEDNESDAY</p>
      </div>
    </div>
  );
}
