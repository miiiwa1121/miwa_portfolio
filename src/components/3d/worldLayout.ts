import type { SectionType } from "../AppStateContext";

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
 */
export const HOME_RADIUS = 26;
export const HOME_HEIGHT = 11;
/** Aim at the middle of the world's height, not at the ground. */
export const HOME_TARGET_Y = 3.5;
export const HOME_ANGLE = Math.PI / 4;

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

/** Where the camera sits in the free diorama view, at a given orbit azimuth. */
export function homePose(azimuth: number): Pose {
  const [x, z] = azimuthToXZ(azimuth, HOME_RADIUS);
  return [x, HOME_HEIGHT, z, 0, HOME_TARGET_Y, 0];
}
