import type { SectionType } from "@/types";

/**
 * Where the world sits and where the camera looks from.
 *
 * Deliberately free of three.js and R3F imports: the building positions and
 * the camera framings derived from them are plain arithmetic, and keeping
 * them here means they can be reasoned about (and tested) without spinning up
 * a renderer. Diorama places the buildings from this; Scene aims the camera
 * with it — previously the two held separate copies that a comment asked you
 * to keep in sync by hand.
 */

/** World positions of each section building. */
export const BUILDING_POSITIONS = {
  products: [1, 0.2, -2] as [number, number, number],
  skills: [7, 0.2, -3.5] as [number, number, number],
  experience: [6, 0.2, 5] as [number, number, number],
  about: [-6.5, 0.2, 4] as [number, number, number],
  contact: [-7, 0.2, -3] as [number, number, number],
};

/** How high up each building the camera aims — roughly its mid-height. */
const FOCUS_HEIGHT: Record<NonNullable<SectionType>, number> = {
  about: 1.5,
  products: 3.5,
  skills: 3,
  experience: 2,
  contact: 2.5,
};

/** Look-at point for each section: building centre, raised to mid-height. */
export const sectionTargets = Object.fromEntries(
  (Object.keys(BUILDING_POSITIONS) as (keyof typeof BUILDING_POSITIONS)[]).map((key) => [
    key,
    [BUILDING_POSITIONS[key][0], FOCUS_HEIGHT[key], BUILDING_POSITIONS[key][2]],
  ])
) as Record<NonNullable<SectionType>, [number, number, number]>;

/**
 * The free diorama view, set from measured world bounds rather than guessed.
 *
 * Measured extents: the island spans roughly ±14 in XZ and reaches y = 12.2 at
 * the tip of the Products tower's antenna, with its underside at y = -7.3.
 *
 * The old values (radius 24, aiming at y = 1) tilted the view down 22.6°,
 * which against a 45° vertical fov put the top edge of the frame within a
 * tenth of a degree of horizontal — so anything above the camera's own eye
 * height was off-screen, and the tower always had its top cut off. Aiming at
 * the middle of the content rather than at the ground fixes it: at y = 3.5 the
 * tilt is 16.1°, which clears the tower and still keeps the island's underside
 * inside the bottom edge.
 *
 * The radius grew from 26 to 27.5 when the island was pushed right to clear the
 * card (see `HOME_CARD_SHARE`). At 26 the push left the island's right edge at
 * 98.2% of the frame's width at the worst angle of a full turn — touching the
 * edge, and certain to cross it at some angle between the twelve sampled.
 * Backing off 5.8% brings the worst angle to 95.3%, a margin that holds all the
 * way round, and costs less of the island's size than it sounds: it covers
 * 33-36% of the frame against 37-40% before.
 *
 * The height moves with the radius rather than staying put, to hold the tilt at
 * 16.1°: it is `HOME_TARGET_Y + HOME_RADIUS · tan(16.1°)`. Raising the radius
 * alone would have flattened the diorama's three-quarter view into something
 * closer to an elevation. Pinned by a test, since nothing else says the two
 * numbers belong together.
 */
export const HOME_RADIUS = 27.5;
export const HOME_HEIGHT = 11.44;
/** Aim at the middle of the world's height, not at the ground. */
export const HOME_TARGET_Y = 3.5;
export const HOME_ANGLE = Math.PI / 4;

/**
 * Straight-line distance from the home camera to the point it aims at.
 *
 * The home view is stated as a radius and a height rather than as a distance
 * and a tilt, so the hypotenuse has to be recovered before anything can be
 * measured against the width of the frame at the island's own depth. Derived,
 * not typed in, so it cannot fall out of step with the two above.
 */
export const HOME_DISTANCE = Math.hypot(HOME_RADIUS, HOME_HEIGHT - HOME_TARGET_Y);

