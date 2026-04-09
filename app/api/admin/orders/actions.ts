"use server";

import { getAdminSession } from "@/lib/auth";
import { sendOrderConfirmation } from "@/lib/email";
import type { ShippingBreakdown } from "@/types";

/**
 * Sends a sample order confirmation to the logged-in admin’s email (same path as real checkout).
 */
export async function sendTestOrderEmailAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const to = session.email?.trim();
  if (!to) return { success: false, error: "No email on your admin account" };

  const shippingBreakdown: ShippingBreakdown = {
    allowed: true,
    zoneName: "PA (sample)",
    subtotal: 1000,
    heatSurcharge: 0,
    icePackFee: 0,
    insulatedPackagingFee: 0,
    total: 1000,
    currency: "USD",
  };

  const result = await sendOrderConfirmation({
    to,
    orderId: "TEST-ORDER",
    lines: [
      {
        name: "Test item (sample)",
        quantity: 1,
        priceCents: 1000,
        totalCents: 1000,
      },
    ],
    shippingBreakdown,
    totalCents: 2000,
    currency: "USD",
    orderNote:
      "This is a test email from Admin → Orders. No payment was taken. If you received this, checkout confirmation email is working.",
  });

  if (result.ok) return { success: true };
  return { success: false, error: result.error ?? "Failed to send" };
}
