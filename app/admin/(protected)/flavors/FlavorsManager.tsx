"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FlavorOptionRow } from "@/lib/flavorOptions";
import { addOrUpdateFlavorAction, toggleFlavorFieldAction } from "@/app/api/admin/inventory/actions";

export function FlavorsManager({ initialFlavors }: { initialFlavors: FlavorOptionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [featured, setFeatured] = useState(false);
  const [seasonal, setSeasonal] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);

  const flavors = useMemo(() => initialFlavors ?? [], [initialFlavors]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    if (featured) fd.set("featured", "on");
    if (seasonal) fd.set("seasonal", "on");
    if (!inStock) fd.set("in_stock", "off");
    fd.set("sort_order", String(sortOrder));
    startTransition(async () => {
      const res = await addOrUpdateFlavorAction(fd);
      if (res.success) {
        setName("");
        setFeatured(false);
        setSeasonal(false);
        setInStock(true);
        setSortOrder(0);
        setMessage("Saved.");
        router.refresh();
      } else {
        setMessage(res.error);
      }
      setTimeout(() => setMessage(null), 2500);
    });
  };

  const toggle = (id: string, field: "in_stock" | "featured" | "seasonal") => {
    startTransition(async () => {
      const res = await toggleFlavorFieldAction(id, field);
      if (!res.success) setMessage(res.error);
      router.refresh();
      setTimeout(() => setMessage(null), 2500);
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="p-4 bg-white rounded-lg border space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Flavor name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cookie Dough"
              className="rounded border border-gray-300 px-3 py-2 w-72"
              disabled={pending}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Sort order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="rounded border border-gray-300 px-3 py-2 w-28"
              disabled={pending}
            />
          </label>
          <label className="flex items-center gap-2 h-[42px]">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} disabled={pending} />
            <span className="text-sm text-gray-700">In stock</span>
          </label>
          <label className="flex items-center gap-2 h-[42px]">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} disabled={pending} />
            <span className="text-sm text-gray-700">Featured</span>
          </label>
          <label className="flex items-center gap-2 h-[42px]">
            <input type="checkbox" checked={seasonal} onChange={(e) => setSeasonal(e.target.checked)} disabled={pending} />
            <span className="text-sm text-gray-700">Seasonal</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save flavor"}
          </button>
        </div>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </form>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">In stock</th>
              <th className="px-4 py-2 font-medium">Featured</th>
              <th className="px-4 py-2 font-medium">Seasonal</th>
              <th className="px-4 py-2 font-medium">Order</th>
            </tr>
          </thead>
          <tbody>
            {flavors.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{f.name}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(f.id, "in_stock")}
                    disabled={pending}
                    className={`px-2 py-1 rounded text-sm border ${f.in_stock ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
                  >
                    {f.in_stock ? "In stock" : "Out"}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(f.id, "featured")}
                    disabled={pending}
                    className={`px-2 py-1 rounded text-sm border ${f.featured ? "bg-pink-50 border-pink-200 text-pink-700" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                  >
                    {f.featured ? "Yes" : "No"}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(f.id, "seasonal")}
                    disabled={pending}
                    className={`px-2 py-1 rounded text-sm border ${f.seasonal ? "bg-pink-50 border-pink-200 text-pink-700" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                  >
                    {f.seasonal ? "Yes" : "No"}
                  </button>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">{f.sort_order}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {flavors.length === 0 && <p className="p-4 text-gray-500">No flavors yet. Add one above.</p>}
      </div>
    </div>
  );
}

