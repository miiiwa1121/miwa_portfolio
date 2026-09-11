"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import VoxelModel, { Voxel } from "../voxel/VoxelModel";
import { fillBox, put } from "../voxel/builders";
import { PALETTE } from "../voxel/palette";
import { sceneClock } from "../sceneClock";
import { PLANET_TOUR } from "../planet/tour";
import { surfacePoint, tangentOf, type Direction } from "../planet/geometry";
import { orientTo } from "../planetPlacement";
import { SMOOTH_PLANET_RADIUS } from "../planet/sections";

const VS = 0.34;
const GROUND_RADIUS = SMOOTH_PLANET_RADIUS;

/** How far ahead along the tour the tram's own facing is sampled from — small
 * enough that `tangentOf`'s projection is a good stand-in for the path's true
 * derivative, large enough not to lose precision to floating point. */
const FACING_EPSILON = 0.0005;

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

/**
 * A tram that rides the same closed path the camera's tour does, at ground
 * level — "a road under the tour", per docs/planet-migration.md, rather than
 * a second route to keep in sync with it by hand. Wherever `PLANET_TOUR`
 * goes, the tram already goes too.
 */
export default function VoxelBus() {
  const groupRef = useRef<THREE.Group>(null);
  const voxels = useMemo(() => tramVoxels(), []);
  // Fraction of the whole tour covered per second. The tour's own arc length
  // is a handful of radians (see tour.ts), so this is a slow lap — a couple
  // of minutes — not a fixed real-world speed.
  const speed = 0.015;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const u = sceneClock.time(state.clock.elapsedTime) * speed;
    const now = PLANET_TOUR.direction(u);
    const ahead = PLANET_TOUR.direction(u + FACING_EPSILON);
    const step: Direction = [ahead[0] - now[0], ahead[1] - now[1], ahead[2] - now[2]];
    const forward = tangentOf(step, now);
    const up = now;
    const right: Direction = [
      up[1] * forward[2] - up[2] * forward[1],
      up[2] * forward[0] - up[0] * forward[2],
      up[0] * forward[1] - up[1] * forward[0],
    ];

    // Not `standOn`: the tram faces along the tour it is running, not the fixed
    // local north `tangentBasis` would give it.
    orientTo(group, { right, up, forward });
    group.position.set(...surfacePoint(now, GROUND_RADIUS, 0.3));
  });

  return (
    <group ref={groupRef}>
      {/* recenter the tram model on its own origin */}
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} position={[-1.5 * VS, 0, -4.5 * VS]} />
    </group>
  );
}
