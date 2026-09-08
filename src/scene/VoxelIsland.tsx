"use client";

import { useMemo } from "react";
import VoxelModel, { Voxel } from "./voxel/VoxelModel";
import { PALETTE, pick } from "./voxel/palette";
import { noise2 } from "./voxel/builders";

/**
 * A floating pastel island generated entirely from code.
 * - Rounded plot with grassy top
 * - Pink stone ring-road + cross paths + centre plaza
 * - Dirt & stone strata tapering to a pointed bottom (floating-island look)
 */
export default function VoxelIsland({ radius = 15 }: { radius?: number }) {
  const voxels = useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const R = radius;

    const isRoad = (x: number, z: number, d: number) => {
      // Ring road
      if (d > R * 0.55 && d < R * 0.72) return true;
      // Cross avenues
      if (Math.abs(x) <= 1 && d < R * 0.95) return true;
      if (Math.abs(z) <= 1 && d < R * 0.95) return true;
      return false;
    };

    for (let x = -R; x <= R; x++) {
      for (let z = -R; z <= R; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > R) continue;

        const edge = R - d; // distance from the rim
        const topY = noise2(x, z) > 0.72 && edge > 2 ? 1 : 0; // gentle bumps inland

        // --- surface ---
        const centrePlaza = d < R * 0.16;
        if (centrePlaza) {
          out.push({ x, y: topY, z, color: PALETTE.plaza });
        } else if (isRoad(x, z, d)) {
          const rim = d > R * 0.55 && (d < R * 0.57 || d > R * 0.70);
          out.push({ x, y: topY, z, color: rim ? PALETTE.roadEdge : PALETTE.road });
        } else {
          out.push({ x, y: topY, z, color: pick(PALETTE.grass, x * 3.1 + z * 5.7) });
        }
        if (topY === 1) {
          // side of the little hill
          out.push({ x, y: 0, z, color: pick(PALETTE.grass, x * 1.3 + z * 2.1) });
        }

        // --- dirt layer ---
        out.push({ x, y: -1, z, color: pick(PALETTE.dirt, x * 2.3 + z) });
        out.push({ x, y: -2, z, color: pick(PALETTE.dirt, x + z * 2.9) });

        // --- stone taper toward centre (pointed underside) ---
        const depth = Math.floor(edge * 0.5) + 1;
        for (let k = 0; k < depth; k++) {
          out.push({ x, y: -3 - k, z, color: pick(PALETTE.stone, x * 1.7 + z * 1.1 + k) });
        }
      }
    }
    return out;
  }, [radius]);

  return <VoxelModel voxels={voxels} voxelSize={0.7} gap={0.02} position={[0, 0, 0]} castShadow receiveShadow />;
}
