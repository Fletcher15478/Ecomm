import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createSupabaseAdmin();
  const [auditRes, webhookRes] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  const auditLogs = auditRes.data ?? [];
  const webhookLogs = webhookRes.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Logs</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Audit logs</h2>
          <div className="bg-white rounded-lg border overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Resource</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="px-3 py-2">{log.details?.user_email ?? log.user_id ?? "—"}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">{log.resource_type} {log.resource_id ? `#${String(log.resource_id).slice(0, 8)}` : ""}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && <p className="p-4 text-gray-500">No audit logs.</p>}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Webhook logs</h2>
          <div className="bg-white rounded-lg border overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Valid</th>
                  <th className="px-3 py-2 font-medium">Processed</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="px-3 py-2">{log.event_type}</td>
                    <td className="px-3 py-2">{log.signature_valid ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{log.processed ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {webhookLogs.length === 0 && <p className="p-4 text-gray-500">No webhook logs.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
