"use server";

import path from "path";
import { createCatalogItem, listCatalogItems, getCatalogItemImageUrls, uploadCatalogImageToSquare, deleteCatalogItem } from "@/lib/square";
import { getAdminSession } from "@/lib/auth";
import { getStoreProductSettings, deleteStoreProductSettingByVariation } from "@/lib/storeProductSettings";
import { upsertStoreProductSetting, setDisplayOrder, type StoreProductSettingPatch } from "@/lib/storeProductSettings";
import { ensureSetting } from "@/lib/storeProductSettings";
import { saveCarouselOverride, deleteCarouselOverride } from "@/lib/productCarouselOverrides";
import { setProductFlavors } from "@/lib/productFlavorOptions";
import { deleteAllSizeOptionsForVariation } from "@/lib/productSizeOptions";
import { insertBatchCodes, getBatchCodesForProductAndWeek, listWeeksForProduct, getWeekStartWednesday, formatWeekLabel } from "@/lib/batchCodes";
import { insertAuditLog } from "@/lib/auditLog";

export async function getAdminCatalog(): Promise<Array<{
  id: string;
  name: string;
  variationId: string;
  priceCents: number;
  currency: string;
  isFrozen: boolean;
}>> {
  const session = await getAdminSession();
  if (!session) return [];

  const items = await listCatalogItems();
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    variationId: item.variationId,
    priceCents: Number(item.priceMoney.amount),
    currency: item.priceMoney.currency,
    isFrozen: item.isFrozen,
  }));
}

export type AdminCatalogItemWithSettings = {
  id: string;
  name: string;
  variationId: string;
  priceCents: number;
  currency: string;
  isFrozen: boolean;
  displayOrder: number;
  isOutOfStock: boolean;
  customImageUrl: string | null;
  hidden: boolean;
  featured: boolean;
  seasonal: boolean;
  imageUrl: string | null;
  productTypeOverride: string | null;
  priceOverrideCents: number | null;
  longDescriptionOverride: string | null;
};

/** Catalog items merged with store_product_settings for admin store board. */
export async function getAdminCatalogWithSettings(): Promise<AdminCatalogItemWithSettings[]> {
  const session = await getAdminSession();
  if (!session) return [];

  const items = await listCatalogItems();
  const settingsMap = await getStoreProductSettings();
  const uniqueIds = Array.from(new Set(items.map((i) => i.id)));
  const imageMap = await getCatalogItemImageUrls(uniqueIds);

  const merged = items.map((item, index) => {
    const setting = settingsMap.get(item.variationId);
    const squareImage = imageMap.get(item.id) ?? null;
    const customImage = setting?.custom_image_url?.trim() || null;
    const priceOverride = setting?.price_override_cents ?? null;
    return {
      id: item.id,
      name: item.name,
      variationId: item.variationId,
      priceCents: priceOverride != null ? priceOverride : Number(item.priceMoney.amount),
      currency: item.priceMoney.currency,
      isFrozen: item.isFrozen,
      displayOrder: setting?.display_order ?? index,
      isOutOfStock: setting?.is_out_of_stock ?? false,
      customImageUrl: setting?.custom_image_url ?? null,
      hidden: setting?.hidden ?? false,
      featured: setting?.featured ?? false,
      seasonal: setting?.seasonal ?? false,
      imageUrl: customImage || squareImage,
      productTypeOverride: setting?.product_type_override ?? null,
      priceOverrideCents: setting?.price_override_cents ?? null,
      longDescriptionOverride: setting?.long_description_override ?? null,
    };
  });
  merged.sort((a, b) => a.displayOrder - b.displayOrder);
  // Ensure every variation has a settings row (for reorder to work on first use)
  for (let i = 0; i < merged.length; i++) {
    const item = merged[i];
    if (!settingsMap.has(item.variationId)) {
      await ensureSetting(item.variationId, item.id, i);
    }
  }
  return merged;
}

