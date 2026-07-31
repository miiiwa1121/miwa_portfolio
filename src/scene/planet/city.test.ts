import { describe, expect, it } from "vitest";
import {
  FILLER_CITY,
  FILLER_VOXEL_SIZE,
  bareFraction,
  generateFillerCity,
  sectionObstacles,
  type Obstacle,
} from "./city";
import { angleBetween, fibonacciSphere } from "./planetLayout";
import { PLANET_SECTION_KEYS } from "./sections";

const length = (v: readonly [number, number, number]) => Math.hypot(v[0], v[1], v[2]);

const baseOptions = {
  planetRadius: 16.8,
  clusterCount: 6,
  buildingsPerCluster: 8,
  clusterAngularRadius: 0.3,
};

describe("generateFillerCity", () => {
  it("is deterministic", () => {
    const a = generateFillerCity(baseOptions);
    const b = generateFillerCity(baseOptions);
    expect(a).toEqual(b);
  });

  it("places every building on the unit sphere", () => {
    for (const b of generateFillerCity(baseOptions)) expect(length(b.direction)).toBeCloseTo(1);
  });

  it("keeps footprint and height inside the requested range", () => {
    const city = generateFillerCity({
      ...baseOptions,
      minFootprintBlocks: 2,
      maxFootprintBlocks: 3,
      minHeightBlocks: 5,
      maxHeightBlocks: 5,
    });
    expect(city.length).toBeGreaterThan(0);
    for (const b of city) {
      expect(b.widthBlocks).toBeGreaterThanOrEqual(2);
      expect(b.widthBlocks).toBeLessThanOrEqual(3);
      expect(b.depthBlocks).toBeGreaterThanOrEqual(2);
      expect(b.depthBlocks).toBeLessThanOrEqual(3);
      expect(b.heightBlocks).toBe(5);
    }
  });

  it("derives angularRadius from the larger footprint side and the planet radius", () => {
    const city = generateFillerCity({
      ...baseOptions,
      minFootprintBlocks: 4,
      maxFootprintBlocks: 4,
    });
    for (const b of city) {
      const expected = ((Math.max(b.widthBlocks, b.depthBlocks) / 2) * FILLER_VOXEL_SIZE) / baseOptions.planetRadius;
      expect(b.angularRadius).toBeCloseTo(expected, 9);
    }
  });

  it("returns nothing for zero clusters", () => {
    expect(generateFillerCity({ ...baseOptions, clusterCount: 0 })).toEqual([]);
  });

  it("returns nothing for zero buildings per cluster", () => {
    expect(generateFillerCity({ ...baseOptions, buildingsPerCluster: 0 })).toEqual([]);
  });

  // The property the whole reason `avoid` exists: a filler building landing
  // inside a landmark's own footprint would read as broken geometry, not as
  // background city.
  it("keeps clear of every obstacle in the avoid list", () => {
    const avoid: Obstacle[] = [
      { direction: [0, 0, 1], angularRadius: 0.2 },
      { direction: [1, 0, 0], angularRadius: 0.15 },
    ];
    const city = generateFillerCity({
      planetRadius: 16.8,
      clusterCount: 20,
      buildingsPerCluster: 40,
      clusterAngularRadius: 0.6,
      avoid,
    });
    expect(city.length).toBeGreaterThan(0);
    for (const b of city)
      for (const o of avoid) expect(angleBetween(b.direction, o.direction)).toBeGreaterThanOrEqual(o.angularRadius + b.angularRadius);
  });

  // Cluster *centres* also have to clear the avoid list — a cluster centred
  // on a landmark would pack its densest buildings exactly where the
  // avoidance is supposed to keep things clear.
  it("keeps cluster centres clear of large obstacles too", () => {
    const hugeAvoid: Obstacle[] = [{ direction: [0, 1, 0], angularRadius: 2.5 }];
    const city = generateFillerCity({
      planetRadius: 16.8,
      clusterCount: 10,
      buildingsPerCluster: 20,
      clusterAngularRadius: 0.3,
      avoid: hugeAvoid,
    });
    // A 2.5-radian exclusion around one pole leaves only a cap near the
    // opposite pole clear — every surviving building has to be out there.
    for (const b of city) expect(angleBetween(b.direction, hugeAvoid[0].direction)).toBeGreaterThan(2.5);
  });

  // The per-building check alone can't tell this apart from the cluster-centre
  // check above: a huge obstacle rejects individual buildings on its own, so a
  // test that only measures distance-to-obstacle passes whether or not cluster
  // centres are separately screened. Here the obstacle is *small* — small
  // enough that a cluster centred on it would still scatter plenty of
  // buildings past the per-building margin, out in the ring between the
  // obstacle's edge and the cluster's own radius. If cluster centres aren't
  // screened, that ring fills in; if they are, no cluster ever forms there and
  // the ring stays empty.
  it("keeps a whole cluster from forming on a small obstacle, not just individual buildings", () => {
    const clusterAngularRadius = 0.3;
    const candidates = fibonacciSphere(6); // clusterCount 2 → oversampled by 3
    const obstacle: Obstacle = { direction: candidates[0], angularRadius: 0.05 };
    const city = generateFillerCity({
      planetRadius: 16.8,
      clusterCount: 2,
      buildingsPerCluster: 60,
      clusterAngularRadius,
      maxFootprintBlocks: 6,
      avoid: [obstacle],
    });
    const maxBuildingAngularRadius = (6 / 2) * FILLER_VOXEL_SIZE / 16.8;
    const ringInner = obstacle.angularRadius + maxBuildingAngularRadius + 0.02;
    const inRing = city.filter((b) => {
      const d = angleBetween(b.direction, candidates[0]);
      return d >= ringInner && d <= clusterAngularRadius;
    });
    expect(inRing).toEqual([]);
  });

  it("scatters within clusterAngularRadius of some cluster centre", () => {
    // Indirect: every building has to be within clusterAngularRadius of at
    // least one Fibonacci-lattice candidate, since that's the only place
    // cluster centres are drawn from.
    const options = { ...baseOptions, clusterCount: 4, buildingsPerCluster: 15, clusterAngularRadius: 0.2 };
    const city = generateFillerCity(options);
    const candidates = fibonacciSphere(options.clusterCount * 3);
    for (const b of city) {
      const nearest = Math.min(...candidates.map((c) => angleBetween(b.direction, c)));
      expect(nearest).toBeLessThanOrEqual(options.clusterAngularRadius + 1e-9);
    }
  });

  // The reason radial distance is drawn uniformly rather than area-uniformly
  // (see the function's own docstring): density should be higher near a
  // cluster's centre than at its edge. Bucket buildings by distance from
  // their nearest cluster candidate and check the inner half has more than
  // the outer half.
  it("is denser towards each cluster's own centre", () => {
    const options = { planetRadius: 16.8, clusterCount: 1, buildingsPerCluster: 2000, clusterAngularRadius: 0.5 };
    const city = generateFillerCity(options);
    const centre = fibonacciSphere(3)[0]; // the single cluster candidate actually used
    const distances = city.map((b) => angleBetween(b.direction, centre)).sort((a, b) => a - b);
    const half = options.clusterAngularRadius / 2;
    const inner = distances.filter((d) => d < half).length;
    const outer = distances.filter((d) => d >= half).length;
    expect(inner).toBeGreaterThan(outer);
  });
});

