import Link from "next/link";
import { CreateProductForm } from "../CreateProductForm";

export const dynamic = "force-dynamic";

export default function AdminCreateProductPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/products" className="text-gray-600 hover:text-gray-900">
          ← Products
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Create item</h1>
      <p className="text-gray-600 text-sm mb-6">
        Add a new item to your Square catalog. It will appear on your store board and storefront.
      </p>
      <CreateProductForm />
    </div>
  );
}
