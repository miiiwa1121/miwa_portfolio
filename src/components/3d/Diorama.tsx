"use client";

import VoxelIsland from "./VoxelIsland";
import {
  AboutBuilding,
  ProductsBuilding,
  SkillsBuilding,
  ExperienceBuilding,
  ContactBillboard,
} from "./ProceduralObjects";
import { FerrisWheel, Trees, StreetLamps, Clouds, Villagers, Confetti } from "./Decorations";
import { VoxelBus } from "./VoxelBus";

// World positions of each section building. Kept in sync with
// `sectionTargets` in Scene.tsx so the camera zooms to the right spot.
export const BUILDING_POSITIONS = {
  products: [1, 0.2, -2] as [number, number, number],
  skills: [7, 0.2, -3.5] as [number, number, number],
  experience: [6, 0.2, 5] as [number, number, number],
  about: [-6.5, 0.2, 4] as [number, number, number],
  contact: [-7, 0.2, -3] as [number, number, number],
};

export default function Diorama() {
  return (
    <group>
      {/* Floating pastel island */}
      <VoxelIsland radius={15} />

      {/* Section anchors */}
      <ProductsBuilding position={BUILDING_POSITIONS.products} sectionId="products" />
      <SkillsBuilding position={BUILDING_POSITIONS.skills} sectionId="skills" />
      <ExperienceBuilding position={BUILDING_POSITIONS.experience} sectionId="experience" />
      <AboutBuilding position={BUILDING_POSITIONS.about} sectionId="about" />
      <ContactBillboard position={BUILDING_POSITIONS.contact} sectionId="contact" />

      {/* Decorations */}
      <FerrisWheel position={[-2, 0.2, -8]} />
      <Trees />
      <StreetLamps />
      <Clouds />
      <Villagers />
      <Confetti />
      <VoxelBus />
    </group>
  );
}
