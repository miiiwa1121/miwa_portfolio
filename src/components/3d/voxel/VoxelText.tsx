"use client";

import { useMemo } from "react";
import VoxelModel from "./VoxelModel";
import { textToVoxels } from "./text";

type Props = {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  depth?: number;
  /** World size of one rasterized voxel. */
  voxelSize?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
};

/** Blocky 3D signage generated from a string. Memoized so it rasterizes once. */
export default function VoxelText({
  text,
  color = "#ffffff",
  fontSize = 16,
  fontWeight = 800,
  fontFamily,
  depth = 2,
  voxelSize = 0.06,
  position,
  rotation,
  castShadow = true,
}: Props) {
  const voxels = useMemo(
    () => textToVoxels(text, { color, fontSize, fontWeight, fontFamily, depth }),
    [text, color, fontSize, fontWeight, fontFamily, depth]
  );

  return (
    <VoxelModel
      voxels={voxels}
      voxelSize={voxelSize}
      gap={0}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={false}
    />
  );
}
