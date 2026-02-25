import { getCatalogItems } from "@/app/products/catalog";
import { ProductTabs } from "@/components/ProductTabs";

export const revalidate = 15;

export default async function ProductsPage() {
  const items = await getCatalogItems();

  return (
    <div className="p-6 pt-10 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2 mt-6" style={{ color: "var(--millies-pink)" }}>
        Shop
      </h1>
      <p className="text-gray-600 mb-8 text-sm">
        Ice cream, merchandise & gift cards.
      </p>
      <ProductTabs items={items} />
    </div>
  );
}
