import { NextResponse } from "next/server";
import { listCatalogItems } from "@/lib/square";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * GET /api/catalog
 * Returns catalog items for the storefront. Cached with revalidation.
 * All pricing from Square; no secrets exposed.
 */
export async function GET() {
  try {
    const items = await listCatalogItems();
    const serializable = items.map((item) => ({
      id: item.id,
      name: item.name,
      variationId: item.variationId,
      priceCents: Number(item.priceMoney.amount),
      currency: item.priceMoney.currency,
      isFrozen: item.isFrozen,
    }));
    return NextResponse.json(serializable);
  } catch (err) {
    console.error("Catalog fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}
