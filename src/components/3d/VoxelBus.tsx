import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function VoxelBus() {
  const busRef = useRef<THREE.Group>(null);
  const pathSize = 12; // Size of the square path
  const speed = 4; // Driving speed

  useFrame((state) => {
    if (!busRef.current) return;

    // A simple logic to drive in a square looping path
    const perimeter = pathSize * 4;
    const t = (state.clock.getElapsedTime() * speed) % perimeter;

    if (t < pathSize) {
      // Top Edge: left to right
      busRef.current.position.set(-pathSize/2 + t, 0, -pathSize/2);
      busRef.current.rotation.y = Math.PI / 2; // Facing right
    } else if (t < pathSize * 2) {
      // Right Edge: top to bottom
      busRef.current.position.set(pathSize/2, 0, -pathSize/2 + (t - pathSize));
      busRef.current.rotation.y = 0; // Facing forward (towards camera)
    } else if (t < pathSize * 3) {
      // Bottom Edge: right to left
      busRef.current.position.set(pathSize/2 - (t - pathSize * 2), 0, pathSize/2);
      busRef.current.rotation.y = -Math.PI / 2; // Facing left
    } else {
      // Left Edge: bottom to top
      busRef.current.position.set(-pathSize/2, 0, pathSize/2 - (t - pathSize * 3));
      busRef.current.rotation.y = Math.PI; // Facing back
    }
  });

  return (
    <group ref={busRef}>
      {/* Bus Body */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.2, 1.2, 2.5]} />
        <meshStandardMaterial color="#60a5fa" /> {/* Light blue bus */}
      </mesh>
      
      {/* Bus Windows */}
      <mesh position={[0.61, 0.8, 0]} castShadow>
        <boxGeometry args={[0.05, 0.5, 1.8]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      <mesh position={[-0.61, 0.8, 0]} castShadow>
        <boxGeometry args={[0.05, 0.5, 1.8]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      {/* Front Windshield */}
      <mesh position={[0, 0.8, 1.26]} castShadow>
        <boxGeometry args={[1, 0.5, 0.05]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>

      {/* Wheels */}
      {[[-0.6, 0.2, 0.8], [0.6, 0.2, 0.8], [-0.6, 0.2, -0.8], [0.6, 0.2, -0.8]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
    </group>
  );
}
