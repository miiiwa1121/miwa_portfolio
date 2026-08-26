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
 * **No fixed sun can light every area.** The five areas span 149.5° of sphere;
 * a search over every direction in 2° steps found that the best any fixed one
 * manages for the worst-lit area is exactly 0 — with the sun at its default,
 * `contact` sits 142° past the terminator and reads about a seventh as bright
 * as `skills`. Moving the sun with the camera was tried and rejected: it does
 * fix the brightness (1.94x measured over `contact`), but a sun near the view
 * axis drops the ground in visible shadow from 26.9% to 20.6% and makes the
 * shading stop changing as the planet turns, which reads as flat.
 *
 * So the reader moves it instead. The sun is an object in the sky that can be
 * dragged anywhere, and it stays where it is put — the shading still changes
 * continuously as the planet turns underneath it, which is the half the camera
 * version threw away.
 */

import { angleBetween, dot, normalize, rotateAboutAxis, type Direction } from "./planet/planetLayout";

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

/**
 * How far out the visible sun sits — a different radius from the light's own,
 * and a much smaller one than intuition suggests.
 *
 * A directional light is only a direction; its `position` matters solely
 * because the shadow camera is placed there, which is why the light itself has
 * to stay on `SUN_DISTANCE`. The *object* is free, and the first version put it
 * far away (260, past the camera's furthest reach) on the reasoning that a sun
 * should be distant. **It was never once on screen.**
 *
 * The reason is the camera: it always looks at the planet's centre, so the
 * frame is a ~33°×22.5° cone about that one direction and there is very little
 * sky in it. A body far away is seen in essentially its own direction from the
 * planet, and for that to fall inside the cone the sun has to be nearly behind
 * the planet — where the planet then hides it. Measured over a full lap of the
 * tour at 260: visible in zero frames out of six.
 *
 * Close in, the geometry inverts: the sun is seen *beside* the planet, in the
 * ring of sky around its disc, which is exactly where there is room. This
 * radius clears everything standing on the surface (`SCENE_BOUNDING_RADIUS`)
 * and sits well inside the free orbit's nearest altitude (`NEAR_ORBIT_RADIUS`,
 * 50), so the planet still occludes it as it passes behind — the sun still
 * sets. It is a lamp near the world rather than a star at infinity, which is
 * the honest description of what a diorama's sun is anyway.
 */
export const SUN_ORB_RADIUS = 34;

/**
 * The visible sun's radius on screen, in CSS pixels.
 *
 * Sized in pixels and solved back to a world scale each frame
 * (`markerScaleForScreenRadius`), the same as the area markers — not given a
 * fixed world scale. At `SUN_ORB_RADIUS` the distance from the camera swings
 * between 16 and 84 units over one turn at the near altitude, which a fixed
 * world size would show as the sun swelling fivefold; and it is a thing to be
 * grabbed, so it wants a predictable target the whole way round.
 */
export const SUN_ORB_SCREEN_RADIUS = 26;

/**
 * How much of the sun is showing, given where the camera is — 1 out at the
 * limb, 0 once it is between the camera and the planet.
 *
 * **A sun lighting the face you are looking at is a sun behind your shoulder.**
 * `SUN_ORB_RADIUS` sits inside the free orbit, which is what makes the sun
 * visible beside the planet at all (see that constant); the cost is that
 * dragging it round to the camera's own side puts the object physically
 * between the eye and the world, where it draws as a bright dot sitting on top
 * of the city. Fading it out over that arc is not a patch on the geometry —
 * it *is* the geometry: at those angles the real sun would be off behind the
 * viewer, out of frame, with the planet fully lit. Which is exactly what is
 * left once the sprite is gone.
 *
 * Faded rather than switched, because the arc is crossed by hand and a sun that
 * blinks out mid-drag reads as a bug.
 */
export const SUN_BEHIND_ANGLE = 0.79; // 45°: fully behind the viewer
export const SUN_CLEAR_ANGLE = 1.13; // 65°: clear of them, full brightness

export function sunVisibility(sun: Direction, view: Direction): number {
  const angle = angleBetween(sun, view);
  if (angle <= SUN_BEHIND_ANGLE) return 0;
  if (angle >= SUN_CLEAR_ANGLE) return 1;
  const t = (angle - SUN_BEHIND_ANGLE) / (SUN_CLEAR_ANGLE - SUN_BEHIND_ANGLE);
  return t * t * (3 - 2 * t); // smoothstep: no corner at either end
}

/**
 * Where a drag leaves the sun.
 *
 * Turned about the camera's own axes rather than the planet's, so the sun
 * follows the hand: dragging right walks it right across the frame wherever the
 * camera happens to be, and there is no pole for a planet-relative bearing to
 * become undefined over.
 *
 * `radiansPerPixel` is the caller's business because it is what makes the sun
 * track the pointer rather than merely respond to it: at the sprite's own
 * distance a pixel subtends `fov / viewportHeight` radians, so passing that
 * gives one-to-one movement at any window size or field of view.
 */
export function dragSunDirection(
  current: Direction,
  dx: number,
  dy: number,
  cameraRight: Direction,
  cameraUp: Direction,
  radiansPerPixel: number
): Direction {
  // Both positive: `current` points outward from the planet's centre, so its
  // component along `cameraRight` is how far right of centre the sun appears.
  // Turning about `cameraUp` by +dx grows that component, which is the sun
  // going the same way as the hand. (Negating either is the classic way to end
  // up with a sun that runs away from the pointer, so both directions are
  // pinned in the tests.)
  const turned = rotateAboutAxis(current, cameraUp, dx * radiansPerPixel);
  return normalize(rotateAboutAxis(turned, cameraRight, dy * radiansPerPixel));
}

/** How lit a surface with normal `n` is, 0 (at or past the terminator) to 1. */
export function incidence(n: Direction, sun: Direction): number {
  return Math.max(0, dot(normalize(n), normalize(sun)));
}
