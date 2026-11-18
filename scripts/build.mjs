#!/usr/bin/env node
/**
 * TypeScript build: compiles every .ts under src/ into the deployable dist/ tree.
 *
 *   npm run build        → clean dist/ + tsc
 *   npm run typecheck    → tsc --noEmit (no files written)
 *
 * The `dist/` directory is generated output (gitignored) — edit `src/`, never
 * `dist/`. Cleaning first guarantees the shipped tree can never contain a
 * stale module from a renamed/deleted source file (the service worker
 * precaches every path in there, so a leftover would ship forever).
 */
import { rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Locate tsc entry point (pure JS CLI entry in typescript package)
let tscPath = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");
if (!existsSync(tscPath)) {
  const binTsc = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
  if (existsSync(binTsc)) {
    tscPath = binTsc;
  }
}

rmSync(path.join(ROOT, "dist"), { recursive: true, force: true });
rmSync(path.join(ROOT, "js"), { recursive: true, force: true });

console.log("[build] Compiling TypeScript modules to dist/...");

const isDirectJs = tscPath.endsWith("tsc") || tscPath.endsWith("tsc.js");
const result = isDirectJs
  ? spawnSync(process.execPath, [tscPath, "-p", path.join(ROOT, "tsconfig.json")], {
      stdio: "inherit",
      cwd: ROOT
    })
  : spawnSync(tscPath, ["-p", path.join(ROOT, "tsconfig.json")], {
      stdio: "inherit",
      cwd: ROOT
    });

if (result.error) {
  console.error("[build] Failed to launch TypeScript compiler:", result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[build] Compilation failed with exit code ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log("[build] Build complete: dist/ generated successfully.");
