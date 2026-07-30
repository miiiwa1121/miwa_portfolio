import type { Voxel } from "./VoxelModel";
import { pick } from "./palette";

export type ColorArg = string | readonly string[] | ((x: number, y: number, z: number) => string);

function resolveColor(color: ColorArg, x: number, y: number, z: number): string {
  if (typeof color === "function") return color(x, y, z);
  if (Array.isArray(color)) return pick(color, x * 7.1 + y * 13.3 + z * 3.7);
  return color as string;
}

/** Fill a solid box region [ox..ox+w) x [oy..oy+h) x [oz..oz+d). */
export function fillBox(
  out: Voxel[],
  ox: number,
  oy: number,
  oz: number,
  w: number,
  h: number,
  d: number,
  color: ColorArg
): Voxel[] {
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++)
      for (let z = 0; z < d; z++)
        out.push({ x: ox + x, y: oy + y, z: oz + z, color: resolveColor(color, ox + x, oy + y, oz + z) });
  return out;
}

/** Hollow box shell (walls only) — cheaper for large buildings. */
export function shellBox(
  out: Voxel[],
  ox: number,
  oy: number,
  oz: number,
  w: number,
  h: number,
  d: number,
  color: ColorArg
): Voxel[] {
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++)
      for (let z = 0; z < d; z++) {
        const onShell =
          x === 0 || x === w - 1 || y === 0 || y === h - 1 || z === 0 || z === d - 1;
        if (onShell)
          out.push({ x: ox + x, y: oy + y, z: oz + z, color: resolveColor(color, ox + x, oy + y, oz + z) });
      }
  return out;
}

/** A single voxel. */
export function put(out: Voxel[], x: number, y: number, z: number, color: string): Voxel[] {
  out.push({ x, y, z, color });
  return out;
}

/** Carve away voxels matching a predicate (e.g. round off corners). */
export function carve(voxels: Voxel[], keep: (v: Voxel) => boolean): Voxel[] {
  return voxels.filter(keep);
}

/** Recolor voxels matching a predicate. */
export function paint(voxels: Voxel[], match: (v: Voxel) => boolean, color: string): Voxel[] {
  for (const v of voxels) if (match(v)) v.color = color;
  return voxels;
}

/** Small deterministic value-noise in [0,1] for gentle terrain variation. */
export function noise2(x: number, z: number): number {
  const n = Math.sin(x * 0.55 + 1.7) * Math.cos(z * 0.5 - 0.9) + Math.sin((x + z) * 0.27);
  return (n / 3 + 1) / 2; // -> ~[0,1]
}

/** Merge several voxel arrays into one. */
export function merge(...groups: Voxel[][]): Voxel[] {
  return groups.flat();
}

/**
 * A wide flat plinth extending downward from y = 0, wider than the building's
 * own footprint by `margin` on every side.
 *
 * Buildings now stand on a voxel sphere (see `scene/planet/shell.ts`) rather
 * than a flat plane. The building's anchor follows the *terrain* (a smooth
 * function of direction), while the crust around it is a *lattice* that steps
 * by a whole planet voxel at a time — the two disagree by up to half a planet
 * voxel wherever the anchor doesn't happen to land exactly on a lattice
 * boundary. A plinth several building-voxels deep buries that mismatch rather
 * than computing it exactly, the same way the flat island's buildings never
 * had to reason about the ground underneath them.
 */
export function foundation(
  out: Voxel[],
  w: number,
  d: number,
  depth: number,
  color: ColorArg,
  margin = 2
): Voxel[] {
  const ox = -Math.floor((w + margin * 2) / 2);
  const oz = -Math.floor((d + margin * 2) / 2);
  return fillBox(out, ox, -depth, oz, w + margin * 2, depth, d + margin * 2, color);
}
