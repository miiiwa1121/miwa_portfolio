"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import VoxelModel, { Voxel } from "../voxel/VoxelModel";
import { fillBox, put } from "../voxel/builders";
import { PALETTE, pick } from "../voxel/palette";
import { sceneClock } from "../sceneClock";
import { PARK_CENTRE, scatterAround, walkerFacing } from "../planet/decor";
import { normalize, offsetDirection, surfacePoint, tangentBasis, type Direction } from "../planet/geometry";
import { orientTo, quaternionOf, standOn } from "../planetPlacement";
import { SMOOTH_PLANET_RADIUS } from "../planet/sections";

const VS = 0.42;

/** The ground every decoration in this file stands on or floats above. */
const GROUND_RADIUS = SMOOTH_PLANET_RADIUS;

/**
 * A world position + quaternion for something standing at `direction`,
 * `height` above the surface — for the placements decided once, in a `useMemo`.
 *
 * Anything recomputed every frame uses `standOn` (the clouds and the villagers
 * below), which writes into the object rather than handing back tuples for a
 * render to spread.
 */
function standAt(direction: Direction, height = 0, yaw = 0): { position: [number, number, number]; quaternion: [number, number, number, number] } {
  const [x, y, z] = surfacePoint(direction, GROUND_RADIUS, height);
  return { position: [x, y, z], quaternion: quaternionOf(tangentBasis(direction, yaw)) };
}

