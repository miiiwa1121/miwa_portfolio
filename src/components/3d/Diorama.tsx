"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Text, useCursor } from "@react-three/drei";
import { useAppState, SectionType } from "../AppStateContext";
import * as THREE from "three";
import VoxelIsland from "./VoxelIsland";

// Monolith (Interactive Object)
function InteractiveObject({ 
  position, 
  color, 
  label, 
  sectionId 
}: { 
  position: [number, number, number], 
  color: string, 
  label: string,
  sectionId: SectionType 
}) {
  const { setActiveSection } = useAppState();
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Group>(null);
  
  useCursor(hovered);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle float bounce
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        hovered ? position[1] + 0.3 : position[1],
        0.1
      );
    }
  });

  return (
    <group position={position} ref={meshRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group
          onClick={(e) => {
            e.stopPropagation();
            setActiveSection(sectionId);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* Base / Core */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[1, 3, 1]} />
            <meshStandardMaterial 
              color="#2a2a2a" 
              roughness={0.7} 
              metalness={0.8}
            />
          </mesh>
          
          {/* Glowing Energy Ring / Accent */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[1.1, 0.2, 1.1]} />
            <meshStandardMaterial 
              color={color} 
              emissive={color}
              emissiveIntensity={hovered ? 2 : 0.5}
            />
          </mesh>
          
          {/* Floating Label */}
          <Text
            position={[0, 4, 0]}
            fontSize={0.6}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {label}
          </Text>
        </group>
      </Float>
    </group>
  );
}

// Generate some random ambient particles outside the component to avoid impure render
const particleCount = 200;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  particlePositions[i] = (Math.random() - 0.5) * 40;
}

// The central island and world elements
export default function Diorama() {
  const groupRef = useRef<THREE.Group>(null);

  // We want the monoliths to sit ON the procedural island.
  // The island's top surface varies between height -2 to +2 approximately.
  // We place them at specific coordinates and appropriate Y offsets.
  return (
    <group ref={groupRef}>
      {/* Voxel Terrain */}
      <VoxelIsland radius={14} />

      {/* Interactive Monoliths */}
      <InteractiveObject position={[-6, 1, 6]} color="#00f0ff" label="ABOUT" sectionId="about" />
      <InteractiveObject position={[6, 1, 6]} color="#bd00ff" label="PRODUCTS" sectionId="products" />
      <InteractiveObject position={[-5, 2, -5]} color="#39ff14" label="SKILLS" sectionId="skills" />
      <InteractiveObject position={[5, 1, -6]} color="#f97316" label="EXPERIENCE" sectionId="experience" />
      <InteractiveObject position={[0, 3, -1]} color="#facc15" label="CONTACT" sectionId="contact" />

      {/* Ambient Particles */}
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
        <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
      </points>
    </group>
  );
}
