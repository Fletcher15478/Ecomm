import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminsClient } from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "admin") redirect("/admin");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Admins</h1>
      <p className="text-gray-600 text-sm mb-6">
        Grant admin access by email. The person must have logged in at least once so they exist in Supabase Auth.
      </p>
      <AdminsClient />
    </div>
  );
}

