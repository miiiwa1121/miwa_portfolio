import type { SectionType } from "@/types";
import { latLonToDirection, type Direction } from "./planetLayout";

/**
 * Where each section's building stands on the planet, and which way it faces.
 *
 * The flat world put these in world coordinates (`BUILDING_POSITIONS` in
 * worldLayout.ts). On a sphere the world position is derived — direction times
 * the planet's radius — so what is actually authored is a latitude and a
 * longitude. Keeping them in degrees is deliberate: these are numbers a person
 * tunes while looking at screenshots, and radians are not.
 *
 * **These values are provisional.** The plan tunes them in stage 2 against the
 * rendered planet (see docs/planet-migration.md); what is fixed here is the
 * shape of the data, not the numbers. Two constraints they must keep:
 *
 * - **Latitude stays inside ±60** (`MAX_TOUR_LATITUDE`). `camera.up` is pinned
 *   to +Y, so a camera framing something near a pole has its view direction
 *   nearly parallel to its own up vector and the roll goes wherever `lookAt`'s
 *   degenerate case sends it. The camera rides the tour path through these
 *   anchors, so their latitudes are the camera's latitudes — with about a
 *   degree of spline overshoot on top. There is a test for the built path.
 * - **Longitudes stay spread.** The tour visits them eastward, so two sections
 *   at nearly the same longitude give it a near-doubled-back leg, which reads
 *   as the camera lurching.
 * - **Neighbouring latitudes stay close.** The first draft alternated +42, -34,
 *   +26, -48 around the loop, which is a rollercoaster rather than a satellite:
 *   three swings of 60-76° of latitude in a single lap. These drift one way and
 *   then back, the way an inclined orbit does.
 */
export const PLANET_SECTIONS: Record<
  NonNullable<SectionType>,
  { lat: number; lon: number; yaw: number }
> = {
  products: { lat: 6, lon: 0, yaw: 0 },
  skills: { lat: 38, lon: 70, yaw: 0 },
  experience: { lat: 30, lon: 150, yaw: 0 },
  about: { lat: -18, lon: 212, yaw: 0 },
  contact: { lat: -44, lon: 290, yaw: 0 },
};

/**
 * Why every yaw is zero, and what a non-zero one would mean.
 *
 * `tangentBasis(normal, 0).forward` points along the surface towards the north
 * pole, and the buildings are modelled with their signboards on their local +Z
 * — so yaw 0 turns every signboard to face north. That is the right default
 * because the section camera comes from the north too: `sectionPose` tilts away
 * from the normal along this same tangent, so a building at yaw 0 is looking
 * straight at the camera that frames it.
 *
 * The two are therefore coupled. If the section framing is ever tilted along a
 * different tangent, every yaw here has to turn with it, or the hero shot of
 * each section becomes a view of its blank side.
 */

/** The surface normal a section's building stands on. */
export function sectionDirection(section: NonNullable<SectionType>): Direction {
  const { lat, lon } = PLANET_SECTIONS[section];
  return latLonToDirection(lat, lon);
}

/**
 * Every section, in the order they happen to be declared.
 *
 * Not a visiting order — that is the tour's business, and it is decided by
 * distance rather than by declaration (see `tour.ts`). Kept in step with
 * `SECTIONS` in worldLayout.ts by being derived from the same shape.
 */
export const PLANET_SECTION_KEYS = Object.keys(PLANET_SECTIONS) as NonNullable<SectionType>[];
