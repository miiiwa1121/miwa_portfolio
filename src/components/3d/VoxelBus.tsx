"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import VoxelModel, { Voxel } from "./voxel/VoxelModel";
import { fillBox, put } from "./voxel/builders";
import { PALETTE } from "./voxel/palette";
import { sceneClock } from "./sceneClock";

const VS = 0.34;

function tramVoxels(): Voxel[] {
  const out: Voxel[] = [];
  const w = 4, h = 4, len = 9;
  // body
  fillBox(out, 0, 1, 0, w, h, len, PALETTE.pink[1]);
  // roof band
  fillBox(out, 0, h, 0, w, 1, len, PALETTE.white);
  // windows (both sides)
  for (let z = 1; z < len - 1; z += 2) {
    for (let y = 2; y < 4; y++) {
      out.push({ x: 0, y, z, color: PALETTE.glass });
      out.push({ x: w - 1, y, z, color: PALETTE.glass });
    }
  }
  // front & back windshields
  for (let x = 1; x < w - 1; x++) {
    out.push({ x, y: 3, z: 0, color: PALETTE.glass });
    out.push({ x, y: 3, z: len - 1, color: PALETTE.glass });
  }
  // wheels
  for (const z of [1, len - 2]) {
    put(out, 0, 0, z, PALETTE.stone[1]);
    put(out, w - 1, 0, z, PALETTE.stone[1]);
  }
  // headlight
  put(out, 1, 1, len - 1, PALETTE.glassWarm);
  put(out, w - 2, 1, len - 1, PALETTE.glassWarm);
  return out;
}

export function VoxelBus() {
  const groupRef = useRef<THREE.Group>(null);
  const voxels = useMemo(() => tramVoxels(), []);
  const radius = 6.6; // matches the island ring road
  const speed = 0.22;

  useFrame((state) => {
    if (!groupRef.current) return;
    const a = sceneClock.time(state.clock.elapsedTime) * speed;
    groupRef.current.position.set(Math.cos(a) * radius, 0.35, Math.sin(a) * radius);
    // orient along the tangent of the circle
    groupRef.current.rotation.y = -a + Math.PI / 2;
  });

  return (
    <group ref={groupRef}>
      {/* recenter the tram model on its own origin */}
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} position={[-1.5 * VS, 0, -4.5 * VS]} />
    </group>
  );
}
