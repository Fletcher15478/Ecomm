import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface FlavorOptionRow {
  id: string;
  name: string;
  in_stock: boolean;
  featured: boolean;
  seasonal: boolean;
  sort_order: number;
  updated_at: string;
}

export async function getFlavorOptions(): Promise<FlavorOptionRow[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("flavor_options")
    .select("*")
    .order("featured", { ascending: false })
    .order("seasonal", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("[flavorOptions] getFlavorOptions error:", error);
    return [];
  }
  return (data ?? []) as FlavorOptionRow[];
}

export async function getInStockFlavorNames(): Promise<string[]> {
  const all = await getFlavorOptions();
  return all.filter((f) => f.in_stock).map((f) => f.name);
}

export async function upsertFlavorOptionByName(
  name: string,
  patch: Partial<Pick<FlavorOptionRow, "in_stock" | "featured" | "seasonal" | "sort_order">>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const payload: Record<string, unknown> = {
    name: name.trim(),
    updated_at: new Date().toISOString(),
  };
  if (patch.in_stock !== undefined) payload.in_stock = patch.in_stock;
  if (patch.featured !== undefined) payload.featured = patch.featured;
  if (patch.seasonal !== undefined) payload.seasonal = patch.seasonal;
  if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;

  const { error } = await supabase.from("flavor_options").upsert(payload, { onConflict: "name" });
  if (error) {
    console.error("[flavorOptions] upsert error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateFlavorOption(
  id: string,
  patch: Partial<Pick<FlavorOptionRow, "in_stock" | "featured" | "seasonal" | "sort_order" | "name">>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("flavor_options")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[flavorOptions] update error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

