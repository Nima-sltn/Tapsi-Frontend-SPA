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
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TSC = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");

rmSync(path.join(ROOT, "dist"), { recursive: true, force: true });
// Remove the pre-3.x output directory if an older checkout still has it.
rmSync(path.join(ROOT, "js"), { recursive: true, force: true });

const result = spawnSync(process.execPath, [TSC, "-p", path.join(ROOT, "tsconfig.json")], {
  stdio: "inherit",
  cwd: ROOT
});

process.exit(result.status === null ? 1 : result.status);
