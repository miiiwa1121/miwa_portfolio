/**
 * Where the sun is.
 *
 * **The sun rides with the camera, at a fixed offset, rather than standing
 * still over one hemisphere.** The five areas are scattered across 149.5° of
 * the sphere, and a search over every fixed direction (2° steps, 16,200 of
 * them) found that **no fixed sun lights all five** — the best any of them can
 * do for the worst-lit area is exactly 0. Measured against the tour, with the
 * old fixed sun at [18, 34, 14], `contact` sat at N·L = −0.79 (142° past the
 * terminator) and read about a seventh as bright as `skills`. That is not a
 * constant that was tuned badly; it is a problem a constant cannot solve.
 *
 * **Not a headlight, though.** Putting the sun exactly on the view axis is the
 * obvious version of this idea and it breaks three things at once: the voxel
 * geometry flattens (every camera-facing face lands on the same N·L, and the
 * facets are how the blocky form reads), every shadow falls directly behind its
 * own caster where nobody can see it (wasting the entire shadow pass over the
 * planet, 290 filler buildings and the landmarks), and the planet stops reading
 * as a world in space — the terminator is most of what separates "a planet"
 * from "a ball in a studio". So the sun sits `SUN_TILT` off the view axis: far
 * enough to keep a gradient and cast visible shadows, close enough that the
 * area in front is never the one in the dark.
 *
 * Kept as a pure function of the camera's own frame so that swapping "follows
 * the camera" for something else later — a sun the reader can place by hand,
 * say — is a change of caller rather than a change of lighting.
 */

import {
  dot,
  normalize,
  rotateAboutAxis,
  tangentOf,
  type Direction,
} from "./planet/planetLayout";

/**
 * How far off the view axis the sun sits, in radians (0.5 ≈ 28.6°).
 *
 * The area the card is describing is not at the centre of the planet's disc —
 * it is the nearest of five anchors, and it wanders. Sampled 360 times around
 * the tour, it sits a median of 18.1° from the camera's own direction and as
 * much as 40.1°. So the tilt has to be small enough that the far side of that
 * wander is still lit. Measured worst-case N·L for the facing area, over a full
 * lap: 20° → 0.59, 25° → 0.53, 30° → 0.47, 40° → 0.34, 60° → 0.04.
 *
 * The other end of the range is form: at 0 the geometry flattens and the
 * shadows hide (see the note above), and anything under ~20° puts the whole
 * visible disc inside the lit cap with no terminator on screen at all.
 */
export const SUN_TILT = 0.5;

/**
 * Which way the tilt leans, as a rotation about the view axis in radians.
 *
 * Zero would put the sun straight above the camera's own "up". Rolling it round
 * is the difference between a light directly overhead and a three-quarter key —
 * the second is what gives two visibly different faces on a cube. Positive
 * turns it towards the left of frame (the view axis points out of the screen,
 * so a right-handed turn about it reads counter-clockwise); negate for the
 * other side.
 */
export const SUN_ROLL = 0.6;

/**
 * The radius of the sphere the sun is kept on.
 *
 * **Every shadow constant below is derived from this, and only this** — which
 * is what makes a moving sun cost nothing to re-tune. An orthographic shadow
 * camera's left/right/top/bottom bound the projected size of what it frames, so
 * they only have to hold the scene's own bounding radius and are the same in
 * every direction; near/far are that radius slid along the sun's distance from
 * the origin. Keep the sun on this sphere and turn it wherever you like, and
 * all four bounds stay exactly as correct as they were when the sun never moved
 * (it stood at [18, 34, 14], which is 40.94 from the origin — this is that,
 * rounded).
 */
export const SUN_DISTANCE = 41;

/**
 * How much of the world the shadow camera has to hold: the planet's own radius
 * (`SMOOTH_PLANET_RADIUS`, 16.8) plus the tallest building's peak above its
 * anchor (the pink tower's antenna tip, voxel y=30 at VS=0.42 ≈ 12.9) ≈ 29.7,
 * rounded up for margin.
 */
export const SCENE_BOUNDING_RADIUS = 34;

/** Shadow frustum depth, rounded outward from `SUN_DISTANCE ∓ SCENE_BOUNDING_RADIUS`. */
export const SUN_SHADOW_NEAR = 5;
export const SUN_SHADOW_FAR = 78;

/**
 * The direction the sun sits in, given where the camera is and which way is up
 * for it.
 *
 * `view` is the direction from the planet's centre towards the camera, and `up`
 * is `camera.up` — the world's +Y in the free orbit, a building's own normal
 * while a section is framed, and a slerp between them during a flight (see
 * `sectionUp`). Working in the camera's own frame rather than the planet's is
 * what keeps this free of the pole: a bearing measured from the planet's north
 * has nowhere to point when the camera is over the pole, whereas "up in the
 * frame" is defined wherever the camera is, and is already continuous because
 * `camera.up` is.
 *
 * The result is exactly `SUN_TILT` from `view` — `tangentOf` takes the part of
 * `up` square to the view axis, so the tilt is not shortened by however much
 * `up` happens to lean towards the camera.
 */
export function sunDirection(view: Direction, up: Direction, tilt = SUN_TILT, roll = SUN_ROLL): Direction {
  const axis = normalize(view);
  const screenUp = rotateAboutAxis(tangentOf(up, axis), axis, roll);
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return normalize([
    axis[0] * cos + screenUp[0] * sin,
    axis[1] * cos + screenUp[1] * sin,
    axis[2] * cos + screenUp[2] * sin,
  ]);
}

/** Where to put the light: `sunDirection`, out at the one radius the shadow bounds assume. */
export function sunPosition(view: Direction, up: Direction): [number, number, number] {
  const [x, y, z] = sunDirection(view, up);
  return [x * SUN_DISTANCE, y * SUN_DISTANCE, z * SUN_DISTANCE];
}

/** How lit a surface with normal `n` is, 0 (at or past the terminator) to 1. */
export function incidence(n: Direction, sun: Direction): number {
  return Math.max(0, dot(normalize(n), normalize(sun)));
}
