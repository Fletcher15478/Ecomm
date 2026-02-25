import { Client, Environment } from "square";
import type { CartLineItem } from "@/types";
import { isMerchProduct } from "@/lib/productContent";
import { createReadStream } from "fs";
import path from "path";
import { FileWrapper } from "square";

const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const environment =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? Environment.Production
    : Environment.Sandbox;

/**
 * Server-only Square client. Never use on the client; never expose SQUARE_ACCESS_TOKEN.
 * Returns null if SQUARE_ACCESS_TOKEN is not set (e.g. at build time).
 */
export function getSquareClient(): Client | null {
  if (!accessToken) return null;
  return new Client({
    accessToken,
    environment,
  });
}

export const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

if (!SQUARE_LOCATION_ID && process.env.NODE_ENV === "production") {
  console.warn("NEXT_PUBLIC_SQUARE_LOCATION_ID is not set");
}

/** Product tab category. Set in Square via custom attribute "product_type" (ice_cream, merchandise, gift_card). */
export type ProductType = "ice_cream" | "merchandise" | "gift_card";

/** Catalog item/variation with pricing; optional custom attributes is_frozen, product_type. */
export interface CatalogItemForCart {
  id: string;
  name: string;
  description?: string | null;
  variationId: string;
  priceMoney: { amount: bigint; currency: string };
  isFrozen: boolean;
  productType: ProductType;
}

const FROZEN_ATTR_KEY = "is_frozen";
const PRODUCT_TYPE_ATTR_KEY = "product_type";
const PRODUCT_TYPES: ProductType[] = ["ice_cream", "merchandise", "gift_card"];
function parseProductType(value: string | undefined): ProductType {
  if (!value) return "ice_cream";
  const v = value.toLowerCase().replace(/-/g, "_");
  return PRODUCT_TYPES.includes(v as ProductType) ? (v as ProductType) : "ice_cream";
}

/**
 * Fetch catalog (items with variations and pricing) for the configured location.
 * Used by storefront and by server validation.
 * Returns [] if Square is not configured (e.g. at build time).
 */
export async function listCatalogItems(): Promise<CatalogItemForCart[]> {
  const client = getSquareClient();
  if (!client) return [];

  const list: CatalogItemForCart[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.catalogApi.listCatalog(undefined, cursor);
    const objects = response.result.objects ?? [];

    for (const obj of objects) {
      if (obj.type !== "ITEM" || !obj.itemData?.variations) continue;

      const itemName = obj.itemData.name ?? "Unnamed";
      const description =
        (obj.itemData as { description?: string; descriptionPlaintext?: string }).description?.trim() ||
        (obj.itemData as { description?: string; descriptionPlaintext?: string }).descriptionPlaintext?.trim() ||
        null;
      const customAttrs = "customAttributeValues" in obj ? (obj as { customAttributeValues?: Record<string, { stringValue?: string }> }).customAttributeValues : undefined;
      const isFrozen = customAttrs?.[FROZEN_ATTR_KEY]?.stringValue?.toLowerCase() === "true";
      const productType = parseProductType(customAttrs?.[PRODUCT_TYPE_ATTR_KEY]?.stringValue);

      for (const v of obj.itemData.variations) {
        if (v.type !== "ITEM_VARIATION" || !v.id) continue;
        const price = v.itemVariationData?.priceMoney;
        if (!price?.amount) continue;

        list.push({
          id: obj.id ?? "",
          name: itemName,
          description: description || undefined,
          variationId: v.id,
          priceMoney: {
            amount: BigInt(price.amount),
            currency: price.currency ?? "USD",
          },
          isFrozen,
          productType,
        });
      }
    }

    cursor = response.result.cursor ?? undefined;
  } while (cursor);

  return list;
}

/**
 * Fetch first image URL per catalog item id (for product grid). Batch retrieves with related objects.
 * Checks both item-level and variation-level imageIds (Square can attach images to either).
 */
