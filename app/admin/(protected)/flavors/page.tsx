import { getFlavorOptionsAction } from "@/app/api/admin/inventory/actions";
import { FlavorsManager } from "./FlavorsManager";

export const dynamic = "force-dynamic";

export default async function AdminFlavorsPage() {
  const flavors = await getFlavorOptionsAction();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Flavors</h1>
      <p className="text-gray-600 text-sm mb-6">
        These flavors appear in the Pick 4 / Pick 6 dropdowns. Mark a flavor out of stock to remove it from the dropdown.
      </p>
      <FlavorsManager initialFlavors={flavors} />
    </div>
  );
}

