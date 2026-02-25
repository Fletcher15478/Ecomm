"use client";

import { useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createProductAction,
  type CreateProductResult,
} from "@/app/api/admin/catalog/actions";

export function CreateProductForm() {
  const [state, setState] = useState<CreateProductResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();
  const squarePhotoUrlRef = useRef<HTMLInputElement>(null);
  const carouselUrlsRef = useRef<HTMLTextAreaElement>(null);

  async function handleSquarePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setUploadError("Upload not available. Restart the dev server (npm run dev) and try again.");
        } else {
          setUploadError(data.error ?? `Upload failed (${res.status})`);
        }
        return;
      }
      if (data.url && squarePhotoUrlRef.current) {
        squarePhotoUrlRef.current.value = data.url;
      } else {
        setUploadError(data.error ?? "Upload failed");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleCarouselUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setUploadError("Upload not available. Restart the dev server (npm run dev) and try again.");
        } else {
          setUploadError(data.error ?? `Upload failed (${res.status})`);
        }
        return;
      }
      if (data.url && carouselUrlsRef.current) {
        const ta = carouselUrlsRef.current;
        const current = ta.value.trim();
        ta.value = current ? `${current}\n${data.url}` : data.url;
      } else {
        setUploadError(data.error ?? "Upload failed");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setState(null);
    setUploadError(null);
    startTransition(async () => {
      const result = await createProductAction(formData);
      setState(result);
      if (result.success) {
        form.reset();
        router.push("/admin/products");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-white rounded-lg border border-gray-200 max-w-2xl shadow-sm"
    >
      <h2 className="text-xl font-semibold mb-2">New item</h2>
      <p className="text-amber-800 bg-amber-100 border border-amber-300 rounded px-3 py-2 text-sm mb-6">
        This will add the item to your Square catalog. It will appear in the products list and on your storefront.
      </p>

      {uploadError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{uploadError}</p>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Mint Chip Pint"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Price (USD)</span>
          <input
            type="number"
            name="price"
            required
            min="0"
            step="0.01"
            placeholder="12.00"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 max-w-[120px]"
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Square photo</span>
          <span className="text-xs text-gray-500 ml-1">(URL or upload from computer)</span>
          <input
            ref={squarePhotoUrlRef}
            type="text"
            name="squarePhotoUrl"
            placeholder="https://... or upload below"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            disabled={isPending}
          />
          <label className="mt-1 inline-flex items-center gap-2 text-sm">
            <span className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
              {uploading ? "Uploading…" : "Upload from computer"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isPending || uploading}
              onChange={handleSquarePhotoUpload}
            />
          </label>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Carousel</span>
          <span className="text-xs text-gray-500 ml-1">(one image URL per line, or upload from computer)</span>
          <textarea
            ref={carouselUrlsRef}
            name="carouselUrls"
            rows={3}
            placeholder={"Paste URLs or upload images below"}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
            disabled={isPending}
          />
          <label className="mt-1 inline-flex items-center gap-2 text-sm">
            <span className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
              {uploading ? "Uploading…" : "Upload image from computer"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isPending || uploading}
              onChange={handleCarouselUpload}
            />
          </label>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Square description</span>
          <span className="text-xs text-gray-500 ml-1">(short description on catalogue page)</span>
          <input
            type="text"
            name="squareDescription"
            placeholder="Brief description for the product grid"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Big description</span>
          <span className="text-xs text-gray-500 ml-1">(full description on product detail page)</span>
          <textarea
            name="bigDescription"
            rows={4}
            placeholder="Full product description..."
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Show as</span>
          <select
            name="productType"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 max-w-[200px]"
            disabled={isPending}
          >
            <option value="ice_cream">Ice cream</option>
            <option value="merchandise">Merchandise</option>
            <option value="gift_card">Gift card</option>
          </select>
        </label>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create item"}
        </button>
      </div>

      {state?.success === false && (
        <p className="mt-3 text-sm text-red-600">{state.error}</p>
      )}
      {state?.success === true && (
        <p className="mt-3 text-sm text-green-600">Item created and added to Square. Redirecting to products…</p>
      )}
    </form>
  );
}
