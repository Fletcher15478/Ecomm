/**
 * One-time script: convert Millie's logo SVG to PNG for email (Gmail doesn't show SVG).
 * Run: node scripts/convert-email-logo.mjs
 */

import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "app/uploads/millies homemade pink.svg");
const outDir = join(root, "public/uploads");
const outPath = join(outDir, "millies-homemade-pink.png");

const svg = readFileSync(svgPath);
mkdirSync(outDir, { recursive: true });

await sharp(Buffer.from(svg))
  .resize(400) // width 400, height auto
  .png()
  .toFile(outPath);

console.log("Created:", outPath);
