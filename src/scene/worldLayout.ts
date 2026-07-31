import type { SectionType } from "@/types";
import { PLANET_SECTION_KEYS, sectionPosition } from "./planet/sections";
import { tangentBasis, type Direction } from "./planet/planetLayout";

/**
 * Where the world sits and where the camera looks from.
 *
 * Deliberately free of three.js and R3F imports: the building positions and
 * the camera framings derived from them are plain arithmetic, and keeping
 * them here means they can be reasoned about (and tested) without spinning up
 * a renderer. Diorama places the buildings from this; Scene aims the camera
 * with it — previously the two held separate copies that a comment asked you
 * to keep in sync by hand.
 *
 * **Stage 4 of docs/planet-migration.md.** Everything about a single fixed
 * `HOME_ANGLE` and a world-+Y-based `framePose` is gone. The camera is now a
 * satellite at a fixed straight-line distance from the planet's own centre
 * (`ORBIT_RADIUS`), free to sit at any azimuth *and* polar angle rather than
 * one azimuth at a pinned height — and a section's close-up (`sectionPose`)
 * is built from the building's own local frame (`tangentBasis`), which is
 * what lets it aim correctly at a building away from the equator instead of
 * diving underground.
 */

/**
 * World positions of each section building, on the planet's surface.
 *
 * These come from `scene/planet/sections.ts`'s latitude/longitude table
 * rather than being authored here directly as flat XZ triples — see
 * `sectionPosition()` there.
 */
export const BUILDING_POSITIONS = Object.fromEntries(
  PLANET_SECTION_KEYS.map((key) => [key, sectionPosition(key)])
) as Record<NonNullable<SectionType>, [number, number, number]>;

/**
 * Straight-line distance from the camera to the planet's centre, in the free
 * orbit — the satellite's fixed altitude.
 *
 * Carried over as the exact hypotenuse of stage 2's `HOME_RADIUS` (158.6) and
 * `HOME_HEIGHT` (45.8) rather than retuned: those were measured against the
 * planet's own silhouette (see docs/planet-migration.md, "手順2の結果"), and
 * that measurement is still the best evidence for how far back the camera
 * needs to sit — stage 4 changes *what the camera can do*, not how big the
 * planet looks. `HOME_RADIUS`/`HOME_HEIGHT` themselves are gone: a single
 * fixed polar angle no longer describes the free orbit once polar can move.
 */
export const ORBIT_RADIUS = Math.hypot(158.6, 45.8);

/**
 * How far from the poles the camera is allowed to go, in either the free
 * orbit or a drag — radians of polar angle, measured from `+Y` the way
 * `camera-controls`' own `phi` is.
 *
 * `camera.up` is pinned to `+Y`; near a pole the view direction runs nearly
 * parallel to it and `lookAt`'s degenerate case decides the roll arbitrarily.
 * `setLookAt` rebuilds `_spherical` from the camera's position every frame
 * and never consults `CameraControls`' own `minPolarAngle`/`maxPolarAngle` —
 * those only gate `rotateTo` — so the clamp has to live here instead of being
 * handed to the library.
 */
export const ORBIT_MIN_POLAR = 0.15;
export const ORBIT_MAX_POLAR = Math.PI - 0.15;

/**
 * Fraction of the frame's width the free orbit gives up to the card on the
 * left. Carried over unchanged from stage 2's `HOME_CARD_SHARE` — a
 * dimensionless fraction, unaffected by which of `ORBIT_RADIUS`'s azimuth or
 * polar the camera currently sits at.
 */
export const ORBIT_CARD_SHARE = 0.22;

/**
 * How steeply the camera looks down when framing a single area, in radians —
 * the angle `sectionPose` tilts away from a building's own surface normal,
 * towards its local north.
 */
export const SECTION_TILT = 0.34;

/** Slack around a framed area so it never touches the edges of the frame. */
export const FRAME_MARGIN = 1.35;

/**
 * How far back a camera needs to sit for a sphere of `radius` to fit.
 *
 * Takes whichever half-angle is tighter, so a tall narrow viewport is fitted
 * on width and a wide one on height — the reason this is computed rather than
 * fixed is that a single hardcoded distance frames the tallest tower and the
 * smallest building equally badly.
 *
 * (`fitToBox` from camera-controls looks like the built-in answer to this, but
 * it rounds the camera's angles to the nearest 90° first, snapping to a
 * face-on elevation and throwing away the diorama's three-quarter view.)
 */
export function frameDistance(radius: number, fovDegrees: number, aspect: number): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  return radius / Math.sin(Math.min(halfVertical, halfHorizontal));
}

