/**
 * Where the sun is, and what the shadow camera has to hold because of it.
 *
 * The direction itself is a plain constant for now. What is worth having in one
 * place is the *relationship* between the sun's distance and the shadow
 * frustum: three of the four bounds below are derived from `SUN_DISTANCE` and
 * nothing else, which is what lets the sun be pointed anywhere without any of
 * them being re-tuned. They used to be literals spread across JSX in
 * `Scene.tsx`, where that relationship could not be written down, let alone
 * tested.
 *
 * **A fixed sun cannot light every area, and that is a known limitation.** The
 * five areas span 149.5° of sphere; a search over every direction in 2° steps
 * found that the best any fixed one manages for the worst-lit area is exactly
 * 0. With the sun here, `contact` sits 142° past the terminator and reads about
 * a seventh as bright as `skills`. Moving the sun with the camera was tried and
 * rejected — it does fix the brightness (1.94x measured over `contact`), but
 * a sun near the view axis drops the ground in visible shadow from 26.9% to
 * 20.6% and makes the shading stop changing as the planet turns, which reads as
 * flat. The answer being pursued instead is a sun the reader can move.
 */

import { dot, normalize, type Direction } from "./planet/planetLayout";

/**
 * The radius of the sphere the sun is kept on.
 *
 * **`SUN_SHADOW_NEAR`/`FAR` are derived from this and nothing else** — an
 * orthographic shadow camera's near and far are the scene's bounding radius
 * slid along the light's own distance from the origin. Keep the sun on this
 * sphere and it can be turned anywhere with all four bounds still correct.
 * (41 is the distance of the direction below, 40.94, rounded.)
 */
export const SUN_DISTANCE = 41;

/**
 * How much of the world the shadow camera has to hold: the planet's own radius
 * (`SMOOTH_PLANET_RADIUS`, 16.8) plus the tallest building's peak above its
 * anchor (the pink tower's antenna tip, voxel y=30 at VS=0.42 ≈ 12.9) ≈ 29.7,
 * rounded up for margin. Direction-independent, which is why left/right/top/
 * bottom are all this one number.
 */
export const SCENE_BOUNDING_RADIUS = 34;

/** Shadow frustum depth, rounded outward from `SUN_DISTANCE ∓ SCENE_BOUNDING_RADIUS`. */
export const SUN_SHADOW_NEAR = 5;
export const SUN_SHADOW_FAR = 78;

/**
 * Which way the sun sits, as a unit direction from the planet's centre.
 *
 * The angle the whole scene's look was tuned against — high and to one side, so
 * the voxel blocks show a lit top, a mid side and a dark side, and cast shadows
 * fall where they can be seen.
 */
export const SUN_DIRECTION: Direction = normalize([18, 34, 14]);

/** Where to put the light: a direction, out at the one radius the shadow bounds assume. */
export function sunPosition(direction: Direction = SUN_DIRECTION): [number, number, number] {
  const [x, y, z] = normalize(direction);
  return [x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE];
}

/** How lit a surface with normal `n` is, 0 (at or past the terminator) to 1. */
export function incidence(n: Direction, sun: Direction): number {
  return Math.max(0, dot(normalize(n), normalize(sun)));
}
