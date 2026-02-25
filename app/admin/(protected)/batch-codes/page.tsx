import { getAdminCatalogWithSettings, getThisWeekStartAction } from "@/app/api/admin/catalog/actions";
import { formatWeekLabel } from "@/lib/batchCodes";
import { BatchCodesClient } from "./BatchCodesClient";

export const dynamic = "force-dynamic";

export default async function BatchCodesPage() {
  const [items, thisWeekStart] = await Promise.all([
    getAdminCatalogWithSettings(),
    getThisWeekStartAction(),
  ]);
  const products = items.map((i) => ({ id: i.id, name: i.name }));
  const thisWeekLabel = formatWeekLabel(thisWeekStart);

  return (
    <div>
      <BatchCodesClient
        products={products}
        thisWeekStart={thisWeekStart}
        thisWeekLabel={thisWeekLabel}
      />
    </div>
  );
}
