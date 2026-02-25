/**
 * Product batch codes (e.g. pint codes 26-037, 25-034).
 * Grouped by week; week starts Wednesday. Resets every Wednesday.
 */

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface BatchCodeRow {
  id: string;
  catalog_item_id: string;
  code: string;
  week_start_date: string;
  scanned_at: string;
  created_at: string;
}

/** Get the Wednesday that starts the current batch week (Wed–Tue). Returns YYYY-MM-DD. */
export function getWeekStartWednesday(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 Sun .. 3 Wed .. 6 Sat
  const daysSinceWed = (dow + 4) % 7; // Wed=0, Thu=1, .. Tue=6
  d.setDate(d.getDate() - daysSinceWed);
  return d.toISOString().slice(0, 10);
}

/** Format week label e.g. "Wed Feb 19 – Tue Feb 25" */
export function formatWeekLabel(weekStartDate: string): string {
  const wed = new Date(weekStartDate + "T12:00:00Z");
  const tue = new Date(wed);
  tue.setDate(tue.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${fmt(wed)} – ${fmt(tue)}`;
}

/** Normalize batch code: trim, allow format XX-XXX (2 digits, dash, 3 digits). */
export function normalizeBatchCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return null;
  // Allow 26-037, 25-034 style; optionally strip extra chars
  const match = trimmed.match(/^(\d{2}-\d{3})/);
  return match ? match[1] : trimmed.length <= 10 ? trimmed : trimmed.slice(0, 10);
}

/** List batch codes for a catalog item and week (week_start_date = YYYY-MM-DD). */
export async function getBatchCodesForProductAndWeek(
  catalogItemId: string,
  weekStartDate: string
): Promise<BatchCodeRow[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("product_batch_codes")
    .select("*")
    .eq("catalog_item_id", catalogItemId)
    .eq("week_start_date", weekStartDate)
    .order("scanned_at", { ascending: false });
  if (error) {
    console.error("[batchCodes] getBatchCodesForProductAndWeek error:", error);
    return [];
  }
  return (data ?? []) as BatchCodeRow[];
}

/** List distinct week_start_dates that have codes for a product (newest first). */
export async function listWeeksForProduct(
  catalogItemId: string
): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("product_batch_codes")
    .select("week_start_date")
    .eq("catalog_item_id", catalogItemId)
    .order("week_start_date", { ascending: false });
  if (error) {
    console.error("[batchCodes] listWeeksForProduct error:", error);
    return [];
  }
  const dates = (data ?? []).map((r: { week_start_date: string }) => r.week_start_date);
  return Array.from(new Set(dates));
}

/** Insert batch codes for a catalog item for the current week (week starts Wednesday). */
export async function insertBatchCodes(
  catalogItemId: string,
  codes: string[],
  weekStartDate?: string
): Promise<{ ok: boolean; error?: string; inserted: number }> {
  const supabase = createSupabaseAdmin();
  const normalized = codes
    .map((c) => normalizeBatchCode(c))
    .filter((c): c is string => c !== null && c.length > 0);
  const unique = Array.from(new Set(normalized));
  if (unique.length === 0) {
    return { ok: true, inserted: 0 };
  }
  const week = weekStartDate ?? getWeekStartWednesday(new Date());
  const rows = unique.map((code) => ({
    catalog_item_id: catalogItemId,
    code,
    week_start_date: week,
  }));
  const { data, error } = await supabase
    .from("product_batch_codes")
    .insert(rows)
    .select("id");
  if (error) {
    console.error("[batchCodes] insertBatchCodes error:", error);
    return { ok: false, error: error.message, inserted: 0 };
  }
  return { ok: true, inserted: data?.length ?? 0 };
}