/** Single catalog item by id (first variation) for admin product edit page. */
export async function getAdminCatalogItemById(
  catalogItemId: string
): Promise<AdminCatalogItemWithSettings | null> {
  const session = await getAdminSession();
  if (!session) return null;
  const items = await getAdminCatalogWithSettings();
  return items.find((i) => i.id === catalogItemId) ?? null;
}

export type UpdateStoreSettingResult = { success: true } | { success: false; error: string };

export async function updateStoreSettingAction(
  variationId: string,
  catalogItemId: string,
  patch: {
    isOutOfStock?: boolean;
    customImageUrl?: string | null;
    hidden?: boolean;
    featured?: boolean;
    seasonal?: boolean;
    productTypeOverride?: string | null;
    priceOverrideCents?: number | null;
    longDescriptionOverride?: string | null;
  }
): Promise<UpdateStoreSettingResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const mapped: StoreProductSettingPatch = {};
  if (patch.isOutOfStock !== undefined) mapped.is_out_of_stock = patch.isOutOfStock;
  if (patch.customImageUrl !== undefined) mapped.custom_image_url = patch.customImageUrl;
  if (patch.hidden !== undefined) mapped.hidden = patch.hidden;
  if (patch.featured !== undefined) mapped.featured = patch.featured;
  if (patch.seasonal !== undefined) mapped.seasonal = patch.seasonal;
  if (patch.productTypeOverride !== undefined) mapped.product_type_override = patch.productTypeOverride;
  if (patch.priceOverrideCents !== undefined) mapped.price_override_cents = patch.priceOverrideCents;
  if (patch.longDescriptionOverride !== undefined) mapped.long_description_override = patch.longDescriptionOverride;
  const result = await upsertStoreProductSetting(variationId, catalogItemId, mapped);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to update" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
  return { success: true };
}

export async function moveStoreItemAction(
  variationId: string,
  direction: "up" | "down"
): Promise<UpdateStoreSettingResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const items = await getAdminCatalogWithSettings();
  const index = items.findIndex((i) => i.variationId === variationId);
  if (index < 0) return { success: false, error: "Item not found" };
  const newIndex = direction === "up" ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= items.length) return { success: true };
  const reordered = [...items];
  const a = reordered[index];
  const b = reordered[newIndex];
  reordered[index] = b;
  reordered[newIndex] = a;
  const variationIds = reordered.map((i) => i.variationId);
  const catalogItemIds = new Map(reordered.map((i) => [i.variationId, i.id]));
  const result = await setDisplayOrder(variationIds, catalogItemIds);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to reorder" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
  return { success: true };
}

/** Save display order from admin (variationIds in desired order). */
export async function saveStoreOrderAction(variationIds: string[]): Promise<UpdateStoreSettingResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const items = await getAdminCatalogWithSettings();
  const byVariation = new Map(items.map((i) => [i.variationId, i]));
  const catalogItemIds = new Map<string, string>();
  for (const vid of variationIds) {
    const item = byVariation.get(vid);
    if (item) catalogItemIds.set(vid, item.id);
  }
  const result = await setDisplayOrder(variationIds, catalogItemIds);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to save order" };
  await insertAuditLog(session, "product_order_updated", "product", null, { variationIds: variationIds.length });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
  return { success: true };
}

export type DeleteProductResult =
  | { success: true }
  | { success: false; error: string };

/** Delete item from Square catalog and remove from dashboard/catalogue (store settings, carousel, flavors, sizes). */
export async function deleteProductFromSquareAction(
  itemId: string,
  variationId: string
): Promise<DeleteProductResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const squareResult = await deleteCatalogItem(itemId, variationId);
  if (!squareResult.success) {
    return { success: false, error: squareResult.error };
  }

  await deleteStoreProductSettingByVariation(variationId);
  await deleteCarouselOverride(itemId);
  await setProductFlavors(itemId, []);
  await deleteAllSizeOptionsForVariation(variationId);

  await insertAuditLog(session, "product_deleted", "product", itemId, { variationId });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
  return { success: true };
}

