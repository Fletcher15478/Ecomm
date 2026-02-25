"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCatalogItemWithSettings } from "@/app/api/admin/catalog/actions";
import { getCarouselOverrideAction, saveCarouselOverrideAction } from "@/app/api/admin/inventory/actions";

export function CarouselsManager({ products }: { products: AdminCatalogItemWithSettings[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [catalogItemId, setCatalogItemId] = useState(products[0]?.id ?? "");
  const [urlsText, setUrlsText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [products]);

  useEffect(() => {
    if (!catalogItemId) return;
    startTransition(async () => {
      const urls = await getCarouselOverrideAction(catalogItemId);
      setUrlsText((urls ?? []).join("\n"));
    });
  }, [catalogItemId]);

  const save = () => {
    startTransition(async () => {
      const res = await saveCarouselOverrideAction(catalogItemId, urlsText);
      if (res.success) {
        setMessage("Saved.");
        router.refresh();
      } else {
        setMessage(res.error);
      }
      setTimeout(() => setMessage(null), 2500);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Product</span>
          <select
            value={catalogItemId}
            onChange={(e) => setCatalogItemId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
            disabled={pending}
          >
            {uniqueProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Carousel image URLs</h2>
        <p className="text-sm text-gray-600">
          One URL per line. You can use `/uploads/...` paths too.
        </p>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          rows={10}
          className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          disabled={pending}
          placeholder="https://...\nhttps://...\n/uploads/example.png"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save carousel"}
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
      </div>
    </div>
  );
}

