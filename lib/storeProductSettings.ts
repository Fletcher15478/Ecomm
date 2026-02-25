/**
 * Store product settings (order, out-of-stock, custom image, hidden).
 * Stored in Supabase; merged with Square catalog for the storefront.
 */

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface StoreProductSetting {
  variation_id: string;
  catalog_item_id: string;
  display_order: number;
  is_out_of_stock: boolean;
  custom_image_url: string | null;
  hidden: boolean;
  featured?: boolean;
  seasonal?: boolean;
  product_type_override?: string | null;
  price_override_cents?: number | null;
  long_description_override?: string | null;
  updated_at: string;
}

export type StoreProductSettingPatch = Partial<
  Pick<
    StoreProductSetting,
    | "display_order"
    | "is_out_of_stock"
    | "custom_image_url"
    | "hidden"
    | "featured"
    | "seasonal"
    | "product_type_override"
    | "price_override_cents"
    | "long_description_override"
  >
>;

/** Fetch all store product settings keyed by variation_id. */
export async function getStoreProductSettings(): Promise<Map<string, StoreProductSetting>> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("store_product_settings")
    .select("*");
  if (error) {
    console.error("[storeProductSettings] getStoreProductSettings error:", error);
    return new Map();
  }
  const map = new Map<string, StoreProductSetting>();
  for (const row of data ?? []) {
    map.set(row.variation_id, row as StoreProductSetting);
  }
  return map;
}

/** Upsert one setting (by variation_id). Only provided patch fields are updated. */
export async function upsertStoreProductSetting(
  variationId: string,
  catalogItemId: string,
  patch: StoreProductSettingPatch
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { data: existing } = await supabase
    .from("store_product_settings")
    .select("variation_id")
    .eq("variation_id", variationId)
    .single();
  const payload: Record<string, unknown> = {
    variation_id: variationId,
    catalog_item_id: catalogItemId,
    updated_at: new Date().toISOString(),
  };
  if (patch.display_order !== undefined) payload.display_order = patch.display_order;
  if (patch.is_out_of_stock !== undefined) payload.is_out_of_stock = patch.is_out_of_stock;
  if (patch.custom_image_url !== undefined) payload.custom_image_url = patch.custom_image_url;
  if (patch.hidden !== undefined) payload.hidden = patch.hidden;
  if (patch.featured !== undefined) payload.featured = patch.featured;
  if (patch.seasonal !== undefined) payload.seasonal = patch.seasonal;
  if (patch.product_type_override !== undefined) payload.product_type_override = patch.product_type_override;
  if (patch.price_override_cents !== undefined) payload.price_override_cents = patch.price_override_cents;
  if (patch.long_description_override !== undefined) payload.long_description_override = patch.long_description_override;
  if (!existing) {
    if (payload.display_order === undefined) payload.display_order = 0;
    if (payload.is_out_of_stock === undefined) payload.is_out_of_stock = false;
    if (payload.hidden === undefined) payload.hidden = false;
    if (payload.featured === undefined) payload.featured = false;
    if (payload.seasonal === undefined) payload.seasonal = false;
  }
  const { error } = await supabase.from("store_product_settings").upsert(payload, {
    onConflict: "variation_id",
  });
  if (error) {
    console.error("[storeProductSettings] upsert error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Set display order for multiple variations (order of array = display order). Creates rows if missing. */
export async function setDisplayOrder(
  variationIds: string[],
  catalogItemIds?: Map<string, string>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  for (let i = 0; i < variationIds.length; i++) {
    const variationId = variationIds[i];
    const catalogItemId = catalogItemIds?.get(variationId);
    const { error } = await supabase.from("store_product_settings").upsert(
      {
        variation_id: variationId,
        catalog_item_id: catalogItemId ?? variationId,
        display_order: i,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "variation_id" }
    );
    if (error) {
      console.error("[storeProductSettings] setDisplayOrder error:", error);
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

/** Ensure a row exists for a variation (e.g. when first seen from Square). */
export async function ensureSetting(
  variationId: string,
  catalogItemId: string,
  displayOrder: number
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("store_product_settings").upsert(
    {
      variation_id: variationId,
      catalog_item_id: catalogItemId,
      display_order: displayOrder,
      is_out_of_stock: false,
      custom_image_url: null,
      hidden: false,
      featured: false,
      seasonal: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "variation_id" }
  );
}

/** Remove store product setting for a variation (e.g. when item is deleted from Square). */
export async function deleteStoreProductSettingByVariation(
  variationId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("store_product_settings")
    .delete()
    .eq("variation_id", variationId);
  if (error) {
    console.error("[storeProductSettings] delete error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
