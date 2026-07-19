"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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

const HOME_RADIUS = 24;
const HOME_HEIGHT = 17;
const HOME_ANGLE = Math.PI / 4;

// Rotation sensitivity (kept gentle).
const DRAG_SENSITIVITY = 0.004; // radians per px of pointer drag
const WHEEL_SENSITIVITY = 0.0008; // radians per unit of wheel deltaY
const AUTO_ORBIT_SPEED = 0.045; // radians per second of idle drift

/** Elements whose gestures should NOT rotate the camera (real UI controls). */
function isInteractive(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest?.(
    "button, a, input, textarea, select, [data-ui]"
  );
}

/**
 * While the detail page is closed, wheel / vertical swipe / horizontal drag all
 * orbit the diorama (there is nothing to scroll). When the page is open we do
 * nothing so normal page scrolling takes over. Listeners live on `window` so a
 * gesture anywhere over the canvas works, even though the canvas sits behind the
 * (mostly pointer-events-none) UI overlay.
 */
function useViewInput(
  angleRef: React.RefObject<number>,
  draggingRef: React.RefObject<boolean>,
  pageOpenRef: React.RefObject<boolean>
) {
  useEffect(() => {
    let down = false;
    let lastX = 0;
    let lastY = 0;
    let pointerType = "mouse";

    const onPointerDown = (e: PointerEvent) => {
      if (pageOpenRef.current || isInteractive(e.target)) return;
      down = true;
      lastX = e.clientX;
      lastY = e.clientY;
      pointerType = e.pointerType || "mouse";
      draggingRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!down || pageOpenRef.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      // Touch: a vertical swipe (scroll gesture) rotates. Mouse: horizontal drag.
      const delta = pointerType === "touch" ? -dy : dx;
      angleRef.current += delta * DRAG_SENSITIVITY;
    };

    const endDrag = () => {
      down = false;
      draggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (pageOpenRef.current) return;
      e.preventDefault(); // stop any rubber-band scroll; there's no page yet
      angleRef.current += e.deltaY * WHEEL_SENSITIVITY;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("wheel", onWheel);
    };
  }, [angleRef, draggingRef, pageOpenRef]);
}

function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection, pageOpen, homeNonce } = useAppState();
  const angleRef = useRef(HOME_ANGLE);
  const draggingRef = useRef(false);

  // Keep a ref of pageOpen so the input listeners don't need to re-bind.
  const pageOpenRef = useRef(pageOpen);
  pageOpenRef.current = pageOpen;

  useViewInput(angleRef, draggingRef, pageOpenRef);

  // Zoom to a building when one is focused.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !activeSection || !sectionTargets[activeSection]) return;
    const [tx, ty, tz] = sectionTargets[activeSection];
    const dir = new THREE.Vector2(tx, tz);
    if (dir.length() < 0.001) dir.set(0, 1);
    dir.normalize();
    const dist = 13;
    controls.setLookAt(tx + dir.x * dist, ty + 6, tz + dir.y * dist, tx, ty, tz, true);
  }, [activeSection]);

  // Full reset (logo / HOME / scrolled to bottom): restore orbit angle + home view.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    angleRef.current = HOME_ANGLE;
    controls.setLookAt(
      Math.cos(HOME_ANGLE) * HOME_RADIUS,
      HOME_HEIGHT,
      Math.sin(HOME_ANGLE) * HOME_RADIUS,
      0,
      1,
      0,
      true
    );
  }, [homeNonce]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!activeSection) {
      if (!draggingRef.current) {
        angleRef.current -= delta * AUTO_ORBIT_SPEED; // gentle auto-orbit when idle
      }
      const camX = Math.cos(angleRef.current) * HOME_RADIUS;
      const camZ = Math.sin(angleRef.current) * HOME_RADIUS;
      if (!controls.active) {
        controls.setPosition(camX, HOME_HEIGHT, camZ, false);
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
