#!/usr/bin/env node
/**
 * Static site audit — a dependency-free QA gate.
 *
 * Checks, for every page at the project root:
 *   1. every local asset reference (src/href/srcset/`<use>`) resolves to a file
 *   2. every in-page `#fragment` link points at an existing id
 *   3. every `<img>` carries an `alt` attribute
 *   4. every `aria-controls` / `data-tab-target` points at an existing id
 *   5. no render-blocking third-party CDN dependency sneaks back in
 *   6. CSS never references assets with a root-absolute path
 *
 * Usage: npm run audit        (exit code 1 when a check fails)
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index.html"];

const problems = [];
const notes = [];

/**
 * @param {boolean} condition
 * @param {string} message
 */
function check(condition, message) {
  if (!condition) problems.push(message);
}

/** @param {string} html */
function collectIds(html) {
  const ids = new Set();
  const pattern = /\bid\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html))) ids.add(match[1]);
  return ids;
}

/** @param {string} html */
function collectLocalRefs(html) {
  const refs = new Set();
  const patterns = [
    /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi,
    /\bsrcset\s*=\s*["']([^"']+)["']/gi
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html))) {
      match[1]
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean)
        .forEach((value) => refs.add(value));
    }
  });

  return refs;
}

async function fileExists(relative) {
  try {
    const stats = await fs.stat(path.join(ROOT, relative));
    return stats.isFile();
  } catch {
    return false;
  }
}

async function auditPage(page) {
  const html = await fs.readFile(path.join(ROOT, page), "utf8");
  const ids = collectIds(html);

  // 1 — local asset references.
  for (const rawRef of collectLocalRefs(html)) {
    // Strip query/fragment: `sprite.svg#icon` and `page.html#section` are fine.
    const ref = rawRef.split(/[?#]/)[0];
    if (!ref || ref.startsWith("mailto:") || ref.startsWith("tel:")) continue;
    if (rawRef.startsWith("#")) continue;

    if (/^https?:\/\//i.test(ref)) continue; // absolute URLs are checked below

    check(await fileExists(ref), `${page}: broken reference → ${rawRef}`);
  }

  // 2 — in-page fragment links.
  const fragments = [...html.matchAll(/\bhref\s*=\s*["']#([^"']+)["']/gi)].map((match) => match[1]);
  for (const fragment of fragments) {
    if (!fragment) continue;
    check(ids.has(fragment), `${page}: link "#${fragment}" has no matching id`);
  }

  // 3 — image alternatives.
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  for (const image of images) {
    check(/\balt\s*=\s*["'][^"']*["']/i.test(image), `${page}: <img> without alt → ${image.slice(0, 90)}…`);
    check(/\bwidth\s*=/i.test(image) && /\bheight\s*=/i.test(image), `${page}: <img> without width/height (CLS) → ${image.slice(0, 90)}…`);
  }

  // 4 — ARIA cross-references.
  const ariaRefs = [...html.matchAll(/\b(?:aria-controls|data-tab-target)\s*=\s*["']([^"']+)["']/gi)].map(
    (match) => match[1]
  );
  for (const ref of ariaRefs) {
    check(ids.has(ref), `${page}: aria target "#${ref}" has no matching id`);
  }

  // 5 — no third-party scripts, stylesheets or preloads.
  const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\/[^"']+["']/gi)];
  const externalStyles = [
    ...html.matchAll(/<link\b[^>]*rel\s*=\s*["'](?:stylesheet|preload|prefetch)["'][^>]*href\s*=\s*["']https?:\/\/[^"']+["']/gi),
    ...html.matchAll(/<link\b[^>]*href\s*=\s*["']https?:\/\/[^"']+["'][^>]*rel\s*=\s*["'](?:stylesheet|preload|prefetch)["']/gi)
  ];
  const externalCount = externalScripts.length + externalStyles.length;
  check(externalCount === 0, `${page}: render-blocking third-party assets found (${externalCount})`);

  // Basic document semantics.
  check(/<html[^>]*\blang\s*=/i.test(html), `${page}: <html> is missing a lang attribute`);
  check(/<main\b/i.test(html), `${page}: missing <main> landmark`);
  check(/<title>[^<]+<\/title>/i.test(html), `${page}: missing <title>`);
  check(/name\s*=\s*["']description["']/i.test(html), `${page}: missing meta description`);
  check(/<h1[\s>]/i.test(html), `${page}: missing <h1>`);

  notes.push(`${page}: ${ids.size} ids, ${images.length} images, ${fragments.length} fragment links checked`);
}

/** CSS must never rely on root-absolute asset paths. */
async function auditStyles(dir = "css") {
  const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });

  for (const entry of entries) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await auditStyles(relative);
      continue;
    }
    if (!entry.name.endsWith(".css")) continue;

    const css = await fs.readFile(path.join(ROOT, relative), "utf8");
    const absoluteRefs = [...css.matchAll(/url\(\s*["']?(\/[^"')]+)["']?\s*\)/g)].map((match) => match[1]);
    absoluteRefs.forEach((ref) => problems.push(`${relative}: root-absolute asset path → url(${ref})`));
  }
}

async function main() {
  for (const page of PAGES) await auditPage(page);
  await auditStyles();

  notes.forEach((note) => console.log(`✓ ${note}`));

  if (problems.length) {
    console.error(`\n✗ ${problems.length} problem(s) found:\n`);
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exitCode = 1;
    return;
  }

  console.log("\n✓ Audit passed: references, semantics, a11y hooks and performance guards are all green.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
