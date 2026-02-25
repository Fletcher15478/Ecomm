/**
 * Audit log for admin actions (who added, deleted, or modified what).
 */

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminSession } from "@/lib/auth";

export async function insertAuditLog(
  session: AdminSession,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  details?: Record<string, unknown> | null
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("audit_logs").insert({
    user_id: session.userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    details: {
      user_email: session.email,
      ...(details ?? {}),
    },
  });
}
