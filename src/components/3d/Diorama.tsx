"use client";

import { useRef } from "react";
import * as THREE from "three";
import VoxelIsland from "./VoxelIsland";
import { FerrisWheel, PinkBuilding, GreenBuilding, CompanyGate, ContactBillboard } from "./ProceduralObjects";
import { VoxelBus } from "./VoxelBus";

// Generate some random ambient particles (floating stars/cubes)
const particleCount = 100;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  particlePositions[i] = (Math.random() - 0.5) * 40;
}

export default function Diorama() {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef}>
      {/* City Ground */}
      <VoxelIsland radius={14} />

      {/* Pastel Prototype Buildings */}
      <FerrisWheel position={[-8, 0, -8]} label="ABOUT" sectionId="about" />
      <PinkBuilding position={[2, 0, -6]} label="PRODUCTS" sectionId="products" />
      <GreenBuilding position={[-2, 0, 0]} label="SKILLS" sectionId="skills" />
      <CompanyGate position={[0, 0, 8]} label="EXPERIENCE" sectionId="experience" />
      <ContactBillboard position={[8, 0, 4]} label="CONTACT" sectionId="contact" />

      {/* Animated Vehicles */}
      <VoxelBus />

      {/* Cute Floating Particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.3} color="#fcd34d" transparent opacity={0.8} sizeAttenuation />
      </points>
    </group>
  );
}
