/**
 * Where things sit on the planet's surface, and how they are turned to stand
 * on it.
 *
 * Deliberately free of three.js and R3F imports, for the same reason
 * `worldLayout.ts` is: this is plain arithmetic over unit vectors, and keeping
 * it that way means it can be tested without a renderer. In particular
 * `tangentBasis` returns three plain number triples rather than a
 * `THREE.Quaternion` — the caller feeds them to `Matrix4.makeBasis`, and the
 * maths that decides *which* way a building faces stays testable in node.
 */

/**
 * A unit vector. Every direction here doubles as a surface normal: a point on
 * the planet and the way "up" points there are the same three numbers.
 */
export type Direction = readonly [number, number, number];

/** A point in world space. Distinguished from Direction, which is always unit. */
export type Point3 = [number, number, number];

const DEG = Math.PI / 180;

/**
 * Unit direction for a latitude/longitude, in degrees.
 *
 * +Y is the pole, and longitude follows `atan2(x, z)` — the same convention
 * `azimuthToXZ` in worldLayout.ts inverts, and therefore the same one
 * CameraControls' `azimuthAngle` uses. That is not a detail: it means **a
 * section's longitude is exactly the orbit azimuth that puts it in front of the
 * camera**, so the existing `sectionAzimuth` / `facingSection` reasoning
 * carries over instead of being off by a quarter turn.
 */
export function latLonToDirection(latDeg: number, lonDeg: number): Direction {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const horizontal = Math.cos(lat);
  return [Math.sin(lon) * horizontal, Math.sin(lat), Math.cos(lon) * horizontal];
}

/** The inverse, in degrees. Used to read back tuned positions and to test. */
export function directionToLatLon(dir: Direction): { lat: number; lon: number } {
  const [x, y, z] = dir;
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, y))) / DEG,
    lon: Math.atan2(x, z) / DEG,
  };
}

export function dot(a: Direction, b: Direction): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Direction, b: Direction): Direction {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Scales a vector back to unit length. Returns +Y for a zero-length input
 * rather than NaNs: callers here are building coordinate frames, and one axis
 * quietly becoming NaN corrupts the whole basis in a way that only shows up as
 * an object vanishing from the scene.
 */
export function normalize(v: Direction): Direction {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length < 1e-9) return [0, 1, 0];
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** Great-circle angle between two directions, in radians. Always in [0, π]. */
export function angleBetween(a: Direction, b: Direction): number {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
}

/**
 * Rotates `v` about `axis` by `angle` radians (Rodrigues' formula).
 *
 * This is how anything walks a great circle: pick a start point and an axis
 * perpendicular to it, then advance the angle with time. The villagers and the
 * tram used `[cos(t)·r, 0, sin(t)·r]`, which is only a circle because the old
 * world was flat — on a sphere the same idea has to name the plane it turns in.
 */
export function rotateAboutAxis(v: Direction, axis: Direction, angle: number): Direction {
  const k = normalize(axis);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - cos);
  return [
    v[0] * cos + kv[0] * sin + k[0] * kd,
    v[1] * cos + kv[1] * sin + k[1] * kd,
    v[2] * cos + kv[2] * sin + k[2] * kd,
  ];
}

/**
 * A direction `t` of the way along the great circle from `a` to `b`.
 *
 * Spherical, not a normalized lerp: a normalized lerp travels the chord and so
 * moves fastest at the midpoint, which for a camera path reads as a lurch
 * through the middle of every segment.
 *
 * Antipodal inputs have no shortest path — every great circle through them is
 * the same length — so rather than dividing by a vanishing `sin(omega)` this
 * picks one perpendicular axis and turns about it. Arbitrary, but continuous
 * and never NaN.
 */
export function slerpDirection(a: Direction, b: Direction, t: number): Direction {
  const omega = angleBetween(a, b);
  if (omega < 1e-6) return normalize(a);
  if (Math.PI - omega < 1e-6) return rotateAboutAxis(a, anyPerpendicular(a), omega * t);
  const sin = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / sin;
  const wb = Math.sin(t * omega) / sin;
  return normalize([
    a[0] * wa + b[0] * wb,
    a[1] * wa + b[1] * wb,
    a[2] * wa + b[2] * wb,
  ]);
}

/**
 * Some unit vector at right angles to `v`.
 *
 * Crosses with whichever cardinal axis `v` leans on least. Crossing with a
 * fixed axis would collapse to zero whenever `v` happened to be parallel to it,
 * which is exactly the case the callers reach for this in.
 */
export function anyPerpendicular(v: Direction): Direction {
  const [x, y, z] = v;
  const axis: Direction =
    Math.abs(x) <= Math.abs(y) && Math.abs(x) <= Math.abs(z)
      ? [1, 0, 0]
      : Math.abs(y) <= Math.abs(z)
        ? [0, 1, 0]
        : [0, 0, 1];
  return normalize(cross(v, axis));
}

/**
 * The frame a thing standing at `normal` is built in: its local +X, +Y and +Z
 * axes expressed in world space.
 *
 * `up` is the normal — that is the whole point of the planet, and why a
 * building at 50° north leans 50° away from the camera's own up. `forward`
 * starts out pointing at the north pole along the surface and is then turned
 * `yaw` radians about the normal, which is how each building chooses which way
 * its signboard and its `VoxelText` face.
 *
 * Right-handed, so `right × up === forward` and the three can be handed
 * straight to `Matrix4.makeBasis(right, up, forward)` without a mirrored
 * building on one hemisphere.
 *
 * At the poles "towards the north pole" is not a direction, and the projection
 * below collapses to zero. Sections are kept away from the poles for camera
 * reasons, but the scattered filler city is not, so this falls back to
 * projecting +Z instead of returning a degenerate frame.
 */
