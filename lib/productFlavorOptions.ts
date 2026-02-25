import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface ProductFlavorRow {
  catalog_item_id: string;
  flavor_name: string;
  sort_order: number;
}

export async function getProductFlavorNames(catalogItemId: string): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("product_flavor_options")
    .select("flavor_name, sort_order")
    .eq("catalog_item_id", catalogItemId)
    .order("sort_order", { ascending: true })
    .order("flavor_name", { ascending: true });
  if (error) {
    console.error("[productFlavorOptions] getProductFlavorNames error:", error);
    return [];
  }
  return (data ?? []).map((r: { flavor_name: string }) => r.flavor_name);
}

/** Set the full list of flavors for this product (replaces existing). */
export async function setProductFlavors(
  catalogItemId: string,
  flavorNames: string[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  await supabase.from("product_flavor_options").delete().eq("catalog_item_id", catalogItemId);
  if (flavorNames.length === 0) return { ok: true };
  const rows = flavorNames.map((name, i) => ({
    catalog_item_id: catalogItemId,
    flavor_name: name.trim(),
    sort_order: i,
  })).filter((r) => r.flavor_name.length > 0);
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from("product_flavor_options").insert(rows);
  if (error) {
    console.error("[productFlavorOptions] setProductFlavors error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Add one flavor to this product's list. */
export async function addProductFlavor(
  catalogItemId: string,
  flavorName: string
): Promise<{ ok: boolean; error?: string }> {
  const name = flavorName.trim();
  if (!name) return { ok: false, error: "Flavor name is required" };
  const supabase = createSupabaseAdmin();
  const { data: existing } = await supabase
    .from("product_flavor_options")
    .select("sort_order")
    .eq("catalog_item_id", catalogItemId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const sortOrder = (existing?.sort_order ?? -1) + 1;
  const { error } = await supabase.from("product_flavor_options").insert({
    catalog_item_id: catalogItemId,
    flavor_name: name,
    sort_order: sortOrder,
  });
  if (error) {
    if (error.code === "23505") return { ok: true }; // already exists
    console.error("[productFlavorOptions] addProductFlavor error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Remove one flavor from this product's list. */
export async function removeProductFlavor(
  catalogItemId: string,
  flavorName: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("product_flavor_options")
    .delete()
    .eq("catalog_item_id", catalogItemId)
    .eq("flavor_name", flavorName.trim());
  if (error) {
    console.error("[productFlavorOptions] removeProductFlavor error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** If this product has no flavors saved, seed from default names (e.g. from global flavor_options). */
export async function ensureProductFlavors(
  catalogItemId: string,
  defaultFlavorNames: string[]
): Promise<void> {
  const existing = await getProductFlavorNames(catalogItemId);
  if (existing.length > 0) return;
  await setProductFlavors(catalogItemId, defaultFlavorNames);
}