describe("bareFraction", () => {
  it("is 1 with nothing built", () => {
    expect(bareFraction([])).toBe(1);
  });

  it("drops to 0 when one obstacle covers the whole sphere", () => {
    expect(bareFraction([{ direction: [0, 1, 0], angularRadius: Math.PI }])).toBe(0);
  });

  // A disc of angular radius r covers a solid-angle fraction of
  // (1 - cos(r)) / 2 of the sphere — the standard spherical cap formula.
  // Sampled at 20,000 directions this should land within a percent of it.
  it("matches the spherical-cap formula for a single obstacle", () => {
    for (const r of [0.3, 0.8, 1.5]) {
      const covered = 1 - bareFraction([{ direction: [0, 0, 1], angularRadius: r }], 20000);
      const expected = (1 - Math.cos(r)) / 2;
      expect(Math.abs(covered - expected)).toBeLessThan(0.01);
    }
  });

  it("is deterministic", () => {
    const obstacles: Obstacle[] = [{ direction: [1, 0, 0], angularRadius: 0.4 }];
    expect(bareFraction(obstacles)).toBe(bareFraction(obstacles));
  });

  it("never goes up when another obstacle is added", () => {
    const one: Obstacle[] = [{ direction: [0, 0, 1], angularRadius: 0.5 }];
    const two: Obstacle[] = [...one, { direction: [1, 0, 0], angularRadius: 0.5 }];
    expect(bareFraction(two)).toBeLessThanOrEqual(bareFraction(one));
  });
});

describe("sectionObstacles", () => {
  it("returns one obstacle per section", () => {
    expect(sectionObstacles(16.8)).toHaveLength(PLANET_SECTION_KEYS.length);
  });

  it("shrinks angular radius as the planet grows", () => {
    const small = sectionObstacles(10);
    const big = sectionObstacles(100);
    for (let i = 0; i < small.length; i++) expect(big[i].angularRadius).toBeLessThan(small[i].angularRadius);
  });

  it("is positive for every section", () => {
    for (const o of sectionObstacles(16.8)) expect(o.angularRadius).toBeGreaterThan(0);
  });
});

describe("the site's own filler city", () => {
  it("keeps clear of every landmark", () => {
    const obstacles = sectionObstacles(16.8);
    for (const b of FILLER_CITY)
      for (const o of obstacles)
        expect(angleBetween(b.direction, o.direction)).toBeGreaterThanOrEqual(o.angularRadius + b.angularRadius - 1e-9);
  });

  // The reference (reference/image3.png) measured 26% bare, but FILLER_CITY's
  // own docstring explains why the site stopped well short of matching it —
  // headless SwiftShader went from a ~5s screenshot with the filler city off
  // to 20-30s at a density that reached 74% covered. This pins the density
  // actually shipped (roughly a quarter covered) so a future change to these
  // parameters has to be a deliberate edit here, not a silent drift.
  it("leaves most of the sphere bare — the density is capped by rendering cost, not by the reference", () => {
    const obstacles = sectionObstacles(16.8);
    const bare = bareFraction([...obstacles, ...FILLER_CITY]);
    expect(bare).toBeGreaterThan(0.65);
    expect(bare).toBeLessThan(0.85);
  });

  it("is a few hundred buildings, not five and not a thousand", () => {
    expect(FILLER_CITY.length).toBeGreaterThan(150);
    expect(FILLER_CITY.length).toBeLessThan(600);
  });
});
