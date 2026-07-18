"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";

export default function VoxelIsland({ radius = 12 }: { radius?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Generate voxel data
  const { blockData, count } = useMemo(() => {
    const blocks: { position: [number, number, number], color: string }[] = [];
    
    // Simple 2D noise approximation using Math functions
    const noise = (x: number, z: number) => {
      return Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2 + Math.sin(x * 0.1 + z * 0.2) * 1.5;
    };

    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        
        // Circular island mask with slight noise on edges
        if (dist < radius + noise(x, z) * 0.5) {
          const height = Math.floor(noise(x, z));
          
          // Cone depth calculation (deeper in middle, shallow at edges)
          const maxDepth = Math.max(1, Math.floor((radius - dist) * 1.5 + Math.abs(noise(x*2, z*2))));
          
          for (let y = height; y >= height - maxDepth; y--) {
            let color = "#4ade80"; // Default Grass
            
            if (y === height) {
              // Top layer variations (light/dark grass)
              color = (x + z) % 2 === 0 ? "#4ade80" : "#22c55e";
            } else if (y >= height - 2) {
              // Dirt layer
              color = (x + y + z) % 2 === 0 ? "#854d0e" : "#713f12";
            } else {
              // Stone/Core layer
              // Fade into dark gray as it goes deeper
              const intensity = Math.max(0.1, 1 - (Math.abs(y - height) / maxDepth));
              const coreColor = new THREE.Color("#475569").multiplyScalar(intensity).getHexString();
              color = `#${coreColor}`;
            }

            blocks.push({ position: [x, y, z], color });
          }
        }
      }
    }
    
    return { blockData: blocks, count: blocks.length };
  }, [radius]);

  // Apply matrix and colors to InstancedMesh
  useEffect(() => {
    if (!meshRef.current) return;
    
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    blockData.forEach((block, i) => {
      dummy.position.set(block.position[0], block.position[1], block.position[2]);
      // Scale down slightly so each voxel is distinctly visible with small gaps
      dummy.scale.set(0.96, 0.96, 0.96); 
      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, color.set(block.color));
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [blockData]);

  return (
    <instancedMesh ref={meshRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} metalness={0.0} />
    </instancedMesh>
  );
}
