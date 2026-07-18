import * as THREE from "three";

export default function VoxelIsland({ radius = 20 }: { radius?: number }) {
  return (
    <group>
      {/* Yellow Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[radius * 4, radius * 4]} />
        <meshStandardMaterial color="#fef08a" roughness={0.9} />
      </mesh>
      
      {/* Green Grid Lines to represent roads/city blocks */}
      <gridHelper 
        args={[radius * 4, 40, "#4ade80", "#86efac"]} 
        position={[0, -0.49, 0]} 
      />
    </group>
  );
}
