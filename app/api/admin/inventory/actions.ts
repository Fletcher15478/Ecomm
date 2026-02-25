"use server";

import { getAdminSession } from "@/lib/auth";
import { getFlavorOptions, upsertFlavorOptionByName, updateFlavorOption } from "@/lib/flavorOptions";
import { getInStockFlavorNames } from "@/lib/flavorOptions";
import { getAdminCatalogWithSettings } from "@/app/api/admin/catalog/actions";
import { getSizeOptionsForVariation, upsertSizeOption, deleteSizeOption } from "@/lib/productSizeOptions";
import { getCarouselOverride, saveCarouselOverride } from "@/lib/productCarouselOverrides";
import {
  getProductFlavorNames,
  addProductFlavor,
  removeProductFlavor,
  ensureProductFlavors,
} from "@/lib/productFlavorOptions";
import { insertAuditLog } from "@/lib/auditLog";

export async function getFlavorOptionsAction() {
  const session = await getAdminSession();
  if (!session) return [];
  return await getFlavorOptions();
}

export async function addOrUpdateFlavorAction(formData: FormData): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) return { success: false, error: "Flavor name is required" };
  const featured = formData.get("featured") === "on";
  const seasonal = formData.get("seasonal") === "on";
  const in_stock = formData.get("in_stock") !== "off";
  const sort_order_raw = formData.get("sort_order");
  const sort_order = sort_order_raw ? Number(sort_order_raw) : 0;

  const result = await upsertFlavorOptionByName(name.trim(), {
    in_stock,
    featured,
    seasonal,
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
  });
  if (!result.ok) return { success: false, error: result.error ?? "Failed to save flavor" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/flavors");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

export async function toggleFlavorFieldAction(
  id: string,
  field: "in_stock" | "featured" | "seasonal"
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const flavors = await getFlavorOptions();
  const row = flavors.find((f) => f.id === id);
  if (!row) return { success: false, error: "Flavor not found" };
  const next = { [field]: !row[field] } as Record<string, boolean>;
  const result = await updateFlavorOption(id, next);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to update" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/flavors");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

export async function getInventoryProductsAction() {
  const session = await getAdminSession();
  if (!session) return [];
  return await getAdminCatalogWithSettings();
}

export async function getSizeOptionsAction(variationId: string) {
  const session = await getAdminSession();
  if (!session) return [];
  return await getSizeOptionsForVariation(variationId);
}

export async function upsertSizeOptionAction(
  variationId: string,
  size: string,
  inStock: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!size.trim()) return { success: false, error: "Size is required" };
  const result = await upsertSizeOption(variationId, size.trim(), { in_stock: inStock });
  if (!result.ok) return { success: false, error: result.error ?? "Failed to save size" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/sizes");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSizeOptionAction(
  variationId: string,
  size: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await deleteSizeOption(variationId, size);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to delete size" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/sizes");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

export async function getCarouselOverrideAction(catalogItemId: string): Promise<string[] | null> {
  const session = await getAdminSession();
  if (!session) return null;
  return await getCarouselOverride(catalogItemId);
}

export async function saveCarouselOverrideAction(
  catalogItemId: string,
  urlsText: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const urls = urlsText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const result = await saveCarouselOverride(catalogItemId, urls);
  if (!result.ok) return { success: false, error: result.error ?? "Failed to save carousel" };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/carousels");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

/** Storefront helper: in-stock flavor list (server). */
export async function getInStockFlavorsForStore(): Promise<string[]> {
  // no admin session check; this is used server-side for storefront rendering
  return await getInStockFlavorNames();
}

export async function addProductFlavorAction(
  catalogItemId: string,
  flavorName: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await addProductFlavor(catalogItemId, flavorName.trim());
  if (!result.ok) return { success: false, error: result.error ?? "Failed to add flavor" };
  await insertAuditLog(session, "product_updated", "product", catalogItemId, { what: "flavor_added", flavorName: flavorName.trim() });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

export async function removeProductFlavorAction(
  catalogItemId: string,
  flavorName: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await removeProductFlavor(catalogItemId, flavorName.trim());
  if (!result.ok) return { success: false, error: result.error ?? "Failed to remove flavor" };
  await insertAuditLog(session, "product_updated", "product", catalogItemId, { what: "flavor_removed", flavorName: flavorName.trim() });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

