import { Resend } from "resend";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ShippingBreakdown } from "@/types";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "orders@example.com";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO;

/** Gmail SMTP: no domain verification. Set USE_SMTP_GMAIL=1, SMTP_USER=your@gmail.com, SMTP_APP_PASSWORD=16-char app password. */
const USE_SMTP_GMAIL = process.env.USE_SMTP_GMAIL === "1" || process.env.USE_SMTP_GMAIL === "true";
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_APP_PASSWORD = process.env.SMTP_APP_PASSWORD ?? "";

function isSmtpConfigured(): boolean {
  return USE_SMTP_GMAIL && SMTP_USER.length > 0 && SMTP_APP_PASSWORD.length > 0;
}

async function sendViaSmtp(
  to: string | string[],
  subject: string,
  html: string,
  replyTo?: string,
  attachments?: Array<{ filename: string; content: Buffer; cid: string }>
): Promise<{ ok: boolean; error?: string }> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_APP_PASSWORD },
  });
  const toList = Array.isArray(to) ? to : [to];
  try {
    await transporter.sendMail({
      from: EMAIL_FROM || SMTP_USER,
      to: toList,
      replyTo: replyTo ?? undefined,
      subject,
      html,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, cid: a.cid })),
    });
    return { ok: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: errMsg };
  }
}

export type EmailTemplateType = "order_confirmation" | "payment_failed";

interface OrderSummaryLine {
  name: string;
  quantity: number;
  priceCents: number;
  totalCents: number;
  /** Line note (e.g. flavor choices, size) */
  note?: string;
}

export interface SendOrderConfirmationParams {
  to: string;
  orderId: string;
  lines: OrderSummaryLine[];
  shippingBreakdown: ShippingBreakdown | null;
  totalCents: number;
  currency: string;
  orderMetadataId?: string;
  /** Order / gift note from checkout */
  orderNote?: string;
}

export interface SendPaymentFailedParams {
  to: string;
  orderId: string;
  reason?: string;
  orderMetadataId?: string;
}