/**
 * Fraction of the frame's width the home view gives up to the card on the left.
 *
 * Smaller than `CARD_SHARE`, which the sections use: a section is a single
 * building cropped in on, where the home view has to hold the whole island —
 * a wide flat disc whose silhouette already fills most of the frame — so the
 * same push would run its right edge off the screen.
 *
 * The island's centre travels half of this as a fraction of the full frame
 * width (the share is measured against the *half* width), so 0.22 moves it from
 * the middle to a measured 61.7-63.8% across a full turn — against the
 * reference's 61%. That also puts its left edge no further left than 32.0%,
 * clear of the card's right edge at 27.8%, which is what the request was
 * actually about.
 *
 * Set from the *worst* angle of a full turn rather than one screenshot, the same
 * way `ABOUT_RADIUS` was: the island is a disc with a tower on it, so its
 * silhouette breathes as it turns. Sampling that is easy to get wrong — the
 * first pass measured the leftmost and rightmost non-background pixel and read
 * 83% of frame width, but the scene has confetti drifting out to the frame
 * edges and that was mostly what it had found. Counting only columns more than
 * a tenth of the frame deep leaves the island alone, and puts its real width at
 * 57%.
 */
export const HOME_CARD_SHARE = 0.22;

/**
 * How steeply the camera looks down when framing a single area, in radians.
 * Matches the diorama's three-quarter feel rather than dropping to eye level.
 */
export const SECTION_TILT = 0.34;

/** Slack around a framed area so it never touches the edges of the frame. */
export const FRAME_MARGIN = 1.35;

/**
 * How far back a camera needs to sit for a sphere of `radius` to fit.
 *
 * Takes whichever half-angle is tighter, so a tall narrow viewport is fitted
 * on width and a wide one on height — the reason this is computed rather than
 * fixed is that a single hardcoded distance frames the 12-unit Products tower
 * and the 4-unit library equally badly.
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
 * About's framing departs from every other section's, but only in angle —
 * not in what it orbits. Every other section pivots tightly on its own
 * building; About has no card to clear and no single subject to crop in on,
 * so it keeps turning round the same axis the free/home view does (the
 * vertical line through the island's centre) rather than the small "about"
 * building itself. Framing it as a subject to close in on, the way this originally
 * shipped, pivoted the idle rotation on that building instead of the island —
 * a different axis from every other view on the site, which read as the
 * building holding still while the world spun around it.
 */
export const ABOUT_TILT = 0.62;

/**
 * How far About's orbit sits from the axis, horizontally.
 *
 * Its own value rather than `HOME_RADIUS`: sharing the *axis* is what keeps
 * the rotation reading like every other view on the site, and that only
 * requires the circle be centred on the same vertical line — not that it be
 * the same size. Pulling the radius out here is what lets the diorama be
 * framed to sit fully inside the frame (measured against reference/image2.png)
 * without ever moving the pivot off that shared line.
 *
 * Set from the *widest* angle, not a single screenshot. The island is a disc
 * with a tower and signs on it, so its silhouette breathes as it turns —
 * sampled across a turn it ran 45.8%..50.0% of frame width, and framing to
 * the average left the widest angles sliced off the right edge (measured
 * 99.9%). Backing off until the worst angle clears is the only setting that
 * holds for every frame of the rotation rather than for the one that was shot.
 */
export const ABOUT_RADIUS = 32;

/**
 * Where along the shared axis About aims.
 *
 * Below `HOME_TARGET_Y`, which pushes the island *up* the frame: the camera
 * centres on whatever it aims at, so a lower aim point lifts everything above
 * it into view. The home view aims at 3.5 to clear the Products tower, but at
 * About's steeper tilt that same aim buried the island's underside off the
 * bottom edge — measured at 99.9% of frame height, against 90.4% in the
 * reference, i.e. cropped rather than sitting complete in its own space.
 *
 * Solved rather than guessed: one frame-height here spans `2 · ABOUT_DISTANCE
 * · tan(fov/2)` world units, and a drop in the aim point travels
 * `cos(ABOUT_TILT)` of that on screen — which put the island's measured centre
 * within a point of the reference's 52.7% on the first try.
 */
export const ABOUT_TARGET_Y = -1.7;

/** The hypotenuse: back off along the tilt so the horizontal leg is the radius. */
export const ABOUT_DISTANCE = ABOUT_RADIUS / Math.cos(ABOUT_TILT);

/**
 * A larger share than the cards get, since the text column beside it is a
 * whole page rather than a small card.
 *
 * Not pushed far enough to sit the island's left edge exactly on the
 * reference's 52%: this island is a wide flat disc where the reference's is a
 * tall dense cluster (measured 48.9% of frame width against 45.5%), so the
 * extra push that matched the left edge ran the right edge off at 99.9%.
 * What the reference is actually doing — object whole, clear of the text — is
 * matched better by the gap: 2.9% of frame width here against its 3.1%.
 */