export async function getCatalogItemImageUrls(
  itemIds: string[]
): Promise<Map<string, string>> {
  const client = getSquareClient();
  if (!client || itemIds.length === 0) return new Map();
  const unique = [...new Set(itemIds)];
  const map = new Map<string, string>();
  const BATCH_SIZE = 100;
  try {
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      const response = await client.catalogApi.batchRetrieveCatalogObjects({
        objectIds: batch,
        includeRelatedObjects: true,
      });
      const related = response.result.relatedObjects ?? [];
      const imageUrlByImageId = new Map<string, string>();
      for (const obj of related) {
        if (obj.type === "IMAGE" && obj.id && obj.imageData?.url)
          imageUrlByImageId.set(obj.id, obj.imageData.url);
      }
      const objects = response.result.objects ?? [];
      for (const obj of objects) {
        if (obj.type !== "ITEM" || !obj.id) continue;
        const itemId = obj.id;
        let imageIds: string[] = obj.itemData?.imageIds ?? [];
        if (imageIds.length === 0 && obj.itemData?.variations) {
          for (const v of obj.itemData.variations) {
            if (v.type === "ITEM_VARIATION" && v.itemVariationData?.imageIds?.length) {
              imageIds = v.itemVariationData.imageIds;
              break;
            }
          }
        }
        const first = imageIds.map((id) => imageUrlByImageId.get(id)).find(Boolean);
        if (first) map.set(itemId, first);
      }
    }
  } catch (e) {
    console.error("getCatalogItemImageUrls error:", e);
  }
  return map;
}

/** Full catalog item for product detail page (name, description, price, image URLs). */
export interface CatalogItemDetail {
  id: string;
  name: string;
  description: string | null;
  variationId: string;
  priceCents: number;
  currency: string;
  isFrozen: boolean;
  imageUrls: string[];
}

/**
 * Fetch a single catalog item by id with related objects (e.g. images).
 * Returns null if not found or Square not configured.
 */
export async function getCatalogItemDetail(
  itemId: string
): Promise<CatalogItemDetail | null> {
  const client = getSquareClient();
  if (!client) return null;

  try {
    const response = await client.catalogApi.batchRetrieveCatalogObjects({
      objectIds: [itemId],
      includeRelatedObjects: true,
    });
    const objects = response.result.objects ?? [];
    const related = response.result.relatedObjects ?? [];
    const itemObj = objects.find((o) => o.type === "ITEM" && o.id === itemId);
    if (!itemObj?.itemData?.variations?.length) return null;

    const firstVariation = itemObj.itemData.variations.find(
      (v) => v.type === "ITEM_VARIATION" && v.itemVariationData?.priceMoney?.amount
    );
    if (!firstVariation?.id || !firstVariation.itemVariationData?.priceMoney)
      return null;

    const customAttrs =
      "customAttributeValues" in itemObj
        ? (itemObj as { customAttributeValues?: Record<string, { stringValue?: string }> })
            .customAttributeValues
        : undefined;
    const isFrozen =
      customAttrs?.[FROZEN_ATTR_KEY]?.stringValue?.toLowerCase() === "true";

    const imageIds =
      itemObj.itemData.imageIds ?? firstVariation.itemVariationData?.imageIds ?? [];
    const imageMap = new Map<string, string>();
    for (const obj of related) {
      if (obj.type === "IMAGE" && obj.id && obj.imageData?.url) {
        imageMap.set(obj.id, obj.imageData.url);
      }
    }
    const imageUrls = imageIds
      .map((id) => imageMap.get(id))
      .filter((u): u is string => Boolean(u));

    const price = firstVariation.itemVariationData.priceMoney;

    return {
      id: itemObj.id ?? itemId,
      name: itemObj.itemData.name ?? "Unnamed",
      description:
        itemObj.itemData.description?.trim() ||
        itemObj.itemData.descriptionPlaintext?.trim() ||
        null,
      variationId: firstVariation.id,
      priceCents: Number(price.amount),
      currency: price.currency ?? "USD",
      isFrozen,
      imageUrls,
    };
  } catch {
    return null;
  }
}

/**
 * Validate client cart against Square catalog and return server-authoritative line items.
 * Use for checkout: never trust client totals.
 */
export function validateCart(
  catalogItems: CatalogItemForCart[],
  cartInput: Array<{ catalogObjectId: string; quantity: number; variationId?: string }>
): { valid: true; lines: CartLineItem[] } | { valid: false; error: string } {
  const lines: CartLineItem[] = [];
  const byVariation = new Map<string, CatalogItemForCart>();
  for (const item of catalogItems) {
    byVariation.set(item.variationId, item);
    byVariation.set(item.id, item); // some clients may send catalog item id
  }

  for (const input of cartInput) {
    const qty = Math.floor(Number(input.quantity));
    if (qty < 1) continue;

    const variationId = input.variationId ?? input.catalogObjectId;
    const catalogItem = byVariation.get(variationId) ?? byVariation.get(input.catalogObjectId);
    if (!catalogItem) {
      return { valid: false, error: `Invalid or unavailable item: ${input.catalogObjectId}` };
    }

    lines.push({
      catalogObjectId: catalogItem.id,
      variationId: catalogItem.variationId,
      name: catalogItem.name,
      quantity: qty,
      basePriceMoney: catalogItem.priceMoney,
      isFrozen: catalogItem.isFrozen,
      isMerch: isMerchProduct(catalogItem.name),
    });
  }

  if (lines.length === 0) {
    return { valid: false, error: "Cart is empty" };
  }

  return { valid: true, lines };
}

