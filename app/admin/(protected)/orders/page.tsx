import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { OrdersTable } from "./OrdersTable";
import { OrdersTestEmailButton } from "./OrdersTestEmailButton";

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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <OrdersTestEmailButton />
      </div>
      <p className="text-gray-600 text-sm mb-4">
        Click a row to see name, address, note, total, and shipping. Use{" "}
        <strong>Send test order email</strong> to verify confirmation mail (sent to your admin login email).
      </p>
      <OrdersTable orders={orders ?? []} />
    </div>
  );
}