/** Params for internal "new order" notification to store (e.g. support@millieshomemade.com). */
export interface SendNewOrderNotificationParams {
  to: string[];
  customerEmail: string;
  orderId: string;
  lines: OrderSummaryLine[];
  shippingBreakdown: ShippingBreakdown | null;
  totalCents: number;
  currency: string;
  orderNote?: string;
  /** Formatted shipping/billing address for store reference */
  addressBlock?: string;
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function buildOrderConfirmationHtml(
  params: SendOrderConfirmationParams,
  options?: { useCidLogo: boolean }
): string {
  const { orderId, lines, shippingBreakdown, totalCents, currency, orderNote } = params;
  const useCidLogo = options?.useCidLogo ?? true;
  // Logo is embedded via CID (Content-ID) attachment for Gmail/compatibility
  const linesHtml = lines
    .map(
      (l) =>
        `<tr>
          <td>${escapeHtml(l.name)}${l.note ? `<br/><small style="color:#666;">${escapeHtml(l.note)}</small>` : ""}</td>
          <td>${l.quantity}</td>
          <td>${formatCents(l.priceCents, currency)}</td>
          <td>${formatCents(l.totalCents, currency)}</td>
        </tr>`
    )
    .join("");
  let shippingHtml = "<p>No shipping details.</p>";
  if (shippingBreakdown?.allowed) {
    shippingHtml = `
      <p><strong>Shipping (${escapeHtml(shippingBreakdown.zoneName ?? "Standard")})</strong></p>
      <ul>
        <li>Subtotal: ${formatCents(shippingBreakdown.subtotal, currency)}</li>
        ${shippingBreakdown.heatSurcharge ? `<li>Heat surcharge: ${formatCents(shippingBreakdown.heatSurcharge, currency)}</li>` : ""}
        ${shippingBreakdown.icePackFee ? `<li>Ice pack: ${formatCents(shippingBreakdown.icePackFee, currency)}</li>` : ""}
        ${shippingBreakdown.insulatedPackagingFee ? `<li>Insulated packaging: ${formatCents(shippingBreakdown.insulatedPackagingFee, currency)}</li>` : ""}
        <li><strong>Shipping total: ${formatCents(shippingBreakdown.total, currency)}</strong></li>
      </ul>
    `;
  } else if (shippingBreakdown?.blockedReason) {
    shippingHtml = `<p>${escapeHtml(shippingBreakdown.blockedReason)}</p>`;
  }
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fff; padding: 20px; text-align: center;">
          ${useCidLogo ? '<img src="cid:millies-logo" alt="Millie\'s Homemade" style="max-width: 200px; height: auto;" />' : ""}
          <p style="color: #ef4b81; margin: 12px 0 0; font-size: 16px; font-weight: 600;">Your order from Millie's Homemade</p>
        </div>
        <div style="padding: 20px;">
          <h1 style="color: #ef4b81;">Order Confirmation</h1>
          <p>Thank you for your order. Order ID: <strong>${escapeHtml(orderId)}</strong></p>
          ${orderNote ? `<p><strong>Your note:</strong><br/>${escapeHtml(orderNote)}</p>` : ""}
          <h2 style="color: #ef4b81;">Order summary</h2>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border-color: #ef4b81;">
            <thead><tr style="background: #ef4b81; color: #fff;"><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>${linesHtml}</tbody>
          </table>
          <h2 style="color: #ef4b81;">Shipping</h2>
          ${shippingHtml}
          <p><strong>Grand total: ${formatCents(totalCents, currency)}</strong></p>
          <p>If you have questions, reply to this email.</p>
        </div>
      </body>
    </html>
  `;
}

function buildNewOrderNotificationHtml(params: SendNewOrderNotificationParams): string {
  const { customerEmail, orderId, lines, shippingBreakdown, totalCents, currency, orderNote, addressBlock } = params;
  const linesHtml = lines
    .map(
      (l) =>
        `<tr>
          <td>${escapeHtml(l.name)}${l.note ? `<br/><small>${escapeHtml(l.note)}</small>` : ""}</td>
          <td>${l.quantity}</td>
          <td>${formatCents(l.priceCents, currency)}</td>
          <td>${formatCents(l.totalCents, currency)}</td>
        </tr>`
    )
    .join("");
  let shippingHtml = "<p>No shipping details.</p>";
  if (shippingBreakdown?.allowed) {
    shippingHtml = `
      <p><strong>Shipping (${escapeHtml(shippingBreakdown.zoneName ?? "Standard")})</strong></p>
      <ul>
        <li>Subtotal: ${formatCents(shippingBreakdown.subtotal, currency)}</li>
        ${shippingBreakdown.heatSurcharge ? `<li>Heat surcharge: ${formatCents(shippingBreakdown.heatSurcharge, currency)}</li>` : ""}
        ${shippingBreakdown.icePackFee ? `<li>Ice pack: ${formatCents(shippingBreakdown.icePackFee, currency)}</li>` : ""}
        ${shippingBreakdown.insulatedPackagingFee ? `<li>Insulated packaging: ${formatCents(shippingBreakdown.insulatedPackagingFee, currency)}</li>` : ""}
        <li><strong>Shipping total: ${formatCents(shippingBreakdown.total, currency)}</strong></li>
      </ul>
    `;
  } else if (shippingBreakdown?.blockedReason) {
    shippingHtml = `<p>${escapeHtml(shippingBreakdown.blockedReason)}</p>`;
  }
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; max-width: 600px;">
        <h1>New order received</h1>
        <p>Customer: <strong>${escapeHtml(customerEmail)}</strong></p>
        <p>Order ID: <strong>${escapeHtml(orderId)}</strong></p>
        ${addressBlock ? `<h2>Address</h2><pre style="background:#f5f5f5; padding:12px; white-space:pre-wrap;">${escapeHtml(addressBlock)}</pre>` : ""}
        ${orderNote ? `<p><strong>Order / gift note:</strong><br/>${escapeHtml(orderNote)}</p>` : ""}
        <h2>Order summary</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>${linesHtml}</tbody>
        </table>
        <h2>Shipping</h2>
        ${shippingHtml}
        <p><strong>Grand total: ${formatCents(totalCents, currency)}</strong></p>
      </body>
    </html>
  `;
}

function buildPaymentFailedHtml(params: SendPaymentFailedParams): string {
  const { orderId, reason } = params;
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: sans-serif; max-width: 600px;">
        <h1>Payment Failed</h1>
        <p>We were unable to process payment for order <strong>${escapeHtml(orderId)}</strong>.</p>
        ${reason ? `<p>Reason: ${escapeHtml(reason)}</p>` : ""}
        <p>Please try again or use a different payment method. If the problem persists, contact support.</p>
      </body>
    </html>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Read Millie's logo PNG for order confirmation (CID inline attachment). Returns null if file missing. */
function getOrderConfirmationLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "uploads", "millies-homemade-pink.png");
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
  } catch {
    // ignore
  }
  return null;
}

