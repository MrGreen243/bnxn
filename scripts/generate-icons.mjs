// Generates original app icons and demo ad placeholders as PNGs (no binary assets in git history needed).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas, hex } from "./png.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");
const adsDir = path.join(root, "public", "ads");
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(adsDir, { recursive: true });

// 16x16 pixel-art "ST" crown-over-naira emblem
const EMBLEM = [
  "................",
  "...Y.Y....Y.Y...",
  "...YYY....YYY...",
  "..YYYYYYYYYYYY..",
  "..YYYYYYYYYYYY..",
  "....GGGGGGGG....",
  "...GGWWWGGWWGG..",
  "...GGWGGGWGWGG..",
  "...GGWWWGWGWGG..",
  "...GGGGWGWGWGG..",
  "...GGWWWGGWWGG..",
  "....GGGGGGGG....",
  ".....DDDDDD.....",
  "....DDDDDDDD....",
  "....DDDDDDDD....",
  "................",
];
const PAL = { Y: hex("#f2bd48"), G: hex("#38c172"), W: hex("#0b0d12"), D: hex("#e0a526") };

function icon(size, maskable) {
  const c = new Canvas(size, size);
  c.rect(0, 0, size, size, hex("#11141c"));
  const pad = maskable ? Math.round(size * 0.2) : Math.round(size * 0.1);
  const inner = size - pad * 2;
  // rounded dark panel
  c.rect(pad, pad, inner, inner, hex("#181c26"));
  const scale = Math.floor(inner / 16);
  const ox = Math.round((size - 16 * scale) / 2);
  c.art(ox, ox, EMBLEM, PAL, scale);
  // gold border
  const b = Math.max(2, Math.round(size / 64));
  c.rect(pad, pad, inner, b, hex("#e0a526"));
  c.rect(pad, pad + inner - b, inner, b, hex("#e0a526"));
  c.rect(pad, pad, b, inner, hex("#e0a526"));
  c.rect(pad + inner - b, pad, b, inner, hex("#e0a526"));
  return c.toPNG();
}

for (const size of [192, 512]) {
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), icon(size, false));
  fs.writeFileSync(path.join(iconsDir, `icon-maskable-${size}.png`), icon(size, true));
}
fs.writeFileSync(path.join(root, "public", "favicon.png"), icon(64, false));

// Demo ad placeholders: simple branded gradients with a pixel emblem
function demo(w, h, bg, accent, name) {
  const c = new Canvas(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const col = [Math.round(bg[0] * (1 - t) + accent[0] * t * 0.35), Math.round(bg[1] * (1 - t) + accent[1] * t * 0.35), Math.round(bg[2] * (1 - t) + accent[2] * t * 0.35), 255];
    c.rect(0, y, w, 1, col);
  }
  const scale = Math.max(2, Math.floor(Math.min(w, h) / 24));
  c.art(Math.round(w * 0.06), Math.round((h - 16 * scale) / 2), EMBLEM, { ...PAL, Y: accent, D: accent }, scale);
  // stripes on the right as "text" placeholder
  const sx = Math.round(w * 0.06) + 16 * scale + Math.round(w * 0.05);
  const lineH = Math.max(3, Math.round(h / 14));
  c.rect(sx, Math.round(h * 0.3), Math.round((w - sx) * 0.7), lineH, accent);
  c.rect(sx, Math.round(h * 0.3) + lineH * 2, Math.round((w - sx) * 0.5), lineH, [255, 255, 255, 140]);
  c.rect(sx, Math.round(h * 0.3) + lineH * 4, Math.round((w - sx) * 0.4), lineH, [255, 255, 255, 90]);
  fs.writeFileSync(path.join(adsDir, name), c.toPNG());
}
demo(728, 90, hex("#1f2740"), hex("#4cc9f0"), "demo-hud.png");
demo(600, 400, hex("#2d1f3c"), hex("#f15bb5"), "demo-feed.png");
demo(256, 128, hex("#223548"), hex("#f2bd48"), "demo-billboard.png");
demo(800, 450, hex("#3a2814"), hex("#e0a526"), "demo-loading.png");
console.log("icons and demo ads generated");
