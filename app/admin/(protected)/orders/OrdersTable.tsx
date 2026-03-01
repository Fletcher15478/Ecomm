"use client";

import { useState, Fragment } from "react";

type ShippingAddress = {
  firstName?: string | null;
  lastName?: string | null;
  addressLine1?: string | null;
  locality?: string | null;
  administrativeDistrictLevel1?: string | null;
  postalCode?: string | null;
};

type ShippingBreakdown = {
  subtotal?: number;
  heatSurcharge?: number;
  icePackFee?: number;
  insulatedPackagingFee?: number;
  total?: number;
  currency?: string;
  zoneName?: string;
};

type OrderRow = {
  id: string;
  square_order_id: string;
  email: string;
  shipping_state: string;
  amount_total_cents: number | string;
  currency: string;
  status: string;
  created_at: string;
  customer_name?: string | null;
  shipping_address?: ShippingAddress | null;
  order_note?: string | null;
  shipping_breakdown?: ShippingBreakdown | null;
};

function formatAddress(addr: ShippingAddress | null | undefined): string {
  if (!addr) return "—";
  const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ").trim();
  const line1 = addr.addressLine1?.trim();
  const cityStateZip = [addr.locality, addr.administrativeDistrictLevel1, addr.postalCode]
    .filter(Boolean)
    .join(", ");
  const parts = [name, line1, cityStateZip].filter(Boolean);
  return parts.length ? parts.join("\n") : "—";
}

function formatShipping(b: ShippingBreakdown | null | undefined): string {
  if (!b || b.total == null) return "—";
  const cents = Number(b.total);
  const curr = b.currency ?? "USD";
  return `$${(cents / 100).toFixed(2)} ${curr}`;
}

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-2 font-medium w-8" aria-label="Expand" />
            <th className="px-4 py-2 font-medium">Order ID</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">State</th>
            <th className="px-4 py-2 font-medium">Total</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => {
            const isExpanded = expandedId === o.id;
            return (
              <>
                <tr
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : o.id);
                    }
                  }}
                  className="border-b hover:bg-gray-50 cursor-pointer select-none"
                >
                  <td className="px-4 py-2 text-gray-500">
                    {isExpanded ? "▼" : "▶"}
                  </td>
                  <td className="px-4 py-2 font-mono text-sm">{o.square_order_id}</td>
                  <td className="px-4 py-2">{o.email}</td>
                  <td className="px-4 py-2">{o.shipping_state}</td>
                  <td className="px-4 py-2">
                    ${((Number(o.amount_total_cents) || 0) / 100).toFixed(2)} {o.currency}
                  </td>
                  <td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${o.id}-detail`} className="bg-gray-50 border-b">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">Order details</h4>
                          <dl className="space-y-1">
                            <div>
                              <dt className="text-gray-500 inline">Name: </dt>
                              <dd className="inline">{o.customer_name?.trim() || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 inline">Email: </dt>
                              <dd className="inline">{o.email}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 inline">Order type: </dt>
                              <dd className="inline">
                                {o.shipping_address?.addressLine1 ? "Shipping" : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 inline">Total: </dt>
                              <dd className="inline">
                                ${((Number(o.amount_total_cents) || 0) / 100).toFixed(2)} {o.currency}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-gray-500 inline">Shipping: </dt>
                              <dd className="inline">{formatShipping(o.shipping_breakdown)}</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">Address</h4>
                          <pre className="whitespace-pre-wrap font-sans text-gray-800">
                            {formatAddress(o.shipping_address)}
                          </pre>
                          {o.order_note?.trim() && (
                            <>
                              <h4 className="font-semibold text-gray-700 mt-3 mb-1">Note</h4>
                              <p className="text-gray-800">{o.order_note.trim()}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {(!orders || orders.length === 0) && (
        <p className="p-4 text-gray-500">No orders yet.</p>
      )}
    </div>
  );
}
