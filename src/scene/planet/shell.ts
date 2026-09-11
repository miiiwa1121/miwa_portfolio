import type { Voxel } from "../voxel/VoxelModel";
import { PALETTE, pick } from "../voxel/palette";
import { normalize, type Direction } from "./geometry";

/**
 * The planet's body: a hollow shell of voxels with terrain on it.
 *
 * Pure, and free of three.js — it hands back the same `Voxel[]` the flat
 * island did, so one `InstancedMesh` still draws the whole thing. What it can
 * assert without a renderer is the part that is easy to get quietly wrong: that
 * the shell has no holes in it, that nothing was generated inside where nobody
 * can see it, and that the terrain has no seam.
 */

/**
 * The planet, in voxels and in world units.
 *
 * 24 voxels of radius at 1.4 world units each — a world radius of 33.6. Both
 * numbers come from the reference image rather than from taste: measured across
 * 720 directions, its buildings rise 17% of the ground radius at the median and
 * 30% at the tallest. The Products tower is 24 voxels at 0.42, i.e. 10.1 world
 * units, so a radius of 33.6 puts the site's tallest building at 30% — the
 * reference's tallest — and the rest between 9% and 19%, straddling its median.
 *
 * The first draft used radius 22, which put that tower at 46% of the planet's
 * radius. Nothing in the reference is anywhere near that; it reads as a spike
 * driven into a marble rather than a tower standing on a world.
 *
 * The voxel is deliberately coarse — three and a third times the buildings'
 * 0.42 — so the ground reads as terrain and the buildings as construction. It
 * also keeps the block count down: 1.4 reaches the same world radius as
 * voxelSize 1.0 at radius 34 for roughly half the blocks.
 */
export const PLANET_RADIUS_VOXELS = 24;
export const PLANET_VOXEL_SIZE = 1.4;
export const PLANET_RADIUS = PLANET_RADIUS_VOXELS * PLANET_VOXEL_SIZE;

/**
 * How many voxels thick the crust is.
 *
 * Two, and this is a measured floor rather than a preference. A one-voxel shell
 * has pinholes: casting 20,000 rays out from the centre, 3-4% of them pass
 * between the blocks and out the other side, because a single lattice layer
 * approximating a curved surface leaves gaps at the corners where the surface
 * runs diagonally through the grid. At two the same sweep finds no gaps at all.
 * The test below pins both halves of that.
 */
export const PLANET_SHELL_THICKNESS = 2;

/** How far, in voxels, the ground rises above and falls below the mean radius. */
export const RELIEF_AMPLITUDE = 2.2;

/** Ground below this height, in voxels relative to the mean radius, is sea. */
export const SEA_LEVEL = -0.35;

/**
 * Terrain height at a direction, as a factor on `RELIEF_AMPLITUDE`.
 *
 * Sampled over 4,000 directions it runs -0.685 to 0.669, so it never quite
 * reaches the amplitude it is multiplied by — which is why the amplitude is
 * stated as the peak and the sea level tuned against the result rather than
 * against the nominal range.
 *
 * A sum of sinusoids of the direction's own components, which is what keeps it
 * seamless. The obvious alternative — noise over latitude and longitude, the
 * way `noise2` works over x and z on the flat island — has two seams the sphere
 * makes visible: a cliff down the ±180° meridian where longitude wraps, and a
 * pinwheel at each pole, where every longitude meets and the noise disagrees
 * with itself about the height of a single point. A function of the direction
 * cannot have either, because it never names a coordinate that wraps.
 */
export function planetRelief(dir: Direction): number {
  const [x, y, z] = normalize(dir);
  const continents = Math.sin(x * 2.7 + 1.3) * Math.cos(y * 2.1 - 0.4) + Math.sin(z * 2.3 + 2.6);
  const hills = Math.sin(x * 5.9 - 2.2) * Math.sin(z * 6.7 + 0.8) + Math.cos(y * 6.1 + 1.9);
  const detail = Math.sin((x + y + z) * 11.3 + 0.5);
  return (continents * 0.55 + hills * 0.28 + detail * 0.1) / 1.66;
}

export type GroundOptions = {
  /** Mean radius in voxels. */
  radius?: number;
  /** Peak-to-trough terrain, in voxels. Zero gives a bare sphere. */
  relief?: number;
  /** Sea level in voxels relative to the mean radius. */
  seaLevel?: number;
};

export type ShellOptions = GroundOptions & {
  /** Crust depth in voxels. */
  thickness?: number;
};

/**
 * The ground's distance from the planet's centre in direction `dir`, in
 * voxels — sea included, so this is where a building's foundation should
 * rest, not where the bare terrain happens to be.
 *
 * Split out of `planetVoxels` so a building's footing and the ground it
 * stands on read the same height by construction, rather than by two
 * separately-tuned copies of "radius plus relief, flattened at the shore"
 * staying in sync by hand.
 */
export function groundRadiusVoxels(dir: Direction, options: GroundOptions = {}): number {
  const radius = options.radius ?? PLANET_RADIUS_VOXELS;
  const amplitude = options.relief ?? RELIEF_AMPLITUDE;
  const seaLevel = options.seaLevel ?? SEA_LEVEL;
  const ground = planetRelief(dir) * amplitude;
  return radius + Math.max(ground, seaLevel);
}

