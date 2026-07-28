"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import * as THREE from "three";
import Diorama from "./Diorama";
import {
  sectionTargets,
  sectionAzimuth,
  framePose,
  frameDistance,
  aimOffset,
  FRAME_MARGIN,
  facingSection,
  homePose,
  wrapAngle,
  HOME_ANGLE,
  HOME_HEIGHT,
  type Pose,
} from "./worldLayout";
import { useAppState, type SectionType } from "../AppStateContext";

// Rotation sensitivity (kept gentle).
const DRAG_SENSITIVITY = 0.004; // radians per px of pointer drag
const WHEEL_SENSITIVITY = 0.0008; // radians per unit of wheel deltaY
const AUTO_ORBIT_SPEED = 0.045; // radians per second of idle drift

// How long the wheel must be quiet before a stream that began while the orbit
// was locked is trusted again. Longer than the gaps within a momentum tail,
// shorter than the pause between two deliberate gestures.
const WHEEL_REARM_MS = 220;

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
  orbitLockedRef: React.RefObject<boolean>,
  flightRef: React.RefObject<number>
) {
  useEffect(() => {
    let down = false;
    let lastX = 0;
    let lastY = 0;
    let pointerType = "mouse";

    // A camera flight owns the camera outright; gestures during one would be
    // fighting it, and would land as a jump the moment it finished.
    const locked = () => orbitLockedRef.current || flightRef.current !== 0;

    const onPointerDown = (e: PointerEvent) => {
      if (locked() || isInteractive(e.target)) return;
      down = true;
      lastX = e.clientX;
      lastY = e.clientY;
      pointerType = e.pointerType || "mouse";
      draggingRef.current = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!down || locked()) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      // Touch: a vertical swipe (scroll gesture) rotates. Mouse: horizontal drag.
      // Subtracted (not added): CameraControls' azimuth increases clockwise
      // when viewed from above (three.js's `atan2(x, z)` convention, see
      // azimuthToXZ below), which is the opposite handedness of the drag
      // gesture's natural "grab and pull" direction — so the delta is negated
      // here to keep dragging right feel like rotating the diorama rightward.
      const delta = pointerType === "touch" ? -dy : dx;
      targetAngleRef.current -= delta * DRAG_SENSITIVITY;
    };

    const endDrag = () => {
      down = false;
      draggingRef.current = false;
    };

    // A hard flick that dismisses the detail page keeps emitting wheel events
    // for a second or two after the fingers leave the trackpad. Those arrive
    // just as the orbit unlocks, and used to pour straight into the rotation
    // target — which is why a hard swipe home sent the camera spinning while a
    // gentle one looked fine. Momentum is one unbroken stream, so a stream
    // that began while locked is refused until the wheel falls quiet: a
    // genuinely new gesture always starts after a pause.
    let lastWheelAt = 0;
    let wheelArmed = true;

    const onWheel = (e: WheelEvent) => {
      const sinceLast = e.timeStamp - lastWheelAt;
      lastWheelAt = e.timeStamp;

      if (locked()) {
        wheelArmed = false;
        return;
      }
      if (!wheelArmed) {
        if (sinceLast < WHEEL_REARM_MS) return; // same stream, still coasting
        wheelArmed = true;
      }

      e.preventDefault(); // stop any rubber-band scroll; there's no page yet
      targetAngleRef.current -= e.deltaY * WHEEL_SENSITIVITY;
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
  }, [targetAngleRef, draggingRef, orbitLockedRef, flightRef]);
}

/**
 * While the detail page covers the canvas there is nothing to look at, so the
 * render loop is switched to on-demand and nudged about once a second instead
 * of running at 60fps behind an opaque panel. Rendering a few thousand
 * instanced voxels plus a shadow pass for an audience of nobody is the most
 * expensive thing this page can do, and it competes for the same main thread
 * the sheet animation and the section mount are using.
 */
const OBSCURED_HEARTBEAT_MS = 1000;

function IdleHeartbeat({ obscured }: { obscured: boolean }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!obscured) return;
    const id = setInterval(invalidate, OBSCURED_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [obscured, invalidate]);

  return null;
}

