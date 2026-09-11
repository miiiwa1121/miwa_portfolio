"use client";

import { useMemo } from "react";
import type { SectionType } from "@/types";
import VoxelModel, { Voxel } from "../voxel/VoxelModel";
import VoxelText from "../voxel/VoxelText";
import { fillBox, foundation, shellBox, put } from "../voxel/builders";
import { PALETTE } from "../voxel/palette";

// World size of one building voxel.
const VS = 0.42;

/**
 * How many building voxels a foundation reaches down from y = 0.
 *
 * 12 voxels at 0.42 world units is 5.04 — comfortably deeper than one planet
 * voxel's stepping (1.4 world units, see `PLANET_VOXEL_SIZE` in
 * `scene/planet/shell.ts`), with room left for the terrain sloping away
 * across a building's own footprint. Picked generously and checked by eye
 * against the rendered planet rather than derived exactly: the exact
 * mismatch depends on where in a planet voxel's lattice cell a building's
 * surface point happens to land, which is not worth solving in closed form
 * for a plinth nobody is meant to see the bottom of.
 */
const FOUNDATION_DEPTH = 12;

// ------------------------------------------------------------------
// Placement wrapper
// ------------------------------------------------------------------
interface ObjectProps {
  position: [number, number, number];
  sectionId: SectionType;
  /**
   * [x, y, z, w]. Orients the building so its local +Y stands along the
   * planet's surface normal instead of always pointing world +Y — see
   * `scene/planet/sections.ts`'s `sectionBasis`. Omitted, a building keeps
   * the identity rotation (local +Y = world +Y), which is only correct at
   * the north pole.
   */
  quaternion?: [number, number, number, number];
}

/**
 * Positions and orients a building, and gives it a name, nothing more.
 *
 * The buildings are deliberately inert: hovering and clicking belong to the
 * marker floating above each area, which is a small, unambiguous target with
 * a card and a line already pointing at it. Letting the whole building
 * respond as well meant two hit areas for one destination, and a hover-lift
 * that moved the very thing the marker was anchored to.
 */
function Anchor({
  position,
  quaternion,
  sectionId,
  children,
}: ObjectProps & { children: React.ReactNode }) {
  return (
    // Named so the camera can look the building up in the scene graph and
    // frame its actual bounds, rather than being told them by hand.
    <group position={position} quaternion={quaternion} name={sectionId ?? undefined}>
      {children}
    </group>
  );
}

// ------------------------------------------------------------------
// Building voxel generators
// ------------------------------------------------------------------
function windowize(
  out: Voxel[],
  w: number,
  h: number,
  d: number,
  glass: string,
  stepX = 2,
  stepY = 3,
  marginY = 2
) {
  const ox = -Math.floor(w / 2);
  const oz = -Math.floor(d / 2);
  for (const v of out) {
    const lx = v.x - ox;
    const ly = v.y;
    const lz = v.z - oz;
    const onFrontBack = lz === 0 || lz === d - 1;
    const onSides = lx === 0 || lx === w - 1;
    if ((ly - marginY) % stepY !== 0 || ly < marginY || ly >= h - 1) continue;
    if (onFrontBack && lx > 0 && lx < w - 1 && lx % stepX === 0) v.color = glass;
    if (onSides && lz > 0 && lz < d - 1 && lz % stepX === 0) v.color = glass;
  }
}

function slabRoof(out: Voxel[], w: number, h: number, d: number, color: string, overhang = 1, thick = 1) {
  const ox = -Math.floor((w + overhang * 2) / 2);
  const oz = -Math.floor((d + overhang * 2) / 2);
  fillBox(out, ox, h, oz, w + overhang * 2, thick, d + overhang * 2, color);
}

// ABOUT — cozy little house
function useHouse() {
  return useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const w = 11, h = 6, d = 9;
    const ox = -Math.floor(w / 2), oz = -Math.floor(d / 2);
    foundation(out, w, d, FOUNDATION_DEPTH, PALETTE.stone[1]);
    shellBox(out, ox, 0, oz, w, h, d, PALETTE.cream);
    fillBox(out, ox, 0, oz, w, 1, d, PALETTE.wood); // floor
    windowize(out, w, h, d, PALETTE.glassWarm, 3, 2, 2);
    slabRoof(out, w, h, d, PALETTE.roofRed, 1, 2);
    // door
    fillBox(out, -1, 0, oz, 2, 3, 1, PALETTE.wood);
    // chimney
    fillBox(out, ox + 2, h + 2, oz + 2, 1, 3, 1, PALETTE.roofRed);
    return out;
  }, []);
}

// PRODUCTS — big pink landmark tower with a setback + antenna
function usePinkTower() {
  return useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const w = 12, h = 18, d = 12;
    const ox = -Math.floor(w / 2), oz = -Math.floor(d / 2);
    foundation(out, w, d, FOUNDATION_DEPTH, PALETTE.stone[0]);
    shellBox(out, ox, 0, oz, w, h, d, PALETTE.pink);
    windowize(out, w, h, d, PALETTE.glass, 2, 3, 3);
    slabRoof(out, w, h, d, PALETTE.pinkDark, 1, 1);
    // setback penthouse
    const w2 = 7, h2 = 4, d2 = 7;
    const ox2 = -Math.floor(w2 / 2), oz2 = -Math.floor(d2 / 2);
    shellBox(out, ox2, h + 1, oz2, w2, h2, d2, PALETTE.pink);
    slabRoof(out, w2, h + 1 + h2, d2, PALETTE.pinkDark, 1, 1);
    // antenna
    fillBox(out, 0, h + h2 + 2, 0, 1, 4, 1, PALETTE.stone[0]);
    put(out, 0, h + h2 + 6, 0, PALETTE.yellow[0]);
    // sign board on the front face
    fillBox(out, -4, h - 6, oz + d - 1, 8, 3, 1, PALETTE.white);
    return out;
  }, []);
}

