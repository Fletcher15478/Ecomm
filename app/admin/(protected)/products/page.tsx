import { getAdminCatalogWithSettings } from "@/app/api/admin/catalog/actions";
import { StoreBoard } from "./StoreBoard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const items = await getAdminCatalogWithSettings();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Products &amp; Store board</h1>
      <p className="text-gray-600 text-sm mb-4">
        Use the table to reorder how products appear on the store, mark out of stock, hide items, or set a custom photo URL. Click a product name to edit details, flavors, sizes, and photos.
      </p>
      <Link
        href="/admin/products/create"
        className="inline-block px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 mb-6"
      >
        Create item
      </Link>
      <h2 className="text-lg font-semibold mt-8 mb-3">Manage store board</h2>
      <StoreBoard items={items} />
    </div>
  );
}
