// Tiny dependency-free static server for the exported `out/` directory.
// Mirrors how a static host serves the app (directory index + .html fallback).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length) || "/";
  const candidates = [p, path.join(p, "index.html"), `${p.replace(/\/$/, "")}.html`];
  for (const c of candidates) {
    const full = path.join(root, c);
    if (!full.startsWith(root)) continue;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

http
  .createServer((req, res) => {
    const file = resolveFile(req.url ?? "/") ?? path.join(root, "404.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file);
    const headers = { "content-type": types[ext] ?? "application/octet-stream" };
    if (file.endsWith("sw.js")) headers["service-worker-allowed"] = `${basePath}/`;
    headers["cache-control"] = ext === ".html" || file.endsWith("sw.js") ? "no-cache" : "public, max-age=3600";
    res.writeHead(fs.existsSync(file) ? 200 : 404, headers);
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}${basePath}/`);
  });
