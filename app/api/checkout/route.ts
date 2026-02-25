import { NextRequest, NextResponse } from "next/server";
import { getSquareClient, listCatalogItems, validateCart, SQUARE_LOCATION_ID } from "@/lib/square";
import { calculateShipping, type ShippingCartItem } from "@/lib/shipping";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendNewOrderNotification } from "@/lib/email";
import { sendPaymentFailed } from "@/lib/email";
import { checkCheckoutRateLimitFromRequest } from "@/lib/rate-limit";
import type { CartItemInput } from "@/types";

interface CheckoutBody {
  idempotencyKey: string;
  cart: CartItemInput[];
  shippingState: string;
  email: string;
  paymentNonce: string;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    addressLine1?: string;
    locality?: string;
    administrativeDistrictLevel1?: string;
    postalCode?: string;
  };
  orderNote?: string;
}

export async function POST(request: NextRequest) {
  if (!checkCheckoutRateLimitFromRequest(request)) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    idempotencyKey,
    cart,
    shippingState,
    email,
    paymentNonce,
    shippingAddress,
    orderNote,
  } = body;

  if (
    !idempotencyKey ||
    !Array.isArray(cart) ||
    !shippingState?.trim() ||
    !email?.trim() ||
    !paymentNonce?.trim()
  ) {
    return NextResponse.json(
      { error: "Missing idempotencyKey, cart, shippingState, email, or paymentNonce" },
      { status: 400 }
    );
  }

  const client = getSquareClient();
  const locationId = SQUARE_LOCATION_ID;
  if (!client || !locationId) {
    return NextResponse.json(
      { error: "Checkout is not configured" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdmin();

  const existingOrder = await supabase
    .from("order_metadata")
    .select("id, square_order_id, status")
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existingOrder.data) {
    if (existingOrder.data.status === "completed") {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.data.square_order_id,
        message: "Order already completed (idempotent)",
      });
    }
    if (existingOrder.data.status === "payment_failed") {
      return NextResponse.json(
        { error: "A previous attempt for this order failed. Please try again with a new checkout." },
        { status: 400 }
      );
    }
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

  const subtotalCents = Number(
    lines.reduce(
      (sum, l) => sum + l.basePriceMoney.amount * BigInt(l.quantity),
      BigInt(0)
    )
  );
  const shippingTotalCents = shippingBreakdown.total;
  const totalCents = subtotalCents + shippingTotalCents;
  const currency = shippingBreakdown.currency ?? "USD";

  const orderLineItems = lines.map((l, i) => ({
    uid: `line-${i}`,
    name: l.name,
    quantity: String(l.quantity),
    catalogObjectId: l.variationId,
    basePriceMoney: {
      amount: l.basePriceMoney.amount,
      currency: l.basePriceMoney.currency,
    },
    ...(cart[i]?.note && { note: cart[i].note }),
  }));

  const serviceCharges = [
    {
      uid: "shipping",
      name: "Shipping",
      amountMoney: {
        amount: BigInt(shippingTotalCents),
        currency,
      },
      calculationPhase: "SUBTOTAL_PHASE" as const,
    },
  ];

  try {
    const createOrderResponse = await client.ordersApi.createOrder({
      idempotencyKey: idempotencyKey + "-order",
      order: {
        locationId,
        lineItems: orderLineItems,
        serviceCharges,
      },
    });

    const orderId = createOrderResponse.result.order?.id;
    if (!orderId) {
      const errMsg = createOrderResponse.result.errors?.map((e) => e.detail).join("; ") ?? "Create order failed";
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const createPaymentResponse = await client.paymentsApi.createPayment({
      sourceId: paymentNonce,
      idempotencyKey: idempotencyKey + "-payment",
      amountMoney: {
        amount: BigInt(totalCents),
        currency,
      },
      orderId,
      locationId,
      buyerEmailAddress: email,
      shippingAddress: shippingAddress
        ? {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            addressLine1: shippingAddress.addressLine1,
            locality: shippingAddress.locality,
            administrativeDistrictLevel1: shippingAddress.administrativeDistrictLevel1,
            postalCode: shippingAddress.postalCode,
          }
        : undefined,
    });

    const payment = createPaymentResponse.result.payment;
    const paymentId = payment?.id ?? null;
    const paymentStatus = payment?.status;

    if (paymentStatus !== "COMPLETED" && paymentStatus !== "APPROVED") {
      await supabase.from("order_metadata").insert({
        square_order_id: orderId,
        square_payment_id: paymentId,
        idempotency_key: idempotencyKey,
        email,
        shipping_state: shippingState.trim(),
        shipping_breakdown: shippingBreakdown,
        amount_total_cents: totalCents,
        currency,
        status: "payment_failed",
      });

      const declineReason = createPaymentResponse.result.errors?.map((e) => e.detail).join("; ");
      await sendPaymentFailed({
        to: email,
        orderId,
        reason: declineReason,
      });

      return NextResponse.json(
        { error: declineReason ?? "Payment was not completed" },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("order_metadata")
      .insert({
        square_order_id: orderId,
        square_payment_id: paymentId,
        idempotency_key: idempotencyKey,
        email,
        shipping_state: shippingState.trim(),
        shipping_breakdown: shippingBreakdown,
        amount_total_cents: totalCents,
        currency,
        status: "completed",
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      console.error("Order metadata insert error:", insertError);
    }

    const orderMetadataId = inserted?.id ?? undefined;
    const orderSummaryLines = lines.map((l, i) => ({
      name: l.name,
      quantity: l.quantity,
      priceCents: Number(l.basePriceMoney.amount),
      totalCents: Number(l.basePriceMoney.amount) * l.quantity,
      ...(cart[i]?.note && { note: cart[i].note }),
    }));

    const addressBlock = shippingAddress
      ? [
          [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(" "),
          shippingAddress.addressLine1,
          [shippingAddress.locality, shippingAddress.administrativeDistrictLevel1, shippingAddress.postalCode]
            .filter(Boolean)
            .join(", "),
        ]
          .filter(Boolean)
          .join("\n")
      : undefined;

    const orderConfirmationResult = await sendOrderConfirmation({
      to: email,
      orderId,
      lines: orderSummaryLines,
      shippingBreakdown,
      totalCents,
      currency,
      orderMetadataId,
      ...(orderNote?.trim() && { orderNote: orderNote.trim() }),
    });
    if (!orderConfirmationResult.ok) {
      console.error("[Checkout] Order confirmation email failed:", orderConfirmationResult.error);
    }

    const notifyEmailsRaw = (process.env.ORDER_NOTIFY_EMAILS ?? "").trim();
    const notifyEmails = notifyEmailsRaw
      ? notifyEmailsRaw.split(",").map((e) => e.trim()).filter(Boolean)
      : ["support@millieshomemade.com"];
    if (notifyEmails.length > 0) {
      const notifyResult = await sendNewOrderNotification({
        to: notifyEmails,
        customerEmail: email,
        orderId,
        lines: orderSummaryLines,
        shippingBreakdown,
        totalCents,
        currency,
        ...(orderNote?.trim() && { orderNote: orderNote.trim() }),
        ...(addressBlock && { addressBlock }),
      });
      if (!notifyResult.ok) {
        console.error("[Checkout] New order notification email failed:", notifyResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentId,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}
