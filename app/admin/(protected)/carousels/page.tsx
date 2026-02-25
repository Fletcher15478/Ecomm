import { getInventoryProductsAction } from "@/app/api/admin/inventory/actions";
import { CarouselsManager } from "./CarouselsManager";

export const dynamic = "force-dynamic";

export default async function AdminCarouselsPage() {
  const products = await getInventoryProductsAction();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Carousels</h1>
      <p className="text-gray-600 text-sm mb-6">
        Override the product image carousel by pasting image URLs (one per line). If no override is set, the site uses the default carousel images.
      </p>
      <CarouselsManager products={products} />
    </div>
  );
}