/** Input to create a new catalog item at the configured location only. */
export interface CreateCatalogItemInput {
  name: string;
  priceCents: number;
  currency?: string;
  isFrozen?: boolean;
  /** Short description (e.g. for Square / catalogue listing). */
  description?: string | null;
  /** Product type for catalogue tab (ice_cream, merchandise, gift_card). */
  productType?: ProductType;
  /** Square catalog image ID from CreateCatalogImage (optional). */
  imageId?: string | null;
}

/**
 * Step 1: Upload an image file to Square Catalog (CreateCatalogImage).
 * Returns the Square image ID to use in itemData.imageIds when creating the item.
 */
export async function uploadCatalogImageToSquare(
  filePath: string
): Promise<{ success: true; imageId: string } | { success: false; error: string }> {
  const client = getSquareClient();
  if (!client) {
    return { success: false, error: "Square is not configured" };
  }
  try {
    const request = {
      idempotencyKey: crypto.randomUUID(),
      image: {
        type: "IMAGE" as const,
        id: `#img-${crypto.randomUUID()}`,
        imageData: {
          name: path.basename(filePath),
        },
      },
    };
    const readStream = createReadStream(filePath);
    const imageFile = new FileWrapper(readStream);
    const response = await client.catalogApi.createCatalogImage(request, imageFile);
    const imageId = response.result.image?.id;
    if (!imageId) {
      const errMsg = response.result.errors?.[0]?.detail ?? "Square did not return an image ID";
      return { success: false, error: errMsg };
    }
    return { success: true, imageId };
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Upload failed";
    return { success: false, error: message };
  }
}

/**
 * Create a catalog item in Square with one variation (price) and make it available
 * only at the configured SQUARE_LOCATION_ID. Returns the new item id and variation id.
 */
export async function createCatalogItem(
  input: CreateCatalogItemInput
): Promise<
  | { success: true; itemId: string; variationId: string }
  | { success: false; error: string }
> {
  const client = getSquareClient();
  const locationId = SQUARE_LOCATION_ID;
  if (!client || !locationId) {
    return { success: false, error: "Square is not configured" };
  }

  const itemTempId = `#item-${crypto.randomUUID()}`;
  const varTempId = `#var-${crypto.randomUUID()}`;
  const currency = input.currency ?? "USD";

  // Do not send custom_attribute_values unless you have created the corresponding
  // Custom Attribute Definitions in Square (Dashboard or API). Otherwise upsert returns 404 NOT_FOUND.
  // We store product_type and is_frozen in our DB (store_product_settings) for the storefront.

  try {
    const response = await client.catalogApi.upsertCatalogObject({
      idempotencyKey: crypto.randomUUID(),
      object: {
        type: "ITEM",
        id: itemTempId,
        presentAtAllLocations: false,
        presentAtLocationIds: [locationId],
        itemData: {
          name: input.name.trim() || "Unnamed",
          ...(input.description?.trim() && {
            description: input.description.trim(),
          }),
          ...(input.imageId && { imageIds: [input.imageId] }),
          variations: [
            {
              type: "ITEM_VARIATION",
              id: varTempId,
              presentAtAllLocations: false,
              presentAtLocationIds: [locationId],
              itemVariationData: {
                itemId: itemTempId,
                name: "Default",
                pricingType: "FIXED_PRICING",
                priceMoney: {
                  amount: BigInt(Math.round(input.priceCents)),
                  currency,
                },
              },
            },
          ],
        },
      },
    });

    const catalogObject = response.result.catalogObject;
    const mapping = response.result.idMappings ?? [];
    const itemId =
      catalogObject?.id ??
      mapping.find((m) => m.clientObjectId === itemTempId)?.objectId;
    const variationId =
      mapping.find((m) => m.clientObjectId === varTempId)?.objectId ??
      catalogObject?.itemData?.variations?.[0]?.id;

    if (!itemId || !variationId) {
      return {
        success: false,
        error: "Square did not return the new item or variation id",
      };
    }
    return { success: true, itemId, variationId };
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Delete a catalog item and its default variation from Square.
 */
export async function deleteCatalogItem(
  itemId: string,
  variationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const client = getSquareClient();
  if (!client) {
    return { success: false, error: "Square is not configured" };
  }
  try {
    await client.catalogApi.batchDeleteCatalogObjects({
      objectIds: [itemId, variationId],
    });
    return { success: true };
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Delete failed";
    return { success: false, error: message };
  }
}
