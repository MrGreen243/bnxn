/**
 * Tiny pixel-art helpers. Art is described as rows of characters that map to
 * colours, then rasterised onto a canvas. Everything in the world is drawn
 * this way at build time, so the game ships no binary art assets.
 */
export type Palette = Record<string, string>;

export function drawPixels(ctx: CanvasRenderingContext2D, ox: number, oy: number, rows: string[], palette: Palette, scale = 1) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]!;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

export function ctxOf(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas not supported");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Deterministic noise for texture variation. */
export function hash2(x: number, y: number, seed = 7): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1446648313) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
