import type { Voxel } from "./VoxelModel";

type TextOpts = {
  color?: string;
  depth?: number;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  threshold?: number;
};

/**
 * Rasterizes a string on an offscreen canvas and converts each opaque pixel
 * into a voxel column of `depth`. This gives MagicaVoxel-style blocky 3D text
 * for signage — generated entirely from code, no modeling required.
 *
 * Returns voxels centered on X, with Y=0 at the baseline bottom. Runs only in
 * the browser (guards against SSR where `document` is undefined).
 */
export function textToVoxels(text: string, opts: TextOpts = {}): Voxel[] {
  const {
    color = "#ffffff",
    depth = 2,
    fontSize = 16,
    fontWeight = 700,
    fontFamily = "'Geist Mono', ui-monospace, monospace",
    threshold = 128,
  } = opts;

  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.max(1, Math.ceil(metrics.width) + 2);
  const h = Math.ceil(fontSize * 1.4);

  canvas.width = w;
  canvas.height = h;
  ctx.font = font; // re-apply: resizing the canvas resets the context
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 1, h / 2);

  const data = ctx.getImageData(0, 0, w, h).data;
  const voxels: Voxel[] = [];
  const halfW = w / 2;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const alpha = data[(py * w + px) * 4 + 3];
      if (alpha >= threshold) {
        const gx = px - halfW; // center horizontally
        const gy = h - py; // flip: canvas Y grows downward
        for (let z = 0; z < depth; z++) voxels.push({ x: gx, y: gy, z, color });
      }
    }
  }
  return voxels;
}

/** Height (in voxels) a rasterized string of this fontSize will occupy. */
export function textVoxelHeight(fontSize: number): number {
  return Math.ceil(fontSize * 1.4);
}
