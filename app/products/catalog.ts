import { listCatalogItems, getCatalogItemImageUrls, type ProductType } from "@/lib/square";
import { isMerchProduct } from "@/lib/productContent";
import { getStoreProductSettings } from "@/lib/storeProductSettings";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * If set, only show items whose Square name matches (case-insensitive) one of these.
 * Comma-separated list.
 *
 * Example:
 * STORE_ALLOWED_ITEM_NAMES="Best Sellers Collection, Build Your Own 4 Pack"
 */
export function getAllowedStoreItemNames(): Set<string> | null {
  const raw = process.env.STORE_ALLOWED_ITEM_NAMES?.trim();
  if (!raw) return null;
  const names = raw
    .split(",")
    .map((s) => normalizeName(s))
    .filter(Boolean);
  if (names.length === 0) return null;
  return new Set(names);
}

export interface CatalogItemDisplay {
  id: string;
  name: string;
  description?: string | null;
  variationId: string;
  priceCents: number;
  currency: string;
  isFrozen: boolean;
  imageUrl?: string;
  productType: ProductType;
  /** When true, show "Out of stock" and disable add to cart (from admin store settings). */
  isOutOfStock?: boolean;
  /** Featured product (admin). */
  isFeatured?: boolean;
  /** Seasonal product (admin). */
  isSeasonal?: boolean;
}

/**
 * Server-side catalog fetch. Cached with revalidation (see page revalidate).
 * Merges Square catalog with store_product_settings (order, out-of-stock, custom image, hidden).
 */
export async function getCatalogItems(): Promise<CatalogItemDisplay[]> {
  const items = await listCatalogItems();
  const allowed = getAllowedStoreItemNames();
  const visibleSquareItems = allowed
    ? items.filter((i) => allowed.has(normalizeName(i.name)))
    : items;

  const uniqueIds = Array.from(new Set(visibleSquareItems.map((i) => i.id)));
  const imageMap = await getCatalogItemImageUrls(uniqueIds);
  const settingsMap = await getStoreProductSettings();

  const merged: (CatalogItemDisplay & { _displayOrder: number; _hidden: boolean })[] = visibleSquareItems.map((item) => {
    const setting = settingsMap.get(item.variationId);
    const displayOrder = setting?.display_order ?? 999999;
    const hidden = setting?.hidden ?? false;
    const isOutOfStock = setting?.is_out_of_stock ?? false;
    const isFeatured = setting?.featured ?? false;
    const isSeasonal = setting?.seasonal ?? false;
    const customImage = setting?.custom_image_url?.trim();
    const imageUrl = customImage || imageMap.get(item.id);
    const productTypeOverride = setting?.product_type_override as "ice_cream" | "merchandise" | "gift_card" | undefined;
    const priceOverride = setting?.price_override_cents;
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      variationId: item.variationId,
      priceCents: priceOverride != null ? priceOverride : Number(item.priceMoney.amount),
      currency: item.priceMoney.currency,
      isFrozen: item.isFrozen,
      imageUrl: imageUrl ?? undefined,
      productType: productTypeOverride ?? (isMerchProduct(item.name) ? "merchandise" : item.productType),
      isOutOfStock,
      isFeatured,
      isSeasonal,
      _displayOrder: displayOrder,
      _hidden: hidden,
    };
  });

  const filtered = merged.filter((i) => !i._hidden);
  filtered.sort((a, b) => {
    const ar = a.isFeatured ? 0 : a.isSeasonal ? 1 : 2;
    const br = b.isFeatured ? 0 : b.isSeasonal ? 1 : 2;
    if (ar !== br) return ar - br;
    return a._displayOrder - b._displayOrder;
  });

  return filtered.map(({ _displayOrder, _hidden, ...rest }) => rest as CatalogItemDisplay);
}