async function logEmail(
  to: string,
  templateType: EmailTemplateType,
  status: "sent" | "failed",
  orderMetadataId: string | null,
  providerMessageId: string | null,
  errorMessage: string | null
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("email_logs").insert({
    to_email: to,
    template_type: templateType,
    order_metadata_id: orderMetadataId,
    status,
    provider_message_id: providerMessageId,
    error_message: errorMessage,
  });
}

const MAX_RETRIES = 2;

async function sendWithRetry(
  fn: () => Promise<{ data?: { id: string } | null; error?: unknown }>
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  let lastError: string = "Unknown error";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (result.data?.id) {
        return { success: true, messageId: result.data.id };
      }
      if (result.error) {
        lastError = String((result.error as Error).message ?? result.error);
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { success: false, error: lastError };
}

/**
 * Send order confirmation email. Server-side only. Logs to Supabase and retries on failure.
 * Uses Gmail SMTP if USE_SMTP_GMAIL is set, otherwise Resend.
 */
export async function sendOrderConfirmation(
  params: SendOrderConfirmationParams
): Promise<{ ok: boolean; error?: string }> {
  const logoBuffer = getOrderConfirmationLogoBuffer();
  const html = buildOrderConfirmationHtml(params, { useCidLogo: !!logoBuffer });
  const subject = `Order Confirmation – ${params.orderId}`;
  const logoAttachments = logoBuffer
    ? [{ filename: "millies-homemade-pink.png", content: logoBuffer, cid: "millies-logo" as const }]
    : undefined;

  if (isSmtpConfigured()) {
    const result = await sendViaSmtp(
      params.to,
      subject,
      html,
      EMAIL_REPLY_TO ?? undefined,
      logoAttachments
    );
    if (result.ok) {
      await logEmail(params.to, "order_confirmation", "sent", params.orderMetadataId ?? null, "smtp", null);
      return { ok: true };
    }
    await logEmail(params.to, "order_confirmation", "failed", params.orderMetadataId ?? null, null, result.error ?? null);
    return { ok: false, error: result.error };
  }

  if (!RESEND_API_KEY) {
    await logEmail(
      params.to,
      "order_confirmation",
      "failed",
      params.orderMetadataId ?? null,
      null,
      "RESEND_API_KEY not configured"
    );
    return { ok: false, error: "Email not configured" };
  }

  const resend = new Resend(RESEND_API_KEY);

  const result = await sendWithRetry(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      replyTo: EMAIL_REPLY_TO ?? undefined,
      subject,
      html,
      attachments: logoBuffer
        ? [
            {
              content: logoBuffer,
              filename: "millies-homemade-pink.png",
              contentType: "image/png",
              inlineContentId: "millies-logo",
            },
          ]
        : undefined,
    })
  );

  if (result.success) {
    await logEmail(
      params.to,
      "order_confirmation",
      "sent",
      params.orderMetadataId ?? null,
      result.messageId,
      null
    );
    return { ok: true };
  }

  await logEmail(
    params.to,
    "order_confirmation",
    "failed",
    params.orderMetadataId ?? null,
    null,
    result.error
  );
  return { ok: false, error: result.error };
}

