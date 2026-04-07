"use client";

import { usePathname } from "next/navigation";
import { StoreBanner } from "./StoreBanner";

/** Renders the store banner except on product detail pages (e.g. /products/abc123). */
export function StoreBannerWrapper() {
  const pathname = usePathname();
  const isProductDetail =
    pathname?.startsWith("/products/") && pathname !== "/products" && pathname.length > "/products/".length;
  if (isProductDetail) return null;
  return <StoreBanner />;
}
