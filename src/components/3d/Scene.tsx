"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import * as THREE from "three";
import Diorama, { BUILDING_POSITIONS } from "./Diorama";
import { useAppState, SectionType } from "../AppStateContext";

// Focus points for each section (building centre, raised to mid-height).
const sectionTargets: Record<NonNullable<SectionType>, [number, number, number]> = {
  about: [BUILDING_POSITIONS.about[0], 1.5, BUILDING_POSITIONS.about[2]],
  products: [BUILDING_POSITIONS.products[0], 3.5, BUILDING_POSITIONS.products[2]],
  skills: [BUILDING_POSITIONS.skills[0], 3, BUILDING_POSITIONS.skills[2]],
  experience: [BUILDING_POSITIONS.experience[0], 2, BUILDING_POSITIONS.experience[2]],
  contact: [BUILDING_POSITIONS.contact[0], 2.5, BUILDING_POSITIONS.contact[2]],
};

// Drag/swipe sensitivity: radians of orbit per pixel of horizontal movement.
const DRAG_SENSITIVITY = 0.006;
// Minimum movement (px) before a touch commits to "rotate" vs "page scroll".
const DRAG_INTENT_THRESHOLD = 6;

/**
 * Click+drag (mouse) / swipe (touch) support for orbiting the home view
 * left-right. Horizontal movement rotates the camera; vertical movement is
 * left alone so the page can still scroll normally on touch devices.
 */
function useDragOrbit(angleRef: React.RefObject<number>, draggingRef: React.RefObject<boolean>) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const el = gl.domElement;
    let pointerDown = false;
    let intent: "none" | "rotate" | "scroll" = "none";
    let startX = 0;
    let startY = 0;
    let lastX = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true;
      intent = "none";
      startX = lastX = e.clientX;
      startY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown) return;
      if (intent === "none") {
        const dxTotal = e.clientX - startX;
        const dyTotal = e.clientY - startY;
        if (Math.abs(dxTotal) > DRAG_INTENT_THRESHOLD || Math.abs(dyTotal) > DRAG_INTENT_THRESHOLD) {
          intent = Math.abs(dxTotal) > Math.abs(dyTotal) ? "rotate" : "scroll";
          if (intent === "rotate") draggingRef.current = true;
        }
      }
      if (intent === "rotate") {
        e.preventDefault();
        const dx = e.clientX - lastX;
        angleRef.current += dx * DRAG_SENSITIVITY;
      }
      lastX = e.clientX;
    };

    const endDrag = () => {
      pointerDown = false;
      intent = "none";
      draggingRef.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [gl, angleRef, draggingRef]);
}

function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection } = useAppState();
  const angleRef = useRef(Math.PI / 4);
  const draggingRef = useRef(false);

  useDragOrbit(angleRef, draggingRef);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (activeSection && sectionTargets[activeSection]) {
      const [tx, ty, tz] = sectionTargets[activeSection];
      // Place the camera outward from the island centre, slightly above.
      const dir = new THREE.Vector2(tx, tz);
      if (dir.length() < 0.001) dir.set(0, 1);
      dir.normalize();
      const dist = 13;
      controls.setLookAt(
        tx + dir.x * dist,
        ty + 6,
        tz + dir.y * dist,
        tx,
        ty,
        tz,
        true
      );
    } else {
      const a = angleRef.current;
      const radius = 24;
      controls.setLookAt(Math.cos(a) * radius, 17, Math.sin(a) * radius, 0, 1, 0, true);
    }
  }, [activeSection]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!activeSection) {
      if (!draggingRef.current) {
        angleRef.current -= delta * 0.08; // gentle auto-orbit when idle
      }
      const radius = 24;
      const camX = Math.cos(angleRef.current) * radius;
      const camZ = Math.sin(angleRef.current) * radius;
      if (!controls.active) {
        controls.setPosition(camX, 17, camZ, false);
      }
    } else {
      const pos = controls.camera.position;
      angleRef.current = Math.atan2(pos.z, pos.x);
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      // Built-in pointer input is off — rotation is fully driven by our own
      // drag/swipe handler (useDragOrbit) and the auto-orbit above.
      // `enabled=false` only gates user input; setPosition/setLookAt calls
      // still work normally.
      enabled={false}
      minDistance={3}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2 - 0.05}
      makeDefault
    />
  );
}

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [16, 14, 16], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#fff3d1"]} />
      <fog attach="fog" args={["#fff3d1", 30, 70]} />

      {/* Warm sunlight */}
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#fff7e0", "#f6d9a8", 0.6]} />
      <directionalLight
        position={[18, 34, 14]}
        intensity={1.35}
        color="#fff3d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-20, 16, -18]} intensity={0.4} color="#dff0ff" />

      <Diorama />

      <CameraController />
    </Canvas>
  );
}
