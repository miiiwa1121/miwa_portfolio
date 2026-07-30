import { describe, expect, it } from "vitest";
import {
  MAX_TOUR_LATITUDE,
  PLANET_TOUR,
  TOUR_ORDER,
  adjacentOnTour,
  buildTour,
  facingSectionOnPlanet,
  orderByLongitude,
  sectionU,
  type Anchor,
} from "./tour";
import { PLANET_SECTIONS, PLANET_SECTION_KEYS, sectionDirection } from "./sections";
import { angleBetween, latLonToDirection, normalize, type Direction } from "./planetLayout";

const latitudeOf = (dir: Direction) => (Math.asin(Math.max(-1, Math.min(1, dir[1]))) * 180) / Math.PI;

/** The latitudes the path actually reaches, sampled finely enough to catch a peak. */
function latitudeRange(tour: { direction(u: number): Direction }) {
  let min = 90;
  let max = -90;
  for (let i = 0; i < 2000; i++) {
    const lat = latitudeOf(tour.direction(i / 2000));
    min = Math.min(min, lat);
    max = Math.max(max, lat);
  }
  return { min, max };
}

const equatorSquare: Anchor[] = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 90 },
  { lat: 0, lon: 180 },
  { lat: 0, lon: 270 },
];

describe("orderByLongitude", () => {
  it("visits anchors eastward whatever order they arrive in", () => {
    const anchors: Anchor[] = [
      { lat: 0, lon: 200 },
      { lat: 0, lon: 10 },
      { lat: 0, lon: 300 },
      { lat: 0, lon: 95 },
    ];
    expect(orderByLongitude(anchors)).toEqual([1, 3, 0, 2]);
  });

  it("normalizes longitudes outside 0..360 before comparing", () => {
    const anchors: Anchor[] = [
      { lat: 0, lon: -20 }, // 340
      { lat: 0, lon: 400 }, // 40
      { lat: 0, lon: 100 },
    ];
    expect(orderByLongitude(anchors)).toEqual([1, 2, 0]);
  });

  it("breaks ties by declaration order rather than leaving it to the sort", () => {
    const anchors: Anchor[] = [
      { lat: 10, lon: 50 },
      { lat: -10, lon: 50 },
    ];
    expect(orderByLongitude(anchors)).toEqual([0, 1]);
  });

  it("returns every index exactly once", () => {
    const anchors = [0, 210, 40, 130, 330].map((lon) => ({ lat: 0, lon }));
    expect([...orderByLongitude(anchors)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("buildTour", () => {
  it("passes exactly through every anchor", () => {
    const anchors: Anchor[] = [
      { lat: 6, lon: 0 },
      { lat: 38, lon: 70 },
      { lat: 30, lon: 150 },
      { lat: -18, lon: 212 },
      { lat: -44, lon: 290 },
    ];
    const tour = buildTour(anchors);
    anchors.forEach((anchor, i) => {
      const wanted = latLonToDirection(anchor.lat, anchor.lon);
      expect(angleBetween(tour.direction(tour.anchorU(i)), wanted)).toBeLessThan(1e-6);
    });
  });

  it("closes: u = 0 and u = 1 are the same point", () => {
    const tour = buildTour(equatorSquare);
    expect(angleBetween(tour.direction(0), tour.direction(1))).toBeLessThan(1e-9);
  });

  it("wraps u outside 0..1 rather than running off the end", () => {
    const tour = buildTour(equatorSquare);
    expect(angleBetween(tour.direction(-0.25), tour.direction(0.75))).toBeLessThan(1e-9);
    expect(angleBetween(tour.direction(2.4), tour.direction(0.4))).toBeLessThan(1e-9);
  });

  // Four points evenly round the equator have a great circle through them, and
  // the path must be that circle rather than something that wobbles off it.
  it("reproduces the equator from four points on it", () => {
    const tour = buildTour(equatorSquare);
    const range = latitudeRange(tour);
    expect(Math.abs(range.min)).toBeLessThan(0.001);
    expect(Math.abs(range.max)).toBeLessThan(0.001);
    expect(tour.length).toBeCloseTo(Math.PI * 2, 3);
  });

  // One unit of scroll has to be one unit of travel wherever the camera is; a
  // spline's own parameter runs quick through corners and slow along straights.
  // Sampled at 1/500 the spread between the shortest and longest step is 0.02%,
  // against 15% if the raw spline parameter were handed straight through.
  it("covers equal arc for equal steps in u", () => {
    const tour = buildTour([
      { lat: 6, lon: 0 },
      { lat: 38, lon: 70 },
      { lat: 30, lon: 150 },
      { lat: -18, lon: 212 },
      { lat: -44, lon: 290 },
    ]);
    let shortest = Infinity;
    let longest = 0;
    for (let i = 0; i < 500; i++) {
      const step = angleBetween(tour.direction(i / 500), tour.direction((i + 1) / 500));
      shortest = Math.min(shortest, step);
      longest = Math.max(longest, step);
    }
    expect(longest / shortest - 1).toBeLessThan(0.01);
    expect(shortest).toBeCloseTo(tour.length / 500, 4);
  });

  // The bug this whole module was rewritten for. Splining the direction vectors
  // and normalizing — the textbook way to curve on a sphere — takes a great
  // circle between each pair, and a great circle between two southern points
  // dives further south than either. Over a 144° leg from 40° south that is a
  // 29.8° dive; the first draft reached 71° south from anchors that stopped at
  // 48°. Interpolating latitude and longitude cannot do that at all.
  it("keeps the path inside the anchors' own latitudes", () => {
    const anchors: Anchor[] = [
      { lat: 8, lon: 0 },
      { lat: 42, lon: 72 },
      { lat: -34, lon: 144 },
      { lat: 26, lon: 216 },
      { lat: -48, lon: 288 },
    ];
    const range = latitudeRange(buildTour(anchors));
    // Only the spline's own overshoot is allowed, which is about a degree.
    expect(range.min).toBeGreaterThan(-50);
    expect(range.max).toBeLessThan(44);
  });

  // Long legs are where the old construction failed worst, so the new one has
  // to hold at a leg length that would have dived 30°.
  it("holds its latitude even across a 144-degree leg", () => {
    const range = latitudeRange(
      buildTour([
        { lat: -40, lon: 0 },
        { lat: -40, lon: 144 },
        { lat: -40, lon: 288 },
      ])
    );
    expect(range.min).toBeGreaterThan(-41);
    expect(range.max).toBeLessThan(-39);
  });

  // Left wrapped, the step from 350° to 10° reads as 340° backwards, and the
  // camera would cross most of the planet between two neighbouring buildings.
  it("unwraps longitude so one lap is one revolution", () => {
    const anchors: Anchor[] = [
      { lat: 0, lon: 10 },
      { lat: 0, lon: 130 },
      { lat: 0, lon: 250 },
      { lat: 0, lon: 350 },
    ];
    const tour = buildTour(anchors);
    // Four points round one circle: a single lap, not four. Not exactly 2π —
    // these gaps are 120°, 120°, 100°, 20°, and a spline through unevenly
    // spaced controls overshoots the tight one, backing up about a third of a
    // degree of longitude and walking it again. That costs 0.67° of extra
    // path. Wrapped longitude would instead read the last step as 340°
    // backwards and come out near four times this.
    expect(tour.length).toBeGreaterThan(Math.PI * 2);
    expect(tour.length).toBeLessThan(Math.PI * 2 * 1.01);
    // The closing leg spans 10° + 10° = 20° of longitude the short way round,
    // against 340° the wrong way. It measures 20.67°: the whole of the extra
    // path above is this leg's backtrack, which is where the tight gap is.
    const closing = ((1 - tour.anchorU(3)) * tour.length * 180) / Math.PI;
    expect(closing).toBeGreaterThan(20);
    expect(closing).toBeLessThan(21);
  });

  // `buildTour` visits anchors in the order handed to it and does not sort
  // them, so the unwrapping has to cope with a list that is not already
  // ascending — 200°, 10°, 130° means east to 370° and on to 490°, one lap
  // forward, not a 190° reversal and then a 430° sprint. Every other test here
  // feeds it longitudes that already ascend, where unwrapping is a no-op, so
  // without this one the whole loop could be deleted unnoticed.
  it("laps forward once from anchors given out of longitude order", () => {
    const tour = buildTour([
      { lat: 0, lon: 200 },
      { lat: 0, lon: 10 },
      { lat: 0, lon: 130 },
    ]);
    expect(tour.length).toBeGreaterThan(Math.PI * 2);
    expect(tour.length).toBeLessThan(Math.PI * 2 * 1.05);

    let previous = (Math.atan2(tour.direction(0)[0], tour.direction(0)[2]) * 180) / Math.PI;
    let travelled = 0;
    for (let i = 1; i <= 720; i++) {
      const dir = tour.direction(i / 720);
      const lon = (Math.atan2(dir[0], dir[2]) * 180) / Math.PI;
      let step = lon - previous;
      while (step <= -180) step += 360;
      while (step > 180) step -= 360;
      expect(step).toBeGreaterThan(0);
      travelled += step;
      previous = lon;
    }
    expect(travelled).toBeCloseTo(360, 1);
  });

  // Arriving at a building must not be a corner. Interpolating latitude and
  // longitude straight between anchors would satisfy every other test in this
  // file — it passes through them, stays in the band, advances eastward — and
  // still turn the camera 55° in an instant every time it reached one.
  // Measured across a window of u = 0.004 either side of each anchor, the
  // spline bends 3.3° where straight legs bend 54.5°.
  it("arrives at each anchor without a corner", () => {
    const anchors: Anchor[] = [
      { lat: 6, lon: 0 },
      { lat: 38, lon: 70 },
      { lat: 30, lon: 150 },
      { lat: -18, lon: 212 },
      { lat: -44, lon: 290 },
    ];
    const tour = buildTour(anchors);
    const window = 0.004;
    anchors.forEach((_, i) => {
      const u = tour.anchorU(i);
      const before = tour.direction(u - window);
      const here = tour.direction(u);
      const after = tour.direction(u + window);
      const incoming: Direction = [here[0] - before[0], here[1] - before[1], here[2] - before[2]];
      const outgoing: Direction = [after[0] - here[0], after[1] - here[1], after[2] - here[2]];
      expect((angleBetween(normalize(incoming), normalize(outgoing)) * 180) / Math.PI).toBeLessThan(10);
    });
  });

  it("survives having nothing, or only one thing, to visit", () => {
    const none = buildTour([]);
    expect(none.length).toBe(0);
    expect(none.order).toEqual([]);
    const one = buildTour([{ lat: 30, lon: 40 }]);
    expect(one.length).toBe(0);
    expect(angleBetween(one.direction(0.7), latLonToDirection(30, 40))).toBeLessThan(1e-6);
  });
});

describe("Tour.nearestU", () => {
  const tour = buildTour([
    { lat: 6, lon: 0 },
    { lat: 38, lon: 70 },
    { lat: 30, lon: 150 },
    { lat: -18, lon: 212 },
    { lat: -44, lon: 290 },
  ]);

  // What a drag leaves behind: the camera is off the path, and the next scroll
  // has to carry on from where it stands rather than snapping back to wherever
  // the path was last left.
  it("recovers the u of a point taken from the path", () => {
    for (let i = 0; i < 40; i++) {
      const u = i / 40;
      const recovered = tour.nearestU(tour.direction(u));
      // Compared the short way round, since 0.999 and 0.001 are neighbours.
      const gap = Math.abs((((recovered - u + 0.5) % 1) + 1) % 1 - 0.5);
      expect(gap).toBeLessThan(0.001);
    }
  });

  it("finds the closest point on the path for somewhere off it", () => {
    const off = latLonToDirection(70, 40);
    const best = tour.nearestU(off);
    const bestAngle = angleBetween(off, tour.direction(best));
    for (let i = 0; i < 200; i++)
      expect(bestAngle).toBeLessThanOrEqual(angleBetween(off, tour.direction(i / 200)) + 1e-9);
  });

  it("answers inside 0..1", () => {
    for (const dir of [[0, 1, 0], [0, -1, 0], [1, 0, 0]] as Direction[]) {
      const u = tour.nearestU(dir);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
});

describe("the planet's own tour", () => {
  it("visits every section exactly once", () => {
    expect([...TOUR_ORDER].sort()).toEqual([...PLANET_SECTION_KEYS].sort());
  });

  it("passes through every section's building", () => {
    for (const section of PLANET_SECTION_KEYS)
      expect(angleBetween(PLANET_TOUR.direction(sectionU(section)), sectionDirection(section))).toBeLessThan(1e-6);
  });

  // The guard on the tuning that stage 2 does. The camera rides this path, and
  // `camera.up` is pinned to +Y — near a pole the view direction lines up with
  // it and the roll goes wherever lookAt's degenerate case sends it. Authored
  // latitudes run -44..38, and the built path reaches -44.6..39.8.
  it("never leaves the safe latitude band", () => {
    const range = latitudeRange(PLANET_TOUR);
    expect(range.min).toBeGreaterThan(-MAX_TOUR_LATITUDE);
    expect(range.max).toBeLessThan(MAX_TOUR_LATITUDE);
  });

  // A satellite's orbit, not a rollercoaster: a great circle is 6.283 radians
  // and this path is 6.326, so it wanders by well under a percent of its own
  // length. A tour that swung between the latitudes it visits would be longer
  // than this by a large margin — the first draft's zigzag anchors measured
  // 7.87.
  it("is barely longer than a great circle", () => {
    expect(PLANET_TOUR.length).toBeGreaterThan(Math.PI * 2);
    expect(PLANET_TOUR.length).toBeLessThan(Math.PI * 2 * 1.05);
  });

  it("keeps every authored section inside the safe band too", () => {
    for (const section of PLANET_SECTION_KEYS)
      expect(Math.abs(PLANET_SECTIONS[section].lat)).toBeLessThan(MAX_TOUR_LATITUDE);
  });

  // Scrolling forward has to move the camera forward. A spline through
  // unevenly spaced longitudes can overshoot a tight gap and back up into it —
  // small, but it would read as the planet stuttering backwards mid-scroll.
  // The authored longitudes are spread evenly enough that it never happens; if
  // stage 2's tuning bunches two of them, this is what says so.
  it("always advances eastward, never doubling back", () => {
    let previous = 0;
    let unwrapped = 0;
    for (let i = 1; i <= 2000; i++) {
      const dir = PLANET_TOUR.direction(i / 2000);
      const lon = (Math.atan2(dir[0], dir[2]) * 180) / Math.PI;
      let step = lon - previous;
      while (step <= -180) step += 360;
      while (step > 180) step -= 360;
      expect(step).toBeGreaterThan(0);
      unwrapped += step;
      previous = lon;
    }
    // Exactly one revolution over the lap, not two and not none.
    expect(unwrapped).toBeCloseTo(360, 1);
  });
});

describe("adjacentOnTour", () => {
  it("steps forward and back along the tour", () => {
    const first = TOUR_ORDER[0];
    expect(adjacentOnTour(first, 1)).toBe(TOUR_ORDER[1]);
    expect(adjacentOnTour(TOUR_ORDER[1], -1)).toBe(first);
  });

  it("wraps past both ends", () => {
    const last = TOUR_ORDER[TOUR_ORDER.length - 1];
    expect(adjacentOnTour(last, 1)).toBe(TOUR_ORDER[0]);
    expect(adjacentOnTour(TOUR_ORDER[0], -1)).toBe(last);
  });

  it("returns to where it started after a full lap", () => {
    expect(adjacentOnTour(TOUR_ORDER[2], TOUR_ORDER.length)).toBe(TOUR_ORDER[2]);
  });
});

describe("facingSectionOnPlanet", () => {
  it("names a section when the camera is right over it", () => {
    for (const section of PLANET_SECTION_KEYS)
      expect(facingSectionOnPlanet(sectionDirection(section))).toBe(section);
  });

  // The whole reason this replaced an azimuth comparison. Looking down from
  // 85° north at longitude 0, the old rule would match longitude to longitude
  // and name products, which sits at longitude 0 — but products is 79° away
  // across the surface while skills is 50°. Latitude has to count.
  it("prefers the nearest section over the one sharing its longitude", () => {
    const overhead = latLonToDirection(85, 0);
    expect(angleBetween(overhead, sectionDirection("products")) * (180 / Math.PI)).toBeCloseTo(79, 0);
    expect(angleBetween(overhead, sectionDirection("skills")) * (180 / Math.PI)).toBeCloseTo(50.4, 0);
    expect(facingSectionOnPlanet(overhead)).toBe("skills");
    expect(facingSectionOnPlanet(overhead)).not.toBe("products");
  });

  it("always names something, from anywhere", () => {
    for (const lat of [-89, -45, 0, 45, 89])
      for (const lon of [0, 61, 143, 250, 359])
        expect(PLANET_SECTION_KEYS).toContain(facingSectionOnPlanet(latLonToDirection(lat, lon)));
  });
});
