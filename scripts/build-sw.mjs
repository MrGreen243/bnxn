// Bundles src/sw/sw.ts with esbuild and injects the precache manifest of the
// exported `out/` directory using @serwist/build. Runs after `next build`.
import { build } from "esbuild";
import { injectManifest } from "@serwist/build";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "out");
const tmpDir = path.join(rootDir, ".next", "sw-tmp");
fs.mkdirSync(tmpDir, { recursive: true });

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const version = process.env.npm_package_version ?? "0.1.0";

await build({
  entryPoints: [path.join(rootDir, "src", "sw", "sw.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  outfile: path.join(tmpDir, "sw.js"),
  define: {
    "process.env.NODE_ENV": '"production"',
    __APP_VERSION__: JSON.stringify(version),
    __BASE_PATH__: JSON.stringify(basePath),
  },
});

const result = await injectManifest({
  swSrc: path.join(tmpDir, "sw.js"),
  swDest: path.join(outDir, "sw.js"),
  globDirectory: outDir,
  globPatterns: ["**/*.{html,js,css,json,webmanifest,png,svg,ico,woff2,txt}"],
  globIgnores: ["sw.js", "**/*.map"],
  modifyURLPrefix: { "": `${basePath}/` },
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
  injectionPoint: "self.__SW_MANIFEST",
});

console.log(
  `[sw] precache manifest: ${result.count} files, ${(result.size / 1024).toFixed(0)} KiB` +
    (result.warnings.length ? `\n[sw] warnings:\n${result.warnings.join("\n")}` : ""),
);
