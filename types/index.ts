/** Cart item as sent from client; server re-validates against Square. */
export interface CartItemInput {
  catalogObjectId: string;
  quantity: number;
  variationId?: string;
  /** Optional note (e.g. flavor choices) included on the order line item. */
  note?: string;
}

/** Server-validated line item with price from Square. */
export interface CartLineItem {
  catalogObjectId: string;
  variationId: string;
  name: string;
  quantity: number;
  basePriceMoney: { amount: bigint; currency: string };
  isFrozen: boolean;
  /** True if this item is merchandise (shipping: flat $12). */
  isMerch: boolean;
}

/** Shipping breakdown returned by shipping engine. */
export interface ShippingBreakdown {
  allowed: boolean;
  blockedReason?: string;
  zoneId?: string;
  zoneName?: string;
  subtotal: number;
  heatSurcharge: number;
  icePackFee: number;
  insulatedPackagingFee: number;
  total: number;
  currency: string;
}

/** Order metadata stored in Supabase after Square order + payment. */
export interface OrderMetadata {
  id: string;
  square_order_id: string;
  square_payment_id: string | null;
  idempotency_key: string;
  email: string;
  shipping_state: string;
  shipping_breakdown: ShippingBreakdown | null;
  amount_total: number;
  currency: string;
  status: "pending" | "completed" | "payment_failed" | "cancelled";
  created_at: string;
  updated_at: string;
}

/** Admin role stored in Supabase. */
export type AdminRole = "admin" | "viewer";
