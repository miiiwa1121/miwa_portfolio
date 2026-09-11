import type { SectionType } from "@/types";
import {
  angleBetween,
  latLonToDirection,
  normalize,
  slerpDirection,
  type Direction,
} from "./geometry";
import { PLANET_SECTIONS, PLANET_SECTION_KEYS, sectionDirection } from "./sections";

/**
 * The closed path the camera travels when you scroll.
 *
 * The flat world let scrolling mean one thing — turn the orbit's azimuth — and
 * a single lap passed every building because they all sat around one ring. On a
 * sphere with the sections scattered, a lap at a fixed latitude misses whatever
 * is not near that latitude, and "scroll and you will meet everything" is the
 * property the hub is built on: the card, the wheel through the stack and the
 * dotted trail all assume the thing in front of you is reachable by scrolling.
 *
 * So the path is drawn *through* the buildings instead of around the axis. The
 * altitude never changes — the camera is still a satellite at a fixed height —
 * but its heading now drifts north and south as well as east.
 *
 * Free of three.js, like the rest of `planet/`: it is arithmetic over angles
 * and unit vectors, and being able to assert the path passes through every
 * anchor and never leaves the safe latitude band without standing up a renderer
 * is most of why it is written this way.
 */

/** How finely each leg is sampled when the arc-length table is built. */
const SAMPLES_PER_SEGMENT = 48;

/**
 * How many extra samples a `nearestU` answer is refined with.
 *
 * A fixed local resample rather than an iterative search: the cost is constant,
 * the answer cannot depend on a convergence threshold, and this runs on the
 * frame a drag ends rather than every frame.
 */
const REFINE_SAMPLES = 32;

/**
 * How far from the equator the path — and therefore the camera — may go.
 *
 * `camera.up` is pinned to +Y, so a camera looking at the planet from near a
 * pole has its view direction nearly parallel to its own up vector, and the
 * roll goes wherever `lookAt`'s degenerate case sends it. The same bound
 * clamps the free look. Sections are authored well inside it; this is the
 * backstop, and there is a test that the built path respects it.
 */
export const MAX_TOUR_LATITUDE = 60;

export type Anchor = { lat: number; lon: number };

export type Tour = {
  /** Direction on the sphere at `u`, where `u` is the fraction of arc travelled. */
  direction(u: number): Direction;
  /** The `u` at which the path passes through anchor `index`. */
  anchorU(index: number): number;
  /** The `u` whose point on the path is closest to `dir`. */
  nearestU(dir: Direction): number;
  /** Total length of the closed path, in radians of arc. */
  length: number;
  /** The visiting order the path was built from, as indices into the input. */
  order: number[];
};

/**
 * The order the path visits anchors in: eastward, by longitude.
 *
 * This is the same rule `SECTIONS_BY_AZIMUTH` used on the flat world (longitude
 * *is* the orbit azimuth, see `latLonToDirection`), so the card wheel keeps
 * stepping through the areas in the order you would reach them by scrolling —
 * and if every latitude were zero the path would collapse back to exactly
 * today's ring.
 *
 * The obvious alternative — the genuinely shortest cycle, brute-forced over the
 * twelve distinct tours of five points — was written first and thrown away. It
 * can order the anchors so the path doubles back in longitude, which both reads
 * as the camera changing its mind and breaks the one-lap-one-revolution
 * property the scroll depends on.
 */
export function orderByLongitude(anchors: Anchor[]): number[] {
  return anchors
    .map((anchor, index) => ({ index, lon: ((anchor.lon % 360) + 360) % 360 }))
    .sort((a, b) => a.lon - b.lon || a.index - b.index)
    .map((entry) => entry.index);
}

