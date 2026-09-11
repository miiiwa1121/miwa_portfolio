"use client";

import { useMemo } from "react";
import * as THREE from "three";
import PlacedVoxels, { type PlacedVoxel } from "../voxel/PlacedVoxels";
import type { Voxel } from "../voxel/VoxelModel";
import { PALETTE, pick } from "../voxel/palette";
import { FILLER_CITY, FILLER_VOXEL_SIZE, type FillerBuilding } from "../planet/city";
import { SMOOTH_PLANET_RADIUS } from "../planet/sections";
import { surfacePoint, tangentBasis } from "../planet/geometry";

/**
 * The unnamed buildings that keep the planet from reading as five landmarks
 * on open ground — see `scene/planet/city.ts` for where they're placed and
 * why that took over a thousand of them to reach the reference's 74%
 * covered.
 *
 * Everything in `scene/planet/city.ts` is direction, angle and count — no
 * voxels, no colour, no three.js. This component is where a `FillerBuilding`
 * becomes an actual small building and gets baked, cube by cube, into world
 * space. That bake is what `PlacedVoxels` needs and `VoxelModel` can't give
 * it: `VoxelModel` places every voxel inside one shared lattice, and these
 * buildings each stand on their own patch of a sphere with their own "up".
 */

/** Muted, city-coloured — deliberately not the landmarks' own pink/blue, so nothing reads as a sixth named building. */
const WALL_COLORS = [...PALETTE.cream, ...PALETTE.sand, ...PALETTE.stone] as const;
const ROOF_COLOR = PALETTE.stone[1];

/**
 * A small hollow box: four walls and a flat roof cap, no floor.
 *
 * No floor because nothing is ever below one — every building sits directly
 * on the ground it's baked onto, and a floor voxel would be a cube spent on a
 * face that never sees a camera. Landmarks get away with detail (windows,
 * setbacks, antennas) because there are five of them; at a thousand-plus,
 * four walls and a roof is the difference between an `InstancedMesh` and a
 * slideshow.
 */
function fillerBuildingVoxels(width: number, depth: number, height: number, wallColor: string): Voxel[] {
  const out: Voxel[] = [];
  const ox = -Math.floor(width / 2);
  const oz = -Math.floor(depth / 2);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let z = 0; z < depth; z++) {
        if (x === 0 || x === width - 1 || z === 0 || z === depth - 1)
          out.push({ x: ox + x, y, z: oz + z, color: wallColor });
      }
  for (let x = 0; x < width; x++)
    for (let z = 0; z < depth; z++) out.push({ x: ox + x, y: height, z: oz + z, color: ROOF_COLOR });
  return out;
}

/** Scratch three.js objects for the bake below; never read across buildings. */
const scratchMatrix = new THREE.Matrix4();
const scratchQuaternion = new THREE.Quaternion();
const scratchRight = new THREE.Vector3();
const scratchUp = new THREE.Vector3();
const scratchForward = new THREE.Vector3();
const scratchLocal = new THREE.Vector3();
const scratchWorldPosition = new THREE.Vector3();

/** One building's voxels, transformed from its own small local lattice into world-space instances. */
function bakeBuilding(building: FillerBuilding): PlacedVoxel[] {
  const { right, up, forward } = tangentBasis(building.direction);
  scratchMatrix.makeBasis(
    scratchRight.set(...right),
    scratchUp.set(...up),
    scratchForward.set(...forward)
  );
  scratchQuaternion.setFromRotationMatrix(scratchMatrix);
  const quaternion: [number, number, number, number] = [
    scratchQuaternion.x,
    scratchQuaternion.y,
    scratchQuaternion.z,
    scratchQuaternion.w,
  ];

  const [wx, wy, wz] = surfacePoint(building.direction, SMOOTH_PLANET_RADIUS);
  scratchWorldPosition.set(wx, wy, wz);

  const wallColor = pick(WALL_COLORS, building.colorSeed);
  const voxels = fillerBuildingVoxels(building.widthBlocks, building.depthBlocks, building.heightBlocks, wallColor);

  return voxels.map((v) => {
    scratchLocal.set(v.x * FILLER_VOXEL_SIZE, v.y * FILLER_VOXEL_SIZE, v.z * FILLER_VOXEL_SIZE);
    scratchLocal.applyQuaternion(scratchQuaternion).add(scratchWorldPosition);
    return { position: [scratchLocal.x, scratchLocal.y, scratchLocal.z], quaternion, color: v.color };
  });
}

export default function FillerCity() {
  const voxels = useMemo(() => FILLER_CITY.flatMap(bakeBuilding), []);
  return <PlacedVoxels voxels={voxels} voxelSize={FILLER_VOXEL_SIZE} gap={0.05} />;
}
