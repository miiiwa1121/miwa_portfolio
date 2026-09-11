import { describe, expect, it } from "vitest";
import {
  angleBetween,
  anyPerpendicular,
  cross,
  directionToLatLon,
  dot,
  fibonacciSphere,
  latLonToDirection,
  normalize,
  offsetDirection,
  rotateAboutAxis,
  slerpDirection,
  surfacePoint,
  tangentBasis,
  tangentOf,
  type Direction,
} from "./geometry";
import { azimuthToXZ } from "../camera/cameraLayout";

const length = (v: Direction) => Math.hypot(v[0], v[1], v[2]);

describe("latLonToDirection", () => {
  // The convention is the load-bearing part. +Y is the pole and longitude is
  // atan2(x, z), so longitude 0 sits on +Z and a quarter turn east on +X.
  // Getting this backwards puts every building a quarter turn from where the
  // camera thinks it is, and nothing else in the file would notice.
  it("puts longitude 0 on the equator at +Z", () => {
    const [x, y, z] = latLonToDirection(0, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });

  it("puts longitude 90 on +X", () => {
    const [x, y, z] = latLonToDirection(0, 90);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it("puts latitude 90 on +Y", () => {
    const [x, y, z] = latLonToDirection(90, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });

  it("puts latitude -90 on -Y", () => {
    expect(latLonToDirection(-90, 0)[1]).toBeCloseTo(-1);
  });

  it("shrinks the horizontal radius by cos(latitude)", () => {
    // At 60° north the ring the point sits on is half the equator's radius.
    const [x, y, z] = latLonToDirection(60, 90);
    expect(x).toBeCloseTo(0.5);
    expect(y).toBeCloseTo(Math.sqrt(3) / 2);
    expect(z).toBeCloseTo(0);
  });

  it("returns unit vectors at every latitude", () => {
    for (const lat of [-90, -60, -17, 0, 23, 45, 90])
      expect(length(latLonToDirection(lat, 137))).toBeCloseTo(1);
  });

  // The reason for choosing atan2(x, z) over the textbook atan2(z, x): a
  // section's longitude has to BE the orbit azimuth that brings it to the
  // front of the frame, so that facingSection keeps meaning what it means.
  // If these two ever disagree the camera turns to the wrong building.
  it("agrees with cameraLayout's azimuth convention on the equator", () => {
    for (const lonDeg of [0, 37, 90, 154, 210, 300]) {
      const [x, , z] = latLonToDirection(0, lonDeg);
      const [ax, az] = azimuthToXZ((lonDeg * Math.PI) / 180, 1);
      expect(x).toBeCloseTo(ax);
      expect(z).toBeCloseTo(az);
    }
  });
});

describe("directionToLatLon", () => {
  it("round-trips every latitude and longitude", () => {
    for (const [lat, lon] of [
      [0, 0],
      [45, 90],
      [-30, 145],
      [61, -120],
      [-55, 179],
    ]) {
      const back = directionToLatLon(latLonToDirection(lat, lon));
      expect(back.lat).toBeCloseTo(lat);
      expect(back.lon).toBeCloseTo(lon);
    }
  });
});

describe("normalize", () => {
  it("scales to unit length", () => {
    const n = normalize([0, 0, 7]);
    expect(n[2]).toBeCloseTo(1);
    expect(length(n)).toBeCloseTo(1);
  });

  // A NaN axis corrupts a whole basis and shows up only as an object silently
  // vanishing, so a degenerate input has to produce a usable answer.
  it("returns +Y rather than NaN for a zero vector", () => {
    expect(normalize([0, 0, 0])).toEqual([0, 1, 0]);
  });
});

describe("angleBetween", () => {
  it("is zero for the same direction", () => {
    expect(angleBetween([0, 0, 1], [0, 0, 1])).toBeCloseTo(0);
  });

  it("is a quarter turn for perpendicular directions", () => {
    expect(angleBetween([1, 0, 0], [0, 0, 1])).toBeCloseTo(Math.PI / 2);
  });

  it("is half a turn for antipodes", () => {
    expect(angleBetween([0, 1, 0], [0, -1, 0])).toBeCloseTo(Math.PI);
  });

  // acos outside [-1, 1] is NaN, and floating point overshoots on identical
  // inputs often enough to matter.
  it("does not go NaN when the dot product overshoots 1", () => {
    const a = normalize([0.3, 0.7, -0.2]);
    expect(angleBetween(a, a)).toBeCloseTo(0);
  });
});

describe("rotateAboutAxis", () => {
  // Turning about the pole is what longitude means, so this has to agree with
  // latLonToDirection: a quarter turn east of +Z is +X.
  it("turns +Z to +X about the pole in a quarter turn", () => {
    const r = rotateAboutAxis([0, 0, 1], [0, 1, 0], Math.PI / 2);
    expect(r[0]).toBeCloseTo(1);
    expect(r[1]).toBeCloseTo(0);
    expect(r[2]).toBeCloseTo(0);
  });

  it("leaves a vector on its own axis alone", () => {
    const r = rotateAboutAxis([0, 1, 0], [0, 1, 0], 1.3);
    expect(r[1]).toBeCloseTo(1);
  });

  it("returns to the start after a full turn", () => {
    const start: Direction = normalize([0.4, 0.8, -0.3]);
    const r = rotateAboutAxis(start, normalize([1, 0.2, 0.5]), Math.PI * 2);
    expect(angleBetween(r, start)).toBeCloseTo(0);
  });

  it("preserves length", () => {
    expect(length(rotateAboutAxis(normalize([1, 2, 3]), normalize([0, 1, 1]), 0.9))).toBeCloseTo(1);
  });

  // A great circle is how the villagers and the tram get around now, so
  // stepping by a fixed angle has to cover a fixed arc every time.
  it("advances a great circle at a constant rate", () => {
    const start: Direction = [0, 0, 1];
    const axis: Direction = [0, 1, 0];
    let previous = start;
    for (let step = 1; step <= 6; step++) {
      const next = rotateAboutAxis(start, axis, step * 0.4);
      expect(angleBetween(previous, next)).toBeCloseTo(0.4);
      previous = next;
    }
  });
});

describe("slerpDirection", () => {
  it("returns the ends at t = 0 and t = 1", () => {
    const a: Direction = [0, 0, 1];
    const b: Direction = normalize([1, 1, 0]);
    expect(angleBetween(slerpDirection(a, b, 0), a)).toBeCloseTo(0);
    expect(angleBetween(slerpDirection(a, b, 1), b)).toBeCloseTo(0);
  });

  it("stays on the sphere", () => {
    const a: Direction = [0, 0, 1];
    const b: Direction = normalize([0.2, 0.9, -0.4]);
    for (const t of [0.1, 0.35, 0.5, 0.8]) expect(length(slerpDirection(a, b, t))).toBeCloseTo(1);
  });

  // The point of slerp over a normalized lerp. A normalized lerp travels the
  // chord, so it covers more angle per unit t near the middle of a segment —
  // which for a camera on the tour path reads as a lurch through the middle of
  // every leg. Equal steps in t must buy equal arc.
  //
  // The two ends are a quarter turn apart, so each tenth of t must be 0.1571
  // radians. A normalized lerp runs 0.1107 for the first tenth and 0.1974 for
  // the middle one — 78% faster through the middle than at the ends, which is
  // the lurch. This fails on both.
  it("covers equal arc for equal steps in t", () => {
    const a: Direction = [0, 0, 1];
    const b: Direction = [1, 0, 0];
    for (let i = 0; i < 10; i++) {
      const from = slerpDirection(a, b, i / 10);
      const to = slerpDirection(a, b, (i + 1) / 10);
      expect(angleBetween(from, to)).toBeCloseTo(Math.PI / 2 / 10, 4);
    }
  });

  it("survives identical ends", () => {
    const a: Direction = normalize([1, 2, 3]);
    expect(angleBetween(slerpDirection(a, a, 0.5), a)).toBeCloseTo(0);
  });

  // Antipodes have no shortest path, and the naive formula divides by a
  // vanishing sin(omega). Any great circle will do; NaN will not.
  it("survives antipodal ends", () => {
    const mid = slerpDirection([0, 1, 0], [0, -1, 0], 0.5);
    expect(length(mid)).toBeCloseTo(1);
    expect(angleBetween(mid, [0, 1, 0])).toBeCloseTo(Math.PI / 2);
  });
});

describe("anyPerpendicular", () => {
  it("is perpendicular to each cardinal axis", () => {
    for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0]] as Direction[]) {
      const p = anyPerpendicular(v);
      expect(dot(p, v)).toBeCloseTo(0);
      expect(length(p)).toBeCloseTo(1);
    }
  });

  it("is perpendicular to an arbitrary direction", () => {
    const v = normalize([0.3, -0.8, 0.5]);
    expect(dot(anyPerpendicular(v), v)).toBeCloseTo(0);
  });
});

describe("tangentBasis", () => {
  it("uses the surface normal as up", () => {
    const n = latLonToDirection(37, 112);
    const { up } = tangentBasis(n);
    expect(angleBetween(up, n)).toBeCloseTo(0);
  });

  // Right-handed, so the three can go straight into Matrix4.makeBasis. Getting
  // the sign wrong mirrors every building — and a mirrored voxel box looks
  // exactly like an unmirrored one, so nothing on screen would give it away
  // until a signboard's text came out backwards.
  it("is right-handed: right x up === forward", () => {
    for (const [lat, lon] of [[0, 0], [45, 90], [-62, 200], [12, 305]]) {
      const { right, up, forward } = tangentBasis(latLonToDirection(lat, lon));
      const c = cross(right, up);
      expect(c[0]).toBeCloseTo(forward[0]);
      expect(c[1]).toBeCloseTo(forward[1]);
      expect(c[2]).toBeCloseTo(forward[2]);
    }
  });

  it("returns three unit vectors at right angles", () => {
    const { right, up, forward } = tangentBasis(latLonToDirection(-25, 61), 0.8);
    for (const v of [right, up, forward]) expect(length(v)).toBeCloseTo(1);
    expect(dot(right, up)).toBeCloseTo(0);
    expect(dot(up, forward)).toBeCloseTo(0);
    expect(dot(forward, right)).toBeCloseTo(0);
  });

  it("points forward at the north pole with no yaw", () => {
    // Standing on the equator at longitude 0, "along the surface towards the
    // pole" is straight up in world terms.
    const { forward } = tangentBasis([0, 0, 1]);
    expect(forward[0]).toBeCloseTo(0);
    expect(forward[1]).toBeCloseTo(1);
    expect(forward[2]).toBeCloseTo(0);
  });

  // Yaw is how each building chooses which way its signboard faces, so it has
  // to turn by exactly the angle asked for, about the normal and nothing else.
  it("turns forward about the normal by exactly the yaw", () => {
    const n = latLonToDirection(20, 75);
    const { forward: base, up } = tangentBasis(n);
    const { forward: turned } = tangentBasis(n, 0.7);
    expect(angleBetween(base, turned)).toBeCloseTo(0.7);
    // Still in the tangent plane: yawing must not tip the building over.
    expect(dot(turned, up)).toBeCloseTo(0);
  });

  it("gives a quarter turn of yaw a forward along the old right", () => {
    const n: Direction = [0, 0, 1];
    const { right } = tangentBasis(n);
    const { forward } = tangentBasis(n, Math.PI / 2);
    // Turning about +Z by +90° takes +Y to -X, which is this normal's right.
    expect(angleBetween(forward, right)).toBeCloseTo(0);
  });

  // Sections are kept off the poles for camera reasons, but the scattered
  // filler city is not, and "towards the north pole" is not a direction there.
  it("produces a usable frame at both poles", () => {
    for (const pole of [[0, 1, 0], [0, -1, 0]] as Direction[]) {
      const { right, up, forward } = tangentBasis(pole);
      for (const v of [right, up, forward]) {
        expect(Number.isNaN(v[0] + v[1] + v[2])).toBe(false);
        expect(length(v)).toBeCloseTo(1);
      }
      expect(dot(right, up)).toBeCloseTo(0);
      expect(dot(up, forward)).toBeCloseTo(0);
    }
  });
});

describe("tangentOf", () => {
  it("returns a unit vector", () => {
    const n = latLonToDirection(12, 40);
    const v = tangentOf([0.3, 0.9, -0.2], n);
    expect(length(v)).toBeCloseTo(1);
  });

  it("is perpendicular to the normal", () => {
    const n = latLonToDirection(-30, 200);
    for (const v of [[1, 0, 0], [0.2, 0.4, 0.6], [-1, -1, 2]] as Direction[]) {
      expect(dot(tangentOf(v, n), n)).toBeCloseTo(0);
    }
  });

  it("leaves an already-tangent vector pointing the same way", () => {
    const n = latLonToDirection(8, 75);
    const { forward } = tangentBasis(n);
    const result = tangentOf(forward, n);
    expect(angleBetween(result, forward)).toBeCloseTo(0);
  });

  it("keeps the sideways component when a vector leans partly radial", () => {
    const n: Direction = [0, 1, 0];
    // Mostly "up" (radial) with a bit of +X — only the +X should survive.
    const result = tangentOf([0.1, 5, 0], n);
    expect(result[0]).toBeCloseTo(1);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0);
  });

  it("falls back to a perpendicular axis for a purely radial vector, rather than NaN", () => {
    const n = latLonToDirection(50, 10);
    const result = tangentOf(n, n);
    expect(Number.isNaN(result[0] + result[1] + result[2])).toBe(false);
    expect(length(result)).toBeCloseTo(1);
    expect(dot(result, n)).toBeCloseTo(0);
  });
});

