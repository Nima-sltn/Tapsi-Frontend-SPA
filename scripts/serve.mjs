#!/usr/bin/env node
/**
 * Zero-dependency static file server for local development.
 *
 *   npm start            → http://localhost:4173
 *   PORT=8080 npm start  → custom port
 *
 * Serving over HTTP matters: the service worker, `<use>` sprite references
 * and ES fetches are unavailable on the `file://` protocol.
 */
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

/**
 * @param {string} urlPath Request path (decoded, query-free).
 * @returns {string|null} Absolute file path, or null when unsafe/missing.
 */
async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const absolute = path.resolve(ROOT, relative);

  // Refuse anything that escapes the project root (path traversal).
  if (absolute !== ROOT && !absolute.startsWith(ROOT + path.sep)) return null;

  try {
    const stats = await fs.stat(absolute);
    if (stats.isDirectory()) return resolveFile(path.join(relative, "index.html"));
    return absolute;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const filePath = await resolveFile(request.url || "/");

    if (!filePath) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404 Not Found");
      return;
    }

    const body = await fs.readFile(filePath);
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("500 Internal Server Error");
    console.error(error);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Tapsi redesign running at http://${HOST}:${PORT}`);
});
