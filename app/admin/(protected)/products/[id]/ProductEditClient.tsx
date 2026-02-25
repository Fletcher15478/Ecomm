"use client";

import { useTransition, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateStoreSettingAction } from "@/app/api/admin/catalog/actions";
import {
  saveCarouselOverrideAction,
} from "@/app/api/admin/inventory/actions";
import {
  addProductFlavorAction,
  removeProductFlavorAction,
} from "@/app/api/admin/inventory/actions";
import {
  upsertSizeOptionAction,
  deleteSizeOptionAction,
} from "@/app/api/admin/inventory/actions";
import type { ProductSizeRow } from "@/lib/productSizeOptions";
import type { FlavorOptionRow } from "@/lib/flavorOptions";

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

type PageOption = { value: string; label: string };

interface ProductEditClientProps {
  catalogItemId: string;
  variationId: string;
  name: string;
  squareDescription: string | null;
  squareImageUrl: string | null;
  bigDescription: string;
  carouselUrls: string[];
  priceCents: number;
  priceOverrideCents: number | null;
  currency: string;
  productTypeOverride: string | null;
  pageOptions: readonly PageOption[];
  productFlavorNames: string[];
  allFlavorOptions: FlavorOptionRow[];
  sizeOptions: ProductSizeRow[];
  isMultiPint: boolean;
  isTee: boolean;
}