// ---------------------------------------------------------------
// Ferris wheel — a spinning voxel wheel on a central pole, standing at the
// plaza's own centre (see scene/planet/decor.ts for where that is and why).
// ---------------------------------------------------------------
export function FerrisWheel() {
  const wheelRef = useRef<THREE.Group>(null);
  const R = 6; // wheel radius in voxels — smaller than the flat world's 8, so it
  // shares the plaza with the trees and lamps scattered around the same centre.
  const centerY = 9; // hub height in voxels

  const support = useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    fillBox(out, -2, 0, -2, 4, 1, 4, PALETTE.stone[0]);
    fillBox(out, -1, 0, -1, 2, centerY, 2, PALETTE.yellow[1]);
    return out;
  }, []);

  const wheel = useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const spokes = 8;
    for (let a = 0; a < 360; a += 4) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(Math.cos(rad) * R);
      const y = Math.round(Math.sin(rad) * R);
      put(out, x, y, 0, PALETTE.yellow[0]);
      put(out, x, y, 1, PALETTE.yellow[1]);
    }
    const cabinColors = [PALETTE.pink[0], PALETTE.blue[0], PALETTE.green[0], PALETTE.roofRed, PALETTE.yellow[0]];
    for (let k = 0; k < spokes; k++) {
      const rad = (k / spokes) * Math.PI * 2;
      const dx = Math.cos(rad), dy = Math.sin(rad);
      for (let t = 1; t < R; t++) put(out, Math.round(dx * t), Math.round(dy * t), 0, PALETTE.yellow[1]);
      const cx = Math.round(dx * (R + 1)), cy = Math.round(dy * (R + 1));
      fillBox(out, cx - 1, cy - 1, -1, 2, 2, 3, cabinColors[k % cabinColors.length]);
    }
    fillBox(out, -1, -1, -1, 2, 2, 3, PALETTE.stone[0]);
    return out;
  }, []);

  useFrame((_, delta) => {
    if (wheelRef.current) wheelRef.current.rotation.z += sceneClock.delta(delta) * 0.25;
  });

  const { position, quaternion } = useMemo(() => standAt(PARK_CENTRE), []);

  return (
    <group position={position} quaternion={quaternion}>
      <VoxelModel voxels={support} voxelSize={VS} gap={0.05} />
      <group ref={wheelRef} position={[0, centerY * VS, 0]}>
        <VoxelModel voxels={wheel} voxelSize={VS} gap={0.05} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------
// Voxel tree
// ---------------------------------------------------------------
function treeVoxels(seed: number): Voxel[] {
  const out: Voxel[] = [];
  const trunkH = 3 + (Math.floor(seed) % 2);
  fillBox(out, 0, 0, 0, 1, trunkH, 1, PALETTE.wood);
  for (let ly = 0; ly < 3; ly++) {
    const s = ly === 2 ? 3 : 5;
    const o = -Math.floor(s / 2);
    for (let x = 0; x < s; x++)
      for (let z = 0; z < s; z++) {
        const corner = (x === 0 || x === s - 1) && (z === 0 || z === s - 1);
        if (corner && s === 5) continue;
        put(out, o + x, trunkH + ly, o + z, pick(PALETTE.grass, seed + x * 3.1 + ly * 7.7 + z * 1.9));
      }
  }
  return out;
}

/** How far from the plaza's centre trees and lamps scatter — inside
 * `PARK_RADIUS` (see decor.ts), and clear of the ferris wheel's own
 * footprint (`FerrisWheel`'s R=6 voxels × 0.42 ÷ planet radius ≈ 0.15). */
const TREE_MIN_RADIUS = 0.17;
const TREE_MAX_RADIUS = 0.3;

export function Trees() {
  const spots = useMemo(() => scatterAround(PARK_CENTRE, 8, TREE_MAX_RADIUS, 3001, TREE_MIN_RADIUS), []);
  const models = useMemo(() => spots.map((s) => treeVoxels(s.seed)), [spots]);
  const placed = useMemo(() => spots.map((s) => standAt(s.direction)), [spots]);
  return (
    <>
      {spots.map((_, i) => (
        <group key={i} position={placed[i].position} quaternion={placed[i].quaternion}>
          <VoxelModel voxels={models[i]} voxelSize={0.34} gap={0.06} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------
// Street lamps
// ---------------------------------------------------------------
function lampVoxels(): Voxel[] {
  const out: Voxel[] = [];
  fillBox(out, 0, 0, 0, 1, 6, 1, PALETTE.stone[1]);
  fillBox(out, 0, 6, 0, 2, 1, 1, PALETTE.stone[1]);
  put(out, 2, 5, 0, PALETTE.glassWarm);
  put(out, 2, 6, 0, PALETTE.yellow[0]);
  return out;
}

const LAMP_MIN_RADIUS = 0.16;
const LAMP_MAX_RADIUS = 0.24;

export function StreetLamps() {
  const voxels = useMemo(() => lampVoxels(), []);
  const spots = useMemo(() => scatterAround(PARK_CENTRE, 6, LAMP_MAX_RADIUS, 4001, LAMP_MIN_RADIUS), []);
  const placed = useMemo(() => spots.map((s) => standAt(s.direction)), [spots]);
  return (
    <>
      {spots.map((_, i) => (
        <group key={i} position={placed[i].position} quaternion={placed[i].quaternion}>
          <VoxelModel voxels={voxels} voxelSize={0.28} gap={0.05} castShadow={false} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------
// Drifting voxel clouds
// ---------------------------------------------------------------
function cloudVoxels(seed: number): Voxel[] {
  const out: Voxel[] = [];
  const puffs = 2 + (Math.floor(seed) % 2);
  for (let p = 0; p < puffs; p++) {
    const ox = p * 2 - puffs;
    const w = 2 + (p % 2);
    for (let x = 0; x < w; x++)
      for (let y = 0; y < 2; y++)
        for (let z = 0; z < 2; z++) {
          if ((x === 0 || x === w - 1) && y === 1 && w > 2) continue;
          out.push({ x: ox + x, y: (p % 2) + y, z, color: "#ffffff" });
        }
  }
  return out;
}

/** Where each cloud anchors, and how it drifts — spread around the globe
 * rather than clustered at the plaza, the way the flat world's four clouds
 * covered the four quadrants of the sky above the island. */
type CloudSpec = { anchor: Direction; seed: number; driftRadius: number; speed: number; height: number };

export function Clouds() {
  const clouds = useMemo<CloudSpec[]>(
    () => [
      { anchor: [1, 0.5, 0.2], seed: 1, driftRadius: 0.05, speed: 0.4, height: 11 },
      { anchor: [-0.6, 0.7, 0.9], seed: 3, driftRadius: 0.07, speed: 0.3, height: 13 },
      { anchor: [0.2, -0.8, 0.6], seed: 6, driftRadius: 0.06, speed: 0.5, height: 12 },
      { anchor: [-0.9, -0.3, -0.4], seed: 2, driftRadius: 0.08, speed: 0.35, height: 10.5 },
    ],
    []
  );
  const anchors = useMemo(() => clouds.map((c) => normalize(c.anchor)), [clouds]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const models = useMemo(() => clouds.map((c) => cloudVoxels(c.seed)), [clouds]);

  useFrame((state) => {
    const time = sceneClock.time(state.clock.elapsedTime);
    clouds.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      const bearing = c.seed + time * c.speed * 0.2;
      standOn(g, offsetDirection(anchors[i], bearing, c.driftRadius), GROUND_RADIUS, c.height);
    });
  });

  return (
    <>
      {clouds.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <VoxelModel voxels={models[i]} voxelSize={0.5} gap={0} castShadow={false} receiveShadow={false} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------
// Wandering voxel villagers (NPCs)
// ---------------------------------------------------------------
function npcVoxels(bodyColor: string, hairColor: string): Voxel[] {
  const out: Voxel[] = [];
  put(out, 0, 0, 0, PALETTE.stone[1]);
  put(out, 1, 0, 0, PALETTE.stone[1]);
  fillBox(out, 0, 1, 0, 2, 2, 1, bodyColor);
  fillBox(out, 0, 3, 0, 2, 2, 1, "#f6d3b0");
  fillBox(out, 0, 4, 0, 2, 1, 1, hairColor);
  return out;
}

type NpcSpec = { body: string; hair: string; angularRadius: number; phase: number; speed: number };

export function Villagers() {
  const npcs = useMemo<NpcSpec[]>(
    () => [
      { body: PALETTE.pink[0], hair: "#5b3a29", angularRadius: 0.15, phase: 0, speed: 0.35 },
      { body: PALETTE.blue[0], hair: "#2b2b2b", angularRadius: 0.15, phase: 2.1, speed: 0.35 },
      { body: PALETTE.yellow[0], hair: "#3a2a1a", angularRadius: 0.15, phase: 4.2, speed: 0.35 },
      { body: PALETTE.green[0], hair: "#5b3a29", angularRadius: 0.09, phase: 1.0, speed: -0.5 },
      { body: PALETTE.orange, hair: "#2b2b2b", angularRadius: 0.09, phase: 3.5, speed: -0.5 },
    ],
    []
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const models = useMemo(() => npcs.map((n) => npcVoxels(n.body, n.hair)), [npcs]);

  useFrame((state) => {
    const time = sceneClock.time(state.clock.elapsedTime);
    npcs.forEach((n, i) => {
      const g = refs.current[i];
      if (!g) return;
      const bearing = time * n.speed + n.phase;
      const bob = 0.15 + Math.abs(Math.sin(bearing * 8)) * 0.06;
      // Not `standOn`: a villager faces the way it is walking, which is the
      // path's own tangent, rather than the fixed local north `tangentBasis`
      // would give it.
      const up = offsetDirection(PARK_CENTRE, bearing, n.angularRadius);
      const facing = walkerFacing(PARK_CENTRE, bearing);
      const forward: Direction = n.speed >= 0 ? facing : [-facing[0], -facing[1], -facing[2]];
      const right: Direction = [
        up[1] * forward[2] - up[2] * forward[1],
        up[2] * forward[0] - up[0] * forward[2],
        up[0] * forward[1] - up[1] * forward[0],
      ];
      orientTo(g, { right, up, forward });
      g.position.set(...surfacePoint(up, GROUND_RADIUS, bob));
    });
  });

  return (
    <>
      {npcs.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <VoxelModel voxels={models[i]} voxelSize={0.18} gap={0.06} castShadow />
        </group>
      ))}
    </>
  );
}
