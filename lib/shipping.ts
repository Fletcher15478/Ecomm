import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ShippingBreakdown } from "@/types";

export interface ShippingCartItem {
  catalogObjectId: string;
  quantity: number;
  isFrozen: boolean;
  /** True if this item is merchandise (adds $12 to shipping when present). */
  isMerch?: boolean;
}

export interface ShippingConfig {
  zones: Array<{
    id: string;
    name: string;
    states: string[];
    base_price_cents: number;
    currency: string;
    is_default: boolean;
  }>;
  blockedStates: string[];
  heatSurchargeRules: Array<{
    id: string;
    zone_id: string | null;
    surcharge_cents: number;
    applies_to_frozen_only: boolean;
  }>;
  packagingFees: Array<{
    kind: "ice_pack" | "insulated";
    zone_id: string | null;
    fee_cents: number;
  }>;
}

const DEFAULT_CURRENCY = "USD";

/** Flat shipping for merchandise-only or merchandise add-on. */
const MERCH_SHIPPING_CENTS = 1200; // $12

/**
 * Millie's flat-rate shipping by state (matches WooCommerce zones).
 * Per-package rate for ice cream. Merch is flat $12.
 */
const STATE_SHIPPING_CENTS: Record<string, number> = {
  PA: 1000,   // $10 – PA Flat Rate
  DE: 1500, DC: 1500, MD: 1500, NJ: 1500, OH: 1500,   // $15
  WV: 2500, CT: 2500, VA: 2500,   // $25
  IL: 3000, IN: 3000, KY: 3000, MA: 3000, MI: 3000, NH: 3000, NY: 3000, RI: 3000, TN: 3000,   // $30
  NC: 3500, SC: 3500, VT: 3500, ME: 3500,   // $35
  AL: 4000, GA: 4000, IA: 4000, AR: 4000, FL: 4000, KS: 4000, LA: 4000, MO: 4000, NE: 4000,   // $40
  MS: 4500, MN: 4500, OK: 4500, SD: 4500, WI: 4500,   // $45
  TX: 5500,   // $55
  AZ: 6500, CA: 6500, CO: 6500, ID: 6500, MT: 6500, NV: 6500, NM: 6500, ND: 6500, OR: 6500, UT: 6500, WA: 6500, WY: 6500,   // $65
};

/**
 * Fetch shipping configuration from Supabase. O(n) in number of rows.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const supabase = createSupabaseAdmin();

  const [zonesRes, restrictionsRes, heatRes, packagingRes] = await Promise.all([
    supabase.from("shipping_zones").select("id, name, states, base_price_cents, currency, is_default").order("is_default", { ascending: false }),
    supabase.from("state_restrictions").select("state_code"),
    supabase.from("heat_surcharge_rules").select("id, zone_id, surcharge_cents, applies_to_frozen_only"),
    supabase.from("packaging_fees").select("kind, zone_id, fee_cents"),
  ]);

  const zones = (zonesRes.data ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    states: z.states ?? [],
    base_price_cents: z.base_price_cents ?? 0,
    currency: z.currency ?? DEFAULT_CURRENCY,
    is_default: z.is_default ?? false,
  }));

  const blockedStates = (restrictionsRes.data ?? []).map((r) => (r.state_code ?? "").toUpperCase());

  const heatSurchargeRules = (heatRes.data ?? []).map((h) => ({
    id: h.id,
    zone_id: h.zone_id ?? null,
    surcharge_cents: h.surcharge_cents ?? 0,
    applies_to_frozen_only: h.applies_to_frozen_only ?? true,
  }));

  const packagingFees = (packagingRes.data ?? []).map((p) => ({
    kind: p.kind as "ice_pack" | "insulated",
    zone_id: p.zone_id ?? null,
    fee_cents: p.fee_cents ?? 0,
  }));

  return { zones, blockedStates, heatSurchargeRules, packagingFees };
}

/**
 * Find zone for state. Uses first matching zone or default. O(zones).
 */
function resolveZone(
  stateCode: string,
  config: ShippingConfig
): ShippingConfig["zones"][number] | null {
  const upper = stateCode.toUpperCase().trim();
  const defaultZone = config.zones.find((z) => z.is_default);
  const matching = config.zones.find((z) =>
    z.states.some((s) => s.toUpperCase() === upper)
  );
  return matching ?? defaultZone ?? null;
}

