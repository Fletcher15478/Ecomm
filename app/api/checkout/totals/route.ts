import { NextRequest, NextResponse } from "next/server";
import type { CartItemInput } from "@/types";
import { listCatalogItems, validateCart, getSquareClient, SQUARE_LOCATION_ID } from "@/lib/square";
import { calculateShipping } from "@/lib/shipping";
import type { ShippingCartItem } from "@/lib/shipping";
import {
  buildMilliesSquareDraftOrder,
  findMilliesSquareDiscountByCode,
  listMilliesSquareCatalogDiscounts,
  normalizeDiscountCodeInput,
} from "@/lib/squareCheckout";

/**
 * POST /api/checkout/totals
 * Preview subtotal (gross lines), Square discount, shipping, and total via CalculateOrder.
 * Discount codes match Square catalog DISCOUNT names for this app's location (case-insensitive).
 */
export async function POST(request: NextRequest) {
  const client = getSquareClient();
  const locationId = SQUARE_LOCATION_ID;
  if (!client || !locationId) {
    return NextResponse.json({ error: "Checkout is not configured" }, { status: 500 });
  }

  let body: {
    cart?: CartItemInput[];
    shippingState?: string;
    discountCode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cart = body.cart;
  const shippingState = typeof body.shippingState === "string" ? body.shippingState.trim() : "";
  const discountRaw = typeof body.discountCode === "string" ? body.discountCode : "";

  if (!Array.isArray(cart) || !shippingState || shippingState.length !== 2) {
    return NextResponse.json({ error: "Missing cart or a valid shipping state." }, { status: 400 });
  }

  const catalogItems = await listCatalogItems();
  const validation = validateCart(catalogItems, cart);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const lines = validation.lines;

  const shippingCartItems: ShippingCartItem[] = lines.map((l) => ({
    catalogObjectId: l.catalogObjectId,
    quantity: l.quantity,
    isFrozen: l.isFrozen,
    isMerch: l.isMerch,
  }));
  const shippingBreakdown = await calculateShipping(shippingCartItems, shippingState);
  if (!shippingBreakdown.allowed) {
    return NextResponse.json(
      { error: shippingBreakdown.blockedReason ?? "Shipping not available" },
      { status: 400 }
    );
  }

  const grossSubtotalCents = Number(
    lines.reduce((sum, l) => sum + l.basePriceMoney.amount * BigInt(l.quantity), BigInt(0))
  );
  const currency = lines[0]?.basePriceMoney.currency ?? shippingBreakdown.currency ?? "USD";
  const shippingTotalCents = shippingBreakdown.total;

  let discountApplied: { id: string; name: string; version?: bigint } | null = null;
  const codeNorm = normalizeDiscountCodeInput(discountRaw);
  if (codeNorm) {
    const discounts = await listMilliesSquareCatalogDiscounts();
    const found = findMilliesSquareDiscountByCode(discountRaw, discounts);
    if (!found) {
      return NextResponse.json({ error: "That discount code is not valid.", codeInvalid: true }, { status: 400 });
    }
    discountApplied = {
      id: found.id,
      name: found.name,
      ...(found.version !== undefined ? { version: found.version } : {}),
    };
  }

  const lineNotes = cart.map((c) => c.note);
  const orderDraft = buildMilliesSquareDraftOrder({
    locationId,
    lines,
    lineNotes,
    shippingTotalCents,
    currency,
    discount: discountApplied,
  });

  try {
    const calc = await client.ordersApi.calculateOrder({ order: orderDraft });
    const apiErrors = calc.result.errors ?? [];
    if (apiErrors.length > 0) {
      const msg = apiErrors.map((e) => e.detail).filter(Boolean).join("; ") || "Could not apply discount.";
      return NextResponse.json(
        discountApplied
          ? { error: `${msg}`, codeInvalid: true }
          : { error: msg },
        { status: 400 }
      );
    }
    const computed = calc.result.order;
    const totalMoney = computed?.totalMoney;
    const totalDiscountMoney = computed?.totalDiscountMoney;
    if (!totalMoney?.amount) {
      return NextResponse.json({ error: "Could not calculate order total." }, { status: 500 });
    }

    const discountCents = Number(totalDiscountMoney?.amount ?? 0);
    const totalCents = Number(totalMoney.amount);

    return NextResponse.json({
      grossSubtotalCents,
      shippingCents: shippingTotalCents,
      discountCents,
      totalCents,
      currency: totalMoney.currency ?? currency,
      discountName: discountApplied?.name ?? null,
    });
  } catch (err) {
    console.error("[checkout/totals]", err);
    return NextResponse.json({ error: "Could not preview totals." }, { status: 500 });
  }
}
