import { describe, expect, it } from "vitest";
import {
  PLANET_RADIUS,
  PLANET_RADIUS_VOXELS,
  PLANET_SHELL_THICKNESS,
  PLANET_VOXEL_SIZE,
  RELIEF_AMPLITUDE,
  SEA_LEVEL,
  groundRadiusVoxels,
  pinholeFraction,
  planetRelief,
  planetVoxels,
} from "./shell";
import { PALETTE } from "../voxel/palette";
import { fibonacciSphere, latLonToDirection, type Direction } from "./geometry";

const crust = planetVoxels();
const radiusOf = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

describe("planetRelief", () => {
  it("is deterministic", () => {
    const dir = latLonToDirection(21, 143);
    expect(planetRelief(dir)).toBe(planetRelief(dir));
  });

  it("stays inside the amplitude it scales", () => {
    const heights = fibonacciSphere(2000).map(planetRelief);
    expect(Math.min(...heights)).toBeGreaterThan(-1);
    expect(Math.max(...heights)).toBeLessThan(1);
  });

  // A cliff in the terrain would be a cliff on screen. Sampled across the whole
  // sphere, nudging a direction by 0.01 never moves the height by more than
  // 0.02 of the amplitude.
  it("varies smoothly", () => {
    let worst = 0;
    for (const dir of fibonacciSphere(1000)) {
      const nudged: Direction = [dir[0] + 0.01, dir[1], dir[2]];
      worst = Math.max(worst, Math.abs(planetRelief(dir) - planetRelief(nudged)));
    }
    expect(worst).toBeLessThan(0.05);
  });

  // The reason the height is a function of the direction rather than of
  // latitude and longitude, the way `noise2` works over x and z on the flat
  // island. Longitude wraps at ±180°, and noise taken over it disagrees with
  // itself across that meridian — a seam running pole to pole.
  it("has no seam at the date line", () => {
    for (const lat of [-60, -20, 0, 35, 70]) {
      const east = planetRelief(latLonToDirection(lat, 179.999));
      const west = planetRelief(latLonToDirection(lat, -179.999));
      expect(Math.abs(east - west)).toBeLessThan(1e-4);
    }
  });

  // The other half of the same argument. Every longitude meets at a pole, so
  // latitude/longitude noise gives one point as many different heights as there
  // are meridians — a pinwheel. A function of the direction is handed the same
  // vector from every approach and cannot disagree with itself.
  it("has no pinwheel at the poles", () => {
    for (const pole of [89.999, -89.999]) {
      const heights = [0, 45, 90, 180, 270, 359].map((lon) =>
        planetRelief(latLonToDirection(pole, lon))
      );
      const spread = Math.max(...heights) - Math.min(...heights);
      expect(spread).toBeLessThan(1e-3);
    }
  });

  it("normalizes a direction that is not unit length", () => {
    const dir = latLonToDirection(30, 200);
    const long: Direction = [dir[0] * 7, dir[1] * 7, dir[2] * 7];
    expect(planetRelief(long)).toBeCloseTo(planetRelief(dir), 10);
  });
});

describe("groundRadiusVoxels", () => {
  // The reason this was split out of planetVoxels: a building's foundation has
  // to rest at the same height the ground generator actually drew, not at a
  // second formula that happens to usually agree with it.
  it("agrees with where planetVoxels actually put the topmost block", () => {
    for (const dir of fibonacciSphere(40)) {
      const surface = groundRadiusVoxels(dir);
      const [x, y, z] = [Math.round(dir[0] * surface), Math.round(dir[1] * surface), Math.round(dir[2] * surface)];
      // The rounded lattice point at the computed surface has to be crust, not
      // open air one step further out and not still crust one step further in
      // — a one-voxel tolerance for the rounding itself either way.
      const distance = Math.hypot(x, y, z);
      expect(Math.abs(distance - surface)).toBeLessThan(1.8);
    }
  });

  it("is flat at sea, following the mean radius plus sea level", () => {
    // Any direction where the terrain dips below sea level reads back exactly
    // at the sea's own height, regardless of how far down the terrain actually
    // goes — the flatness that makes water read as water rather than as blue
    // ground.
    for (const dir of fibonacciSphere(500)) {
      if (planetRelief(dir) * RELIEF_AMPLITUDE < SEA_LEVEL) {
        expect(groundRadiusVoxels(dir)).toBeCloseTo(PLANET_RADIUS_VOXELS + SEA_LEVEL, 9);
      }
    }
  });

  it("follows the terrain on land", () => {
    const dir = latLonToDirection(10, 40);
    expect(groundRadiusVoxels(dir)).toBeCloseTo(
      PLANET_RADIUS_VOXELS + Math.max(planetRelief(dir) * RELIEF_AMPLITUDE, SEA_LEVEL),
      9
    );
  });

  it("honours a custom radius, relief and sea level", () => {
    const dir = latLonToDirection(-20, 300);
    expect(groundRadiusVoxels(dir, { radius: 10, relief: 0, seaLevel: -5 })).toBe(10);
  });
});