/**
 * One coordinate of a Catmull-Rom spline through four control values.
 *
 * Catmull-Rom because it passes *through* its controls: the path has to
 * actually arrive at each building, not merely be pulled towards it.
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Builds a closed path through `anchors`, in the order they are given.
 *
 * **Interpolated in latitude and longitude, not between the direction vectors.**
 * The first version splined the unit vectors and pushed the result back onto
 * the sphere, which is the textbook way to draw a smooth curve on a sphere —
 * and it sent the camera to latitude 71° south from anchors that never went
 * past 48°. That is not spline overshoot; dropping the tension to zero, leaving
 * plain great-circle legs, still reached 71°. **Two points at the same southern
 * latitude are joined by a great circle that bulges further south than either
 * of them**, the geometry that sends a Tokyo-to-New-York flight over the
 * Arctic, and the bulge grows fast with the length of the leg. From latitude
 * 40° south:
 *
 * | leg | 36° | 72° | 100° | 144° | 170° |
 * | --- | --- | --- | --- | --- | --- |
 * | bulge | 1.4° | 6.0° | 12.5° | 29.8° | 44.1° |
 *
 * Most of that 71° was really the *ordering*: the first draft visited the
 * anchors in shortest-cycle order, which handed it a 144° leg between two
 * southern buildings. Ordering eastward instead (see `orderByLongitude`) caps
 * the legs at roughly 360°/n and brings the same anchors back to 48.1°.
 *
 * Interpolating the angles removes the bulge outright rather than shrinking it,
 * and that is the reason to keep it even once the ordering is fixed: **the
 * latitude bound stops depending on how evenly the longitudes happen to be
 * spread.** Stage 2 tunes these positions against screenshots, and a coupling
 * where moving one building east quietly drops the camera 10° further south is
 * exactly the kind that gets found late. What overshoot remains is the spline's
 * own, measured at 1.2° and shrinking with tension.
 *
 * Longitude is unwrapped before interpolating so that one lap is one
 * revolution: left wrapped, the step from 350° to 10° reads as a 340° journey
 * backwards, and the camera would spin most of the way round the planet between
 * two neighbouring buildings.
 *
 * **Parameterized by arc length, not by spline parameter.** A spline's own `t`
 * runs at whatever speed the control points imply — quick through a tight
 * corner, slow along a straight — so scrolling a fixed amount would move the
 * camera a different distance depending on where it happened to be. Sampling
 * densely and then indexing by cumulative arc makes one unit of scroll one unit
 * of travel everywhere on the path.
 */
