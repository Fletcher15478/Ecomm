import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface CarouselOverrideRow {
  catalog_item_id: string;
  image_urls: string[];
  updated_at: string;
}

export async function getCarouselOverride(catalogItemId: string): Promise<string[] | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("product_carousel_overrides")
    .select("image_urls")
    .eq("catalog_item_id", catalogItemId)
    .single();
  if (error) {
    // no row is fine; noisy errors are still logged for debugging
    if (error.code !== "PGRST116") {
      console.error("[carouselOverrides] getCarouselOverride error:", error);
    }
    return null;
  }
  const urls = (data as { image_urls?: string[] } | null)?.image_urls ?? null;
  if (!urls || urls.length === 0) return null;
  return urls.filter(Boolean);
}

export async function saveCarouselOverride(
  catalogItemId: string,
  urls: string[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  const { error } = await supabase.from("product_carousel_overrides").upsert(
    {
      catalog_item_id: catalogItemId,
      image_urls: cleaned,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "catalog_item_id" }
  );
  if (error) {
    console.error("[carouselOverrides] save error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Remove carousel override for a catalog item (e.g. when item is deleted from Square). */
export async function deleteCarouselOverride(
  catalogItemId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("product_carousel_overrides")
    .delete()
    .eq("catalog_item_id", catalogItemId);
  if (error) {
    console.error("[carouselOverrides] delete error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