describe("offsetDirection", () => {
  it("returns the centre at zero distance, whatever the bearing", () => {
    const centre = latLonToDirection(20, 130);
    for (const bearing of [0, 1, 3, -2]) {
      expect(angleBetween(offsetDirection(centre, bearing, 0), centre)).toBeCloseTo(0);
    }
  });

  it("lands exactly angularDistance away from the centre", () => {
    const centre = latLonToDirection(-15, 200);
    for (const d of [0.05, 0.3, 1.0, 2.5]) {
      expect(angleBetween(offsetDirection(centre, 0.7, d), centre)).toBeCloseTo(d);
    }
  });

  // Bearing 0 is defined as due north — straight along tangentBasis's own
  // forward — and a quarter turn of bearing (east) lands on its right. Get
  // this backwards and every cluster in the filler city scatters mirrored.
  it("heads north at bearing 0 and east at a quarter turn", () => {
    const centre = latLonToDirection(10, 50);
    const { right, forward } = tangentBasis(centre);
    // At a small angular distance the displacement off centre is `sin(d)` of
    // the tangent direction and `1 - cos(d)` (second order, negligible here)
    // back towards centre itself — so the displacement's own direction
    // converges on forward/right as d shrinks, rather than matching it
    // exactly at any finite distance.
    const d = 0.001;
    const north = offsetDirection(centre, 0, d);
    const east = offsetDirection(centre, Math.PI / 2, d);
    expect(dot(normalize([north[0] - centre[0], north[1] - centre[1], north[2] - centre[2]]), forward)).toBeGreaterThan(0.9999);
    expect(dot(normalize([east[0] - centre[0], east[1] - centre[1], east[2] - centre[2]]), right)).toBeGreaterThan(0.9999);
  });

  it("returns a unit vector", () => {
    for (const d of [0.1, 1.5, 3.0])
      expect(length(offsetDirection(latLonToDirection(5, 5), 1.1, d))).toBeCloseTo(1);
  });

  it("is continuous: a small step in distance is a small step in angle", () => {
    const centre = latLonToDirection(0, 0);
    const a = offsetDirection(centre, 0.4, 1.0);
    const b = offsetDirection(centre, 0.4, 1.001);
    expect(angleBetween(a, b)).toBeCloseTo(0.001, 4);
  });

  // Every bearing has to converge on the same point once the distance reaches
  // π — the antipode of centre — the way every line of longitude meets at a
  // pole.
  it("converges on the antipode at distance pi regardless of bearing", () => {
    const centre = latLonToDirection(25, 80);
    const antipode: Direction = [-centre[0], -centre[1], -centre[2]];
    for (const bearing of [0, 1.2, 2.8, -1.5]) {
      expect(angleBetween(offsetDirection(centre, bearing, Math.PI), antipode)).toBeCloseTo(0, 5);
    }
  });
});