export const ABOUT_CARD_SHARE = 0.42;

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
 * Camera placement looking at `target` from `azimuth`, backed off by
 * `distance`. A positive `sideways` aims left of the subject, which is what
 * pushes the subject to the right of the frame, out from under the card.
 */
export function framePose(
  target: readonly [number, number, number],
  azimuth: number,
  distance: number,
  tilt: number = SECTION_TILT,
  sideways = 0
): Pose {
  const [tx, ty, tz] = target;
  const [dx, dz] = azimuthToXZ(azimuth, distance * Math.cos(tilt));
  // The camera's right in world XZ is a quarter turn round from its azimuth.
  const [rx, rz] = azimuthToXZ(azimuth + Math.PI / 2, sideways);
  return [tx + dx, ty + distance * Math.sin(tilt), tz + dz, tx - rx, ty, tz - rz];
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
 * on a sphere is a chord: pulling back from a building to the island overview
 * that way would dip the camera closer to the town half way through before
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

/** Every focusable area, in the order they sit in the world. */
export const SECTIONS = Object.keys(BUILDING_POSITIONS) as NonNullable<SectionType>[];

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
 * The orbit azimuth that puts a section's area between the camera and the
 * centre of the island — i.e. squarely in front of you, seen from the
 * overview distance. Same `atan2(x, z)` convention as azimuthToXZ.
 */
export function sectionAzimuth(section: NonNullable<SectionType>): number {
  const [tx, , tz] = sectionTargets[section];
  return Math.atan2(tx, tz);
}

/**
 * Which area is front-and-centre at a given orbit azimuth — the one whose
 * own azimuth the camera is closest to, measured the short way round.
 *
 * This is the single source of truth for "which spot am I looking at". The
 * card reads it rather than being set alongside the camera: two places both
 * deciding, and having to agree, is what turns a rotation into a fight.
 */
export function facingSection(azimuth: number): NonNullable<SectionType> {
  let best = SECTIONS[0];
  let bestDistance = Infinity;

  for (const section of SECTIONS) {
    const distance = Math.abs(wrapAngle(sectionAzimuth(section) - azimuth));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = section;
    }
  }
  return best;
}

/**
 * The areas in the order the camera meets them going round, rather than the
 * order they happen to be declared in. Swiping the card steps through this, so
 * "next" means the next spot you would reach by turning, not the next key in
 * an object.
 */
export const SECTIONS_BY_AZIMUTH = [...SECTIONS].sort(
  (a, b) => sectionAzimuth(a) - sectionAzimuth(b)
);

/**
 * The area one step round from `from`. Wraps, so stepping past the last spot
 * continues onto the first rather than stopping.
 */
export function adjacentSection(
  from: NonNullable<SectionType>,
  step: number
): NonNullable<SectionType> {
  const order = SECTIONS_BY_AZIMUTH;
  const index = order.indexOf(from);
  if (index === -1) return order[0];
  const count = order.length;
  return order[(((index + step) % count) + count) % count];
}

/** Where the camera sits in the free diorama view, at a given orbit azimuth. */
export function homePose(azimuth: number): Pose {
  const [x, z] = azimuthToXZ(azimuth, HOME_RADIUS);
  return [x, HOME_HEIGHT, z, 0, HOME_TARGET_Y, 0];
}

/**
 * How far to truck the home camera along its own right axis so the island sits
 * clear of the card, as a CameraControls focal offset in world units.
 *
 * Negative: the offset moves the *camera* rightward, so the island it is
 * looking at swings the other way across the frame — and the card is on the
 * left, so the island has to go right.
 *
 * This is deliberately not the `sideways` argument to `framePose()`, which the
 * sections use. That one shifts the look-at *target*, and the target is also
 * what the orbit pivots on: shifting it would set the island turning about a
 * point off its own centre, tracing a circle across the screen over one
 * revolution instead of holding still. It would also move `azimuthAngle`'s
 * frame of reference by a constant, so `facingSection()` would name an area
 * next to the one actually in front. A focal offset has neither problem —
 * camera-controls applies it after decomposing the orbit, leaving `_spherical`
 * and `_target` untouched. The sections get away with the target shift only
 * because they are parked, and About because it rebuilds its pose every frame.
 */
export function homeFocalOffsetX(fovDegrees: number, aspect: number): number {
  return -aimOffset(HOME_DISTANCE, fovDegrees, aspect, HOME_CARD_SHARE);
}

/**
 * Whether the frame's dimensions actually changed — i.e. whether the focal
 * offset above, which is a share of the frame's width, has to be recomputed.
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
