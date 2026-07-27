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

export const HOME_RADIUS = 24;
export const HOME_HEIGHT = 11;
export const HOME_ANGLE = Math.PI / 4;

/** How far back from a building the camera parks, and how far above it. */
export const SECTION_DISTANCE = 13;
export const SECTION_RISE = 6;

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

/**
 * Where the camera sits when a building is focused: backed off along the ray
 * from the island centre through the building, and raised above it.
 */
export function sectionPose(section: NonNullable<SectionType>): Pose {
  const [tx, ty, tz] = sectionTargets[section];
  // Normalised outward direction, without allocating a Vector2 — this runs
  // every frame while scrolling. A building sitting dead centre has no
  // meaningful outward ray, so fall back to +Z.
  const len = Math.hypot(tx, tz);
  const dx = len < 0.001 ? 0 : tx / len;
  const dz = len < 0.001 ? 1 : tz / len;
  return [
    tx + dx * SECTION_DISTANCE,
    ty + SECTION_RISE,
    tz + dz * SECTION_DISTANCE,
    tx,
    ty,
    tz,
  ];
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

/** Every focusable area, in the order they sit in the world. */
export const SECTIONS = Object.keys(BUILDING_POSITIONS) as NonNullable<SectionType>[];

/**
 * Height of each area's marker, in world units, measured from the ground.
 *
 * These clear the top of each structure by roughly a marker's width, so the
 * dot floats just above the roofline rather than embedded in it. They are
 * hand-tuned against the current procedural buildings (chimney, antenna,
 * rooftop unit and all) and will want re-tuning whenever those change shape.
 */
const MARKER_HEIGHT: Record<NonNullable<SectionType>, number> = {
  about: 5.7, // cottage: roof 7 voxels + chimney to 11
  products: 13.3, // pink tower: 18 + penthouse + antenna to 29
  skills: 8.7, // blue tower: 15 + rooftop unit to 18
  experience: 4.9, // library: 7 + thick green roof to 9
  contact: 5.7, // billboard: posts 8, board top at 11
};

/** Where an area's marker floats: directly above its building. */
export function markerAnchor(section: NonNullable<SectionType>): [number, number, number] {
  const [x, , z] = BUILDING_POSITIONS[section];
  return [x, MARKER_HEIGHT[section], z];
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
  return [x, HOME_HEIGHT, z, 0, 1, 0];
}