export function tangentBasis(
  normal: Direction,
  yaw = 0
): { right: Direction; up: Direction; forward: Direction } {
  const up = normalize(normal);

  // The part of "north" that lies in the tangent plane.
  const northness = dot(up, [0, 1, 0]);
  const projected: Direction = [
    -up[0] * northness,
    1 - up[1] * northness,
    -up[2] * northness,
  ];
  const base =
    Math.hypot(projected[0], projected[1], projected[2]) < 1e-6
      ? anyPerpendicular(up)
      : normalize(projected);

  const forward = yaw === 0 ? base : normalize(rotateAboutAxis(base, up, yaw));
  return { right: cross(up, forward), up, forward };
}

/**
 * The part of `v` that lies in the tangent plane at `normal`, normalized.
 *
 * What turns "which way is this thing moving" into "which way should it
 * face while standing on the sphere": a walker's raw step (`next - now`, or
 * any other vector that is not already tangent) generally has a small radial
 * component too, which `tangentBasis`'s own `forward`/`right` cannot absorb —
 * they are unit vectors in a fixed plane, not a projection. This is that
 * projection, kept separate so it can be tested against any input rather
 * than only against the closed forms that happen to already be tangent.
 *
 * Zero (falling back to `anyPerpendicular`) when `v` is purely radial —
 * pointing straight at or away from `normal` — the same "never NaN" contract
 * `normalize` keeps, for the same reason: a caller building an orientation
 * out of this cannot afford a degenerate axis.
 */
export function tangentOf(v: Direction, normal: Direction): Direction {
  const n = normalize(normal);
  const d = dot(v, n);
  const projected: Direction = [v[0] - d * n[0], v[1] - d * n[1], v[2] - d * n[2]];
  return Math.hypot(...projected) < 1e-9 ? anyPerpendicular(n) : normalize(projected);
}

/**
 * A direction `angularDistance` radians from `centre`, in compass direction
 * `bearing` (radians, measured from `tangentBasis(centre).forward` — "north"
 * — towards `.right` — "east").
 *
 * The geodesic-polar-coordinates formula: `cos(d)·centre + sin(d)·tangentDir`
 * is the point angularDistance `d` along the great circle that leaves `centre`
 * heading in the tangent direction `tangentDir`. This is what scatters filler
 * buildings around a cluster's own centre (`scene/planet/city.ts`) — walking a
 * fixed world-unit offset would bunch points together near the poles of
 * whatever local frame produced them, where a fixed angle does not, because
 * it is measured on the sphere itself rather than projected onto one plane.
 *
 * `bearing` has no meaning at `angularDistance = 0`, the same way longitude
 * has none at the poles — every bearing returns `centre` there.
 */
export function offsetDirection(centre: Direction, bearing: number, angularDistance: number): Direction {
  const { right, forward } = tangentBasis(centre);
  const tangentDir: Direction = [
    Math.cos(bearing) * forward[0] + Math.sin(bearing) * right[0],
    Math.cos(bearing) * forward[1] + Math.sin(bearing) * right[1],
    Math.cos(bearing) * forward[2] + Math.sin(bearing) * right[2],
  ];
  const cos = Math.cos(angularDistance);
  const sin = Math.sin(angularDistance);
  return normalize([
    centre[0] * cos + tangentDir[0] * sin,
    centre[1] * cos + tangentDir[1] * sin,
    centre[2] * cos + tangentDir[2] * sin,
  ]);
}

/**
 * `count` directions spread evenly over the whole sphere (Fibonacci lattice).
 *
 * Even *and* deterministic, which a scatter drawn from `hash01` is not: random
 * points on a sphere clump, and the bald patches read as a modelling mistake
 * rather than as randomness. The golden angle leaves no two neighbours the same
 * distance apart, so it never looks like a grid either.
 *
 * The lattice's own longitudes use `atan2(z, x)` rather than this module's
 * `atan2(x, z)`. For an even scatter that is a rigid rotation of the same set
 * of points and so makes no difference; nothing should read a longitude back
 * out of these without converting.
 */
export function fibonacciSphere(count: number): Direction[] {
  if (count <= 0) return [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const out: Direction[] = [];
  for (let i = 0; i < count; i++) {
    // Offset by a half step so the first and last points sit inside the caps
    // rather than exactly on the poles.
    const y = 1 - (2 * i + 1) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * golden;
    out.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius]);
  }
  return out;
}

/**
 * World position of a point `height` above the surface in direction `dir`.
 *
 * `centre` is a parameter rather than the origin because a second planet is
 * plausible later, and every position in the scene would have to be found and
 * rewritten if this baked in the origin now. It costs nothing today.
 */
export function surfacePoint(
  dir: Direction,
  radius: number,
  height = 0,
  centre: Point3 = [0, 0, 0]
): Point3 {
  const unit = normalize(dir);
  const r = radius + height;
  return [centre[0] + unit[0] * r, centre[1] + unit[1] * r, centre[2] + unit[2] * r];
}
