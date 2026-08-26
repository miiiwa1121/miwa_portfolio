import { describe, expect, it } from "vitest";
import {
  SCENE_BOUNDING_RADIUS,
  SUN_DIRECTION,
  SUN_DISTANCE,
  SUN_SHADOW_FAR,
  SUN_SHADOW_NEAR,
  incidence,
  sunPosition,
} from "./sunLight";
import { SMOOTH_PLANET_RADIUS } from "./planet/sections";
import { normalize, type Direction } from "./planet/planetLayout";

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
