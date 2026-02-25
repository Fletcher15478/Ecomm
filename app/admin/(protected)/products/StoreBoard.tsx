"use client";

import { useTransition, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminCatalogItemWithSettings } from "@/app/api/admin/catalog/actions";
import {
  updateStoreSettingAction,
  moveStoreItemAction,
  saveStoreOrderAction,
  deleteProductFromSquareAction,
} from "@/app/api/admin/catalog/actions";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export function StoreBoard({ items: initialItems }: { items: AdminCatalogItemWithSettings[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [photoUrl, setPhotoUrl] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const showMessage = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleOutOfStock = (item: AdminCatalogItemWithSettings) => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(item.variationId, item.id, {
        isOutOfStock: !item.isOutOfStock,
      });
      if (result.success) {
        router.refresh();
      } else {
        showMessage("err", result.error ?? "Failed to update");
      }
    });
  };

  const handleToggleHidden = (item: AdminCatalogItemWithSettings) => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(item.variationId, item.id, {
        hidden: !item.hidden,
      });
      if (result.success) {
        router.refresh();
      } else {
        showMessage("err", result.error ?? "Failed to update");
      }
    });
  };

  const handleToggleFeatured = (item: AdminCatalogItemWithSettings) => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(item.variationId, item.id, {
        featured: !item.featured,
      });
      if (result.success) {
        router.refresh();
      } else {
        showMessage("err", result.error ?? "Failed to update");
      }
    });
  };

  const handleToggleSeasonal = (item: AdminCatalogItemWithSettings) => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(item.variationId, item.id, {
        seasonal: !item.seasonal,
      });
      if (result.success) {
        router.refresh();
      } else {
        showMessage("err", result.error ?? "Failed to update");
      }
    });
  };

  const handleSavePhotoUrl = (item: AdminCatalogItemWithSettings) => {
    const url = photoUrl[item.variationId]?.trim() ?? item.customImageUrl ?? "";
    startTransition(async () => {
      const result = await updateStoreSettingAction(item.variationId, item.id, {
        customImageUrl: url || null,
      });
      if (result.success) {
        setPhotoUrl((prev) => ({ ...prev, [item.variationId]: "" }));
        router.refresh();
        showMessage("ok", "Photo URL saved.");
      } else {
        showMessage("err", result.error ?? "Failed to save");
      }
    });
  };

  const handleMove = (item: AdminCatalogItemWithSettings, direction: "up" | "down") => {
    startTransition(async () => {
      const result = await moveStoreItemAction(item.variationId, direction);
      if (result.success) {
        router.refresh();
      } else {
        showMessage("err", result.error ?? "Failed to move");
      }
    });
  };

  const handlePageChange = (item: AdminCatalogItemWithSettings, value: string) => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(item.variationId, item.id, {
        productTypeOverride: value || null,
      });
      if (result.success) {
        router.refresh();
        setItems((prev) =>
          prev.map((i) =>
            i.variationId === item.variationId ? { ...i, productTypeOverride: value || null } : i
          )
        );
      } else {
        showMessage("err", result.error ?? "Failed to update page");
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, variationId: string) => {
    setDraggedId(variationId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", variationId);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent, targetVariationId: string) => {
    e.preventDefault();
    setDraggedId(null);
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetVariationId) return;
    const reordered = [...items];
    const from = reordered.findIndex((i) => i.variationId === sourceId);
    const to = reordered.findIndex((i) => i.variationId === targetVariationId);
    if (from < 0 || to < 0) return;
    const [removed] = reordered.splice(from, 1);
    reordered.splice(to, 0, removed);
    setItems(reordered);
    startTransition(async () => {
      const result = await saveStoreOrderAction(reordered.map((i) => i.variationId));
      if (result.success) {
        router.refresh();
        showMessage("ok", "Order saved.");
      } else {
        showMessage("err", result.error ?? "Failed to save order");
        setItems(initialItems);
      }
    });
  };
  const handleDragEnd = () => setDraggedId(null);

  const handleDelete = (item: AdminCatalogItemWithSettings) => {
    if (
      !confirm(
        `Delete "${item.name}" from Square and remove it from the catalogue? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(item.variationId);
    startTransition(async () => {
      const result = await deleteProductFromSquareAction(item.id, item.variationId);
      setDeletingId(null);
      if (result.success) {
        router.refresh();
        showMessage("ok", "Item deleted from Square and catalogue.");
      } else {
        showMessage("err", result.error ?? "Failed to delete");
      }
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-gray-500 py-4">
        No products in your Square catalog. Add a product above or add items in Square.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={`text-sm py-2 px-3 rounded ${message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {message.text}
        </p>
      )}
      <p className="text-gray-600 text-sm">
        Drag rows to reorder. Click a product name to edit flavors, sizes, carousel, description &amp; price. Set which catalogue page (Ice cream / Merch / Gift card) each item appears on.
      </p>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 font-medium text-sm w-12">Drag</th>
              <th className="px-3 py-2 font-medium text-sm w-20">Photo</th>
              <th className="px-3 py-2 font-medium text-sm">Name</th>
              <th className="px-3 py-2 font-medium text-sm w-28">Page</th>
              <th className="px-3 py-2 font-medium text-sm w-24">Price</th>
              <th className="px-3 py-2 font-medium text-sm w-28">Out of stock</th>
              <th className="px-3 py-2 font-medium text-sm w-24">Featured</th>
              <th className="px-3 py-2 font-medium text-sm w-24">Seasonal</th>
              <th className="px-3 py-2 font-medium text-sm w-28">Hide from store</th>
              <th className="px-3 py-2 font-medium text-sm">Photo URL</th>
              <th className="px-3 py-2 font-medium text-sm w-20">Delete</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.variationId}
                draggable
                onDragStart={(e) => handleDragStart(e, item.variationId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.variationId)}
                onDragEnd={handleDragEnd}
                className={`border-b last:border-0 hover:bg-gray-50/50 ${draggedId === item.variationId ? "opacity-50" : ""}`}
              >
                <td className="px-3 py-2 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                  ⋮⋮
                </td>
                <td className="px-3 py-2">
                  <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden relative">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="56px"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center justify-center w-full h-full">No img</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/admin/products/${item.id}`} className="text-pink-600 hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.productTypeOverride ?? ""}
                    onChange={(e) => handlePageChange(item, e.target.value)}
                    disabled={pending}
                    className="text-sm rounded border border-gray-300 px-2 py-1"
                  >
                    <option value="">Default</option>
                    <option value="ice_cream">Ice cream</option>
                    <option value="merchandise">Merch</option>
                    <option value="gift_card">Gift card</option>
                  </select>
                </td>
                <td className="px-3 py-2">{formatMoney(item.priceCents, item.currency)}</td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.isOutOfStock}
                      onChange={() => handleToggleOutOfStock(item)}
                      disabled={pending}
                      className="rounded"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.featured}
                      onChange={() => handleToggleFeatured(item)}
                      disabled={pending}
                      className="rounded"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.seasonal}
                      onChange={() => handleToggleSeasonal(item)}
                      disabled={pending}
                      className="rounded"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.hidden}
                      onChange={() => handleToggleHidden(item)}
                      disabled={pending}
                      className="rounded"
                    />
                    <span className="text-sm">Hide</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={photoUrl[item.variationId] ?? item.customImageUrl ?? ""}
                      onChange={(e) =>
                        setPhotoUrl((prev) => ({ ...prev, [item.variationId]: e.target.value }))
                      }
                      className="flex-1 min-w-0 text-sm rounded border border-gray-300 px-2 py-1"
                      disabled={pending}
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePhotoUrl(item)}
                      disabled={pending}
                      className="px-2 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={pending || deletingId === item.variationId}
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50"
                    title="Delete from Square and catalogue"
                  >
                    {deletingId === item.variationId ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
