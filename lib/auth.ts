import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminRole } from "@/types";

export interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
}

/**
 * Server-only. Returns current admin session (Supabase Auth + admin_roles) or null.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const admin = createSupabaseAdmin();
  const { data: row } = await admin
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!row?.role) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    role: row.role as AdminRole,
  };
}

/**
 * Server-only. Throws if not admin; use in API routes and server components.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