/**
 * Fraction of the frame's width the card occupies on the left. The camera aims
 * this far to the side of its subject, which slides the subject clear of the
 * card instead of sitting behind it.
 */
export const CARD_SHARE = 0.3;

/**
 * A larger share than a normal section gets, since About's text column beside
 * it is a whole page rather than a small card.
 */
export const ABOUT_CARD_SHARE = 0.42;

/**
 * How steeply About looks down — measured the same way `SECTION_TILT` is, but
 * About has no single building to crop in on (its column has no card to
 * clear), so it keeps turning round the planet's own axis at a wider, more
 * distant framing instead of a normal section's tight one.
 */
const ABOUT_TILT = 0.62;

/**
 * About's own orbit — polar angle and straight-line radius from the planet's
 * centre, in the same units `orbitPose` takes.
 *
 * Converted rather than re-measured from stage 2's `ABOUT_RADIUS` (185, a
 * *horizontal* distance from the vertical axis) and `ABOUT_TILT`: `orbitPose`
 * wants a polar angle and a straight-line radius, which is exactly what a
 * horizontal-radius-and-tilt pair resolves to (`radius / cos(tilt)` is the
 * hypotenuse, `π/2 - tilt` is the down-tilt restated as an angle from `+Y`).
 * The visual framing this produces is therefore identical to stage 2's,
 * carried into the new coordinate system rather than retuned.
 */
export const ABOUT_POLAR = Math.PI / 2 - ABOUT_TILT;
export const ABOUT_ORBIT_RADIUS = 185 / Math.cos(ABOUT_TILT);

/**
 * How far to aim to the side of the subject so it clears the card.
 *
 * Half the frame's width at the subject's distance, times the share to give
 * up. Derived rather than fixed because the frame is wider the further back
 * the camera goes, and wider again on a landscape viewport.
 */
export function aimOffset(
  distance: number,
  fovDegrees: number,
  aspect: number,
  share: number = CARD_SHARE
): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  return distance * Math.tan(halfHorizontal) * share;
}

/**
 * The sideways push that clears the card, as a `CameraControls` focal offset
 * in world units — negative, since the offset moves the *camera* along its
 * own right axis, which swings whatever it is looking at the other way across
 * the frame, and the card sits on the left so the subject has to go right.
 *
 * One function for the free orbit, a section, and About, unified — where
 * stage 2 had two different mechanisms (a focal offset for the free view, a
 * shifted look-at target — `framePose`'s own `sideways` — for a section). A
 * focal offset is applied by `camera-controls` *after* it decomposes the
 * orbit, so `_spherical` and `_target` are untouched regardless of which
 * regime is asking for one; a shifted target is not — it is also what the
 * orbit pivots on, which is only safe for a section because a section's
 * camera is parked rather than turning. Now that every regime can be mid-turn
 * (the free orbit always is; About always is; a section briefly is, while its
 * flight lands), only the focal offset is safe everywhere, so everything
 * uses it.
 */
export function focalOffsetX(distance: number, fovDegrees: number, aspect: number, share: number): number {
  return -aimOffset(distance, fovDegrees, aspect, share);
}

/**
 * Camera placement for the free orbit — a satellite at `radius` from
 * `target` (the planet's own centre, by default), at a given azimuth and
 * polar angle. `azimuth`/`polar` follow the same convention `orbitAnglesOf`
 * inverts and `camera-controls`' own `azimuthAngle`/`polarAngle` use: polar
 * measured down from `+Y`, azimuth as `atan2(x, z)`.
 *
 * `target` is a parameter, not always the origin, for the same reason
 * `surfacePoint` in planetLayout.ts takes a centre: a second planet is
 * plausible later, and every orbit in the scene would have to be found and
 * rewritten to add it if this baked the origin in now.
 */
export function orbitPose(
  azimuth: number,
  polar: number,
  radius: number = ORBIT_RADIUS,
  target: readonly [number, number, number] = [0, 0, 0]
): Pose {
  const [tx, ty, tz] = target;
  const [x, z] = azimuthToXZ(azimuth, radius * Math.sin(polar));
  const y = radius * Math.cos(polar);
  return [tx + x, ty + y, tz + z, tx, ty, tz];
}

/**
 * The azimuth and polar angle of a direction from the origin — `orbitPose`'s
 * inverse. Used to turn a point on the tour path, or a building's own
 * direction, into the angles the free-orbit state (`viewRef` in Scene.tsx) is
 * kept in.
 */
