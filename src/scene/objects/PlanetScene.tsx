"use client";

import type { SectionType } from "@/types";
import Planet from "./Planet";
import {
  AboutBuilding,
  ProductsBuilding,
  SkillsBuilding,
  ExperienceBuilding,
  ContactBillboard,
} from "./ProceduralObjects";
import { BUILDING_POSITIONS } from "../camera/cameraLayout";
import { PLANET_SECTION_KEYS, sectionBasis } from "../planet/sections";
import { quaternionOf } from "../planetPlacement";
import SectionMarkers from "./SectionMarkers";
import FillerCity from "./FillerCity";
import { Clouds, FerrisWheel, StreetLamps, Trees, Villagers } from "./Decorations";
import VoxelBus from "./VoxelBus";

/**
 * Each building's rotation: turns its local +Y to stand along the planet's
 * own surface normal, instead of always pointing world +Y (see `sectionBasis`
 * in `scene/planet/sections.ts`). Computed once at module load, the same way
 * `BUILDING_POSITIONS` is — nothing here depends on props or state, so there
 * is nothing for a render to redo.
 *
 * `sectionBasis` already returns the local axes in `Matrix4.makeBasis` order
 * (right, up, forward) and already proved right-handed (see
 * geometry.test.ts); `quaternionOf` is where three.js enters. `scene/planet/`
 * itself stays free of it, which is what lets the basis be tested without
 * standing up a renderer.
 */
const BUILDING_QUATERNIONS = Object.fromEntries(
  PLANET_SECTION_KEYS.map((key) => [key, quaternionOf(sectionBasis(key))])
) as Record<NonNullable<SectionType>, [number, number, number, number]>;

export default function PlanetScene() {
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

      <SectionMarkers />

      {/* The unnamed crowd of small buildings — stage 3 of docs/planet-migration.md. */}
      <FillerCity />

      {/* The plaza (see scene/planet/decor.ts for where PARK_CENTRE lands and
          why) and its own small crowd — stage 6. */}
      <FerrisWheel />
      <Trees />
      <StreetLamps />
      <Villagers />

      {/* Riding the same closed path the camera's tour does, at ground level. */}
      <VoxelBus />

      {/* Ambient motion, switched off close to the ground on purpose: clouds
          float at a fixed height above the surface and don't need to know
          anything about buildings or terrain underneath them. */}
      <Clouds />
    </group>
  );
}
