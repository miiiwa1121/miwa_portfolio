"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

export type Voxel = { x: number; y: number; z: number; color: string };

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

type Props = {
  voxels: Voxel[];
  /** World size of a single voxel cube. */
  voxelSize?: number;
  /** Shrinks each cube slightly to leave a hairline gap (reads more "voxel"). */
  gap?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children?: React.ReactNode;
};

/**
 * Renders an arbitrary list of colored voxels as a single InstancedMesh.
 * Thousands of cubes stay at 60fps because it's one draw call per model.
 */
export default function VoxelModel({
  voxels,
  voxelSize = 1,
  gap = 0.04,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
  children,
}: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(voxels.length, 1);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      tmpObj.position.set(v.x * voxelSize, v.y * voxelSize, v.z * voxelSize);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      mesh.setColorAt(i, tmpColor.set(v.color));
    }
    mesh.count = voxels.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [voxels, voxelSize]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <instancedMesh
        ref={meshRef}
        // geometry & material are supplied as children; only the count matters here
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <boxGeometry args={[voxelSize - gap * voxelSize, voxelSize - gap * voxelSize, voxelSize - gap * voxelSize]} />
        {/* Lambert, not Standard. The voxels are flat matte colour with no
            metalness or roughness variation to express, so the physically
            based shading was computing a response nothing in the scene uses.
            The reference site's author landed on the same material after
            measuring. */}
        <meshLambertMaterial />
      </instancedMesh>
      {children}
    </group>
  );
}
