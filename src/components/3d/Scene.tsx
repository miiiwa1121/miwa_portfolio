"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Stars, CameraControls } from "@react-three/drei";
import Diorama from "./Diorama";
import { useAppState, SectionType } from "../AppStateContext";
import * as THREE from "three";

// Predefined positions for the monoliths from Diorama.tsx
const sectionTargets: Record<NonNullable<SectionType>, [number, number, number]> = {
  about: [-6, 1, 6],
  products: [6, 1, 6],
  skills: [-5, 2, -5],
  experience: [5, 1, -6],
  contact: [0, 3, -1],
};

function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection } = useAppState();
  
  // Custom slow rotation angle for the global view
  const angleRef = useRef(Math.PI / 4); 

  useEffect(() => {
    if (controlsRef.current) {
      if (activeSection && sectionTargets[activeSection]) {
        // Zoom in on the selected section
        const target = sectionTargets[activeSection];
        // Position camera slightly above and in front of the object
        // We push it out from the center (0,0,0) to ensure it doesn't clip through the island
        const angle = Math.atan2(target[2], target[0]);
        const radius = 4;
        const camX = target[0] + Math.cos(angle) * radius;
        const camZ = target[2] + Math.sin(angle) * radius;
        const camY = target[1] + 2;

        controlsRef.current.setLookAt(
          camX, camY, camZ,       // Camera position
          target[0], target[1] + 1.5, target[2], // Look at target (slightly above base)
          true                    // Animate
        );
      } else {
        // Zoom out to global view
        const currentAngle = angleRef.current;
        const radius = 20;
        const camX = Math.cos(currentAngle) * radius;
        const camZ = Math.sin(currentAngle) * radius;
        
        controlsRef.current.setLookAt(
          camX, 12, camZ,  // Camera position (higher up)
          0, 0, 0,         // Look at center
          true             // Animate
        );
      }
    }
  }, [activeSection]);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    
    // Auto-rotate only when no section is active
    if (!activeSection) {
      angleRef.current -= delta * 0.1; // slow rotation
      const radius = 20;
      const camX = Math.cos(angleRef.current) * radius;
      const camZ = Math.sin(angleRef.current) * radius;
      
      // We manually update position here, using setPosition without animation
      // We check if the transition is done to avoid interrupting the setLookAt animation
      if (!controlsRef.current.active) {
        controlsRef.current.setPosition(camX, 12, camZ, false);
      }
    } else {
      // Sync the angleRef to current camera angle so when zooming out it's seamless
      const pos = controlsRef.current.camera.position;
      angleRef.current = Math.atan2(pos.z, pos.x);
    }
  });

  return (
    <CameraControls 
      ref={controlsRef} 
      minDistance={2} 
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below ground
      makeDefault
    />
  );
}

export default function Scene() {
  return (
    <Canvas shadows>
      <color attach="background" args={["#0a0a0a"]} />
      <fog attach="fog" args={["#0a0a0a", 15, 45]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 10, -10]} intensity={1.5} color="#00f0ff" />
      <pointLight position={[10, 5, -10]} intensity={1.5} color="#bd00ff" />

      <Environment preset="city" />
      <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <Diorama />

      <CameraController />
    </Canvas>
  );
}
