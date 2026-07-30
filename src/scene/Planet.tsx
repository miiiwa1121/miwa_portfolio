"use client";

import { useMemo } from "react";
import VoxelModel from "./voxel/VoxelModel";
import { planetVoxels, PLANET_VOXEL_SIZE } from "./planet/shell";

/**
 * The world's ground: a hollow voxel sphere in space, replacing the old flat
 * island. Generation lives in `scene/planet/shell.ts` as plain arithmetic —
 * this component's only job is handing the result to `VoxelModel` at the
 * right scale, the same way `VoxelIsland` did for the disc it replaces.
 */
export default function Planet() {
  const voxels = useMemo(() => planetVoxels(), []);
  return (
    <VoxelModel
      voxels={voxels}
      voxelSize={PLANET_VOXEL_SIZE}
      gap={0.02}
      position={[0, 0, 0]}
      castShadow
      receiveShadow
    />
  );
}
