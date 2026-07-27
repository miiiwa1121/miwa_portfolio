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
import { BUILDING_POSITIONS } from "./worldLayout";
import AreaMarkers from "./AreaMarkers";


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

      <AreaMarkers />

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
