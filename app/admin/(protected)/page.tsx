import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/products"
          className="p-4 bg-white rounded-lg shadow border hover:border-gray-400"
        >
          <h2 className="font-semibold">Products</h2>
          <p className="text-sm text-gray-500 mt-1">
            Update inventory, pricing, availability via Square
          </p>
        </Link>
        <Link
          href="/admin/shipping"
          className="p-4 bg-white rounded-lg shadow border hover:border-gray-400"
        >
          <h2 className="font-semibold">Shipping</h2>
          <p className="text-sm text-gray-500 mt-1">
            Zones, state restrictions, heat surcharges
          </p>
        </Link>
        <Link
          href="/admin/orders"
          className="p-4 bg-white rounded-lg shadow border hover:border-gray-400"
        >
          <h2 className="font-semibold">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            View order logs and metadata
          </p>
        </Link>
        <Link
          href="/admin/logs"
          className="p-4 bg-white rounded-lg shadow border hover:border-gray-400"
        >
          <h2 className="font-semibold">Logs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Audit and webhook event logs
          </p>
        </Link>
      </div>
    </div>
  );
}
