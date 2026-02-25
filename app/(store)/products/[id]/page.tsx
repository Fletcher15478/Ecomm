import { notFound } from "next/navigation";
import Link from "next/link";
import { getCatalogItemDetail } from "@/lib/square";
import { getStoreProductSettings } from "@/lib/storeProductSettings";
import { getCarouselImages, getProductDescription, isMerchProduct } from "@/lib/productContent";
import { getInStockFlavorNames } from "@/lib/flavorOptions";
import { getProductFlavorNames } from "@/lib/productFlavorOptions";
import { getInStockSizesForVariation } from "@/lib/productSizeOptions";
import { getCarouselOverride } from "@/lib/productCarouselOverrides";
import { ProductDetailClient } from "./ProductDetailClient";
import { ProductImageCarousel } from "./ProductImageCarousel";

export const revalidate = 15;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getCatalogItemDetail(id);
  if (!item) notFound();

  const settingsMap = await getStoreProductSettings();
  const setting = settingsMap.get(item.variationId);
  const isOutOfStock = setting?.is_out_of_stock ?? false;
  const priceCentsDisplay = setting?.price_override_cents != null ? setting.price_override_cents : item.priceCents;
  const descriptionOverride = setting?.long_description_override;

  const name = item.name;
  const carouselOverride = await getCarouselOverride(item.id);
  const carouselImages = carouselOverride ?? getCarouselImages(name);
  const productFlavors = await getProductFlavorNames(item.id);
  const inStockFlavors = productFlavors.length > 0 ? productFlavors : await getInStockFlavorNames();
  const inStockSizes = await getInStockSizesForVariation(item.variationId);
  const localDescription = descriptionOverride ?? getProductDescription(name);
  const displayDescription = localDescription ?? item.description ?? null;
  const isMerch = isMerchProduct(name);
  const isCollectionProduct = !!localDescription && !isMerch;
  const showCarousel = carouselImages.length > 0;

  return (
    <div data-page="product-detail" className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: white half – product info + add to cart (on mobile appears below carousel) */}
      <div className="order-2 lg:order-1 flex-1 min-h-[50vh] lg:min-h-screen bg-white flex flex-col">
        <div className="max-w-xl mx-auto w-full px-4 py-8 lg:py-12 flex-1">
            <h1
              className="text-2xl lg:text-3xl font-bold uppercase tracking-tight mb-2"
              style={{ color: "var(--millies-pink)" }}
            >
              {name}
            </h1>
            <p className="text-lg text-gray-900 mb-4">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: item.currency,
              }).format(item.priceCents / 100)}
            </p>
            {displayDescription && (
              <div
                className="product-description-box mb-6"
                style={{ fontFamily: "var(--font-program-narrow)" }}
              >
                <div className="text-gray-700 text-base sm:text-lg leading-relaxed whitespace-pre-line space-y-4">
                  {displayDescription.split(/\n\n+/).map((para, i) => {
                    const isHeading = para.includes("–") && para.length < 120;
                    return (
                      <p
                        key={i}
                        className={
                          isHeading
                            ? "font-semibold text-gray-900 text-lg sm:text-xl"
                            : "mb-0"
                        }
                      >
                        {para.trim()}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            <ProductDetailClient
              key={item.id}
              item={{
                id: item.id,
                name,
                variationId: item.variationId,
                priceCents: priceCentsDisplay,
                currency: item.currency,
                isFrozen: item.isFrozen,
                isOutOfStock,
              }}
              availableFlavors={inStockFlavors}
              availableSizes={inStockSizes.length > 0 ? inStockSizes : undefined}
            />

            {/* Shipping info */}
            <section className="product-shipping-info mt-8 pt-6 border-t border-dashed border-pink-200">
              <h2 className="product-shipping-title text-gray-900 mb-2">
                Important: When We Ship
              </h2>
              <p className="product-shipping-text text-gray-600">
                We ship all orders on Wednesdays. Cutoffs for a Wednesday delivery is Tuesday at 12pm. All orders placed after 12pm on Tuesdays will be shipped the following Wednesday.
              </p>
            </section>
            <details className="product-shipping-details mt-4 group">
              <summary className="product-shipping-summary cursor-pointer list-none flex items-center gap-2 py-1">
                <span className="product-shipping-plus transition-transform">+</span>
                <span>Where We Ship</span>
              </summary>
              <p className="product-shipping-text mt-2 pl-6 text-gray-600">
                We ship to the lower 48! Shipping is $10 to our neighbors in PA and is charged according to region outside the state.
              </p>
            </details>
            <details className="product-shipping-details mt-2 group">
              <summary className="product-shipping-summary cursor-pointer list-none flex items-center gap-2 py-1">
                <span className="product-shipping-plus transition-transform">+</span>
                <span>How We Ship</span>
              </summary>
              <p className="product-shipping-text mt-2 pl-6 text-gray-600">
                We ship via UPS, and all ice cream is shipped on dry ice to keep your ice cream nice and chilly :)
              </p>
            </details>

          <div className="mt-8">
            <Link href="/" className="text-pink-600 hover:underline font-medium">
              ← Back to products
            </Link>
          </div>
        </div>
      </div>

      {/* Right: image (carousel for ice cream, single for merch) – on mobile appears first */}
      {showCarousel && (
      <div
        className={`order-1 lg:order-2 relative flex-1 flex items-center justify-center lg:min-h-screen
          ${isCollectionProduct
            ? "min-h-[72vh] pt-4 pb-6 px-4 sm:px-6 lg:p-10"
            : "min-h-[50vh] p-6 lg:p-10"
          }`}
        style={{ backgroundColor: "#86c3ea" }}
      >
        <ProductImageCarousel imageUrls={carouselImages} prominent={isCollectionProduct} />
      </div>
      )}
    </div>
  );
}
