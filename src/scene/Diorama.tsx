"use client";

import * as THREE from "three";
import type { SectionType } from "@/types";
import Planet from "./Planet";
import {
  AboutBuilding,
  ProductsBuilding,
  SkillsBuilding,
  ExperienceBuilding,
  ContactBillboard,
} from "./ProceduralObjects";
import { BUILDING_POSITIONS } from "./worldLayout";
import { PLANET_SECTION_KEYS, sectionBasis } from "./planet/sections";
import AreaMarkers from "./AreaMarkers";

/**
 * Each building's rotation: turns its local +Y to stand along the planet's
 * own surface normal, instead of always pointing world +Y (see `sectionBasis`
 * in `scene/planet/sections.ts`). Computed once at module load, the same way
 * `BUILDING_POSITIONS` is — nothing here depends on props or state, so there
 * is nothing for a render to redo.
 *
 * `Matrix4.makeBasis` takes local axes as arguments, and `sectionBasis`
 * already returns them in that order (right, up, forward) and already proved
 * right-handed (see planetLayout.test.ts) — so this conversion is the only
 * place three.js enters. `scene/planet/` itself stays free of it, which is
 * what lets the basis be tested without standing up a renderer.
 */
const BUILDING_QUATERNIONS = Object.fromEntries(
  PLANET_SECTION_KEYS.map((key) => {
    const { right, up, forward } = sectionBasis(key);
    const matrix = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...right),
      new THREE.Vector3(...up),
      new THREE.Vector3(...forward)
    );
    const q = new THREE.Quaternion().setFromRotationMatrix(matrix);
    return [key, [q.x, q.y, q.z, q.w] as [number, number, number, number]];
  })
) as Record<NonNullable<SectionType>, [number, number, number, number]>;

export default function Diorama() {
  return (
    <group>
      {/* The world's ground: a hollow voxel sphere in space. */}
      <Planet />

      {/* Section anchors, each standing outward from its own point on the sphere. */}
      <ProductsBuilding
        position={BUILDING_POSITIONS.products}
        quaternion={BUILDING_QUATERNIONS.products}
        sectionId="products"
      />
      <SkillsBuilding
        position={BUILDING_POSITIONS.skills}
        quaternion={BUILDING_QUATERNIONS.skills}
        sectionId="skills"
      />
      <ExperienceBuilding
        position={BUILDING_POSITIONS.experience}
        quaternion={BUILDING_QUATERNIONS.experience}
        sectionId="experience"
      />
      <AboutBuilding
        position={BUILDING_POSITIONS.about}
        quaternion={BUILDING_QUATERNIONS.about}
        sectionId="about"
      />
      <ContactBillboard
        position={BUILDING_POSITIONS.contact}
        quaternion={BUILDING_QUATERNIONS.contact}
        sectionId="contact"
      />

      <AreaMarkers />

      {/*
       * Decorations (Ferris wheel, trees, lamps, clouds, villagers, tram) and
       * the confetti are switched off here for stage 2 of
       * docs/planet-migration.md. Every one of them was tuned for the old flat
       * island — a fixed y=0.2 ground, XZ circles for the tram's and
       * villagers' paths, confetti falling in -Y and respawning at a fixed
       * height — none of which holds on a sphere. Re-scattering them properly
       * (walking a great circle, drifting along the surface, star dust instead
       * of falling confetti) is stage 6's job; leaving them on here would mean
       * tuning their positions twice, and would corrupt this stage's
       * screenshots — taken to measure the planet's radius and the buildings'
       * latitudes — with obviously-wrong floating trees.
       */}
    </group>
  );
}