export function ProductEditClient({
  catalogItemId,
  variationId,
  name,
  squareDescription,
  squareImageUrl,
  bigDescription,
  carouselUrls,
  priceCents,
  priceOverrideCents,
  currency,
  productTypeOverride,
  pageOptions,
  productFlavorNames,
  allFlavorOptions,
  sizeOptions,
  isMultiPint,
  isTee,
}: ProductEditClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [bigDesc, setBigDesc] = useState(bigDescription);
  const [priceOverride, setPriceOverride] = useState(priceOverrideCents != null ? (priceOverrideCents / 100).toFixed(2) : "");
  const [pageValue, setPageValue] = useState(productTypeOverride ?? "");
  const [carouselList, setCarouselList] = useState<string[]>(carouselUrls);
  const [newCarouselUrl, setNewCarouselUrl] = useState("");
  const [typedFlavorName, setTypedFlavorName] = useState("");
  const [newSizeName, setNewSizeName] = useState("");
  const [sizes, setSizes] = useState<ProductSizeRow[]>(sizeOptions);
  const [flavors, setFlavors] = useState<string[]>(productFlavorNames);

  const showMessage = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveBigDescription = () => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(variationId, catalogItemId, {
        longDescriptionOverride: bigDesc.trim() || null,
      });
      if (result.success) {
        router.refresh();
        showMessage("ok", "Big product description saved.");
      } else {
        showMessage("err", result.error ?? "Failed to save");
      }
    });
  };

  const savePriceOverride = () => {
    const cents = Math.round(parseFloat(priceOverride) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      showMessage("err", "Enter a valid price");
      return;
    }
    startTransition(async () => {
      const result = await updateStoreSettingAction(variationId, catalogItemId, {
        priceOverrideCents: cents,
      });
      if (result.success) {
        router.refresh();
        showMessage("ok", "Price override saved.");
      } else {
        showMessage("err", result.error ?? "Failed to save");
      }
    });
  };

  const savePage = () => {
    startTransition(async () => {
      const result = await updateStoreSettingAction(variationId, catalogItemId, {
        productTypeOverride: pageValue || null,
      });
      if (result.success) {
        router.refresh();
        showMessage("ok", "Catalogue page saved.");
      } else {
        showMessage("err", result.error ?? "Failed to save");
      }
    });
  };

  const saveCarousel = () => {
    startTransition(async () => {
      const result = await saveCarouselOverrideAction(catalogItemId, carouselList.join("\n"));
      if (result.success) {
        router.refresh();
        showMessage("ok", "Carousel images saved.");
      } else {
        showMessage("err", result.error ?? "Failed to save");
      }
    });
  };

  const addCarouselUrl = () => {
    const url = newCarouselUrl.trim();
    if (!url) return;
    setCarouselList((prev) => [...prev, url]);
    setNewCarouselUrl("");
  };

  const removeCarouselUrl = (index: number) => {
    setCarouselList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadCarousel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMessage("err", res.status === 404 ? "Upload not available. Restart the dev server and try again." : (data.error ?? "Upload failed"));
      e.target.value = "";
      return;
    }
    if (data.url) {
      setCarouselList((prev) => [...prev, data.url]);
      showMessage("ok", "Image uploaded. Click Save carousel to persist.");
    } else {
      showMessage("err", data.error ?? "Upload failed");
    }
    e.target.value = "";
  };

  const removeFlavor = (flavorName: string) => {
    startTransition(async () => {
      const result = await removeProductFlavorAction(catalogItemId, flavorName);
      if (result.success) {
        router.refresh();
        setFlavors((prev) => prev.filter((n) => n !== flavorName));
        showMessage("ok", "Flavor removed from this product.");
      } else {
        showMessage("err", result.error ?? "Failed");
      }
    });
  };

  const addFlavor = () => {
    const name = typedFlavorName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await addProductFlavorAction(catalogItemId, name);
      if (result.success) {
        router.refresh();
        setFlavors((prev) => [...prev, name]);
        setTypedFlavorName("");
        showMessage("ok", "Flavor added to this product.");
      } else {
        showMessage("err", result.error ?? "Failed");
      }
    });
  };

  const addFlavorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addFlavor();
  };

  const canAddFlavor = typedFlavorName.trim().length > 0;

  const addSize = () => {
    const size = newSizeName.trim();
    if (!size) return;
    startTransition(async () => {
      const result = await upsertSizeOptionAction(variationId, size, true);
      if (result.success) {
        router.refresh();
        setSizes((prev) => [...prev, { variation_id: variationId, size, in_stock: true, sort_order: prev.length, updated_at: "" }]);
        setNewSizeName("");
        showMessage("ok", "Size added.");
      } else {
        showMessage("err", result.error ?? "Failed");
      }
    });
  };

  const removeSize = (size: string) => {
    startTransition(async () => {
      const result = await deleteSizeOptionAction(variationId, size);
      if (result.success) {
        router.refresh();
        setSizes((prev) => prev.filter((s) => s.size !== size));
        showMessage("ok", "Size removed.");
      } else {
        showMessage("err", result.error ?? "Failed");
      }
    });
  };

  const toggleSizeStock = (size: string, inStock: boolean) => {
    startTransition(async () => {
      const result = await upsertSizeOptionAction(variationId, size, !inStock);
      if (result.success) {
        router.refresh();
        setSizes((prev) => prev.map((s) => (s.size === size ? { ...s, in_stock: !inStock } : s)));
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {message && (
        <p
          className={`text-sm py-2 px-3 rounded ${message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {message.text}
        </p>
      )}

      {/* Square vs Big description */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Descriptions</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Square description</label>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border min-h-[80px]">
              {squareDescription || "(None from Square)"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Big product description</label>
            <p className="text-xs text-gray-500 mb-1">Shown on the product detail page. Overrides Square when set.</p>
            <textarea
              value={bigDesc}
              onChange={(e) => setBigDesc(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm min-h-[120px]"
              placeholder="Long description for storefront..."
              disabled={pending}
            />
            <button
              type="button"
              onClick={saveBigDescription}
              disabled={pending}
              className="mt-2 px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Save big description
            </button>
          </div>
        </div>
      </section>

      {/* Square photo vs Big item photo (carousel) */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Square photo</label>
            <div className="w-40 h-40 bg-gray-100 rounded border overflow-hidden relative">
              {squareImageUrl ? (
                <Image src={squareImageUrl} alt="" fill className="object-contain" sizes="160px" unoptimized />
              ) : (
                <span className="text-xs text-gray-400 flex items-center justify-center w-full h-full">No image from Square</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Big item photo / Carousel</label>
            <p className="text-xs text-gray-500 mb-2">Images shown on the product detail page. Add URL or upload from your computer, then Save.</p>
            <ul className="space-y-2 mb-3">
              {carouselList.map((url, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative flex-shrink-0">
                    <Image src={url.startsWith("http") ? url : url.startsWith("/") ? url : `/${url}`} alt="" fill className="object-cover" sizes="48px" unoptimized />
                  </div>
                  <span className="flex-1 truncate text-sm">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeCarouselUrl(i)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 flex-wrap">
              <input
                type="url"
                placeholder="https://... or /media/..."
                value={newCarouselUrl}
                onChange={(e) => setNewCarouselUrl(e.target.value)}
                className="flex-1 min-w-0 text-sm rounded border border-gray-300 px-2 py-1"
              />
              <button type="button" onClick={addCarouselUrl} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Add URL
              </button>
              <label className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                Upload from computer
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadCarousel}
                />
              </label>
              <button
                type="button"
                onClick={saveCarousel}
                disabled={pending}
                className="px-2 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Save carousel
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Price */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Price</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-600">Square price: {formatMoney(priceCents, currency)}</span>
          <div className="flex items-center gap-2">
            <label className="text-sm">Override (storefront):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Leave empty to use Square"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={savePriceOverride}
              disabled={pending}
              className="px-2 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Save price
            </button>
          </div>
        </div>
      </section>

      {/* Catalogue page */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Catalogue page</h2>
        <p className="text-sm text-gray-600 mb-2">Which tab this product appears on: Ice cream, Merch, or Gift card.</p>
        <div className="flex items-center gap-2">
          <select
            value={pageValue}
            onChange={(e) => setPageValue(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Use Square default</option>
            {pageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={savePage}
            disabled={pending}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Save page
          </button>
        </div>
      </section>

      {/* Flavors (multi-pint only) */}
      {isMultiPint && (
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Flavors (Pick 4 / Pick 6)</h2>
          <p className="text-sm text-gray-600 mb-3">These flavors appear in the dropdown for this product. Remove any you don’t want; add more from the list below.</p>
          <ul className="space-y-2 mb-4">
            {flavors.map((name) => (
              <li key={name} className="flex items-center gap-4 flex-wrap">
                <span className="font-medium">{name}</span>
                <button
                  type="button"
                  onClick={() => removeFlavor(name)}
                  disabled={pending}
                  className="text-red-600 text-sm hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {flavors.length === 0 && (
            <p className="text-sm text-gray-500 mb-3">No flavors on this product yet. Add one below.</p>
          )}
          <form onSubmit={addFlavorSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text"
                placeholder="Type flavor name, then click Add flavor"
                value={typedFlavorName}
                onChange={(e) => setTypedFlavorName(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm min-w-[220px]"
              />
              <button
                type="submit"
                disabled={pending || !canAddFlavor}
                className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Add flavor
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Sizes (tees only) */}
      {isTee && (
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Shirt sizes</h2>
          <p className="text-sm text-gray-600 mb-3">Sizes for this product. Toggle in stock; add or remove.</p>
          <ul className="space-y-2 mb-4">
            {sizes.map((s) => (
              <li key={s.size} className="flex items-center gap-4">
                <span className="font-medium">{s.size}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={s.in_stock}
                    onChange={() => toggleSizeStock(s.size, s.in_stock)}
                    disabled={pending}
                    className="rounded"
                  />
                  In stock
                </label>
                <button
                  type="button"
                  onClick={() => removeSize(s.size)}
                  disabled={pending}
                  className="text-red-600 text-sm hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New size (e.g. XL)"
              value={newSizeName}
              onChange={(e) => setNewSizeName(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm w-32"
            />
            <button type="button" onClick={addSize} disabled={pending} className="px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
              Add size
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