/**
 * Shipping engine: cart items + destination state -> breakdown.
 * - Merch only: $12 flat.
 * - Ice cream only: state rate × number of ice cream packages (quantity of ice cream items).
 * - Ice cream + merch: (state rate × ice cream packages) + $12.
 */
export async function calculateShipping(
  cartItems: ShippingCartItem[],
  destinationState: string
): Promise<ShippingBreakdown> {
  const upperState = destinationState.toUpperCase().trim().slice(0, 2);

  const iceCreamPackages = cartItems
    .filter((i) => !i.isMerch)
    .reduce((sum, i) => sum + i.quantity, 0);
  const hasMerch = cartItems.some((i) => i.isMerch);

  // Merch only: $12 flat (no state rate)
  if (iceCreamPackages === 0 && hasMerch) {
    return {
      allowed: true,
      subtotal: MERCH_SHIPPING_CENTS,
      heatSurcharge: 0,
      icePackFee: 0,
      insulatedPackagingFee: 0,
      total: MERCH_SHIPPING_CENTS,
      currency: DEFAULT_CURRENCY,
    };
  }

  // Ice cream only or ice cream + merch: state rate per ice cream package
  const ratePerPackage = STATE_SHIPPING_CENTS[upperState];
  if (ratePerPackage != null) {
    const iceCreamShipping = ratePerPackage * iceCreamPackages;
    const merchShipping = hasMerch ? MERCH_SHIPPING_CENTS : 0;
    const total = iceCreamShipping + merchShipping;
    return {
      allowed: true,
      subtotal: iceCreamShipping,
      heatSurcharge: 0,
      icePackFee: 0,
      insulatedPackagingFee: 0,
      total,
      currency: DEFAULT_CURRENCY,
    };
  }

  // State not in flat-rate map: fall back to Supabase config (ice cream only for now)
  if (iceCreamPackages === 0) {
    // No ice cream and we didn't hit merch-only above (no merch) -> empty cart or unknown state
    return {
      allowed: false,
      blockedReason: `Shipping to ${upperState} is not available.`,
      subtotal: 0,
      heatSurcharge: 0,
      icePackFee: 0,
      insulatedPackagingFee: 0,
      total: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  const config = await getShippingConfig();

  if (config.blockedStates.includes(upperState)) {
    return {
      allowed: false,
      blockedReason: `Shipping to ${upperState} is not available.`,
      subtotal: 0,
      heatSurcharge: 0,
      icePackFee: 0,
      insulatedPackagingFee: 0,
      total: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  const zone = resolveZone(destinationState, config);
  if (!zone) {
    return {
      allowed: false,
      blockedReason: `No shipping available for state ${upperState}.`,
      subtotal: 0,
      heatSurcharge: 0,
      icePackFee: 0,
      insulatedPackagingFee: 0,
      total: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  const hasFrozen = cartItems.some((i) => i.isFrozen);

  let subtotal = zone.base_price_cents * iceCreamPackages;
  let heatSurcharge = 0;
  let icePackFee = 0;
  let insulatedPackagingFee = 0;

  const heatRule = config.heatSurchargeRules.find((r) => {
    if (r.applies_to_frozen_only && !hasFrozen) return false;
    if (r.zone_id && r.zone_id !== zone.id) return false;
    if (!r.zone_id) return true;
    return r.zone_id === zone.id;
  });
  if (heatRule) heatSurcharge = heatRule.surcharge_cents;

  const icePackRule = config.packagingFees.find(
    (p) => p.kind === "ice_pack" && (p.zone_id === null || p.zone_id === zone.id)
  );
  if (hasFrozen && icePackRule) icePackFee = icePackRule.fee_cents;

  const insulatedRule = config.packagingFees.find(
    (p) => p.kind === "insulated" && (p.zone_id === null || p.zone_id === zone.id)
  );
  if (hasFrozen && insulatedRule) insulatedPackagingFee = insulatedRule.fee_cents;

  const merchShipping = hasMerch ? MERCH_SHIPPING_CENTS : 0;
  const total =
    subtotal + heatSurcharge + icePackFee + insulatedPackagingFee + merchShipping;

  return {
    allowed: true,
    zoneId: zone.id,
    zoneName: zone.name,
    subtotal,
    heatSurcharge,
    icePackFee,
    insulatedPackagingFee,
    total,
    currency: zone.currency ?? DEFAULT_CURRENCY,
  };
}
