import { describe, expect, it } from "vitest";
import {
  isGrass,
  PARK_CENTRE,
  PARK_RADIUS,
  pickClearing,
  scatterAround,
  walkerFacing,
} from "./decor";
import { FILLER_CITY, sectionObstacles, tooClose } from "./city";
import {
  angleBetween,
  dot,
  fibonacciSphere,
  latLonToDirection,
  offsetDirection,
  tangentBasis,
  type Direction,
} from "./planetLayout";
import { SMOOTH_PLANET_RADIUS } from "./sections";
import { planetRelief, RELIEF_AMPLITUDE } from "./shell";

const length = (v: Direction) => Math.hypot(v[0], v[1], v[2]);

describe("isGrass", () => {
  it("agrees with Planet.tsx's own band threshold", () => {
    // Same formula bandColor() uses: ground = planetRelief(dir) * RELIEF_AMPLITUDE,
    // grass from 0.25 up.
    for (const [lat, lon] of [[10, 0], [-40, 130], [70, 250], [0, 180]]) {
      const dir = latLonToDirection(lat, lon);
      const ground = planetRelief(dir) * RELIEF_AMPLITUDE;
      expect(isGrass(dir)).toBe(ground >= 0.25);
    }
  });
});

describe("pickClearing", () => {
  it("picks the first candidate that is grass and clear of obstacles", () => {
    const pool = fibonacciSphere(80);
    const notGrass = pool.find((d) => !isGrass(d))!;
    // Grass, but placed exactly on an obstacle's own centre — a real test of
    // the clearance check, not just the grass check.
    const grassyButBlocked = pool.find((d) => isGrass(d))!;
    const grassyClear = pool.find(
      (d) => isGrass(d) && angleBetween(d, grassyButBlocked) > 0.65
    )!;
    const obstacles = [{ direction: grassyButBlocked, angularRadius: 0.3 }];
    const result = pickClearing([notGrass, grassyButBlocked, grassyClear], obstacles, 0.05);
    expect(result).toEqual(grassyClear);
  });

  it("falls back to grass-only when nothing clears the obstacle list", () => {
    const grassy = fibonacciSphere(80).find((d) => isGrass(d))!;
    // An obstacle sitting right on top of the only grass candidate.
    const obstacles = [{ direction: grassy, angularRadius: 3 }];
    const result = pickClearing([grassy], obstacles, 0.05);
    expect(result).toEqual(grassy);
  });

  it("falls back to the first candidate when nothing is grass", () => {
    const notGrass = fibonacciSphere(50).filter((d) => !isGrass(d));
    expect(notGrass.length).toBeGreaterThan(0);
    const result = pickClearing(notGrass, [], 0.05);
    expect(result).toEqual(notGrass[0]);
  });

  it("never throws on an empty candidate list", () => {
    expect(() => pickClearing([], [], 0.05)).not.toThrow();
  });
});

describe("PARK_CENTRE", () => {
  it("is grass", () => {
    expect(isGrass(PARK_CENTRE)).toBe(true);
  });

  it("is clear of every landmark and every filler building by PARK_RADIUS", () => {
    const obstacles = [...sectionObstacles(SMOOTH_PLANET_RADIUS), ...FILLER_CITY];
    expect(tooClose(PARK_CENTRE, PARK_RADIUS, obstacles)).toBe(false);
  });

  it("keeps a real, literal clearance — not just whatever PARK_RADIUS happens to be", () => {
    // A constant compared to itself proves nothing (a shrunk PARK_RADIUS would
    // still pass the test above). 0.2 is PARK_RADIUS's intended value with a
    // hair of slack, pinned here independently of that constant.
    const obstacles = [...sectionObstacles(SMOOTH_PLANET_RADIUS), ...FILLER_CITY];
    expect(tooClose(PARK_CENTRE, 0.2, obstacles)).toBe(false);
  });

  it("is a unit direction", () => {
    expect(length(PARK_CENTRE)).toBeCloseTo(1);
  });
});

describe("scatterAround", () => {
  it("produces the requested number of points", () => {
    expect(scatterAround([0, 1, 0], 0, 0.1, 1)).toHaveLength(0);
    expect(scatterAround([0, 1, 0], 40, 0.1, 1)).toHaveLength(40);
  });

  it("is deterministic — same seed, same scatter", () => {
    expect(scatterAround(PARK_CENTRE, 20, 0.1, 7)).toEqual(scatterAround(PARK_CENTRE, 20, 0.1, 7));
  });

  it("keeps every point within angularRadius of centre", () => {
    const centre = latLonToDirection(15, 40);
    for (const p of scatterAround(centre, 50, 0.15, 3)) {
      expect(angleBetween(p.direction, centre)).toBeLessThanOrEqual(0.15 + 1e-9);
    }
  });

  it("respects a minimum radius, leaving a clear ring around centre", () => {
    const centre = latLonToDirection(-20, 10);
    for (const p of scatterAround(centre, 50, 0.2, 3, 0.08)) {
      expect(angleBetween(p.direction, centre)).toBeGreaterThanOrEqual(0.08 - 1e-9);
    }
  });

  it("spreads points out instead of stacking them at one bearing", () => {
    const points = scatterAround(PARK_CENTRE, 40, 0.15, 5);
    expect(new Set(points.map((p) => p.direction[0])).size).toBeGreaterThan(30);
  });
});

describe("walkerFacing", () => {
  it("returns a unit vector", () => {
    const centre = latLonToDirection(22, 88);
    expect(length(walkerFacing(centre, 1.2))).toBeCloseTo(1);
  });

  it("is tangent to the sphere at the walker's actual position, for any radius", () => {
    const centre = latLonToDirection(-15, 200);
    const bearing = 2.1;
    const facing = walkerFacing(centre, bearing);
    for (const r of [0.05, 0.2, 0.6]) {
      const position = offsetDirection(centre, bearing, r);
      expect(dot(facing, position)).toBeCloseTo(0);
    }
  });

  it("points along +right at bearing 0", () => {
    const centre = latLonToDirection(0, 0);
    const { right } = tangentBasis(centre);
    const facing = walkerFacing(centre, 0);
    expect(angleBetween(facing, right)).toBeCloseTo(0);
  });

  it("points the way bearing is increasing", () => {
    const centre = latLonToDirection(30, 50);
    const bearing = 0.9;
    const r = 0.15;
    const facing = walkerFacing(centre, bearing);
    const ahead = offsetDirection(centre, bearing + 0.01, r);
    const now = offsetDirection(centre, bearing, r);
    const step: Direction = [ahead[0] - now[0], ahead[1] - now[1], ahead[2] - now[2]];
    expect(dot(facing, step)).toBeGreaterThan(0);
  });
});
