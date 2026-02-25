import { NextRequest, NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
const NOTIFICATION_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") + "/api/webhooks/square";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";

  if (!SIGNATURE_KEY || !NOTIFICATION_URL) {
    console.error("Webhook: missing SIGNATURE_KEY or NOTIFICATION_URL");
    await logWebhook(rawBody, signature, false, "Configuration error");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let valid = false;
  try {
    valid = WebhooksHelper.isValidWebhookEventSignature(
      rawBody,
      signature,
      SIGNATURE_KEY,
      NOTIFICATION_URL
    );
  } catch (e) {
    console.error("Webhook signature verification error:", e);
  }

  let payload: { type?: string; data?: { object?: { id?: string } }; merchant_id?: string } = {};
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    // leave payload empty
  }

  const eventType = payload.type ?? "unknown";

  const logId = await logWebhook(rawBody, signature, valid, null, eventType, payload);

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    switch (eventType) {
      case "inventory.updated":
        // Sync or business logic if needed; Square is source of truth.
        break;
      case "order.created":
        // Optionally sync to internal systems; we already store in order_metadata on checkout.
        break;
      case "payment.updated":
        // Optionally update order_metadata status from payment state.
        break;
      default:
        // Acknowledge other events
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    if (logId) await updateWebhookLogProcessed(logId, false, String(err));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  if (logId) await updateWebhookLogProcessed(logId, true, null);
  return NextResponse.json({ received: true });
}

async function logWebhook(
  body: string,
  _signature: string,
  signatureValid: boolean,
  errorMessage: string | null,
  eventType?: string,
  payload?: unknown
): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webhook_logs")
    .insert({
      event_type: eventType ?? "unknown",
      payload: payload ?? (body ? JSON.parse(body) : {}),
      signature_valid: signatureValid,
      processed: false,
      error_message: errorMessage,
    })
    .select("id")
    .single();
  if (error) console.error("Webhook log insert error:", error);
  return data?.id ?? null;
}

async function updateWebhookLogProcessed(
  logId: string,
  processed: boolean,
  errorMessage: string | null
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase
    .from("webhook_logs")
    .update({ processed, error_message: errorMessage })
    .eq("id", logId);
}
