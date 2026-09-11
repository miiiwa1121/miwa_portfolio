/**
 * Where three.js meets `scene/planet/`.
 *
 * Everything under `scene/planet/` describes the world in plain numbers — unit
 * directions and right-handed bases — precisely so it can be tested without a
 * renderer. This is the one place those bases are turned into a `Quaternion`,
 * so the arithmetic stays testable and the conversion is written once instead
 * of in `PlanetScene`, `Decorations` and `VoxelBus` separately.
 *
 * Two shapes, for two different callers:
 *
 * - `quaternionOf` returns a tuple, for the placements computed once at module
 *   load or inside a `useMemo` (the five landmarks, the trees, the lamps).
 * - `orientTo` / `standOn` write straight into an `Object3D`, for the ones
 *   recomputed every frame (the clouds, the villagers, the tram). Those used to
 *   build a `Matrix4`, three `Vector3`s and a `Quaternion` per object per frame
 *   — around a hundred short-lived three.js objects a frame between them, which
 *   is a garbage collection waiting to land in the middle of a camera flight.
 *   The scratch below is the whole difference.
 */

import * as THREE from "three";
import { surfacePoint, tangentBasis, type Direction } from "./planet/geometry";

/** Local axes in `Matrix4.makeBasis` order, as `scene/planet/` hands them out. */
export type Basis = { right: Direction; up: Direction; forward: Direction };

/** Scratch for composing an orientation; never kept, never handed out. */
const basisMatrix = new THREE.Matrix4();
const basisRight = new THREE.Vector3();
const basisUp = new THREE.Vector3();
const basisForward = new THREE.Vector3();
const basisQuaternion = new THREE.Quaternion();

/** Composes `basis` into `basisQuaternion`, which the two callers below read. */
function compose({ right, up, forward }: Basis): THREE.Quaternion {
  basisRight.set(right[0], right[1], right[2]);
  basisUp.set(up[0], up[1], up[2]);
  basisForward.set(forward[0], forward[1], forward[2]);
  return basisQuaternion.setFromRotationMatrix(basisMatrix.makeBasis(basisRight, basisUp, basisForward));
}

/**
 * The rotation that points an object's local axes along `basis`, as a tuple.
 *
 * For placements that are decided once. Anything recomputed per frame wants
 * `orientTo` instead, which skips the tuple as well as the scratch.
 */
export function quaternionOf(basis: Basis): [number, number, number, number] {
  const q = compose(basis);
  return [q.x, q.y, q.z, q.w];
}

/** Points `object`'s local axes along `basis`, allocating nothing. */
export function orientTo(object: THREE.Object3D, basis: Basis): void {
  object.quaternion.copy(compose(basis));
}

/**
 * Stands `object` on the sphere at `direction`, `height` above the surface,
 * with its local up along that point's own normal (see `tangentBasis`).
 *
 * The rule the whole planet is built on: things stand along the normal of the
 * point they occupy, never along world +Y.
 */
export function standOn(
  object: THREE.Object3D,
  direction: Direction,
  radius: number,
  height = 0,
  yaw = 0
): void {
  orientTo(object, tangentBasis(direction, yaw));
  const [x, y, z] = surfacePoint(direction, radius, height);
  object.position.set(x, y, z);
}
