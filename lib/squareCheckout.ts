import type { CatalogObject, Order } from "square";
import { getSquareClient, SQUARE_LOCATION_ID } from "@/lib/square";
import type { CartLineItem } from "@/types";

/** Discounts we can preview and charge via Custom Checkout (fixed catalog amounts/percentages). */
const SUPPORTED_DISCOUNT_TYPES = new Set(["FIXED_PERCENTAGE", "FIXED_AMOUNT"]);

export interface MilliesSquareDiscount {
  id: string;
  name: string;
  version?: bigint;
  discountType?: string | null;
}

function catalogObjectPresentAtLocation(obj: CatalogObject, locationId: string): boolean {
  if (obj.isDeleted) return false;
  const absent = obj.absentAtLocationIds ?? [];
  if (absent.includes(locationId)) return false;
  if (obj.presentAtAllLocations === false) {
    return (obj.presentAtLocationIds ?? []).includes(locationId);
  }
  return true;
}

export function normalizeDiscountCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Customer-entered codes are matched against the Square catalog discount **name**
 * for this location (same name as shown in Dashboard; case-insensitive).
 */
export function findMilliesSquareDiscountByCode(
  code: string,
  discounts: MilliesSquareDiscount[]
): MilliesSquareDiscount | null {
  const n = normalizeDiscountCodeInput(code);
  if (!n) return null;
  return discounts.find((d) => normalizeDiscountCodeInput(d.name) === n) ?? null;
}

/**
 * List non-deleted DISCOUNT catalog objects available at `SQUARE_LOCATION_ID`.
 */
export async function listMilliesSquareCatalogDiscounts(): Promise<MilliesSquareDiscount[]> {
  const client = getSquareClient();
  const locationId = SQUARE_LOCATION_ID;
  if (!client || !locationId) return [];

  const out: MilliesSquareDiscount[] = [];
  let cursor: string | undefined;
  try {
    do {
      const response = await client.catalogApi.listCatalog(cursor, "DISCOUNT");
      const objects = response.result.objects ?? [];
      for (const o of objects) {
        if (o.type !== "DISCOUNT" || !o.id || o.isDeleted) continue;
        if (!catalogObjectPresentAtLocation(o, locationId)) continue;
        const dd = o.discountData;
        if (!dd?.name?.trim()) continue;
        if (dd.pinRequired) continue;
        const discountType = dd.discountType ?? undefined;
        if (discountType && !SUPPORTED_DISCOUNT_TYPES.has(discountType)) continue;

        out.push({
          id: o.id,
          name: dd.name.trim(),
          version: o.version,
          discountType: dd.discountType ?? null,
        });
      }
      cursor = response.result.cursor ?? undefined;
    } while (cursor);
  } catch (err) {
    console.warn("[Square] listMilliesSquareCatalogDiscounts failed:", err);
    return [];
  }
  return out;
}

export function buildMilliesSquareDraftOrder(opts: {
  locationId: string;
  lines: CartLineItem[];
  /** Notes aligned by index with `lines` (from original cart). */
  lineNotes: (string | undefined)[];
  shippingTotalCents: number;
  currency: string;
  discount?: MilliesSquareDiscount | null;
}): Order {
  const { locationId, lines, lineNotes, shippingTotalCents, currency, discount } = opts;

  const lineItems = lines.map((l, i) => ({
    uid: `line-${i}`,
    name: l.name,
    quantity: String(l.quantity),
    catalogObjectId: l.variationId,
    basePriceMoney: {
      amount: l.basePriceMoney.amount,
      currency: l.basePriceMoney.currency,
    },
    ...(lineNotes[i]?.trim() && { note: lineNotes[i]!.trim() }),
  }));

  const serviceCharges =
    shippingTotalCents > 0
      ? [
          {
            uid: "shipping",
            name: "Shipping",
            amountMoney: {
              amount: BigInt(shippingTotalCents),
              currency,
            },
            calculationPhase: "SUBTOTAL_PHASE" as const,
          },
        ]
      : [];

  const discounts = discount
    ? [
        {
          uid: "discount-promo",
          name: discount.name,
          catalogObjectId: discount.id,
          ...(discount.version !== undefined ? { catalogVersion: discount.version } : {}),
          scope: "ORDER" as const,
        },
      ]
    : [];

  return {
    locationId,
    lineItems,
    ...(serviceCharges.length ? { serviceCharges } : {}),
    ...(discounts.length ? { discounts } : {}),
  };
}
