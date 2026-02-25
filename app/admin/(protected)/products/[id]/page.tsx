import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminCatalogItemById } from "@/app/api/admin/catalog/actions";
import { getCatalogItemDetail } from "@/lib/square";
import { getCarouselImages, getProductDescription, getTeeSizes, getPintCount } from "@/lib/productContent";
import { getFlavorOptions } from "@/lib/flavorOptions";
import { getSizeOptionsForVariation } from "@/lib/productSizeOptions";
import { ensureSizeOptionsForTee } from "@/lib/productSizeOptions";
import { getCarouselOverride } from "@/lib/productCarouselOverrides";
import { ProductEditClient } from "./ProductEditClient";
import {
  getProductFlavorNames,
  ensureProductFlavors,
} from "@/lib/productFlavorOptions";

export const dynamic = "force-dynamic";

const PAGE_OPTIONS = [
  { value: "ice_cream", label: "Ice cream" },
  { value: "merchandise", label: "Merch" },
  { value: "gift_card", label: "Gift card" },
] as const;

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: catalogItemId } = await params;
  const item = await getAdminCatalogItemById(catalogItemId);
  if (!item) notFound();

  const squareDetail = await getCatalogItemDetail(catalogItemId);
  const squareDescription = squareDetail?.description ?? null;
  const squareImageUrl = squareDetail?.imageUrls?.[0] ?? null;

  const defaultBigDescription = getProductDescription(item.name);
  const bigDescription = item.longDescriptionOverride ?? defaultBigDescription ?? "";

  const carouselOverride = await getCarouselOverride(catalogItemId);
  const defaultCarousel = getCarouselImages(item.name);
  const carouselUrls = carouselOverride ?? defaultCarousel;

  const pintCount = getPintCount(item.name);
  const teeSizes = getTeeSizes(item.name);
  // Per-product flavors: seed from global list if none saved yet
  if (pintCount > 0) {
    const allFlavorOptions = await getFlavorOptions();
    if (allFlavorOptions.length > 0) {
      await ensureProductFlavors(
        catalogItemId,
        allFlavorOptions.map((f) => f.name)
      );
    }
  }
  const productFlavorNames = pintCount > 0 ? await getProductFlavorNames(catalogItemId) : [];
  await ensureSizeOptionsForTee(item.variationId, teeSizes ?? []);
  const sizeOptions = teeSizes ? await getSizeOptionsForVariation(item.variationId) : [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/products" className="text-gray-600 hover:text-gray-900">
          ← Products
        </Link>
        <span className="text-gray-400">|</span>
        <Link
          href={`/products/${catalogItemId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 hover:underline"
        >
          View on store
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">Edit: {item.name}</h1>
      <p className="text-gray-600 text-sm mb-6">
        Click on this item to edit descriptions, photos, price, flavors, sizes, and which catalogue page it appears on.
      </p>
      <ProductEditClient
        catalogItemId={catalogItemId}
        variationId={item.variationId}
        name={item.name}
        squareDescription={squareDescription}
        squareImageUrl={squareImageUrl}
        bigDescription={bigDescription}
        carouselUrls={carouselUrls}
        priceCents={item.priceCents}
        priceOverrideCents={item.priceOverrideCents}
        currency={item.currency}
        productTypeOverride={item.productTypeOverride}
        pageOptions={PAGE_OPTIONS}
        productFlavorNames={productFlavorNames}
        sizeOptions={sizeOptions}
        isMultiPint={pintCount > 0}
        isTee={teeSizes != null}
      />
    </div>
  );
}
