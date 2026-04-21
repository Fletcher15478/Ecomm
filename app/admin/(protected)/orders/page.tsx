import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSquareClient } from "@/lib/square";
import { OrdersTable } from "./OrdersTable";
import { OrdersTestEmailButton } from "./OrdersTestEmailButton";

export const dynamic = "force-dynamic";

async function backfillRecentOrderItems(orders: Array<{ id: string; square_order_id: string; order_items?: unknown }>) {
  const client = getSquareClient();
  if (!client) return;
  const supabase = createSupabaseAdmin();

  const recent = orders.slice(0, 3);
  for (const o of recent) {
    if (Array.isArray((o as { order_items?: unknown }).order_items) && (o as { order_items?: unknown }).order_items) {
      continue;
    }
    const orderId = o.square_order_id;
    if (!orderId) continue;
    try {
      const res = await client.ordersApi.retrieveOrder(orderId);
      const order = res.result.order;
      const items = (order?.lineItems ?? []).map((li) => ({
        name: li.name ?? null,
        quantity: li.quantity ? Number(li.quantity) : 1,
        note: li.note ?? null,
        price_cents: li.basePriceMoney?.amount != null ? Number(li.basePriceMoney.amount) : null,
        total_cents: li.totalMoney?.amount != null ? Number(li.totalMoney.amount) : null,
      }));
      await supabase
        .from("order_metadata")
        .update({ order_items: items })
        .eq("id", o.id);
    } catch (e) {
      console.error("[Orders] backfill order_items failed:", orderId, e);
    }
  }
}

export default async function AdminOrdersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createSupabaseAdmin();
  const { data: orders } = await supabase
    .from("order_metadata")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  await backfillRecentOrderItems((orders ?? []) as Array<{ id: string; square_order_id: string; order_items?: unknown }>);

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
