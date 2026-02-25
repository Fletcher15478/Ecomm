import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface ProductSizeRow {
  variation_id: string;
  size: string;
  in_stock: boolean;
  sort_order: number;
  updated_at: string;
}

export async function getSizeOptionsForVariation(variationId: string): Promise<ProductSizeRow[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("product_size_options")
    .select("*")
    .eq("variation_id", variationId)
    .order("in_stock", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("size", { ascending: true });
  if (error) {
    console.error("[productSizeOptions] getSizeOptionsForVariation error:", error);
    return [];
  }
  return (data ?? []) as ProductSizeRow[];
}

export async function getInStockSizesForVariation(variationId: string): Promise<string[]> {
  const rows = await getSizeOptionsForVariation(variationId);
  return rows.filter((r) => r.in_stock).map((r) => r.size);
}

export async function upsertSizeOption(
  variationId: string,
  size: string,
  patch: Partial<Pick<ProductSizeRow, "in_stock" | "sort_order">>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const payload: Record<string, unknown> = {
    variation_id: variationId,
    size: size.trim(),
    updated_at: new Date().toISOString(),
  };
  if (patch.in_stock !== undefined) payload.in_stock = patch.in_stock;
  if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;

  const { error } = await supabase.from("product_size_options").upsert(payload, {
    onConflict: "variation_id,size",
  });
  if (error) {
    console.error("[productSizeOptions] upsert error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteSizeOption(
  variationId: string,
  size: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("product_size_options")
    .delete()
    .eq("variation_id", variationId)
    .eq("size", size);
  if (error) {
    console.error("[productSizeOptions] delete error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Ensure size options exist for a tee variation (seed from default sizes when empty). */
export async function ensureSizeOptionsForTee(
  variationId: string,
  defaultSizes: string[]
): Promise<void> {
  const existing = await getSizeOptionsForVariation(variationId);
  if (existing.length > 0) return;
  for (let i = 0; i < defaultSizes.length; i++) {
    await upsertSizeOption(variationId, defaultSizes[i], { in_stock: true, sort_order: i });
  }
}

/** Remove all size options for a variation (e.g. when item is deleted from Square). */
export async function deleteAllSizeOptionsForVariation(
  variationId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("product_size_options")
    .delete()
    .eq("variation_id", variationId);
  if (error) {
    console.error("[productSizeOptions] deleteAll error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