export function orbitAnglesOf(direction: readonly [number, number, number]): {
  azimuth: number;
  polar: number;
} {
  const [x, y, z] = direction;
  const radius = Math.hypot(x, y, z) || 1;
  return {
    azimuth: Math.atan2(x, z),
    polar: Math.acos(Math.min(1, Math.max(-1, y / radius))),
  };
}

/**
 * Camera placement for a close-up of a section's building.
 *
 * The sphere-native successor to `framePose()`, built from the building's own
 * local frame (`tangentBasis`) rather than world azimuth and `+Y` — the
 * reason `framePose` could send the camera underground for a building away
 * from the equator, and `sectionPose` cannot: every axis it uses is the
 * building's own, so there is no latitude for it to disagree with.
 *
 * Mirrors `framePose`'s own construction with local axes in place of global
 * ones — `forward` (the building's local north) stands in for the azimuth
 * direction, `up` (the building's own outward normal) stands in for world
 * `+Y` — so `distance` still means exactly what it meant there: the
 * straight-line camera-to-target distance `frameDistance()` computes,
 * regardless of the building's latitude. The sideways push that used to be
 * `framePose`'s own `sideways` parameter is gone — see `focalOffsetX`.
 */
export function sectionPose(target: readonly [number, number, number], distance: number, tilt: number = SECTION_TILT): Pose {
  // tangentBasis normalizes its own input, so target's magnitude never needs
  // recovering here — only its direction from the origin matters.
  const { up, forward } = tangentBasis(target as Direction);
  const [tx, ty, tz] = target;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return [
    tx + forward[0] * distance * cos + up[0] * distance * sin,
    ty + forward[1] * distance * cos + up[1] * distance * sin,
    tz + forward[2] * distance * cos + up[2] * distance * sin,
    tx,
    ty,
    tz,
  ];
}

/**
 * Eased progress for a camera flight: still at both ends, quickest in the
 * middle.
 *
 * Symmetrical rather than an ease-*out*, which is what camera-controls' own
 * `smoothTime` damping gives you. A damped flight spends most of its travel in
 * its first moments, and the flight that matters most here — backing out of a
 * section once the detail page is dismissed — begins with the sheet still
 * sliding off the screen. Nearly all of the movement therefore happened behind
 * an opaque panel, and what was left when the canvas came back into view was
 * the last tenth of it: a snap, not a camera pulling back. Holding the start
 * still buys that half-second back.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * A camera placement `t` of the way from one framing to another.
 *
 * Interpolated as an *orbit* — radius, tilt and azimuth about the look-at
 * point, with the look-at point itself travelling in a straight line — rather
 * than by lerping the two camera positions. A straight line between two points
 * on a sphere is a chord: pulling back from a building to the planet overview
 * that way would dip the camera closer to the world half way through before
 * finally retreating, since the midpoint of the chord sits inside the arc.
 *
 * (`CameraControls.lerp()` does interpolate spherically and would otherwise be
 * the built-in answer, but it recovers both azimuths through `atan2` and then
 * subtracts them raw. Two framings either side of ±π are a fraction of a turn
 * apart and it sweeps the long way round between them — most visibly when
 * About, which never stops orbiting, is left from wherever it had drifted to.
 * `wrapAngle` below is the whole difference.)
 */
export function glidePose(from: Pose, to: Pose, t: number): Pose {
  const a = orbitOf(from);
  const b = orbitOf(to);

  const radius = a.radius + (b.radius - a.radius) * t;
  const polar = a.polar + (b.polar - a.polar) * t;
  const azimuth = a.azimuth + wrapAngle(b.azimuth - a.azimuth) * t;

  const tx = from[3] + (to[3] - from[3]) * t;
  const ty = from[4] + (to[4] - from[4]) * t;
  const tz = from[5] + (to[5] - from[5]) * t;

  const [x, z] = azimuthToXZ(azimuth, radius * Math.sin(polar));
  return [tx + x, ty + radius * Math.cos(polar), tz + z, tx, ty, tz];
}

/** A pose read as an orbit about its own look-at point. */
function orbitOf(pose: Pose): { radius: number; polar: number; azimuth: number } {
  const x = pose[0] - pose[3];
  const y = pose[1] - pose[4];
  const z = pose[2] - pose[5];
  const radius = Math.hypot(x, y, z);
  // A camera sitting exactly on what it looks at has no direction to preserve;
  // any angle will do, and the radius is what the interpolation moves anyway.
  if (radius === 0) return { radius: 0, polar: 0, azimuth: 0 };
  // Polar measured down from +Y and azimuth as atan2(x, z), matching
  // three.js's Spherical — the same convention azimuthToXZ inverts.
  return {
    radius,
    polar: Math.acos(Math.min(1, Math.max(-1, y / radius))),
    azimuth: Math.atan2(x, z),
  };
}

