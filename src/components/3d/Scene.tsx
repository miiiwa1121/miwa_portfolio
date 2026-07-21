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
const HOME_HEIGHT = 11;
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
 * Only in the free home view do wheel / vertical swipe / horizontal drag orbit
 * the diorama (there is nothing to scroll there). Whenever a section is
 * focused — card or full page — orbiting is locked out, since the camera is
 * driven by the zoom/scroll logic instead; a stray gesture is simply ignored
 * rather than silently queued up for later. Listeners live on `window` so a
 * gesture anywhere over the canvas works, even though the canvas sits behind the
 * (mostly pointer-events-none) UI overlay.
 */
function useViewInput(
  targetAngleRef: React.RefObject<number>,
  draggingRef: React.RefObject<boolean>,
  orbitLockedRef: React.RefObject<boolean>
) {
  useEffect(() => {
    let down = false;
    let lastX = 0;
    let lastY = 0;
    let pointerType = "mouse";

    const onPointerDown = (e: PointerEvent) => {
      if (orbitLockedRef.current || isInteractive(e.target)) return;
      down = true;
      lastX = e.clientX;
      lastY = e.clientY;
      pointerType = e.pointerType || "mouse";
      draggingRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!down || orbitLockedRef.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      // Touch: a vertical swipe (scroll gesture) rotates. Mouse: horizontal drag.
      const delta = pointerType === "touch" ? -dy : dx;
      targetAngleRef.current += delta * DRAG_SENSITIVITY;
    };

    const endDrag = () => {
      down = false;
      draggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (orbitLockedRef.current) return;
      e.preventDefault(); // stop any rubber-band scroll; there's no page yet
      targetAngleRef.current += e.deltaY * WHEEL_SENSITIVITY;
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
  }, [targetAngleRef, draggingRef, orbitLockedRef]);
}

function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection, pageOpen, homeNonce, scrollProgressRef } = useAppState();
  
  const angleRef = useRef(HOME_ANGLE);
  const targetAngleRef = useRef(HOME_ANGLE);
  const draggingRef = useRef(false);
  const isTransitioningRef = useRef(false);

  // Orbiting only makes sense in the free home view — lock out drag/wheel input
  // whenever a section is focused (card or full page) so stray gestures can't
  // silently accumulate into targetAngleRef and cause a spin once we get home.
  const orbitLockedRef = useRef(pageOpen || !!activeSection);
  orbitLockedRef.current = pageOpen || !!activeSection;

  useViewInput(targetAngleRef, draggingRef, orbitLockedRef);

  // Zoom to a building when one is focused. Freeze the orbit angle we'll
  // resume at — captured once, here, before anything else can perturb it —
  // so the scroll-linked return lerp and the home reset both converge on the
  // exact spot the diorama was left at, instead of drifting frame-to-frame.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !activeSection || !sectionTargets[activeSection]) return;
    const [tx, ty, tz] = sectionTargets[activeSection];
    const dir = new THREE.Vector2(tx, tz);
    if (dir.length() < 0.001) dir.set(0, 1);
    dir.normalize();
    const dist = 13;

    targetAngleRef.current = angleRef.current;

    isTransitioningRef.current = true;
    controls.setLookAt(tx + dir.x * dist, ty + 6, tz + dir.y * dist, tx, ty, tz, true)
      .then(() => { isTransitioningRef.current = false; });
  }, [activeSection]);

  // Full reset (logo / HOME / scrolled to bottom): restore orbit angle + home view.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // angleRef already holds the angle the diorama was left at (frozen on
    // entry, above) — reuse it so this glides home without an extra spin.
    const homeAngle = angleRef.current;
    targetAngleRef.current = homeAngle;

    isTransitioningRef.current = true;
    controls.setLookAt(
      Math.cos(homeAngle) * HOME_RADIUS,
      HOME_HEIGHT,
      Math.sin(homeAngle) * HOME_RADIUS,
      0,
      1,
      0,
      true
    ).then(() => { isTransitioningRef.current = false; });
  }, [homeNonce]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!activeSection) {
      if (!draggingRef.current && !isTransitioningRef.current) {
        targetAngleRef.current -= delta * AUTO_ORBIT_SPEED; // gentle auto-orbit when idle
      }
      
      // Interpolate for inertia and smooth flowing rotation
      angleRef.current = THREE.MathUtils.damp(angleRef.current, targetAngleRef.current, 5, delta);
      
      const camX = Math.cos(angleRef.current) * HOME_RADIUS;
      const camZ = Math.sin(angleRef.current) * HOME_RADIUS;
      
      if (!isTransitioningRef.current) {
        controls.setPosition(camX, HOME_HEIGHT, camZ, false);
      }
    } else {
      const progress = scrollProgressRef?.current || 0;
      
      if (!isTransitioningRef.current && sectionTargets[activeSection]) {
        // Calculate PosA (Zoomed in) and LookA
        const [tx, ty, tz] = sectionTargets[activeSection];
        const dir = new THREE.Vector2(tx, tz);
        if (dir.length() < 0.001) dir.set(0, 1);
        dir.normalize();
        const dist = 13;
        const PosA = new THREE.Vector3(tx + dir.x * dist, ty + 6, tz + dir.y * dist);
        const LookA = new THREE.Vector3(tx, ty, tz);

        // Calculate PosB (Home view) and LookB — angleRef is frozen at the
        // angle the diorama was left at when this section opened, so PosB
        // stays fixed for the whole scroll instead of chasing itself.
        const camX = Math.cos(angleRef.current) * HOME_RADIUS;
        const camZ = Math.sin(angleRef.current) * HOME_RADIUS;
        const PosB = new THREE.Vector3(camX, HOME_HEIGHT, camZ);
        const LookB = new THREE.Vector3(0, 1, 0);

        // Interpolate based on scroll progress
        const currentPos = new THREE.Vector3().lerpVectors(PosA, PosB, progress);
        const currentLook = new THREE.Vector3().lerpVectors(LookA, LookB, progress);

        controls.setLookAt(
          currentPos.x, currentPos.y, currentPos.z,
          currentLook.x, currentLook.y, currentLook.z,
          false
        );
      }
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
    <Canvas shadows camera={{ position: [16, 11, 16], fov: 45 }} dpr={[1, 2]}>
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
