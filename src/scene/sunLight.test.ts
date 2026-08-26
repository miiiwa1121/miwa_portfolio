import { describe, expect, it } from "vitest";
import {
  SCENE_BOUNDING_RADIUS,
  SUN_DIRECTION,
  SUN_DISTANCE,
  SUN_SHADOW_FAR,
  SUN_SHADOW_NEAR,
  SUN_ORB_RADIUS,
  dragSunDirection,
  sunVisibility,
  incidence,
  sunPosition,
} from "./sunLight";
import { SMOOTH_PLANET_RADIUS } from "./planet/sections";
import { NEAR_ORBIT_RADIUS } from "./worldLayout";
import { angleBetween, dot, normalize, type Direction } from "./planet/planetLayout";

describe("the shadow frustum", () => {
  it("holds the whole scene at the distance the sun is kept at", () => {
    // Every one of these was derived from `SUN_DISTANCE` alone, which is what
    // lets the sun be pointed anywhere without them being re-tuned. Breaking
    // that relationship is silent: the shadow camera simply clips part of the
    // world out of its own depth range and those shadows stop being drawn.
    expect(SUN_SHADOW_NEAR).toBeLessThanOrEqual(SUN_DISTANCE - SCENE_BOUNDING_RADIUS);
    expect(SUN_SHADOW_FAR).toBeGreaterThanOrEqual(SUN_DISTANCE + SCENE_BOUNDING_RADIUS);
  });

  it("is wide enough for the planet and whatever stands on it", () => {
    expect(SCENE_BOUNDING_RADIUS).toBeGreaterThan(SMOOTH_PLANET_RADIUS);
  });

  it("keeps the sun on the sphere those bounds assume, whichever way it points", () => {
    const directions: Direction[] = [SUN_DIRECTION, [0, 1, 0], [1, 0, 0], normalize([-2, 0.4, 0.7])];
    for (const d of directions) {
      expect(Math.hypot(...sunPosition(d))).toBeCloseTo(SUN_DISTANCE, 10);
    }
  });
});

describe("incidence", () => {
  it("is 1 facing the sun, 0 at the terminator, and 0 beyond it", () => {
    const sun: Direction = [0, 1, 0];
    expect(incidence([0, 1, 0], sun)).toBeCloseTo(1, 10);
    expect(incidence([1, 0, 0], sun)).toBeCloseTo(0, 10);
    // Past the terminator, not negative: a surface facing away is unlit, and a
    // negative would subtract light from whatever else is falling on it.
    expect(incidence([0, -1, 0], sun)).toBe(0);
  });
});

describe("dragging the sun", () => {
  // The camera's own axes, for a camera out along +Z looking back at the planet.
  const right: Direction = [1, 0, 0];
  const up: Direction = [0, 1, 0];
  const start: Direction = [0, 0, 1];
  /** One-to-one tracking on a 900px viewport at fov 45. */
  const perPixel = (45 * Math.PI) / 180 / 900;

  it("walks the sun the way the hand goes", () => {
    const dragged = dragSunDirection(start, 100, 0, right, up, perPixel);
    expect(dot(dragged, right)).toBeGreaterThan(dot(start, right));
    const lifted = dragSunDirection(start, 0, -100, right, up, perPixel);
    expect(dot(lifted, up)).toBeGreaterThan(dot(start, up));
    // and the other way round, so a sign flip cannot pass by symmetry
    expect(dot(dragSunDirection(start, -100, 0, right, up, perPixel), right)).toBeLessThan(0);
    expect(dot(dragSunDirection(start, 0, 100, right, up, perPixel), up)).toBeLessThan(0);
  });

  it("tracks the pointer rather than merely responding to it", () => {
    // A 300px drag across a 900px frame at fov 45 should carry the sun a third
    // of the frame's own angle. Anything else and the sun slides out from under
    // the finger holding it.
    const third = ((45 * Math.PI) / 180) / 3;
    expect(angleBetween(start, dragSunDirection(start, 300, 0, right, up, perPixel))).toBeCloseTo(third, 6);
    // Both axes, at the same rate: a drag that is fast one way and slow the
    // other slides out from under the finger on every diagonal.
    expect(angleBetween(start, dragSunDirection(start, 0, 300, right, up, perPixel))).toBeCloseTo(third, 6);
  });

  it("stays a unit direction however far it is dragged", () => {
    let d = start;
    for (let i = 0; i < 400; i++) d = dragSunDirection(d, 37, -21, right, up, perPixel);
    expect(Math.hypot(...d)).toBeCloseTo(1, 10);
  });

  it("goes nowhere on a drag that went nowhere", () => {
    const still = dragSunDirection(start, 0, 0, right, up, perPixel);
    expect(angleBetween(still, start)).toBeCloseTo(0, 12);
  });

  it("can be put anywhere, the far side of the planet included", () => {
    // Deliberately unclamped: the reader is allowed to make it night. What keeps
    // that from being a black screen is the ambient floor, not a limit here.
    // 4,000px of dragging is a shade over 200 degrees at this scale.
    let d = start;
    for (let i = 0; i < 40; i++) d = dragSunDirection(d, 100, 0, right, up, perPixel);
    expect(dot(d, start)).toBeLessThan(-0.9); // round the back, well past the terminator
  });
});

describe("the visible sun", () => {
  it("clears everything standing on the planet", () => {
    // Otherwise it would pass through the city rather than over it.
    expect(SUN_ORB_RADIUS).toBeGreaterThanOrEqual(SCENE_BOUNDING_RADIUS);
  });

  it("stays inside the closest the camera ever gets, so the planet can hide it", () => {
    // This is what makes the sun set instead of hanging in front of the world.
    // Pushing it outside the orbit is what made the first version invisible:
    // the camera only ever looks at the planet's centre, so a distant sun falls
    // in frame only when it is behind the planet, which then occludes it.
    expect(SUN_ORB_RADIUS).toBeLessThan(NEAR_ORBIT_RADIUS);
  });
});

describe("sunVisibility", () => {
  const view: Direction = [0, 0, 1]; // the camera is out along +Z

  it("shows the sun fully when it is out beside the planet or behind it", () => {
    expect(sunVisibility([1, 0, 0], view)).toBe(1); // 90°, at the limb
    expect(sunVisibility([0, 0, -1], view)).toBe(1); // 180°, behind the planet
    expect(sunVisibility([0, 1, 0], view)).toBe(1); // 90° the other way
  });

  it("hides it once it is between the eye and the world", () => {
    // Where it would otherwise draw as a bright dot sitting on top of the city.
    expect(sunVisibility(view, view)).toBe(0);
    expect(sunVisibility(normalize([0.2, 0, 1]), view)).toBe(0); // 11°
  });

  it("crosses over without a step, since the arc is crossed by hand", () => {
    // A sun that blinks out mid-drag reads as a bug. Sampled finely across the
    // whole range, no single step may be visible.
    let previous = sunVisibility(view, view);
    let worst = 0;
    for (let i = 1; i <= 2000; i++) {
      const angle = (i / 2000) * Math.PI;
      const sun: Direction = [Math.sin(angle), 0, Math.cos(angle)];
      const now = sunVisibility(sun, view);
      worst = Math.max(worst, Math.abs(now - previous));
      previous = now;
    }
    expect(worst).toBeLessThan(0.01);
  });

  it("is 0 or 1 outside the crossing and strictly between inside it", () => {
    const mid: Direction = [Math.sin(1), 0, Math.cos(1)]; // 1 rad, inside the ramp
    const showing = sunVisibility(mid, view);
    expect(showing).toBeGreaterThan(0);
    expect(showing).toBeLessThan(1);
  });
});
