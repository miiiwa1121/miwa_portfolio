import { hashRange } from "./voxel/rng";
import { rotateAboutAxis, type Direction } from "./planet/planetLayout";

/**
 * The stardust simulation, kept apart from the mesh that draws it — the same
 * split `confetti.ts` used, which this replaces (see docs/planet-migration.md,
 * stage 6). "Falling" has no meaning once there is no ground to fall towards
 * in a fixed direction; instead each speck slowly orbits the planet's own
 * centre, on its own axis, forever. That is a genuine simplification over
 * confetti, not just a reskin: an orbit never leaves the shell it started on,
 * so there is nothing to recycle the way a falling flake had to be reset once
 * it passed the ground.
 */

export type DustPart = {
  /** Current unit direction from the planet's centre. */
  x: number;
  y: number;
  z: number;
  /** Unit axis this speck slowly orbits about — its own, chosen once at spawn. */
  axisX: number;
  axisY: number;
  axisZ: number;
  /** Distance from the centre. Fixed: the orbit stays on its own shell. */
  radius: number;
  /** Angular speed, radians per second. */
  speed: number;
  /** Phase offset for the size pulse, so specks don't twinkle in lockstep. */
  twinkle: number;
};

/** Shell the dust orbits within — well clear of the planet and its buildings
 * (`SMOOTH_PLANET_RADIUS` ≈ 16.8), well inside the free-orbit camera distance
 * (`ORBIT_RADIUS` ≈ 165) so it reads as drifting near the planet rather than
 * as background. */
export const DUST_MIN_RADIUS = 20;
export const DUST_MAX_RADIUS = 45;

/** A uniformly-distributed unit vector from two independent seeds. */
function randomDirection(seedZ: number, seedTheta: number): Direction {
  const z = hashRange(seedZ, -1, 1);
  const theta = hashRange(seedTheta, 0, Math.PI * 2);
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(theta) * r, Math.sin(theta) * r, z];
}

/** Deterministic spawn state for `count` specks. Same count, same field. */
export function spawnDust(count: number): DustPart[] {
  return Array.from({ length: count }, (_, i) => {
    const s = i * 1009;
    const [x, y, z] = randomDirection(s + 1, s + 2);
    const [axisX, axisY, axisZ] = randomDirection(s + 3, s + 4);
    return {
      x,
      y,
      z,
      axisX,
      axisY,
      axisZ,
      radius: hashRange(s + 5, DUST_MIN_RADIUS, DUST_MAX_RADIUS),
      speed: hashRange(s + 6, 0.02, 0.08),
      twinkle: hashRange(s + 7, 0, Math.PI * 2),
    };
  });
}

/** Advance the field by `delta` seconds — each speck turns about its own axis. */
export function stepDust(parts: DustPart[], delta: number): void {
  for (const p of parts) {
    const [x, y, z] = rotateAboutAxis([p.x, p.y, p.z], [p.axisX, p.axisY, p.axisZ], p.speed * delta);
    p.x = x;
    p.y = y;
    p.z = z;
  }
}
