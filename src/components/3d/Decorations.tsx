"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import VoxelModel, { Voxel } from "./voxel/VoxelModel";
import { fillBox, put } from "./voxel/builders";
import { PALETTE, pick } from "./voxel/palette";
import {
  spawnConfetti,
  stepConfetti,
  type ConfettiPart,
} from "./confetti";

const VS = 0.42;

// ---------------------------------------------------------------
// Ferris wheel — a spinning voxel wheel on a central pole
// ---------------------------------------------------------------
export function FerrisWheel({ position = [0, 0, 0] as [number, number, number] }) {
  const wheelRef = useRef<THREE.Group>(null);
  const R = 8; // wheel radius in voxels
  const centerY = 11; // hub height in voxels

  const support = useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    // base
    fillBox(out, -2, 0, -2, 4, 1, 4, PALETTE.stone[0]);
    // pole up to the hub
    fillBox(out, -1, 0, -1, 2, centerY, 2, PALETTE.yellow[1]);
    return out;
  }, []);

  const wheel = useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const spokes = 8;
    // rim
    for (let a = 0; a < 360; a += 4) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(Math.cos(rad) * R);
      const y = Math.round(Math.sin(rad) * R);
      put(out, x, y, 0, PALETTE.yellow[0]);
      put(out, x, y, 1, PALETTE.yellow[1]);
    }
    // spokes + cabins
    const cabinColors = [PALETTE.pink[0], PALETTE.blue[0], PALETTE.green[0], PALETTE.roofRed, PALETTE.yellow[0]];
    for (let k = 0; k < spokes; k++) {
      const rad = (k / spokes) * Math.PI * 2;
      const dx = Math.cos(rad), dy = Math.sin(rad);
      for (let t = 1; t < R; t++) put(out, Math.round(dx * t), Math.round(dy * t), 0, PALETTE.yellow[1]);
      // cabin at the rim
      const cx = Math.round(dx * (R + 1)), cy = Math.round(dy * (R + 1));
      fillBox(out, cx - 1, cy - 1, -1, 2, 2, 3, cabinColors[k % cabinColors.length]);
    }
    // hub
    fillBox(out, -1, -1, -1, 2, 2, 3, PALETTE.stone[0]);
    return out;
  }, []);

  useFrame((_, delta) => {
    if (wheelRef.current) wheelRef.current.rotation.z += delta * 0.25;
  });

  return (
    <group position={position}>
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
  // Leaf blob (5x5 with carved corners), three tiers. The tint varies per
  // voxel position rather than per call, so a tree looks the same every mount.
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

export function Trees() {
  const spots = useMemo(
    () =>
      [
        [-3, 0, 6], [3.5, 0, 6.5], [-8.5, 0, 1], [8.5, 0, 1.5],
        [-4.5, 0, -6.5], [4.5, 0, -7], [-2, 0, 8.5], [2.5, 0, -3.5],
      ] as [number, number, number][],
    []
  );
  const models = useMemo(() => spots.map((_, i) => treeVoxels(i * 3.7 + 1)), [spots]);
  return (
    <>
      {spots.map((p, i) => (
        <VoxelModel key={i} voxels={models[i]} voxelSize={0.34} gap={0.06} position={[p[0], 0.2, p[2]]} />
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

export function StreetLamps() {
  const voxels = useMemo(() => lampVoxels(), []);
  const spots = useMemo(
    () =>
      [
        [-6, 0, 0], [6, 0, 0], [0, 0, 6.5], [0, 0, -6.5],
        [-4.2, 0, 4.2], [4.2, 0, -4.2],
      ] as [number, number, number][],
    []
  );
  return (
    <>
      {spots.map((p, i) => (
        <VoxelModel key={i} voxels={voxels} voxelSize={0.28} gap={0.05} position={[p[0], 0.2, p[2]]} castShadow={false} />
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
    // small rounded puff (carve corners)
    for (let x = 0; x < w; x++)
      for (let y = 0; y < 2; y++)
        for (let z = 0; z < 2; z++) {
          if ((x === 0 || x === w - 1) && y === 1 && w > 2) continue;
          out.push({ x: ox + x, y: (p % 2) + y, z, color: "#ffffff" });
        }
  }
  return out;
}

export function Clouds() {
  const clouds = useMemo(
    () =>
      [
        { pos: [-13, 17, -8] as [number, number, number], seed: 1, speed: 0.4 },
        { pos: [12, 19, 6] as [number, number, number], seed: 3, speed: 0.3 },
        { pos: [5, 21, -13] as [number, number, number], seed: 6, speed: 0.5 },
        { pos: [-10, 20, 11] as [number, number, number], seed: 2, speed: 0.35 },
      ],
    []
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const models = useMemo(() => clouds.map((c) => cloudVoxels(c.seed)), [clouds]);

  useFrame((state) => {
    clouds.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.x = c.pos[0] + Math.sin(state.clock.elapsedTime * c.speed * 0.2 + c.seed) * 4;
    });
  });

  return (
    <>
      {clouds.map((c, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={c.pos}>
          <VoxelModel voxels={models[i]} voxelSize={0.5} gap={0} castShadow={false} receiveShadow={false} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------
// Falling pastel confetti
// ---------------------------------------------------------------
// Scratch transform reused for every instance matrix write. It is never
// rendered and never read across frames, so one module-level instance is
// enough — and keeps useFrame from mutating a value React owns.
const scratch = new THREE.Object3D();

export function Confetti({ count = 90 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const palette = useMemo(
    () => [PALETTE.pink[0], PALETTE.blue[0], PALETTE.yellow[0], PALETTE.green[0], PALETTE.orange, PALETTE.white],
    []
  );

  // Per-flake positions are animation state, not render state: useFrame writes
  // to them every frame. Holding them in a ref (seeded in a layout effect,
  // before the first paint) keeps that mutation off anything React memoises.
  const partsRef = useRef<ConfettiPart[]>([]);

  useLayoutEffect(() => {
    partsRef.current = spawnConfetti(count);

    const mesh = meshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) mesh.setColorAt(i, c.set(palette[i % palette.length]));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, palette]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const parts = partsRef.current;
    if (!mesh || parts.length === 0) return;

    stepConfetti(parts, delta);

    const t = state.clock.elapsedTime;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      scratch.position.set(p.x + Math.sin(t * 0.6 + p.sway) * 0.7, p.y, p.z);
      scratch.rotation.set(p.spin + t, t * 0.8 + p.sway, p.spin);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[0.14, 0.14, 0.14]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------
// Wandering voxel villagers (NPCs)
// ---------------------------------------------------------------
function npcVoxels(bodyColor: string, hairColor: string): Voxel[] {
  const out: Voxel[] = [];
  // legs
  put(out, 0, 0, 0, PALETTE.stone[1]);
  put(out, 1, 0, 0, PALETTE.stone[1]);
  // body
  fillBox(out, 0, 1, 0, 2, 2, 1, bodyColor);
  // head
  fillBox(out, 0, 3, 0, 2, 2, 1, "#f6d3b0");
  // hair
  fillBox(out, 0, 4, 0, 2, 1, 1, hairColor);
  return out;
}

export function Villagers() {
  const npcs = useMemo(
    () => [
      { body: PALETTE.pink[0], hair: "#5b3a29", r: 5.5, phase: 0, speed: 0.35 },
      { body: PALETTE.blue[0], hair: "#2b2b2b", r: 5.5, phase: 2.1, speed: 0.35 },
      { body: PALETTE.yellow[0], hair: "#3a2a1a", r: 5.5, phase: 4.2, speed: 0.35 },
      { body: PALETTE.green[0], hair: "#5b3a29", r: 3.5, phase: 1.0, speed: -0.5 },
      { body: PALETTE.orange, hair: "#2b2b2b", r: 3.5, phase: 3.5, speed: -0.5 },
    ],
    []
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const models = useMemo(() => npcs.map((n) => npcVoxels(n.body, n.hair)), [npcs]);

  useFrame((state) => {
    npcs.forEach((n, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = state.clock.elapsedTime * n.speed + n.phase;
      g.position.set(Math.cos(a) * n.r, 0.3 + Math.abs(Math.sin(a * 8)) * 0.08, Math.sin(a) * n.r);
      g.rotation.y = -a + (n.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
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
