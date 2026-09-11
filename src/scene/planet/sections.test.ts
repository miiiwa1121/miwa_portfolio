import { describe, expect, it } from "vitest";
import {
  PLANET_SECTIONS,
  PLANET_SECTION_KEYS,
  SMOOTH_PLANET_RADIUS,
  sectionBasis,
  sectionDirection,
  sectionGroundRadius,
  sectionPosition,
} from "./sections";
import { MAX_TOUR_LATITUDE } from "./tour";
import { angleBetween, dot, normalize } from "./geometry";
import { PLANET_RADIUS } from "./shell";

const length = (v: readonly [number, number, number]) => Math.hypot(v[0], v[1], v[2]);

describe("sectionDirection", () => {
  it("returns a unit vector for every section", () => {
    for (const s of PLANET_SECTION_KEYS) expect(length(sectionDirection(s))).toBeCloseTo(1);
  });

  it("keeps every section's latitude inside the safe band", () => {
    // MAX_TOUR_LATITUDE (60) is the camera's hard limit; the authored positions
    // are meant to sit comfortably inside it, with room for the tour spline's
    // own overshoot.
    for (const s of PLANET_SECTION_KEYS)
      expect(Math.abs(PLANET_SECTIONS[s].lat)).toBeLessThan(MAX_TOUR_LATITUDE);
  });
});

describe("sectionGroundRadius", () => {
  // The current ground is a smooth sphere (see SMOOTH_PLANET_RADIUS's own
  // docstring) — every section sits at the same radius, not a per-direction
  // terrain height.
  it("is the same constant for every section", () => {
    for (const s of PLANET_SECTION_KEYS) expect(sectionGroundRadius(s)).toBe(SMOOTH_PLANET_RADIUS);
  });

  it("is half the voxel shell's own radius", () => {
    expect(SMOOTH_PLANET_RADIUS).toBeCloseTo(PLANET_RADIUS / 2, 9);
  });

  it("is positive", () => {
    for (const s of PLANET_SECTION_KEYS) expect(sectionGroundRadius(s)).toBeGreaterThan(0);
  });
});

describe("sectionPosition", () => {
  it("lands on the ground at zero height", () => {
    for (const s of PLANET_SECTION_KEYS) {
      const pos = sectionPosition(s);
      expect(Math.hypot(...pos)).toBeCloseTo(sectionGroundRadius(s), 9);
    }
  });

  it("moves straight out along the section's own normal as height grows", () => {
    for (const s of PLANET_SECTION_KEYS) {
      const ground = sectionPosition(s);
      const raised = sectionPosition(s, 5);
      const dir = sectionDirection(s);
      expect(raised[0] - ground[0]).toBeCloseTo(dir[0] * 5, 9);
      expect(raised[1] - ground[1]).toBeCloseTo(dir[1] * 5, 9);
      expect(raised[2] - ground[2]).toBeCloseTo(dir[2] * 5, 9);
    }
  });

  it("points in the same direction as sectionDirection", () => {
    for (const s of PLANET_SECTION_KEYS) {
      const pos = sectionPosition(s);
      expect(angleBetween(normalize(pos), sectionDirection(s))).toBeLessThan(1e-6);
    }
  });
});

describe("sectionBasis", () => {
  // What is NOT tested here, and why: sectionBasis passes PLANET_SECTIONS[s].yaw
  // straight to tangentBasis, but every authored yaw is presently 0 (see the
  // docstring on PLANET_SECTIONS). A mutation that hardcodes 0 instead of
  // reading the field is indistinguishable from correct code through this
  // public API while that stays true — 0 read from the table and 0 hardcoded
  // produce the same output. tangentBasis's own yaw handling is exercised with
  // non-zero angles in geometry.test.ts; once a section actually needs a
  // turned signboard, add a case here that would catch the wiring breaking.
  it("uses the section's own normal as up", () => {
    for (const s of PLANET_SECTION_KEYS) {
      const { up } = sectionBasis(s);
      expect(angleBetween(up, sectionDirection(s))).toBeCloseTo(0);
    }
  });

  it("returns three unit vectors at right angles, for every section", () => {
    for (const s of PLANET_SECTION_KEYS) {
      const { right, up, forward } = sectionBasis(s);
      for (const v of [right, up, forward]) expect(length(v)).toBeCloseTo(1);
      expect(dot(right, up)).toBeCloseTo(0);
      expect(dot(up, forward)).toBeCloseTo(0);
    }
  });
});
