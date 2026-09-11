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
 *
 * **It shows, and can be moved, only from the overview altitude** (`OrbitZoom`
 * `"far"`). That is where there is sky to see it in: the planet's disc is 9.7°
 * across from there against 19.7° at the near altitude, and the near altitude
 * additionally leans the planet into the bottom-right of the frame
 * (`NEAR_VERTICAL_SHARE`), leaving the sun clipped at the very corner and on
 * screen for about a third of a lap. The light itself never stops — wherever
 * the sun was left is where it goes on shining from, at every altitude and
 * inside every section.
 */

import { dot, normalize, type Direction } from "./planet/geometry";

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
 * **Bounded on both sides, and the window is narrow.** Seen from the overview
 * altitude, the sun has to clear the planet's own disc (or it is hidden behind
 * the world) and still fall inside the frame (or it cannot be reached), which
 * pins it to roughly 18–40. The floor is raised again by everything standing on
 * the surface: below `SCENE_BOUNDING_RADIUS` the sun would pass through the
 * city rather than over it. What is left is 34–40, and this sits at the bottom
 * of it. `sunLight.test.ts` holds both ends.
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
 * Where the sun goes for a ray cast from the camera through the pointer.
 *
 * **Direct placement, not a turn by however far the pointer moved.** Rotating
 * the sun by a scaled pointer delta was the obvious way to do this and it
 * cannot be made to track: the sun rides a sphere of radius `SUN_ORB_RADIUS`
 * seen from outside, so most of the way round its circle it is moving *along*
 * the line of sight rather than across it, and the same turn shows as a
 * different distance on screen at every point. Measured square-on to the
 * camera, 94.7% of the sun's motion there is straight away from the eye and a
 * 100px drag moved it 41px; the correction factor needed is not a constant but
 * something that runs to infinity at the silhouette. Intersecting the sphere
 * instead puts the sun exactly under the pointer, everywhere, with no factor at
 * all.
 *
 * A ray that misses the sphere is answered with the nearest direction on it —
 * the silhouette — so the sun follows a pointer dragged off the edge instead of
 * letting go of it.
 *
 * **The near intersection, always.** Which means one drag reaches the half of
 * the sphere facing the camera, and no further; the far half is reached by
 * turning the planet and dragging again, which the orbit is doing on its own
 * anyway. The alternative — flipping to the far intersection when the pointer
 * crosses the silhouette — is the usual arcball, and it buys a reachable back
 * side at the cost of the sun jumping hemispheres under a hand that only meant
 * to drag to the edge.
 */
export function sunDirectionAlong(origin: Direction, direction: Direction): Direction {
  const d = normalize(direction);
  const b = dot(origin, d);
  const c = dot(origin, origin) - SUN_ORB_RADIUS * SUN_ORB_RADIUS;
  const discriminant = b * b - c;

  if (discriminant >= 0) {
    const t = -b - Math.sqrt(discriminant);
    if (t > 0) return normalize([origin[0] + t * d[0], origin[1] + t * d[1], origin[2] + t * d[2]]);
  }
  // Missed: the closest the ray ever comes to the planet's centre is the
  // silhouette direction, which is where the sun should sit. (This can never be
  // the centre itself — a ray through it would have hit.)
  return normalize([origin[0] - b * d[0], origin[1] - b * d[1], origin[2] - b * d[2]]);
}

/** How lit a surface with normal `n` is, 0 (at or past the terminator) to 1. */
export function incidence(n: Direction, sun: Direction): number {
  return Math.max(0, dot(normalize(n), normalize(sun)));
}
