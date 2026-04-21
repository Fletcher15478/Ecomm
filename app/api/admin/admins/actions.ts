"use server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function grantAdminByEmailAction(
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await requireAdmin();
  if (session.role !== "admin") return { success: false, error: "Forbidden" };

  const cleaned = (email ?? "").trim().toLowerCase();
  if (!cleaned.includes("@")) return { success: false, error: "Enter a valid email" };

  const supabase = createSupabaseAdmin();

  // Supabase Auth Admin API: find user by email (scan a few pages).
  let userId: string | null = null;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { success: false, error: error.message };
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === cleaned);
    if (found?.id) {
      userId = found.id;
      break;
    }
    if (data.users.length < 200) break;
  }
  if (!userId) {
    return { success: false, error: `No Supabase Auth user found for ${cleaned}. Have them sign up / log in once first.` };
  }

  const { error: upsertError } = await supabase
    .from("admin_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" });
  if (upsertError) return { success: false, error: upsertError.message };

  return { success: true };
}

