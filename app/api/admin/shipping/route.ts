import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const [zonesRes, restrictionsRes, heatRes, packagingRes] = await Promise.all([
    supabase.from("shipping_zones").select("*").order("is_default", { ascending: false }),
    supabase.from("state_restrictions").select("*"),
    supabase.from("heat_surcharge_rules").select("*"),
    supabase.from("packaging_fees").select("*"),
  ]);

  return NextResponse.json({
    zones: zonesRes.data ?? [],
    stateRestrictions: restrictionsRes.data ?? [],
    heatSurchargeRules: heatRes.data ?? [],
    packagingFees: packagingRes.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  const supabase = createSupabaseAdmin();

  const logAudit = async (action: string, resourceType: string, resourceId: string, details: unknown) => {
    await supabase.from("audit_logs").insert({
      user_id: session.userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: { user_email: session.email, ...(details as Record<string, unknown>) },
    });
  };

  if (action === "createZone") {
    const { name, states, base_price_cents, currency, is_default } = body;
    const { data, error } = await supabase
      .from("shipping_zones")
      .insert({
        name: name ?? "New Zone",
        states: Array.isArray(states) ? states : [],
        base_price_cents: Number(base_price_cents) || 0,
        currency: currency ?? "USD",
        is_default: Boolean(is_default),
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("createZone", "shipping_zone", data.id, body);
    return NextResponse.json(data);
  }

  if (action === "updateZone") {
    const { id, name, states, base_price_cents, currency, is_default } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase
      .from("shipping_zones")
      .update({
        ...(name !== undefined && { name }),
        ...(states !== undefined && { states }),
        ...(base_price_cents !== undefined && { base_price_cents: Number(base_price_cents) }),
        ...(currency !== undefined && { currency }),
        ...(is_default !== undefined && { is_default: Boolean(is_default) }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("updateZone", "shipping_zone", id, body);
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteZone") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("deleteZone", "shipping_zone", id, {});
    return NextResponse.json({ ok: true });
  }

  if (action === "createStateRestriction") {
    const { state_code, reason } = body;
    const { data, error } = await supabase
      .from("state_restrictions")
      .insert({ state_code: (state_code ?? "").toString().toUpperCase().slice(0, 2), reason: reason ?? null })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("createStateRestriction", "state_restriction", data.id, body);
    return NextResponse.json(data);
  }

  if (action === "deleteStateRestriction") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("state_restrictions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("deleteStateRestriction", "state_restriction", id, {});
    return NextResponse.json({ ok: true });
  }

  if (action === "createHeatSurcharge") {
    const { name, zone_id, surcharge_cents, applies_to_frozen_only } = body;
    const { data, error } = await supabase
      .from("heat_surcharge_rules")
      .insert({
        name: name ?? "Heat surcharge",
        zone_id: zone_id || null,
        surcharge_cents: Number(surcharge_cents) || 0,
        applies_to_frozen_only: applies_to_frozen_only !== false,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("createHeatSurcharge", "heat_surcharge_rule", data.id, body);
    return NextResponse.json(data);
  }

  if (action === "deleteHeatSurcharge") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("heat_surcharge_rules").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("deleteHeatSurcharge", "heat_surcharge_rule", id, {});
    return NextResponse.json({ ok: true });
  }

  if (action === "createPackagingFee") {
    const { kind, zone_id, fee_cents } = body;
    if (!kind || !["ice_pack", "insulated"].includes(kind)) {
      return NextResponse.json({ error: "kind must be ice_pack or insulated" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("packaging_fees")
      .insert({
        kind,
        zone_id: zone_id || null,
        fee_cents: Number(fee_cents) || 0,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("createPackagingFee", "packaging_fee", data.id, body);
    return NextResponse.json(data);
  }

  if (action === "deletePackagingFee") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("packaging_fees").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAudit("deletePackagingFee", "packaging_fee", id, {});
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