function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection, pageOpen, homeNonce, facing, setFacing, turnRequest } = useAppState();
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  // The orbit's azimuth is tracked entirely through CameraControls' own
  // `.azimuthAngle` (an accumulative, wraparound-safe property backed by its
  // internal spherical state) rather than a hand-rolled ref recovered via
  // atan2(camera.position). Re-deriving an angle from a transient world-space
  // position was the root cause of the drift/snap bugs here: intermediate
  // points along a flight path don't sit on the orbit circle, so atan2'ing
  // them produced angles that didn't mean anything. `azimuthAngle` never has
  // that problem because it's the authoritative source, not a recomputation.
  const azimuthTargetRef = useRef(HOME_ANGLE);
  const draggingRef = useRef(false);
  const prevSectionRef = useRef<SectionType>(null);
  const prevNonceRef = useRef(homeNonce);
  const facingRef = useRef(facing);

  // A plain "is a flight in progress" boolean cannot be used here.
  // CameraControls' `_createOnRestPromise` has no per-call identity: it
  // resolves on the *next* `rest` event whatever caused it, and hands back an
  // already-resolved promise when the camera happens to sit at the
  // destination. So a stale `.then` from a superseded flight would clear the
  // flag while a newer one is still animating, and useFrame would start
  // writing the camera every frame on top of it — two owners, one camera.
  // Tokens make each flight only able to retire itself.
  const flightIdRef = useRef(0);
  const activeFlightRef = useRef(0); // 0 = camera is ours to drive

  const beginFlight = () => {
    const id = ++flightIdRef.current;
    activeFlightRef.current = id;
    return id;
  };
  const endFlight = (id: number) => {
    if (activeFlightRef.current === id) activeFlightRef.current = 0;
  };
  const inFlight = () => activeFlightRef.current !== 0;

  // Orbiting only makes sense in the free home view — lock out drag/wheel input
  // whenever a section is focused (card or full page) so stray gestures can't
  // silently accumulate into azimuthTargetRef and cause a spin once we get home.
  const orbitLockedRef = useRef(pageOpen || !!activeSection);
  useEffect(() => {
    orbitLockedRef.current = pageOpen || !!activeSection;
  }, [pageOpen, activeSection]);

  useViewInput(azimuthTargetRef, draggingRef, orbitLockedRef, activeFlightRef);

  // Swiping the card asks for a spot. Steering the existing orbit target is
  // all it takes — the idle loop eases the camera round from wherever it is,
  // and the card follows because it reads the angle rather than being set.
  useEffect(() => {
    if (!turnRequest) return;
    const controls = controlsRef.current;
    if (!controls) return;
    const current = controls.azimuthAngle;
    azimuthTargetRef.current =
      current + wrapAngle(sectionAzimuth(turnRequest.section) - current);
  }, [turnRequest]);

  // Every camera destination is decided here, in one place, so the three ways
  // of arriving cannot disagree about where the camera should end up.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const cameFrom = prevSectionRef.current;
    prevSectionRef.current = activeSection;
    const wasReset = homeNonce !== prevNonceRef.current;
    prevNonceRef.current = homeNonce;

    const flyTo = (pose: Pose, azimuth: number) => {
      azimuthTargetRef.current = azimuth;
      const id = beginFlight();
      controls.setLookAt(...pose, true).then(() => endFlight(id));
    };

    // 1. A section was focused: frame its building from the area's own angle,
    //    backing off by however much that particular building needs. Reading
    //    the real bounds means a 12-unit tower and a 4-unit library are each
    //    framed properly, instead of sharing one hardcoded distance.
    if (activeSection && sectionTargets[activeSection]) {
      const building = scene.getObjectByName(activeSection);
      if (building) {
        const sphere = new THREE.Box3()
          .setFromObject(building)
          .getBoundingSphere(new THREE.Sphere());
        const distance = frameDistance(
          sphere.radius * FRAME_MARGIN,
          camera.fov,
          camera.aspect
        );
        const pose = framePose(
          [sphere.center.x, sphere.center.y, sphere.center.z],
          sectionAzimuth(activeSection),
          distance,
          undefined,
          aimOffset(distance, camera.fov, camera.aspect)
        );
        const id = beginFlight();
        controls.setLookAt(...pose, true).then(() => endFlight(id));
      }
      return;
    }

    // 2. A deliberate reset (logo / HOME): the one fixed default view, so it
    //    lands in exactly the same place every single time.
    if (wasReset) {
      flyTo(homePose(HOME_ANGLE), HOME_ANGLE);
      return;
    }

    // 3. Scrolled off the detail page: back out to the overview distance, but
    //    turned so the area just read about is the thing facing the camera.
    if (cameFrom && sectionTargets[cameFrom]) {
      const azimuth = sectionAzimuth(cameFrom);
      flyTo(homePose(azimuth), azimuth);
      return;
    }

    // 4. First mount. The Canvas only gets to set a camera *position*, never
    //    a target, so without this the orbit would run at whatever radius the
    //    initial position happened to imply while still aiming at the origin —
    //    which tilted the view down far enough to cut the top off the tallest
    //    tower. Snap (no transition) so the first frame is already correct.
    azimuthTargetRef.current = HOME_ANGLE;
    controls.setLookAt(...homePose(HOME_ANGLE), false);
  }, [activeSection, homeNonce, scene, camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // The camera is only ever driven here in the free home view. With a
    // section focused it stays exactly where its flight parked it, so nothing
    // writes to the camera between flights — one owner at a time.
    //
    // This used to also run a scroll-linked lerp from the building framing
    // back to the home framing, every frame, for the entire time the detail
    // page was open. That was invisible (the page covers the canvas) and it
    // was the last camera bug: the branch was chosen from `activeSection`,
    // React state, while its input came from a ref written synchronously on
    // scroll. goHome() changed the ref first and the state a render later, so
    // a frame in between ran the lerp at progress 0 and snapped the camera
    // back onto the building before the flight home even started.
    if (activeSection) return;

    if (!draggingRef.current && !inFlight()) {
      azimuthTargetRef.current += delta * AUTO_ORBIT_SPEED; // gentle auto-orbit when idle
    }

    if (inFlight()) return;

    // controls.azimuthAngle gets rewrapped into (-π, π] every frame (it's
    // recovered via atan2 inside setPosition below), but azimuthTargetRef
    // is a plain accumulator that keeps growing past ±π as drag/wheel/
    // auto-orbit deltas pile up. Left alone, damp() would chase the raw
    // numeric gap between a wrapped value and an unbounded one — often
    // many multiples of 2π — instead of the short physical distance,
    // which is what made rotation "run away" after enough spinning.
    // Re-centering the target within one turn of the current angle first
    // keeps every damp step on the shortest path.
    const current = controls.azimuthAngle;
    const target = current + wrapAngle(azimuthTargetRef.current - current);
    azimuthTargetRef.current = target;

    // Interpolate for inertia and smooth flowing rotation.
    //
    // rotateAzimuthTo swings around whatever the camera is currently looking
    // at, keeping its distance and height. That matters now that closing the
    // detail page leaves the camera parked on a building: rebuilding the
    // position from HOME_RADIUS/HOME_HEIGHT, as this used to, would have
    // yanked it back out to the island overview on the very next frame.
    const azimuth = THREE.MathUtils.damp(current, target, 5, delta);
    controls.rotateAzimuthTo(azimuth, false);

    // Publish which area is in front. Only on a change — this runs every
    // frame, and a setState per frame would re-render the whole overlay at
    // 60Hz on the same main thread that is drawing the diorama.
    const facing = facingSection(azimuth);
    if (facing !== facingRef.current) {
      facingRef.current = facing;
      setFacing(facing);
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

export default function Scene({ obscured = false }: { obscured?: boolean }) {
  return (
    <Canvas
      shadows
      camera={{ position: [18.4, HOME_HEIGHT, 18.4], fov: 45 }}
      dpr={[1, 2]}
      frameloop={obscured ? "demand" : "always"}
    >
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
      <IdleHeartbeat obscured={obscured} />
    </Canvas>
  );
}
