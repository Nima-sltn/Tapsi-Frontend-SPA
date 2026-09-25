#!/usr/bin/env node
/**
 * Image optimisation pipeline.
 *
 * Generates resized/re-encoded derivatives next to the originals so the page
 * never downloads a multi-megabyte asset. Originals are left untouched.
 *
 * Usage: npm run optimize:images
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "assets", "images");

/** @type {{ in: string, out: string, width?: number, format: "webp"|"jpeg"|"png" }[]} */
const JOBS = [
  // hero banner (LCP asset)
  { in: "banner.webp", out: "banner-opt.webp", width: 1440, format: "webp" },
  // carousel artwork
  { in: "travell.png", out: "travel-1.webp", width: 640, format: "webp" },
  { in: "travell.png", out: "travel-1.jpg", width: 640, format: "jpeg" },
  { in: "travell-2.jpg", out: "travel-2.webp", width: 640, format: "webp" },
  { in: "travell-2.jpg", out: "travel-2.jpg", width: 640, format: "jpeg" },
  { in: "travell-3.jpg", out: "travel-3.webp", width: 640, format: "webp" },
  { in: "travell-3.jpg", out: "travel-3.jpg", width: 640, format: "jpeg" },
  { in: "travell-4.jpg", out: "travel-4.webp", width: 640, format: "webp" },
  { in: "travell-4.jpg", out: "travel-4.jpg", width: 640, format: "jpeg" },
  // below-the-fold illustrations
  { in: "map.png", out: "map-opt.webp", width: 900, format: "webp" },
  { in: "map.png", out: "map-opt.jpg", width: 900, format: "jpeg" },
  { in: "i-mac-1.png", out: "imac-opt.webp", width: 640, format: "webp" },
  { in: "i-mac-1.png", out: "imac-opt.jpg", width: 640, format: "jpeg" },
  { in: "mockup-phone.webp", out: "mockup-phone-opt.webp", width: 700, format: "webp" },
];

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** PWA icon sizes rendered from the SVG favicon. */
const ICONS = [
  { out: "icon-192.png", size: 192, pad: 0 },
  { out: "icon-512.png", size: 512, pad: 0 },
  // Maskable icons need ~20% safe-zone padding around the artwork.
  { out: "icon-512-maskable.png", size: 512, pad: 0.2 }
];

/** Renders the SVG favicon into PNG app icons. */
async function buildIcons() {
  const source = path.join(dir, "favicon.svg");

  for (const icon of ICONS) {
    const inner = Math.round(icon.size * (1 - icon.pad * 2));
    const artwork = await sharp(source, { density: 300 }).resize(inner, inner).png().toBuffer();

    const image = icon.pad
      ? await sharp({
          create: {
            width: icon.size,
            height: icon.size,
            channels: 4,
            background: "#ff5722"
          }
        })
          .composite([{ input: artwork, gravity: "centre" }])
          .png()
          .toBuffer()
      : artwork;

    await fs.writeFile(path.join(dir, icon.out), image);
    console.log(`favicon.svg -> ${icon.out}`.padEnd(40), `${icon.size}x${icon.size}`, kb(image.length));
  }
}

async function run() {
  let saved = 0;

  for (const job of JOBS) {
    const src = path.join(dir, job.in);
    const dest = path.join(dir, job.out);

    let before;
    try {
      before = (await fs.stat(src)).size;
    } catch {
      console.warn(`skip  ${job.in} (missing)`);
      continue;
    }

    const pipeline = sharp(src).rotate();
    if (job.width) pipeline.resize({ width: job.width, withoutEnlargement: true });

    if (job.format === "webp") await pipeline.webp({ quality: 80, effort: 5 }).toFile(dest);
    else if (job.format === "jpeg") await pipeline.jpeg({ quality: 80, mozjpeg: true }).toFile(dest);
    else await pipeline.png({ compressionLevel: 9 }).toFile(dest);

    const after = (await fs.stat(dest)).size;
    saved += Math.max(0, before - after);
    console.log(
      `${job.in} -> ${job.out}`.padEnd(40),
      `${kb(before)} => ${kb(after)}`,
      after < before ? `(-${kb(before - after)})` : ""
    );
  }

  await buildIcons();

  console.log(`\nTotal bytes avoided on page load: ${kb(saved)}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