export function buildTour(anchors: Anchor[]): Tour {
  const n = anchors.length;

  if (n === 0) {
    const nowhere: Direction = [0, 0, 1];
    return { direction: () => nowhere, anchorU: () => 0, nearestU: () => 0, length: 0, order: [] };
  }
  if (n === 1) {
    const only = latLonToDirection(anchors[0].lat, anchors[0].lon);
    return { direction: () => only, anchorU: () => 0, nearestU: () => 0, length: 0, order: [0] };
  }

  const lat = anchors.map((a) => a.lat);
  // Unwrapped so it climbs monotonically and gains exactly one turn per lap.
  const lon: number[] = [anchors[0].lon];
  for (let i = 1; i < n; i++) {
    let step = anchors[i].lon - anchors[i - 1].lon;
    while (step <= 0) step += 360;
    while (step > 360) step -= 360;
    lon.push(lon[i - 1] + step);
  }

  // Control values outside [0, n) come from the next lap round, which for
  // longitude means another full turn.
  const control = (values: number[], i: number, perLap = 0) => {
    const index = ((i % n) + n) % n;
    return values[index] + Math.floor(i / n) * perLap;
  };

  const samples: Direction[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < SAMPLES_PER_SEGMENT; j++) {
      const t = j / SAMPLES_PER_SEGMENT;
      samples.push(
        latLonToDirection(
          catmullRom(control(lat, i - 1), control(lat, i), control(lat, i + 1), control(lat, i + 2), t),
          catmullRom(
            control(lon, i - 1, 360),
            control(lon, i, 360),
            control(lon, i + 1, 360),
            control(lon, i + 2, 360),
            t
          )
        )
      );
    }

  // Cumulative arc, with the closing step back to the first sample so the last
  // entry is the length of the whole loop.
  const cumulative = new Float64Array(samples.length + 1);
  for (let k = 1; k <= samples.length; k++)
    cumulative[k] = cumulative[k - 1] + angleBetween(samples[k - 1], samples[k % samples.length]);
  const length = cumulative[samples.length];

  const wrap = (u: number) => ((u % 1) + 1) % 1;

  const direction = (u: number): Direction => {
    if (length === 0) return samples[0];
    const target = wrap(u) * length;
    // Largest k with cumulative[k] <= target.
    let lo = 0;
    let hi = samples.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cumulative[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    const span = cumulative[lo + 1] - cumulative[lo];
    const t = span > 1e-12 ? (target - cumulative[lo]) / span : 0;
    return slerpDirection(samples[lo], samples[(lo + 1) % samples.length], t);
  };

  const anchorU = (index: number) => {
    if (length === 0) return 0;
    return cumulative[(((index % n) + n) % n) * SAMPLES_PER_SEGMENT] / length;
  };

  const nearestU = (dir: Direction): number => {
    if (length === 0) return 0;
    const target = normalize(dir);
    let bestK = 0;
    let bestAngle = Infinity;
    for (let k = 0; k < samples.length; k++) {
      const angle = angleBetween(target, samples[k]);
      if (angle < bestAngle) {
        bestAngle = angle;
        bestK = k;
      }
    }
    // Refine inside the sample either side of the winner, so the answer is not
    // quantised to the sampling step.
    const step = 1 / samples.length;
    const centre = cumulative[bestK] / length;
    let bestU = centre;
    for (let i = 0; i <= REFINE_SAMPLES; i++) {
      const u = centre + (i / REFINE_SAMPLES - 0.5) * 2 * step;
      const angle = angleBetween(target, direction(u));
      if (angle < bestAngle) {
        bestAngle = angle;
        bestU = u;
      }
    }
    return wrap(bestU);
  };

  return { direction, anchorU, nearestU, length, order: anchors.map((_, i) => i) };
}

/** The sections in the order the tour visits them, eastward. */
export const TOUR_ORDER: NonNullable<SectionType>[] = orderByLongitude(
  PLANET_SECTION_KEYS.map((section) => PLANET_SECTIONS[section])
).map((i) => PLANET_SECTION_KEYS[i]);

/** The path itself, through the real sections. */
export const PLANET_TOUR: Tour = buildTour(TOUR_ORDER.map((section) => PLANET_SECTIONS[section]));

/** Where along the path a given section sits. */
export function sectionU(section: NonNullable<SectionType>): number {
  return PLANET_TOUR.anchorU(TOUR_ORDER.indexOf(section));
}

/**
 * The section one step round the tour from `from`.
 *
 * Replaces `adjacentSection`'s sort by azimuth, which only ordered the areas
 * correctly while they all sat on one ring. Wraps, so stepping past the last
 * continues onto the first.
 */
export function adjacentOnTour(
  from: NonNullable<SectionType>,
  step: number
): NonNullable<SectionType> {
  const index = TOUR_ORDER.indexOf(from);
  if (index === -1) return TOUR_ORDER[0];
  const count = TOUR_ORDER.length;
  return TOUR_ORDER[(((index + step) % count) + count) % count];
}

/**
 * Which section is closest to a direction, measured as a great-circle angle.
 *
 * The successor to `facingSection`, which compared azimuths alone. That was
 * only ever the right question while every area sat at the same latitude: seen
 * from over a pole every azimuth is equally close to everything, and the old
 * comparison would name an area by an angle that no longer meant anything.
 * Comparing directions is well defined from everywhere the camera can now go.
 */
export function facingSectionOnPlanet(dir: Direction): NonNullable<SectionType> {
  let best = PLANET_SECTION_KEYS[0];
  let bestAngle = Infinity;
  for (const section of PLANET_SECTION_KEYS) {
    const angle = angleBetween(dir, sectionDirection(section));
    if (angle < bestAngle) {
      bestAngle = angle;
      best = section;
    }
  }
  return best;
}
