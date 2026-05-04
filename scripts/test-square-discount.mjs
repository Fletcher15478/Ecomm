/**
 * Smoke-test Square discounts + calculateOrder (reads .env.local, no secrets printed).
 * Usage: node scripts/test-square-discount.mjs [OPTIONAL_CODE]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function loadDotEnvLocal() {
  if (!existsSync(envPath)) {
    console.log("No .env.local — set SQUARE_ACCESS_TOKEN and NEXT_PUBLIC_SQUARE_LOCATION_ID to test.");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnvLocal();

const requestedCode = process.argv[2] ?? "";

const { Client, Environment } = await import("square");

const token = process.env.SQUARE_ACCESS_TOKEN;
const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

if (!token || !locationId) {
  console.log("Missing SQUARE_ACCESS_TOKEN or NEXT_PUBLIC_SQUARE_LOCATION_ID in .env.local");
  process.exit(1);
}

const envFlag = process.env.SQUARE_ENVIRONMENT;
const environment =
  envFlag === "production" ? Environment.Production : Environment.Sandbox;

const client = new Client({ accessToken: token, environment });

function presentAtLocation(obj, lid) {
  if (obj.isDeleted) return false;
  const absent = obj.absentAtLocationIds ?? [];
  if (absent.includes(lid)) return false;
  if (obj.presentAtAllLocations === false) {
    return (obj.presentAtLocationIds ?? []).includes(lid);
  }
  return true;
}

const SUPPORTED = new Set(["FIXED_PERCENTAGE", "FIXED_AMOUNT"]);

function norm(s) {
  return String(s).trim().toUpperCase().replace(/\s+/g, " ");
}

async function listDiscounts() {
  const out = [];
  let cursor;
  do {
    const response = await client.catalogApi.listCatalog(cursor, "DISCOUNT");
    const objects = response.result.objects ?? [];
    for (const o of objects) {
      if (o.type !== "DISCOUNT" || !o.id || o.isDeleted) continue;
      if (!presentAtLocation(o, locationId)) continue;
      const dd = o.discountData;
      if (!dd?.name?.trim()) continue;
      if (dd.pinRequired) continue;
      if (dd.discountType && !SUPPORTED.has(dd.discountType)) continue;
      out.push({
        id: o.id,
        name: dd.name.trim(),
        version: o.version,
        discountType: dd.discountType,
      });
    }
    cursor = response.result.cursor ?? undefined;
  } while (cursor);
  return out;
}

async function firstLineItemVariation() {
  let cursor;
  do {
    const response = await client.catalogApi.listCatalog(cursor, "ITEM");
    const objects = response.result.objects ?? [];
    for (const obj of objects) {
      if (obj.type !== "ITEM" || !obj.itemData?.variations) continue;
      for (const v of obj.itemData.variations) {
        if (v.type !== "ITEM_VARIATION" || !v.id) continue;
        const price = v.itemVariationData?.priceMoney;
        if (!price?.amount) continue;
        return {
          variationId: v.id,
          name: obj.itemData.name ?? "Item",
          amount: BigInt(price.amount),
          currency: price.currency ?? "USD",
        };
      }
    }
    cursor = response.result.cursor ?? undefined;
  } while (cursor);
  return null;
}

try {
  const discounts = await listDiscounts();
  console.log(
    `Location ${locationId}: ${discounts.length} eligible catalog discount(s) for online preview`
  );
  if (process.env.VERBOSE_LIST_DISCOUNTS === "1") {
    for (const d of discounts) {
      console.log(`  - "${d.name}" (${d.discountType})`);
    }
  } else {
    console.log("(Set VERBOSE_LIST_DISCOUNTS=1 to print every catalog discount name.)");
  }

  if (requestedCode) {
    const n = norm(requestedCode);
    const match = discounts.find((d) => norm(d.name) === n);
    if (!match) {
      console.log(
        `\nCode "${requestedCode}" did not match any eligible discount name (case-insensitive).`
      );
      process.exit(2);
    }
    console.log(`\nCode "${requestedCode}" matches catalog discount "${match.name}".`);
  }

  const line = await firstLineItemVariation();
  if (!line) {
    console.log("\nNo priced catalog variation found — skipped calculateOrder.");
    process.exit(0);
  }

  const draft = {
    locationId,
    lineItems: [
      {
        uid: "test-line-0",
        name: line.name,
        quantity: "1",
        catalogObjectId: line.variationId,
        basePriceMoney: {
          amount: line.amount,
          currency: line.currency,
        },
      },
    ],
    serviceCharges: [
      {
        uid: "shipping",
        name: "Shipping",
        amountMoney: { amount: BigInt(2500), currency: line.currency },
        calculationPhase: "SUBTOTAL_PHASE",
      },
    ],
  };

  if (requestedCode) {
    const n = norm(requestedCode);
    const match = discounts.find((d) => norm(d.name) === n);
    if (match) {
      draft.discounts = [
        {
          uid: "discount-test",
          name: match.name,
          catalogObjectId: match.id,
          ...(match.version !== undefined && match.version !== null
            ? { catalogVersion: BigInt(match.version) }
            : {}),
          scope: "ORDER",
        },
      ];
    }
  }

  const calc = await client.ordersApi.calculateOrder({ order: draft });
  const errs = calc.result.errors ?? [];
  if (errs.length) {
    console.log("\ncalculateOrder errors:", errs.map((e) => e.detail).join("; "));
    process.exit(3);
  }
  const ord = calc.result.order;
  const total = ord?.totalMoney;
  const disc = ord?.totalDiscountMoney;
  console.log("\ncalculateOrder (1 test line + $25 shipping):"),
    console.log(
      `  total_cents=${total?.amount ?? "?"} discount_cents=${disc?.amount ?? "0"} currency=${total?.currency ?? line.currency}`
    );
  console.log("Square discount path OK.");
} catch (e) {
  console.error("Test failed:", e?.message ?? e);
  process.exit(4);
}