/**
 * Generates the planet's crust.
 *
 * Only the crust: a solid ball of this radius would be 58,000 blocks against
 * this shell's 15,000, and every one of the extra 43,000 sits where no camera
 * can reach. The old island got the same treatment by tapering its underside to
 * a point; a sphere just needs a floor on how deep to go.
 *
 * Ocean is flat rather than following the ground down, which is what makes it
 * read as water instead of as blue ground: where the terrain falls below sea
 * level the surface is lifted back to it and the top block is painted water,
 * while the crust underneath still follows the real terrain.
 */
export function planetVoxels(options: ShellOptions = {}): Voxel[] {
  const radius = options.radius ?? PLANET_RADIUS_VOXELS;
  const thickness = options.thickness ?? PLANET_SHELL_THICKNESS;
  const amplitude = options.relief ?? RELIEF_AMPLITUDE;
  const seaLevel = options.seaLevel ?? SEA_LEVEL;

  const out: Voxel[] = [];
  // The tallest ground plus a whole voxel of slack, so the bounding cube can
  // never clip a peak.
  const bound = Math.ceil(radius + amplitude + 1);

  for (let x = -bound; x <= bound; x++)
    for (let y = -bound; y <= bound; y++)
      for (let z = -bound; z <= bound; z++) {
        const distance = Math.sqrt(x * x + y * y + z * z);
        // The centre has no direction, and nothing is generated there anyway.
        if (distance < 1e-6) continue;

        const dir: Direction = [x / distance, y / distance, z / distance];
        const ground = planetRelief(dir) * amplitude;
        const underwater = ground < seaLevel;
        const surface = groundRadiusVoxels(dir, options);

        if (distance > surface || distance <= surface - thickness) continue;

        const depth = surface - distance;
        out.push({ x, y, z, color: crustColor(depth, thickness, ground, underwater, x, y, z) });
      }

  return out;
}

/**
 * What a block looks like, from how deep it sits and what is above it.
 *
 * The bands follow the flat island's — grass over dirt over stone — so the two
 * worlds read as the same material even though nothing about the geometry
 * survived. Shores get sand, which is the one band the island never needed: it
 * had no water to meet.
 *
 * **Only the top band is ever seen.** The shell is closed, so everything below
 * the surface exists to make it watertight rather than to be looked at. The
 * lower bands are painted anyway because they cost nothing and would otherwise
 * be a trap the first time anything cuts into the crust — but tuning them is
 * not a way to change how the planet looks.
 *
 * The boundary between dirt and stone is stated as a share of the crust rather
 * than as a fixed depth. Written as `depth < 2` it was dead code at the
 * shipping thickness of 2: no block is ever that deep, so the stone band drew
 * zero of 13,525 blocks.
 */
function crustColor(
  depth: number,
  thickness: number,
  ground: number,
  underwater: boolean,
  x: number,
  y: number,
  z: number
): string {
  const seed = x * 3.1 + y * 5.7 + z * 1.9;
  if (depth < 1) {
    if (underwater) return PALETTE.water;
    if (ground < 0.25) return pick(PALETTE.sand, seed);
    return pick(PALETTE.grass, seed);
  }
  return depth < 1 + (thickness - 1) / 2 ? pick(PALETTE.dirt, seed) : pick(PALETTE.stone, seed);
}

/**
 * The fraction of directions that see straight through the shell.
 *
 * Exists for the tests rather than for the scene: "is it watertight" is the one
 * property of a voxelized sphere that cannot be read off the block count, and
 * it is the reason the crust is two voxels rather than one. Rays are spread on
 * the same Fibonacci lattice the scatter uses, so the sampling is even.
 */
export function pinholeFraction(voxels: Voxel[], rays = 4000): number {
  // Packed into one integer rather than a `"x,y,z"` string. The sweep does
  // hundreds of thousands of lookups and string building dominated it; the
  // planet is nowhere near the ±128 this allows.
  const key = (x: number, y: number, z: number) => ((x + 128) << 16) | ((y + 128) << 8) | (z + 128);
  const filled = new Set(voxels.map((v) => key(v.x, v.y, v.z)));
  let reach = 0;
  for (const v of voxels) reach = Math.max(reach, Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));

  const golden = Math.PI * (3 - Math.sqrt(5));
  let missed = 0;
  for (let i = 0; i < rays; i++) {
    const dy = 1 - (2 * i + 1) / rays;
    const ring = Math.sqrt(Math.max(0, 1 - dy * dy));
    const theta = i * golden;
    const dx = Math.cos(theta) * ring;
    const dz = Math.sin(theta) * ring;

    let hit = false;
    // A quarter-voxel step is short enough that the walk cannot step over a
    // block it passes through.
    for (let t = 0; t <= reach + 1 && !hit; t += 0.25)
      if (filled.has(key(Math.round(dx * t), Math.round(dy * t), Math.round(dz * t)))) hit = true;
    if (!hit) missed++;
  }
  return missed / rays;
}