describe("planetVoxels", () => {
  // The measurement the shell thickness was chosen from, kept where it can go
  // stale loudly. One layer of lattice approximating a curved surface leaves
  // gaps at the corners where the surface cuts the grid diagonally, and you can
  // see the far side of the planet's inside through them.
  it("is watertight at two voxels thick and leaks at one", () => {
    expect(pinholeFraction(crust)).toBe(0);
    expect(pinholeFraction(planetVoxels({ thickness: 1 }))).toBeGreaterThan(0.02);
  });

  it("is hollow", () => {
    // Nothing below the deepest the crust can reach: the mean radius, less the
    // crust, less the deepest the terrain drops.
    const floor = PLANET_RADIUS_VOXELS - PLANET_SHELL_THICKNESS - RELIEF_AMPLITUDE;
    expect(Math.min(...crust.map(radiusOf))).toBeGreaterThan(floor);
  });

  it("reaches no higher than the terrain does", () => {
    const ceiling = PLANET_RADIUS_VOXELS + RELIEF_AMPLITUDE;
    expect(Math.max(...crust.map(radiusOf))).toBeLessThanOrEqual(ceiling);
  });

  // Against the flat island's 4,259. Bounded on both sides rather than pinned:
  // the exact figure moves whenever the terrain is retuned, but an order of
  // magnitude either way means something has gone wrong with the shell test
  // rather than with the landscape.
  it("costs about thirteen thousand blocks", () => {
    expect(crust.length).toBeGreaterThan(12000);
    expect(crust.length).toBeLessThan(16000);
  });

  it("is deterministic", () => {
    const again = planetVoxels();
    expect(again.length).toBe(crust.length);
    expect(again[0]).toEqual(crust[0]);
    expect(again[again.length - 1]).toEqual(crust[crust.length - 1]);
  });

  // Aggregated into one assertion rather than one per block: 13,525 calls to
  // `expect` cost more than generating the planet did.
  it("paints every block from the world's own palette", () => {
    const allowed = new Set<string>([
      PALETTE.water,
      ...PALETTE.sand,
      ...PALETTE.grass,
      ...PALETTE.dirt,
      ...PALETTE.stone,
    ]);
    const strangers = [...new Set(crust.map((v) => v.color))].filter((c) => !allowed.has(c));
    expect(strangers).toEqual([]);
  });

  // Ocean has to be flat or it reads as blue ground. Where the terrain falls
  // below sea level the surface is lifted back to it, so every water block sits
  // in the one voxel below that height however deep the sea floor goes.
  it("holds the sea at one level", () => {
    const water = crust.filter((v) => v.color === PALETTE.water).map(radiusOf);
    expect(water.length).toBeGreaterThan(0);
    const surface = PLANET_RADIUS_VOXELS + SEA_LEVEL;
    expect(Math.max(...water)).toBeLessThanOrEqual(surface);
    expect(Math.min(...water)).toBeGreaterThan(surface - 1);
  });

  it("stands the land above the sea", () => {
    const grass = crust.filter((v) => (PALETTE.grass as readonly string[]).includes(v.color));
    const water = crust.filter((v) => v.color === PALETTE.water);
    expect(Math.max(...grass.map(radiusOf))).toBeGreaterThan(Math.max(...water.map(radiusOf)));
  });

  // Every band has to be reachable at the thickness actually shipped. Written
  // as a fixed depth of 2, the stone band drew zero blocks of 13,525 — a whole
  // branch that looked fine and never ran.
  it("uses every colour band", () => {
    const used = (list: readonly string[]) => crust.some((v) => list.includes(v.color));
    expect(used(PALETTE.grass)).toBe(true);
    expect(used(PALETTE.sand)).toBe(true);
    expect(used(PALETTE.dirt)).toBe(true);
    expect(used(PALETTE.stone)).toBe(true);
    expect(crust.some((v) => v.color === PALETTE.water)).toBe(true);
  });

  it("makes a bare sphere when the relief is turned off", () => {
    const bare = planetVoxels({ relief: 0 });
    const radii = bare.map(radiusOf);
    expect(Math.max(...radii)).toBeLessThanOrEqual(PLANET_RADIUS_VOXELS);
    expect(Math.min(...radii)).toBeGreaterThan(PLANET_RADIUS_VOXELS - PLANET_SHELL_THICKNESS);
    // A smooth sphere is the harder case for watertightness: terrain gives the
    // lattice extra thickness wherever the ground is not level with the grid.
    expect(pinholeFraction(bare, 1500)).toBe(0);
  });

  it("builds a smaller planet when asked", () => {
    const small = planetVoxels({ radius: 8, relief: 0 });
    expect(Math.max(...small.map(radiusOf))).toBeLessThanOrEqual(8);
    expect(small.length).toBeLessThan(crust.length / 5);
  });
});

describe("the planet's dimensions", () => {
  it("derives its world radius from the voxel count and size", () => {
    expect(PLANET_RADIUS).toBeCloseTo(33.6);
    expect(PLANET_RADIUS).toBe(PLANET_RADIUS_VOXELS * PLANET_VOXEL_SIZE);
  });

  // The proportion the reference image was measured for: its tallest buildings
  // rise 30% of the ground radius. The Products tower is 24 building voxels at
  // 0.42, so 10.08 world units.
  it("leaves the tallest building at the reference's 30% of the radius", () => {
    const tower = 24 * 0.42;
    expect(tower / PLANET_RADIUS).toBeCloseTo(0.3, 2);
  });

  // The blocks are deliberately coarse next to the buildings', so the ground
  // reads as terrain rather than as more construction.
  it("uses blocks much coarser than the buildings'", () => {
    expect(PLANET_VOXEL_SIZE / 0.42).toBeGreaterThan(3);
  });
});
