import { hashRange } from "../voxel/rng";
import { fibonacciSphere, normalize, offsetDirection, tangentBasis, type Direction } from "./geometry";
import { FILLER_CITY, sectionObstacles, tooClose, type Obstacle } from "./city";
import { planetRelief, RELIEF_AMPLITUDE } from "./shell";
import { SMOOTH_PLANET_RADIUS } from "./sections";

/**
 * Where the small, unnamed decorations stand — the plaza the flat world's
 * ferris wheel, trees, lamps and wandering villagers all shared by sitting on
 * one small island. On the sphere that shared ground has to be *found* rather
 * than assumed: a spot with grass underfoot, clear of the five landmarks and
 * the filler city.
 *
 * Pure, like the rest of `planet/`: picking the spot and scattering things
 * around it is arithmetic over directions and a seed, so it can be tested
 * without a renderer. Turning a scattered direction into an actual voxel
 * model is `Decorations.tsx`'s job, the same split `city.ts` uses.
 */

/** The colour band `Planet.tsx` paints as grass — see its own `bandColor`. */
const GRASS_THRESHOLD = 0.25;

/** Whether a direction lands on the grass band, not sand or water. */
export function isGrass(dir: Direction): boolean {
  return planetRelief(dir) * RELIEF_AMPLITUDE >= GRASS_THRESHOLD;
}

/**
 * The first of `candidates` that is grass and clear of every obstacle by at
 * least `clearance` — or, failing that, the first that is merely grass, or
 * failing even that, `candidates[0]`. Three falling-back tiers rather than
 * one: a search that can return nothing would leave every caller downstream
 * needing its own "what if there is no park" branch, for a condition that
 * would only ever come up if the obstacle list grew enough to tile the whole
 * sphere. Degrading gracefully costs nothing today and removes a class of
 * caller bug outright — the same trade `normalize`'s zero-length fallback
 * makes.
 */
export function pickClearing(candidates: Direction[], obstacles: Obstacle[], clearance: number): Direction {
  for (const c of candidates) {
    if (isGrass(c) && !tooClose(c, clearance, obstacles)) return c;
  }
  for (const c of candidates) {
    if (isGrass(c)) return c;
  }
  return candidates[0] ?? [0, 1, 0];
}

/** How far the plaza's own footprint reaches — ferris wheel, trees, lamps and
 * the villagers' wider circle all stay inside this. */
export const PARK_RADIUS = 0.22;

/** Where the plaza sits. Computed once at module load, like `FILLER_CITY`. */
export const PARK_CENTRE: Direction = pickClearing(
  fibonacciSphere(300),
  [...sectionObstacles(SMOOTH_PLANET_RADIUS), ...FILLER_CITY],
  PARK_RADIUS
);

export type ScatterPoint = { direction: Direction; seed: number };

/**
 * `count` points scattered within `angularRadius` of `centre`.
 *
 * Radius drawn uniformly in `[minAngularRadius, angularRadius]`, not
 * area-uniformly — density rises towards the centre, the same choice
 * `generateFillerCity` makes and for the same reason: an annulus nearer the
 * centre is smaller but gets just as many points, which reads as a cluster
 * with a core rather than things spread evenly over a disc.
 */
export function scatterAround(
  centre: Direction,
  count: number,
  angularRadius: number,
  seedBase: number,
  minAngularRadius = 0
): ScatterPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = seedBase + i * 131;
    const bearing = hashRange(seed + 1, 0, Math.PI * 2);
    const radial = minAngularRadius + hashRange(seed + 2, 0, 1) * (angularRadius - minAngularRadius);
    return { direction: offsetDirection(centre, bearing, radial), seed };
  });
}

/**
 * Which way something walking a circle of constant angular radius around
 * `centre` is facing at `bearing`, if `bearing` is increasing.
 *
 * `offsetDirection(centre, bearing, r)` is
 * `cos(r)·centre + sin(r)·(cos(bearing)·forward + sin(bearing)·right)`, a
 * closed form differentiable in `bearing` without resampling the curve:
 * `d/dbearing = sin(r)·(-sin(bearing)·forward + cos(bearing)·right)`. The
 * `sin(r)` factor is always positive for the `r ∈ (0, π)` this is used at, so
 * dropping it before normalizing changes nothing about the direction. A
 * walker moving the other way (`bearing` decreasing) simply negates the
 * result — there is no second formula to keep in sync.
 */
export function walkerFacing(centre: Direction, bearing: number): Direction {
  const { right, forward } = tangentBasis(centre);
  return normalize([
    -Math.sin(bearing) * forward[0] + Math.cos(bearing) * right[0],
    -Math.sin(bearing) * forward[1] + Math.cos(bearing) * right[1],
    -Math.sin(bearing) * forward[2] + Math.cos(bearing) * right[2],
  ]);
}
