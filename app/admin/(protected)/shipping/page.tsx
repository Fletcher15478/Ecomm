import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShippingConfigClient } from "./ShippingConfigClient";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createSupabaseAdmin();
  const [zonesRes, restrictionsRes, heatRes, packagingRes] = await Promise.all([
    supabase.from("shipping_zones").select("*").order("is_default", { ascending: false }),
    supabase.from("state_restrictions").select("*"),
    supabase.from("heat_surcharge_rules").select("*"),
    supabase.from("packaging_fees").select("*"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Shipping configuration</h1>
      <ShippingConfigClient
        initialZones={zonesRes.data ?? []}
        initialRestrictions={restrictionsRes.data ?? []}
        initialHeatRules={heatRes.data ?? []}
        initialPackagingFees={packagingRes.data ?? []}
        isAdmin={session.role === "admin"}
      />
    </div>
  );
}