// SKILLS — slim blue office tower
function useBlueTower() {
  return useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const w = 9, h = 15, d = 9;
    const ox = -Math.floor(w / 2), oz = -Math.floor(d / 2);
    foundation(out, w, d, FOUNDATION_DEPTH, PALETTE.stone[0]);
    shellBox(out, ox, 0, oz, w, h, d, PALETTE.blue);
    windowize(out, w, h, d, PALETTE.glass, 2, 2, 2);
    slabRoof(out, w, h, d, PALETTE.roofBlue, 1, 1);
    // rooftop unit
    fillBox(out, -1, h + 1, -1, 3, 2, 3, PALETTE.stone[0]);
    // sign board
    fillBox(out, -3, h - 5, oz + d - 1, 6, 2, 1, PALETTE.white);
    return out;
  }, []);
}

// EXPERIENCE — wide cream library with a green roof + awning
function useLibrary() {
  return useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    const w = 15, h = 7, d = 10;
    const ox = -Math.floor(w / 2), oz = -Math.floor(d / 2);
    foundation(out, w, d, FOUNDATION_DEPTH, PALETTE.stone[1]);
    shellBox(out, ox, 0, oz, w, h, d, PALETTE.cream);
    fillBox(out, ox, 0, oz, w, 1, d, PALETTE.wood);
    windowize(out, w, h, d, PALETTE.glassWarm, 2, 3, 2);
    slabRoof(out, w, h, d, PALETTE.green[0], 2, 2);
    // striped awning over the storefront (front = +z)
    for (let x = 0; x < w - 2; x++) {
      out.push({ x: ox + 1 + x, y: 2, z: oz + d, color: x % 2 === 0 ? PALETTE.roofRed : PALETTE.white });
    }
    // sign board
    fillBox(out, -5, 3, oz + d - 1, 10, 2, 1, PALETTE.white);
    return out;
  }, []);
}

// CONTACT — billboard + mailbox
function useBillboard() {
  return useMemo<Voxel[]>(() => {
    const out: Voxel[] = [];
    foundation(out, 11, 6, FOUNDATION_DEPTH, PALETTE.stone[1]);
    // posts
    fillBox(out, -4, 0, 0, 1, 8, 1, PALETTE.stone[1]);
    fillBox(out, 3, 0, 0, 1, 8, 1, PALETTE.stone[1]);
    // board
    fillBox(out, -5, 6, 0, 11, 5, 1, PALETTE.yellow[0]);
    fillBox(out, -5, 6, -1, 11, 5, 1, PALETTE.yellow[1]); // back
    // mailbox
    fillBox(out, 5, 0, 3, 1, 2, 1, PALETTE.stone[1]);
    fillBox(out, 4, 2, 2, 3, 2, 3, PALETTE.orange);
    return out;
  }, []);
}

// ------------------------------------------------------------------
// Exported building components
// ------------------------------------------------------------------
export function AboutBuilding(props: ObjectProps) {
  const voxels = useHouse();
  return (
    <Anchor {...props}>
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} />
    </Anchor>
  );
}

export function ProductsBuilding(props: ObjectProps) {
  const voxels = usePinkTower();
  return (
    <Anchor {...props}>
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} />
      <VoxelText text="GAME" color="#8a2f52" voxelSize={0.075} fontSize={16} position={[0, 5.4, 2.65]} />
      <VoxelText text="PRODUCTS" color={PALETTE.pinkDark} voxelSize={0.05} fontSize={14} position={[0, 4.6, 2.65]} />
    </Anchor>
  );
}

export function SkillsBuilding(props: ObjectProps) {
  const voxels = useBlueTower();
  return (
    <Anchor {...props}>
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} />
      <VoxelText text="SKILLS" color={PALETTE.roofBlue} voxelSize={0.06} fontSize={14} position={[0, 4.3, 2.0]} />
    </Anchor>
  );
}

export function ExperienceBuilding(props: ObjectProps) {
  const voxels = useLibrary();
  return (
    <Anchor {...props}>
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} />
      <VoxelText text="LIBRARY" color="#3f8f2f" voxelSize={0.06} fontSize={14} position={[0, 1.5, 2.2]} />
    </Anchor>
  );
}

export function ContactBillboard(props: ObjectProps) {
  const voxels = useBillboard();
  return (
    <Anchor {...props}>
      <VoxelModel voxels={voxels} voxelSize={VS} gap={0.05} />
      <VoxelText text="CONTACT" color="#b45309" voxelSize={0.06} fontSize={14} position={[-0.2, 3.4, 0.5]} />
    </Anchor>
  );
}
