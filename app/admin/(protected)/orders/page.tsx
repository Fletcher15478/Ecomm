import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { OrdersTable } from "./OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createSupabaseAdmin();
  const { data: orders } = await supabase
    .from("order_metadata")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <p className="text-gray-600 text-sm mb-4">Click a row to see name, address, note, total, and shipping.</p>
      <OrdersTable orders={orders ?? []} />
    </div>
  );
}
