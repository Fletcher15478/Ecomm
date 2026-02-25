import { getInventoryProductsAction } from "@/app/api/admin/inventory/actions";
import { SizesManager } from "./SizesManager";

export const dynamic = "force-dynamic";

export default async function AdminSizesPage() {
  const products = await getInventoryProductsAction();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Sizes</h1>
      <p className="text-gray-600 text-sm mb-6">
        Manage size availability per product (e.g. tees). Out-of-stock sizes are removed from the size dropdown on the product page.
      </p>
      <SizesManager products={products} />
    </div>
  );
}

