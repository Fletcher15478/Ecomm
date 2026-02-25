import { NextRequest, NextResponse } from "next/server";
import { calculateShipping, type ShippingCartItem } from "@/lib/shipping";
import { isMerchProduct } from "@/lib/productContent";

/**
 * POST /api/shipping
 * Body: { cart: Array<{ catalogObjectId, quantity, isFrozen, name? }>, state: string }
 * Returns shipping breakdown. Used by checkout to display/validate shipping.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cart = body.cart as Array<{ catalogObjectId?: string; quantity?: number; isFrozen?: boolean; name?: string }> | undefined;
    const state = typeof body.state === "string" ? body.state.trim() : "";

    if (!Array.isArray(cart) || !state) {
      return NextResponse.json(
        { error: "Missing or invalid cart or state" },
        { status: 400 }
      );
    }

    const items: ShippingCartItem[] = cart.map((item) => ({
      catalogObjectId: String(item.catalogObjectId ?? ""),
      quantity: Math.floor(Number(item.quantity)) || 0,
      isFrozen: Boolean(item.isFrozen),
      isMerch: typeof item.name === "string" ? isMerchProduct(item.name) : false,
    })).filter((item) => item.quantity > 0);

    const breakdown = await calculateShipping(items, state);
    return NextResponse.json(breakdown);
  } catch (err) {
    console.error("Shipping calculation error:", err);
    return NextResponse.json(
      { error: "Failed to calculate shipping" },
      { status: 500 }
    );
  }
}
