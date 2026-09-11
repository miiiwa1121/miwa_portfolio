import {
  angleBetween,
  fibonacciSphere,
  offsetDirection,
  type Direction,
} from "./geometry";
import { hashRange } from "../voxel/rng";
import { PLANET_SECTION_KEYS, SMOOTH_PLANET_RADIUS, sectionDirection } from "./sections";

/**
 * The filler city: anonymous, unnamed buildings scattered in clusters, so the
 * planet reads as built-over rather than as five landmarks standing alone on
 * open ground.
 *
 * Measured against `reference/image3.png` (see docs/planet-migration.md):
 * 74% of sampled directions there have something breaking the limb. Five
 * named buildings cannot get near that on their own — `bareFraction` below is
 * how this module checks its own scatter against a target. **The site's own
 * `FILLER_CITY` stops well short of 74%** — see its own docstring for why
 * (rendering cost, measured, not guessed). `generateFillerCity` and
 * `bareFraction` are both generic; nothing about reaching 74% is out of
 * reach for a future pass with a rendering budget to spend on it.
 *
 * Pure, like the rest of `planet/`: a cluster placement is arithmetic over
 * directions and a seed, so the scatter can be generated and measured without
 * a renderer. What actually turns a placement into voxels — picking a small
 * building shape and colour — is the render layer's job (`FillerCity.tsx`),
 * the same split `tour.ts` and `sections.ts` use.
 */

/** The grain filler buildings are built from — the same as the landmarks' own 0.42, not a third size to read. */
export const FILLER_VOXEL_SIZE = 0.42;

export type FillerBuilding = {
  /** Where the building stands. */
  direction: Direction;
  /**
   * Half the building's largest horizontal span, as a great-circle angle from
   * `direction` — the unit `bareFraction` and cluster/landmark avoidance both
   * measure in.
   */
  angularRadius: number;
  widthBlocks: number;
  depthBlocks: number;
  heightBlocks: number;
  /** Feeds a deterministic palette pick in the render layer. */
  colorSeed: number;
};

/** Something already standing that a cluster or a building should not land on. */
export type Obstacle = { direction: Direction; angularRadius: number };

export type CityOptions = {
  /** World radius the buildings' footprints are measured against. */
  planetRadius: number;
  /** How many cluster centres to try. Some may be skipped for sitting too close to an obstacle or another cluster. */
  clusterCount: number;
  /** Buildings attempted per cluster; some may be skipped for landing on an obstacle. */
  buildingsPerCluster: number;
  /** How far a cluster's buildings scatter from its own centre, in radians. */
  clusterAngularRadius: number;
  /** Landmarks and anything else already standing. */
  avoid?: Obstacle[];
  /** Footprint size range, in `FILLER_VOXEL_SIZE` blocks, inclusive. */
  minFootprintBlocks?: number;
  maxFootprintBlocks?: number;
  /** Height range, in blocks, inclusive. */
  minHeightBlocks?: number;
  maxHeightBlocks?: number;
};

const DEFAULT_MIN_FOOTPRINT = 2;
const DEFAULT_MAX_FOOTPRINT = 4;
const DEFAULT_MIN_HEIGHT = 3;
const DEFAULT_MAX_HEIGHT = 6;

/** A uniformly-distributed integer in [min, max], from a single seed. */
function hashInt(seed: number, min: number, max: number): number {
  return Math.min(max, Math.floor(hashRange(seed, min, max + 1)));
}

/** Whether `direction`, with its own `radius`, would overlap any of `obstacles`. */
export function tooClose(direction: Direction, radius: number, obstacles: Obstacle[]): boolean {
  return obstacles.some((o) => angleBetween(direction, o.direction) < o.angularRadius + radius);
}

/**
 * Scatters a filler city.
 *
 * **Cluster centres are oversampled and filtered, not retried one at a
 * time.** `fibonacciSphere` hands back an evenly-spread, deterministic set of
 * candidates; taking the first `clusterCount` of them that clear both the
 * avoid list and each other is simpler than a per-candidate retry loop and
 * cannot loop forever — a candidate is either used or skipped, once, in a
 * single pass over a fixed list.
 *
 * **Within a cluster, radial distance is drawn uniformly in
 * `[0, clusterAngularRadius]`, not area-uniformly (`sqrt` of uniform).** For
 * points uniform in radius, the count in an annulus `[r, r+dr]` is constant
 * while the annulus's own area shrinks towards the centre — so density rises
 * approaching the centre without any explicit falloff term. That is the
 * "density within the cluster" the plan asked for; an area-uniform scatter
 * would spread buildings evenly across the whole disc instead, reading as a
 * suburb rather than a core with an edge.
 */
