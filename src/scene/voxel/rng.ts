/**
 * Deterministic hash-based pseudo-randomness for the voxel world.
 *
 * Everything decorative in the scene — leaf tints, confetti spawn points —
 * needs to look scattered but must NOT come from `Math.random()`. Two reasons:
 * React may discard and recompute a `useMemo`, which with a live RNG would
 * teleport every particle mid-flight; and a scene that renders differently on
 * every mount is impossible to screenshot-test or reason about.
 *
 * Same seed in, same value out, forever.
 */

/** Classic fract-sin hash. Returns a value in [0, 1). */
export function hash01(seed: number): number {
  const n = Math.sin(seed * 12.9898) * 43758.5453;
  return n - Math.floor(n);
}

/** Convenience: a deterministic value in [min, max). */
export function hashRange(seed: number, min: number, max: number): number {
  return min + hash01(seed) * (max - min);
}
