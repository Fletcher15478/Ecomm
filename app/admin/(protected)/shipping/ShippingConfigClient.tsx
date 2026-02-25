"use client";

import { useState, useCallback } from "react";

interface Zone {
  id: string;
  name: string;
  states: string[];
  base_price_cents: number;
  currency: string;
  is_default: boolean;
}

interface StateRestriction {
  id: string;
  state_code: string;
  reason: string | null;
}

interface HeatRule {
  id: string;
  name: string;
  zone_id: string | null;
  surcharge_cents: number;
  applies_to_frozen_only: boolean;
}

interface PackagingFee {
  id: string;
  kind: string;
  zone_id: string | null;
  fee_cents: number;
}

interface Props {
  initialZones: Zone[];
  initialRestrictions: StateRestriction[];
  initialHeatRules: HeatRule[];
  initialPackagingFees: PackagingFee[];
  isAdmin: boolean;
}

export function ShippingConfigClient({
  initialZones,
  initialRestrictions,
  initialHeatRules,
  initialPackagingFees,
  isAdmin,
}: Props) {
  const [zones, setZones] = useState(initialZones);
  const [restrictions, setRestrictions] = useState(initialRestrictions);
  const [heatRules, setHeatRules] = useState(initialHeatRules);
  const [packagingFees, setPackagingFees] = useState(initialPackagingFees);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(async (action: string, payload: Record<string, unknown>) => {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return null;
      }
      return data;
    } finally {
      setLoading(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/admin/shipping");
    if (!res.ok) return;
    const data = await res.json();
    setZones(data.zones ?? []);
    setRestrictions(data.stateRestrictions ?? []);
    setHeatRules(data.heatSurchargeRules ?? []);
    setPackagingFees(data.packagingFees ?? []);
  }, []);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-gray-500">View-only. Only admins can edit shipping config.</p>
        <div className="mt-4 space-y-4">
          <Section title="Zones" items={zones.map((z) => `${z.name} (${z.states.join(", ")}) – $${(z.base_price_cents / 100).toFixed(2)}`)} />
          <Section title="Blocked states" items={restrictions.map((r) => `${r.state_code}${r.reason ? ` – ${r.reason}` : ""}`)} />
          <Section title="Heat surcharges" items={heatRules.map((h) => `${h.name} – $${(h.surcharge_cents / 100).toFixed(2)}`)} />
          <Section title="Packaging fees" items={packagingFees.map((p) => `${p.kind} – $${(p.fee_cents / 100).toFixed(2)}`)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Zones</h2>
        <ul className="list-disc list-inside mb-2">
          {zones.map((z) => (
            <li key={z.id}>
              {z.name} – states: {z.states.join(", ") || "(none)"} – ${(z.base_price_cents / 100).toFixed(2)}
              {z.is_default && " (default)"}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={async () => {
            const data = await callApi("createZone", { name: "New Zone", states: [], base_price_cents: 0 });
            if (data) await refetch();
          }}
          disabled={!!loading}
        >
          Add zone
        </button>
      </div>
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Blocked states</h2>
        <ul className="list-disc list-inside mb-2">
          {restrictions.map((r) => (
            <li key={r.id}>
              {r.state_code}
              {r.reason ? ` – ${r.reason}` : ""}
              <button
                type="button"
                className="ml-2 text-red-600 text-sm"
                onClick={async () => {
                  await callApi("deleteStateRestriction", { id: r.id });
                  await refetch();
                }}
                disabled={!!loading}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={async () => {
            const state = prompt("State code (e.g. HI):");
            if (state) {
              await callApi("createStateRestriction", { state_code: state });
              await refetch();
            }
          }}
          disabled={!!loading}
        >
          Add blocked state
        </button>
      </div>
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Heat surcharge rules</h2>
        <ul className="list-disc list-inside mb-2">
          {heatRules.map((h) => (
            <li key={h.id}>
              {h.name} – ${(h.surcharge_cents / 100).toFixed(2)}
              {h.applies_to_frozen_only && " (frozen only)"}
              <button
                type="button"
                className="ml-2 text-red-600 text-sm"
                onClick={async () => {
                  await callApi("deleteHeatSurcharge", { id: h.id });
                  await refetch();
                }}
                disabled={!!loading}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={async () => {
            await callApi("createHeatSurcharge", { name: "Heat surcharge", surcharge_cents: 0 });
            await refetch();
          }}
          disabled={!!loading}
        >
          Add heat surcharge
        </button>
      </div>
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Packaging fees</h2>
        <ul className="list-disc list-inside mb-2">
          {packagingFees.map((p) => (
            <li key={p.id}>
              {p.kind} – ${(p.fee_cents / 100).toFixed(2)}
              <button
                type="button"
                className="ml-2 text-red-600 text-sm"
                onClick={async () => {
                  await callApi("deletePackagingFee", { id: p.id });
                  await refetch();
                }}
                disabled={!!loading}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline mr-2"
          onClick={async () => {
            await callApi("createPackagingFee", { kind: "ice_pack", fee_cents: 0 });
            await refetch();
          }}
          disabled={!!loading}
        >
          Add ice pack fee
        </button>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={async () => {
            await callApi("createPackagingFee", { kind: "insulated", fee_cents: 0 });
            await refetch();
          }}
          disabled={!!loading}
        >
          Add insulated fee
        </button>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-medium text-gray-700">{title}</h3>
      <ul className="list-disc list-inside text-sm text-gray-600">
        {items.length ? items.map((item, i) => <li key={i}>{item}</li>) : <li>None</li>}
      </ul>
    </div>
  );
}