export type CreateProductResult =
  | { success: true }
  | { success: false; error: string };

export async function createProductAction(
  formData: FormData
): Promise<CreateProductResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name");
  const price = formData.get("price");
  if (typeof name !== "string" || !name.trim()) {
    return { success: false, error: "Name is required" };
  }
  const priceCents = Math.round(Number(price) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { success: false, error: "Enter a valid price" };
  }

  const squareDescription = typeof formData.get("squareDescription") === "string" ? formData.get("squareDescription") as string : "";
  const bigDescription = typeof formData.get("bigDescription") === "string" ? formData.get("bigDescription") as string : "";
  const squarePhotoUrl = typeof formData.get("squarePhotoUrl") === "string" ? (formData.get("squarePhotoUrl") as string).trim() || null : null;
  const carouselUrlsText = typeof formData.get("carouselUrls") === "string" ? formData.get("carouselUrls") as string : "";
  const productTypeRaw = typeof formData.get("productType") === "string" ? (formData.get("productType") as string).trim() : "";
  const productType = productTypeRaw === "merchandise" || productTypeRaw === "gift_card" ? productTypeRaw : "ice_cream";

  let imageId: string | null = null;
  if (squarePhotoUrl?.startsWith("/media/")) {
    const publicPath = path.join(process.cwd(), "public", squarePhotoUrl);
    const uploadResult = await uploadCatalogImageToSquare(publicPath);
    if (uploadResult.success) {
      imageId = uploadResult.imageId;
    }
    // If upload failed we still create the item; custom_image_url will be used on the storefront
  }

  const result = await createCatalogItem({
    name: name.trim(),
    priceCents,
    currency: "USD",
    description: squareDescription.trim() || undefined,
    productType,
    imageId: imageId ?? undefined,
  });

  if (!result.success) return { success: false, error: result.error };

  const { itemId, variationId } = result;
  const items = await getAdminCatalogWithSettings();
  const displayOrder = items.length;

  await ensureSetting(variationId, itemId, displayOrder);

  await upsertStoreProductSetting(variationId, itemId, {
    custom_image_url: squarePhotoUrl,
    long_description_override: bigDescription.trim() || null,
    product_type_override: productType,
  });

  const carouselUrls = carouselUrlsText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (carouselUrls.length > 0) {
    await saveCarouselOverride(itemId, carouselUrls);
  }

  await insertAuditLog(session, "product_created", "product", itemId, { name: name.trim(), variationId });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
  return { success: true };
}

export type SubmitBatchCodesResult =
  | { success: true; inserted: number }
  | { success: false; error: string };

export async function submitBatchCodesAction(
  catalogItemId: string,
  codes: string[]
): Promise<SubmitBatchCodesResult> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await insertBatchCodes(catalogItemId, codes);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to save" };
  return { success: true, inserted: result.inserted };
}

/** Get this week's Wednesday (YYYY-MM-DD). Week = Wed–Tue; resets every Wednesday. */
export async function getThisWeekStartAction(): Promise<string> {
  await getAdminSession();
  return getWeekStartWednesday(new Date());
}

/** Get batch codes for a product and week, and list of weeks that have codes for that product. */
export async function getBatchCodesByWeekAction(
  catalogItemId: string,
  weekStartDate: string
): Promise<{
  codes: Array<{ id: string; code: string; scanned_at: string }>;
  weeks: Array<{ weekStartDate: string; label: string }>;
}> {
  const session = await getAdminSession();
  if (!session) return { codes: [], weeks: [] };
  const [codes, weekDates] = await Promise.all([
    getBatchCodesForProductAndWeek(catalogItemId, weekStartDate),
    listWeeksForProduct(catalogItemId),
  ]);
  return {
    codes: codes.map((r) => ({ id: r.id, code: r.code, scanned_at: r.scanned_at })),
    weeks: weekDates.map((w) => ({ weekStartDate: w, label: formatWeekLabel(w) })),
  };
}
