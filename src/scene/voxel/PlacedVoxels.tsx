"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

/** A single cube that carries its own world position and rotation. */
export type PlacedVoxel = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  color: string;
};

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

type Props = {
  voxels: PlacedVoxel[];
  /** World size of a single voxel cube. */
  voxelSize: number;
  /** Shrinks each cube slightly to leave a hairline gap (reads more "voxel"). */
  gap?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

/**
 * `VoxelModel`'s sibling for a scene where cubes don't share one lattice.
 *
 * `VoxelModel` places every voxel at `[v.x, v.y, v.z] * voxelSize` inside one
 * shared frame — fine for a single building, wrong for a filler city where
 * each building stands on its own patch of a sphere with its own "up". This
 * component skips the shared lattice: every voxel already carries its own
 * world position and rotation (baked by whoever assembled the list — see
 * `FillerCity.tsx`), and this only has to write them into one `InstancedMesh`.
 * Still one draw call for however many buildings' worth of cubes are handed
 * to it, which is the whole reason a second component exists rather than a
 * second draw call per building.
 */
export default function PlacedVoxels({ voxels, voxelSize, gap = 0.04, castShadow = true, receiveShadow = true }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(voxels.length, 1);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      tmpObj.position.set(v.position[0], v.position[1], v.position[2]);
      tmpObj.quaternion.set(v.quaternion[0], v.quaternion[1], v.quaternion[2], v.quaternion[3]);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      mesh.setColorAt(i, tmpColor.set(v.color));
    }
    mesh.count = voxels.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [voxels]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={[voxelSize - gap * voxelSize, voxelSize - gap * voxelSize, voxelSize - gap * voxelSize]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}
