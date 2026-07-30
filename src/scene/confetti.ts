import { hashRange } from "./voxel/rng";

/**
 * The confetti simulation, kept apart from the mesh that draws it.
 *
 * Spawning is deterministic so the field looks the same on every mount, and
 * stepping is a plain function over an array, so neither depends on React or
 * three.js being present.
 */

export type ConfettiPart = {
  x: number;
  y: number;
  z: number;
  speed: number;
  sway: number;
  spin: number;
};

/** Height a flake respawns at once it reaches the ground. */
export const CONFETTI_FALL_TOP = 22;

/** Half-width of the square the confetti falls through. */
export const CONFETTI_SPREAD = 14;

/** Deterministic spawn state for `count` flakes. Same count, same field. */
export function spawnConfetti(count: number): ConfettiPart[] {
  return Array.from({ length: count }, (_, i) => {
    const s = i * 6;
    return {
      x: hashRange(s + 1, -CONFETTI_SPREAD, CONFETTI_SPREAD),
      y: hashRange(s + 2, 1, CONFETTI_FALL_TOP + 1),
      z: hashRange(s + 3, -CONFETTI_SPREAD, CONFETTI_SPREAD),
      speed: hashRange(s + 4, 0.4, 1.0),
      sway: hashRange(s + 5, 0, Math.PI * 2),
      spin: hashRange(s + 6, 0, Math.PI),
    };
  });
}

/** Advance the field by `delta` seconds, recycling flakes that hit the ground. */
export function stepConfetti(parts: ConfettiPart[], delta: number): void {
  for (const p of parts) {
    p.y -= p.speed * delta;
    if (p.y < 0) p.y = CONFETTI_FALL_TOP;
  }
}
