"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Text, useCursor } from "@react-three/drei";
import { useAppState, SectionType } from "../AppStateContext";
import * as THREE from "three";

// ------------------------------------------------------------------
// 1. Common Wrapper for Interaction and Label
// ------------------------------------------------------------------
interface ObjectProps {
  position: [number, number, number];
  sectionId: SectionType;
  label: string;
}

function ProceduralWrapper({
  position,
  sectionId,
  label,
  children,
  floatSpeed = 2,
  floatIntensity = 0.5,
  labelYOffset = 3.5,
}: ObjectProps & { children: React.ReactNode; floatSpeed?: number; floatIntensity?: number; labelYOffset?: number }) {
  const { setActiveSection } = useAppState();
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  useCursor(hovered);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        hovered ? position[1] + 0.5 : position[1],
        0.1
      );
    }
  });

  return (
    <group position={position} ref={groupRef}>
      <Float speed={floatSpeed} rotationIntensity={0.1} floatIntensity={floatIntensity}>
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
          {children}
          
          {/* A cute rounded label background */}
          <group position={[0, labelYOffset, 0]}>
             <mesh position={[0, 0, -0.1]}>
               <planeGeometry args={[label.length * 0.4 + 1, 1]} />
               <meshBasicMaterial color={hovered ? "#f97316" : "#ffffff"} />
             </mesh>
            <Text
              fontSize={0.5}
              color={hovered ? "#ffffff" : "#333333"}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {label}
            </Text>
          </group>
        </group>
      </Float>
    </group>
  );
}

// ------------------------------------------------------------------
// 2. Pastel Voxel Prototype Objects
// ------------------------------------------------------------------

export function FerrisWheel(props: ObjectProps) {
  const wheelRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (wheelRef.current) wheelRef.current.rotation.z += 0.01;
  });

  return (
    <ProceduralWrapper {...props} labelYOffset={6}>
      {/* Base */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {/* Supports */}
      <mesh position={[-0.5, 2, 0]} rotation={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
      <mesh position={[0.5, 2, 0]} rotation={[0, 0, -0.2]} castShadow>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
      {/* The Wheel */}
      <group ref={wheelRef} position={[0, 3.5, 0]}>
        <mesh castShadow>
          <torusGeometry args={[2, 0.2, 16, 32]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        {/* Spokes */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (Math.PI / 4) * i]}>
            <cylinderGeometry args={[0.05, 0.05, 4]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        ))}
      </group>
    </ProceduralWrapper>
  );
}

export function PinkBuilding(props: ObjectProps) {
  return (
    <ProceduralWrapper {...props} labelYOffset={5}>
      {/* Main Building */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#f472b6" />
      </mesh>
      {/* Windows */}
      {[[-0.8, 2], [0, 2], [0.8, 2], [-0.8, 1], [0, 1], [0.8, 1]].map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], 1.51]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial color="#bae6fd" />
        </mesh>
      ))}
      {/* Voxel Sign "GAME DEVELOP" on top */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[3.5, 1, 1]} />
        <meshStandardMaterial color="#fb7185" />
      </mesh>
      <Text position={[0, 3.5, 0.51]} fontSize={0.4} color="#ffffff" fontWeight="bold">
        GAME DEVELOP
      </Text>
    </ProceduralWrapper>
  );
}

export function GreenBuilding(props: ObjectProps) {
  return (
    <ProceduralWrapper {...props} labelYOffset={4}>
      {/* Main Building */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[4, 2, 3]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      {/* Green Roof */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[4.2, 1, 3.2]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      {/* Storefront Sign */}
      <mesh position={[0, 1.5, 1.55]} castShadow>
        <boxGeometry args={[2, 0.5, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text position={[0, 1.5, 1.61]} fontSize={0.3} color="#22c55e" fontWeight="bold">
        IT ADVENTURE
      </Text>
    </ProceduralWrapper>
  );
}

export function CompanyGate(props: ObjectProps) {
  return (
    <ProceduralWrapper {...props} labelYOffset={3}>
      {/* Left Pillar */}
      <mesh position={[-2, 1.5, 0]} castShadow>
        <boxGeometry args={[1, 3, 1]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Right Pillar */}
      <mesh position={[2, 1.5, 0]} castShadow>
        <boxGeometry args={[1, 3, 1]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Top Arch */}
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[5, 1, 1]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <Text position={[0, 3, 0.51]} fontSize={0.4} color="#334155" fontWeight="bold">
        VOXEL INC.
      </Text>
    </ProceduralWrapper>
  );
}

export function ContactBillboard(props: ObjectProps) {
  return (
    <ProceduralWrapper {...props} labelYOffset={4}>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0, 3, 0.1]} castShadow>
        <boxGeometry args={[3, 2, 0.2]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
      <Text position={[0, 3, 0.21]} fontSize={0.6} color="#b45309" fontWeight="bold">
        CONTACT
      </Text>
    </ProceduralWrapper>
  );
}