/**
 * Send new order notification to store (e.g. support@millieshomemade.com). Does not log to email_logs.
 * Uses Gmail SMTP if USE_SMTP_GMAIL is set, otherwise Resend.
 */
export async function sendNewOrderNotification(
  params: SendNewOrderNotificationParams
): Promise<{ ok: boolean; error?: string }> {
  if (params.to.length === 0) {
    return { ok: true };
  }

  const html = buildNewOrderNotificationHtml(params);
  const subject = `New order – ${params.orderId} (${params.customerEmail})`;

  if (isSmtpConfigured()) {
    const result = await sendViaSmtp(params.to, subject, html, EMAIL_REPLY_TO ?? undefined);
    if (!result.ok) {
      console.error("[Email] New order notification failed (SMTP):", result.error);
    }
    return result;
  }

  if (!RESEND_API_KEY) {
    console.error("[Email] New order notification skipped: RESEND_API_KEY not set");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      replyTo: EMAIL_REPLY_TO ?? undefined,
      subject,
      html,
    });

    if (result.error) {
      const err =
        typeof result.error === "object" && result.error !== null && "message" in result.error
          ? String((result.error as { message: string }).message)
          : String(result.error);
      console.error("[Email] New order notification failed:", err);
      return { ok: false, error: err };
    }
    if (result.data?.id) {
      return { ok: true };
    }
    return { ok: false, error: "No message id returned" };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[Email] New order notification threw:", errMsg);
    return { ok: false, error: errMsg };
  }
}

/**
 * Send payment failed email. Server-side only. Logs to Supabase and retries.
 * Uses Gmail SMTP if USE_SMTP_GMAIL is set, otherwise Resend.
 */
export async function sendPaymentFailed(
  params: SendPaymentFailedParams
): Promise<{ ok: boolean; error?: string }> {
  const html = buildPaymentFailedHtml(params);
  const subject = `Payment Failed – Order ${params.orderId}`;

  if (isSmtpConfigured()) {
    const result = await sendViaSmtp(params.to, subject, html, EMAIL_REPLY_TO ?? undefined);
    if (result.ok) {
      await logEmail(params.to, "payment_failed", "sent", params.orderMetadataId ?? null, "smtp", null);
      return { ok: true };
    }
    await logEmail(params.to, "payment_failed", "failed", params.orderMetadataId ?? null, null, result.error ?? null);
    return { ok: false, error: result.error };
  }

  if (!RESEND_API_KEY) {
    await logEmail(
      params.to,
      "payment_failed",
      "failed",
      params.orderMetadataId ?? null,
      null,
      "RESEND_API_KEY not configured"
    );
    return { ok: false, error: "Email not configured" };
  }

  const resend = new Resend(RESEND_API_KEY);

  const result = await sendWithRetry(() =>
    resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      replyTo: EMAIL_REPLY_TO ?? undefined,
      subject,
      html,
    })
  );

  if (result.success) {
    await logEmail(
      params.to,
      "payment_failed",
      "sent",
      params.orderMetadataId ?? null,
      result.messageId,
      null
    );
    return { ok: true };
  }

  await logEmail(
    params.to,
    "payment_failed",
    "failed",
    params.orderMetadataId ?? null,
    null,
    result.error
  );
  return { ok: false, error: result.error };
}
