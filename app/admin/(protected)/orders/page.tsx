import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 font-medium">Order ID</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">State</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-mono text-sm">{o.square_order_id}</td>
                <td className="px-4 py-2">{o.email}</td>
                <td className="px-4 py-2">{o.shipping_state}</td>
                <td className="px-4 py-2">
                  ${((Number(o.amount_total_cents) || 0) / 100).toFixed(2)} {o.currency}
                </td>
                <td className="px-4 py-2">{o.status}</td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {new Date(o.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!orders || orders.length === 0) && (
          <p className="p-4 text-gray-500">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