export function generateFillerCity(options: CityOptions): FillerBuilding[] {
  const {
    planetRadius,
    clusterCount,
    buildingsPerCluster,
    clusterAngularRadius,
    avoid = [],
    minFootprintBlocks = DEFAULT_MIN_FOOTPRINT,
    maxFootprintBlocks = DEFAULT_MAX_FOOTPRINT,
    minHeightBlocks = DEFAULT_MIN_HEIGHT,
    maxHeightBlocks = DEFAULT_MAX_HEIGHT,
  } = options;

  const candidates = fibonacciSphere(Math.max(1, clusterCount * 3));
  const clusters: Direction[] = [];
  for (const candidate of candidates) {
    if (clusters.length >= clusterCount) break;
    if (tooClose(candidate, clusterAngularRadius * 0.5, avoid)) continue;
    if (clusters.some((c) => angleBetween(candidate, c) < clusterAngularRadius * 1.5)) continue;
    clusters.push(candidate);
  }

  const buildings: FillerBuilding[] = [];
  clusters.forEach((centre, ci) => {
    for (let bi = 0; bi < buildingsPerCluster; bi++) {
      const seed = ci * 10007 + bi * 131;
      const bearing = hashRange(seed + 1, 0, Math.PI * 2);
      const radial = hashRange(seed + 2, 0, 1) * clusterAngularRadius;
      const direction = offsetDirection(centre, bearing, radial);

      const widthBlocks = hashInt(seed + 3, minFootprintBlocks, maxFootprintBlocks);
      const depthBlocks = hashInt(seed + 4, minFootprintBlocks, maxFootprintBlocks);
      const heightBlocks = hashInt(seed + 5, minHeightBlocks, maxHeightBlocks);
      const angularRadius = ((Math.max(widthBlocks, depthBlocks) / 2) * FILLER_VOXEL_SIZE) / planetRadius;

      if (tooClose(direction, angularRadius, avoid)) continue;

      buildings.push({ direction, angularRadius, widthBlocks, depthBlocks, heightBlocks, colorSeed: seed + 6 });
    }
  });

  return buildings;
}

/**
 * The fraction of `samples` directions, spread evenly over the sphere, that
 * land on none of `obstacles`.
 *
 * This is `reference/image3.png`'s own measurement turned into a pure
 * function: that analysis walked rays out from a photographed silhouette's
 * centre and counted how many found nothing to stop them (74% did not, i.e.
 * 26% were bare). Sampling directions from the planet's own centre instead of
 * a camera's is a deliberate substitution, not an approximation of the same
 * thing — it answers "how much of the surface has nothing directly over it",
 * camera-angle-independent, which is what a scatter's *density* should be
 * tuned against. Framing-dependent effects (buildings overlapping in
 * silhouette from one particular angle) are a separate question the
 * screenshot check in the devlog answers instead.
 */
export function bareFraction(obstacles: Obstacle[], samples = 720): number {
  const directions = fibonacciSphere(samples);
  let bare = 0;
  for (const direction of directions) {
    if (!obstacles.some((o) => angleBetween(direction, o.direction) <= o.angularRadius)) bare++;
  }
  return bare / directions.length;
}

/** The five landmarks, as obstacles a cluster or a filler building should not land on. */
export function sectionObstacles(planetRadius: number): Obstacle[] {
  // Half of each building's own footprint, roughly — see the individual
  // generators in ProceduralObjects.tsx for the real voxel widths. Approximate
  // on purpose: this only has to keep filler buildings from visibly
  // overlapping a landmark, not fit it precisely.
  const FOOTPRINT_WORLD: Record<string, number> = {
    products: 6,
    skills: 4.5,
    experience: 7.5,
    about: 5.5,
    contact: 5.5,
  };
  return PLANET_SECTION_KEYS.map((section) => ({
    direction: sectionDirection(section),
    angularRadius: FOOTPRINT_WORLD[section] / planetRadius,
  }));
}

/**
 * The site's own filler city.
 *
 * **Settled short of the reference's 74% covered, on rendering cost rather
 * than on the count itself.** Reaching 74% (see docs/planet-migration.md for
 * the sweep) took upwards of a thousand buildings, tens of thousands of
 * voxels in one `InstancedMesh` — and under headless SwiftShader, the
 * screenshot used to check it went from ~5s with the filler city off to
 * 20-30s with it on at that size. SwiftShader is known to run far slower than
 * real hardware (see CLAUDE.md), so that gap is not a direct measurement of a
 * real browser's cost, but it is a real, reproducible signal that the
 * geometry itself got heavy, not just that the software rasteriser is slow in
 * general — the no-filler baseline was already running on the same
 * SwiftShader. 290 buildings (~12,000 voxels) added a few seconds rather than
 * fifteen to twenty; 475 sat between the two. This is the safer point on that
 * curve, at 25.4% covered rather than 74%. Revisit with a real GPU before
 * pushing it back up.
 */
export const FILLER_CITY: FillerBuilding[] = generateFillerCity({
  planetRadius: SMOOTH_PLANET_RADIUS,
  clusterCount: 10,
  buildingsPerCluster: 30,
  clusterAngularRadius: 0.35,
  minFootprintBlocks: 2,
  maxFootprintBlocks: 4,
  minHeightBlocks: 3,
  maxHeightBlocks: 5,
  avoid: sectionObstacles(SMOOTH_PLANET_RADIUS),
});
