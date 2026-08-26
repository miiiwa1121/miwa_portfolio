import { describe, expect, it } from "vitest";
import {
  SCENE_BOUNDING_RADIUS,
  SUN_DISTANCE,
  SUN_SHADOW_FAR,
  SUN_SHADOW_NEAR,
  SUN_TILT,
  incidence,
  sunDirection,
  sunPosition,
} from "./sunLight";
import { PLANET_TOUR, facingSectionOnPlanet } from "./planet/tour";
import { SMOOTH_PLANET_RADIUS, sectionDirection } from "./planet/sections";
import { NEAR_ORBIT_RADIUS, ORBIT_UP } from "./worldLayout";
import { angleBetween, dot, normalize, rotateAboutAxis, tangentOf, type Direction } from "./planet/planetLayout";

/** A spread of camera directions, including ones straight over both poles. */
const VIEWS: Direction[] = [
  [0, 0, 1],
  [1, 0, 0],
  normalize([1, 1, 1]),
  normalize([-2, 0.4, 0.7]),
  [0, 1, 0],
  [0, -1, 0],
];

describe("sunDirection", () => {
  it("sits exactly SUN_TILT off the view axis, whatever way up is leaning", () => {
    for (const view of VIEWS) {
      expect(angleBetween(view, sunDirection(view, ORBIT_UP))).toBeCloseTo(SUN_TILT, 6);
    }
    // Including an `up` that leans hard towards the camera — a building's own
    // normal while a section is framed can. Taking `up` whole rather than its
    // square-on part would shrink the tilt here.
    const view: Direction = [0, 0, 1];
    expect(angleBetween(view, sunDirection(view, normalize([0, 0.3, 0.95])))).toBeCloseTo(SUN_TILT, 6);
  });

  it("leans towards the top of the frame rather than the bottom", () => {
    for (const view of VIEWS.slice(0, 4)) {
      const screenUp = tangentOf(ORBIT_UP, view);
      expect(dot(sunDirection(view, ORBIT_UP), screenUp)).toBeGreaterThan(0);
    }
  });

  it("rolls to one side of the frame rather than sitting straight overhead", () => {
    // A key light square above a cube lights its top and leaves the two side
    // faces alike; rolling it round is what gives them different values.
    const view: Direction = [0, 0, 1];
    const screenUp = tangentOf(ORBIT_UP, view);
    const overhead = angleBetween(sunDirection(view, ORBIT_UP), rotateAboutAxis(screenUp, view, 0));
    const straightUp = angleBetween(
      [Math.cos(SUN_TILT) * view[0] + Math.sin(SUN_TILT) * screenUp[0],
       Math.cos(SUN_TILT) * view[1] + Math.sin(SUN_TILT) * screenUp[1],
       Math.cos(SUN_TILT) * view[2] + Math.sin(SUN_TILT) * screenUp[2]],
      sunDirection(view, ORBIT_UP)
    );
    expect(overhead).toBeGreaterThan(0);
    expect(straightUp).toBeGreaterThan(0.2); // a real roll, not a rounding error
  });

  it("is finite everywhere, the poles included", () => {
    // Over a pole the camera's own up is parallel to the view axis, which is
    // where a bearing measured from the planet's north would have nowhere to
    // point. `tangentOf` owes a perpendicular regardless.
    for (const view of VIEWS) {
      for (const value of sunDirection(view, ORBIT_UP)) expect(Number.isFinite(value)).toBe(true);
      expect(Math.hypot(...sunDirection(view, ORBIT_UP))).toBeCloseTo(1, 10);
    }
  });

  it("does not jump as the camera travels the tour", () => {
    // The sun is written into the scene every frame; a discontinuity anywhere
    // along the path would be a light that flicks across the sky mid-orbit.
    const steps = 2000;
    let worst = 0;
    let previous = sunDirection(PLANET_TOUR.direction(0), ORBIT_UP);
    for (let i = 1; i <= steps; i++) {
      const next = sunDirection(PLANET_TOUR.direction(i / steps), ORBIT_UP);
      worst = Math.max(worst, angleBetween(previous, next));
      previous = next;
    }
    // One 2000th of a lap moves the camera about 0.2°; the sun should move with
    // it, not more.
    expect(worst).toBeLessThan(0.01);
  });
});

describe("what the sun is for", () => {
  it("keeps the area the card is describing out of the dark, all the way round", () => {
    // The whole reason the sun moves. With it fixed at [18, 34, 14] this bottomed
    // out at exactly 0 — `contact` sat 142° past the terminator — and no fixed
    // direction can do better, because the five anchors span 149.5° of sphere.
    const samples = 720;
    let worst = Infinity;
    for (let i = 0; i < samples; i++) {
      const view = PLANET_TOUR.direction(i / samples);
      const facing = sectionDirection(facingSectionOnPlanet(view));
      worst = Math.min(worst, incidence(facing, sunDirection(view, ORBIT_UP)));
    }
    expect(worst).toBeGreaterThan(0.35);
  });

  it("still leaves a terminator on screen, so the planet reads as a world", () => {
    // A headlight would light the whole visible disc evenly: no terminator, no
    // shadows anyone can see, and blocky geometry with nothing to read its form
    // by. From `NEAR_ORBIT_RADIUS` the visible cap reaches this far around the
    // sphere from the point facing the camera:
    const visibleCap = Math.acos(SMOOTH_PLANET_RADIUS / NEAR_ORBIT_RADIUS);
    const view: Direction = normalize([0.3, 0.5, 1]);
    const sun = sunDirection(view, ORBIT_UP);
    // The point on the visible limb furthest from the sun: `visibleCap` around
    // the sphere from the point facing the camera, heading directly away from
    // the sun (geodesic polar coordinates, the same form `offsetDirection` uses).
    const awayFromSun = tangentOf(sun, view);
    const cos = Math.cos(visibleCap);
    const sin = Math.sin(visibleCap);
    const away: Direction = [
      view[0] * cos - awayFromSun[0] * sin,
      view[1] * cos - awayFromSun[1] * sin,
      view[2] * cos - awayFromSun[2] * sin,
    ];
    expect(angleBetween(away, sun)).toBeGreaterThan(Math.PI / 2);
    expect(incidence(away, sun)).toBe(0);
  });
});

describe("the shadow frustum", () => {
  it("holds the whole scene at the distance the sun is kept at", () => {
    // Every one of these bounds was derived from `SUN_DISTANCE` alone, which is
    // what lets the sun turn anywhere without any of them being re-tuned.
    expect(SUN_SHADOW_NEAR).toBeLessThanOrEqual(SUN_DISTANCE - SCENE_BOUNDING_RADIUS);
    expect(SUN_SHADOW_FAR).toBeGreaterThanOrEqual(SUN_DISTANCE + SCENE_BOUNDING_RADIUS);
    expect(SCENE_BOUNDING_RADIUS).toBeGreaterThan(SMOOTH_PLANET_RADIUS);
  });

  it("has the sun on the sphere those bounds assume, in every direction", () => {
    for (const view of VIEWS) {
      expect(Math.hypot(...sunPosition(view, ORBIT_UP))).toBeCloseTo(SUN_DISTANCE, 10);
    }
  });
});
