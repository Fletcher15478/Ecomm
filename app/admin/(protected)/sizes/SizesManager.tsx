"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCatalogItemWithSettings } from "@/app/api/admin/catalog/actions";
import type { ProductSizeRow } from "@/lib/productSizeOptions";
import {
  getSizeOptionsAction,
  upsertSizeOptionAction,
  deleteSizeOptionAction,
} from "@/app/api/admin/inventory/actions";

export function SizesManager({ products }: { products: AdminCatalogItemWithSettings[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tees = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes("tee")),
    [products]
  );

  const [variationId, setVariationId] = useState<string>(tees[0]?.variationId ?? "");
  const [rows, setRows] = useState<ProductSizeRow[]>([]);
  const [newSize, setNewSize] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!variationId) return;
    startTransition(async () => {
      const data = await getSizeOptionsAction(variationId);
      setRows(data as ProductSizeRow[]);
    });
  }, [variationId]);

  const selected = tees.find((t) => t.variationId === variationId) ?? null;

  const addSize = () => {
    if (!variationId || !newSize.trim()) return;
    startTransition(async () => {
      const res = await upsertSizeOptionAction(variationId, newSize.trim(), true);
      if (!res.success) setMessage(res.error);
      setNewSize("");
      router.refresh();
      const data = await getSizeOptionsAction(variationId);
      setRows(data as ProductSizeRow[]);
      setTimeout(() => setMessage(null), 2500);
    });
  };

  const toggleStock = (size: string, inStock: boolean) => {
    startTransition(async () => {
      const res = await upsertSizeOptionAction(variationId, size, inStock);
      if (!res.success) setMessage(res.error);
      router.refresh();
      const data = await getSizeOptionsAction(variationId);
      setRows(data as ProductSizeRow[]);
      setTimeout(() => setMessage(null), 2500);
    });
  };

  const remove = (size: string) => {
    startTransition(async () => {
      const res = await deleteSizeOptionAction(variationId, size);
      if (!res.success) setMessage(res.error);
      router.refresh();
      const data = await getSizeOptionsAction(variationId);
      setRows(data as ProductSizeRow[]);
      setTimeout(() => setMessage(null), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {tees.length === 0 ? (
        <p className="text-gray-500">No tee products found (name must include “tee”).</p>
      ) : (
        <>
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Product</span>
              <select
                value={variationId}
                onChange={(e) => setVariationId(e.target.value)}
                className="rounded border border-gray-300 px-3 py-2"
                disabled={pending}
              >
                {tees.map((t) => (
                  <option key={t.variationId} value={t.variationId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <p className="text-sm text-gray-600">
                Variation: <span className="font-mono">{selected.variationId}</span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">Sizes</h2>
            <div className="flex gap-2">
              <input
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="e.g. XS"
                className="rounded border border-gray-300 px-3 py-2 w-40"
                disabled={pending}
              />
              <button
                type="button"
                onClick={addSize}
                disabled={pending || !newSize.trim()}
                className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Add size
              </button>
            </div>
            {message && <p className="text-sm text-gray-600">{message}</p>}
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 font-medium">Size</th>
                  <th className="px-4 py-2 font-medium">In stock</th>
                  <th className="px-4 py-2 font-medium">Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.size} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{r.size}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleStock(r.size, !r.in_stock)}
                        disabled={pending}
                        className={`px-2 py-1 rounded text-sm border ${r.in_stock ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
                      >
                        {r.in_stock ? "In stock" : "Out"}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => remove(r.size)}
                        disabled={pending}
                        className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="p-4 text-gray-500">
                No sizes configured yet. Add sizes above. If you don’t configure sizes, the storefront will fall back to built-in defaults.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