/**
 * CameraControls follows three.js's `Spherical` convention, where the
 * azimuth is measured as `atan2(x, z)` (not the more familiar `atan2(z, x)`)
 * — i.e. `x = radius * sin(azimuth)`, `z = radius * cos(azimuth)`. Any XZ
 * position built from an `azimuthAngle` value has to use this convention or
 * it silently points somewhere else entirely.
 */
export function azimuthToXZ(azimuth: number, radius: number): [number, number] {
  return [Math.sin(azimuth) * radius, Math.cos(azimuth) * radius];
}

/** Wraps an angle (in radians) into (-π, π]. */
export function wrapAngle(angle: number): number {
  const turn = Math.PI * 2;
  return ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI;
}

/**
 * A full camera placement: `[posX, posY, posZ, targetX, targetY, targetZ]`,
 * i.e. exactly the six leading arguments of CameraControls' `setLookAt`, and
 * one half of `lerpLookAt`. Both call sites spread the same tuple, so a
 * framing can only ever be defined in one place.
 */
export type Pose = [number, number, number, number, number, number];

/** Gap between the top of a building and the dot floating over it. */
export const MARKER_CLEARANCE = 1.1;

/**
 * How much of a marker sprite's quad the drawn disc covers, measured from its
 * centre as a fraction of the quad's full height.
 *
 * The trail stops a fixed clearance from *this* edge, so the number has to be
 * the one the texture is painted with rather than a second guess at it — hence
 * both the painter and the sizing maths below reading it from here.
 */
export const MARKER_DOT_FILL = 0.37;

/** The dot's rim, in the same units. It straddles the disc's edge. */
export const MARKER_DOT_RIM = 0.06;

/**
 * How many CSS pixels one world unit spans, `viewDepth` in front of the camera.
 *
 * `viewDepth` is the distance along the camera's forward axis — the `-z` of the
 * point in view space, which is exactly what the projection divides by. The
 * straight-line distance from the camera is a different number, and using it
 * would misjudge anything away from the centre of the frame.
 */
export function pixelsPerWorldUnit(
  viewDepth: number,
  fovDegrees: number,
  viewportHeight: number
): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  return viewportHeight / (2 * Math.tan(halfVertical) * viewDepth);
}

/**
 * The world scale a marker sprite needs for its drawn disc to come out
 * `radiusPx` across on screen.
 *
 * A sprite is a billboard: three.js offsets its corners in *view* space
 * (`mvPosition.xy += rotatedPosition` in the sprite shader), so its size on
 * screen is its scale times the pixels-per-unit at its own depth. Nothing else
 * enters into it — not the camera's tilt, not where in the frame it sits.
 *
 * Recovering that size afterwards by projecting a world-space offset, which is
 * what this replaced, gets both of those wrong: a world-vertical offset is
 * foreshortened by the tilt and stretched by perspective towards the edges of
 * the frame. Deciding the pixel size and solving for the world scale instead
 * leaves nothing to estimate, which is what lets the trail hold a fixed
 * clearance from the dot's edge however the camera moves.
 */
export function markerScaleForScreenRadius(
  radiusPx: number,
  viewDepth: number,
  fovDegrees: number,
  viewportHeight: number
): number {
  return radiusPx / (MARKER_DOT_FILL * pixelsPerWorldUnit(viewDepth, fovDegrees, viewportHeight));
}

/**
 * Whether the frame's dimensions actually changed — i.e. whether a focal
 * offset, which is a share of the frame's width, has to be recomputed.
 *
 * By value, and not by the identity of the object holding them, which is the
 * whole reason this is a named function with a test. `useThree`'s `size` is
 * handed back as a *fresh object* on re-renders that have nothing to do with a
 * resize, so `prev === next` reads every re-render as a resize. That is not a
 * harmless extra recomputation: the resize path *snaps* the offset to its
 * destination, so a re-render that focused an area (or left one) teleported the
 * offset there a moment before the flight read it as its starting value. From
 * and to came out equal, the offset never travelled, and the frame jumped
 * sideways by the whole push instead — measured at 141px focusing an area and
 * 164px leaving one, on a 1280px-wide frame.
 */
export function frameSizeChanged(
  prev: { width: number; height: number },
  next: { width: number; height: number }
): boolean {
  return prev.width !== next.width || prev.height !== next.height;
}