describe("fibonacciSphere", () => {
  it("returns the count asked for, all on the sphere", () => {
    const points = fibonacciSphere(64);
    expect(points).toHaveLength(64);
    for (const p of points) expect(length(p)).toBeCloseTo(1);
  });

  it("returns nothing for a non-positive count", () => {
    expect(fibonacciSphere(0)).toEqual([]);
    expect(fibonacciSphere(-3)).toEqual([]);
  });

  // The reason for a lattice rather than hashed random points: random points
  // on a sphere clump, and the bald patches read as a modelling mistake. For
  // 100 points the mean nearest-neighbour gap is 0.337 rad and the tightest
  // pair 0.310; nothing may sit closer than 0.25. A hash01 scatter of the same
  // size puts its closest pair at 0.010 — thirty times nearer — so this bound
  // is what separates a lattice from a random field.
  it("spreads points without clumping", () => {
    const points = fibonacciSphere(100);
    let closest = Infinity;
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        closest = Math.min(closest, angleBetween(points[i], points[j]));
    expect(closest).toBeGreaterThan(0.25);
  });

  // Anything standing exactly on a pole has no "towards the north pole" to
  // face, so the lattice is offset by half a step to keep off them.
  it("keeps every point off the exact poles", () => {
    for (const p of fibonacciSphere(40)) expect(Math.abs(p[1])).toBeLessThan(0.999);
  });

  it("covers both hemispheres", () => {
    const points = fibonacciSphere(50);
    expect(points.filter((p) => p[1] > 0)).toHaveLength(25);
    expect(points.filter((p) => p[1] < 0)).toHaveLength(25);
  });

  it("is deterministic", () => {
    expect(fibonacciSphere(20)).toEqual(fibonacciSphere(20));
  });
});

describe("surfacePoint", () => {
  it("lands on the surface at zero height", () => {
    const p = surfacePoint(latLonToDirection(30, 200), 34);
    expect(Math.hypot(p[0], p[1], p[2])).toBeCloseTo(34);
  });

  it("stacks height on top of the radius", () => {
    const p = surfacePoint([0, 1, 0], 34, 6);
    expect(p).toEqual([0, 40, 0]);
  });

  // The centre is a parameter because a second planet is plausible later, and
  // baking in the origin now would mean finding every position in the scene
  // again to undo it.
  it("offsets from a planet that is not at the origin", () => {
    const p = surfacePoint([0, 0, 1], 10, 2, [5, -3, 1]);
    expect(p).toEqual([5, -3, 13]);
  });

  it("normalizes a direction that is not unit length", () => {
    const p = surfacePoint([0, 0, 4], 34);
    expect(p[2]).toBeCloseTo(34);
  });
});
