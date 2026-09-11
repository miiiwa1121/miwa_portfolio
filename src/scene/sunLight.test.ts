import { describe, expect, it } from "vitest";
import {
  SCENE_BOUNDING_RADIUS,
  SUN_DIRECTION,
  SUN_DISTANCE,
  SUN_SHADOW_FAR,
  SUN_SHADOW_NEAR,
  SUN_ORB_RADIUS,
  sunDirectionAlong,
  incidence,
  sunPosition,
} from "./sunLight";
import { SMOOTH_PLANET_RADIUS } from "./planet/sections";
import { CAMERA_FOV, ORBIT_RADIUS } from "./camera/cameraLayout";
import { angleBetween, normalize, type Direction } from "./planet/geometry";

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

describe("placing the sun with the pointer", () => {
  /** A camera out along +Z, at the overview altitude. */
  const eye: Direction = [0, 0, ORBIT_RADIUS];
  /** The ray from `eye` towards the point on the sun's own sphere in direction `d`. */
  const rayAt = (d: Direction): Direction =>
    normalize([d[0] * SUN_ORB_RADIUS - eye[0], d[1] * SUN_ORB_RADIUS - eye[1], d[2] * SUN_ORB_RADIUS - eye[2]]);

  it("puts the sun exactly where the pointer is", () => {
    // The whole point of casting a ray rather than turning by a delta: no
    // factor, no lag, nothing that varies with where on its circle the sun is.
    for (const target of [
      normalize([0, 0, 1]), // straight at the camera
      normalize([0.6, 0.2, 0.77]),
      normalize([-0.5, 0.5, 0.71]),
      normalize([0.94, 0, 0.34]), // out towards the silhouette
    ] as Direction[]) {
      const landed = sunDirectionAlong(eye, rayAt(target));
      expect(angleBetween(landed, target)).toBeLessThan(1e-6);
    }
  });

  it("takes the near intersection, so the sun does not jump round the back", () => {
    // A ray through the middle of the sphere leaves by the far side too. Landing
    // there would flip the sun behind the planet on a drag that only crossed the
    // centre of the frame.
    const landed = sunDirectionAlong(eye, [0, 0, -1]);
    expect(landed[2]).toBeGreaterThan(0.99); // the side facing the camera
  });

  it("follows a pointer dragged off the edge instead of letting go", () => {
    // Rays that miss the sphere entirely — the pointer is outside its
    // silhouette — still have to answer with something, or the sun would freeze
    // whenever the hand overshot. The answer has to be the closest the sphere
    // comes to that ray; anywhere else and the sun would slide sideways as the
    // pointer went straight.
    const past: Direction = normalize([1, 0, -0.2]); // well outside the silhouette
    const landed = sunDirectionAlong(eye, past);
    expect(Math.hypot(...landed)).toBeCloseTo(1, 10);
    expect(landed[0]).toBeGreaterThan(0); // the side the pointer went

    /** How far the ray passes from a point on the sun's sphere. */
    const missBy = (d: Direction) => {
      const p = [d[0] * SUN_ORB_RADIUS - eye[0], d[1] * SUN_ORB_RADIUS - eye[1], d[2] * SUN_ORB_RADIUS - eye[2]];
      const along = p[0] * past[0] + p[1] * past[1] + p[2] * past[2];
      return Math.hypot(p[0] - along * past[0], p[1] - along * past[1], p[2] - along * past[2]);
    };
    const best = missBy(landed);
    for (let i = 0; i < 400; i++) {
      const a = (i / 400) * 2 * Math.PI;
      // Nudge the answer around in every direction; none may do better.
      const nudged = normalize([landed[0] + 0.02 * Math.cos(a), landed[1] + 0.02 * Math.sin(a), landed[2]]);
      expect(missBy(nudged)).toBeGreaterThanOrEqual(best - 1e-9);
    }
  });

  it("does not jump as the pointer crosses the silhouette", () => {
    // Where the near and far intersections meet, and the obvious way to write
    // this — one branch for a hit, another for a miss — can part company.
    //
    // Tested by refining rather than by a threshold: the sun genuinely moves
    // fast near the edge (a ray grazing a sphere slides a long way along it for
    // very little pointer travel), so a fixed limit would only say how finely
    // this happened to sample. A real break would not shrink when the sampling
    // does; a steep but continuous stretch halves with it.
    const sweep = (steps: number) => {
      const rayAtSpread = (t: number): Direction => {
        const spread = 0.05 + t * 0.35; // outwards past the sphere's edge (19.9°)
        return normalize([Math.sin(spread), 0, -Math.cos(spread)]);
      };
      let previous = sunDirectionAlong(eye, rayAtSpread(0));
      let worst = 0;
      for (let i = 1; i <= steps; i++) {
        const now = sunDirectionAlong(eye, rayAtSpread(i / steps));
        worst = Math.max(worst, angleBetween(previous, now));
        previous = now;
      }
      return worst;
    };
    const coarse = sweep(3000);
    const fine = sweep(12000);
    expect(fine).toBeLessThan(coarse * 0.75); // shrinks with the sampling: no break
    expect(fine).toBeLessThan(0.02);
  });

  it("does not care how long the ray it is handed is", () => {
    // A ray is a direction, not a distance, and the caller's may be either —
    // three.js hands out a unit one, but the quadratic below only solves for a
    // real distance along the ray if it is. Getting this wrong scales the hit
    // point and lands the sun somewhere else entirely.
    const ray: Direction = normalize([0.3, 0.2, -0.93]);
    const unit = sunDirectionAlong(eye, ray);
    for (const scale of [0.01, 7, 250]) {
      const scaled = sunDirectionAlong(eye, [ray[0] * scale, ray[1] * scale, ray[2] * scale]);
      expect(angleBetween(scaled, unit)).toBeLessThan(1e-6);
    }
  });

  it("always answers a unit direction, whatever it is handed", () => {
    for (const ray of [[0, 0, -1], [1, 1, 1], [0, 1, 0], [-1, 0, 0]] as Direction[]) {
      const landed = sunDirectionAlong(eye, ray);
      expect(Math.hypot(...landed)).toBeCloseTo(1, 10);
      for (const v of landed) expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("the visible sun", () => {
  // Only the overview altitude shows it, so that is the altitude it has to work
  // at. The sun sits at `SUN_ORB_RADIUS` and is seen from `ORBIT_RADIUS`, both
  // measured from the planet's centre, so at its widest — square-on to the
  // camera — it appears this far off the middle of the frame:
  const offAxisAtWidest = Math.atan(SUN_ORB_RADIUS / ORBIT_RADIUS);
  /** How much of the frame the planet itself takes up from there. */
  const planetDisc = Math.asin(SMOOTH_PLANET_RADIUS / ORBIT_RADIUS);
  /** Half the frame, the short way. The sun has to fit inside this to be reachable. */
  const frameHalfHeight = ((CAMERA_FOV / 2) * Math.PI) / 180;

  it("clears the planet's own disc, so it is not hidden behind the world", () => {
    expect(offAxisAtWidest).toBeGreaterThan(planetDisc);
  });

  it("stays inside the frame, so it can be reached", () => {
    // This is the end the first attempt failed: out at 260 the sun was seen in
    // essentially its own direction from the planet, which falls in frame only
    // when it is behind the planet — where the planet then hides it. Zero
    // sightings over a full lap.
    expect(offAxisAtWidest).toBeLessThan(frameHalfHeight);
  });

  it("clears everything standing on the planet", () => {
    // Otherwise it would pass through the city rather than over it.
    expect(SUN_ORB_RADIUS).toBeGreaterThanOrEqual(SCENE_BOUNDING_RADIUS);
  });
});
