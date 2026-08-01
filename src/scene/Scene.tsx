"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import Diorama from "./Diorama";
import {
  frameDistance,
  focalOffsetX,
  focalOffsetY,
  FRAME_MARGIN,
  frameSizeChanged,
  orbitPose,
  orbitAnglesOf,
  sectionPose,
  wrapAngle,
  glidePose,
  easeInOutCubic,
  NEAR_ORBIT_RADIUS,
  NEAR_VERTICAL_SHARE,
  orbitRadiusForZoom,
  ORBIT_MIN_POLAR,
  ORBIT_MAX_POLAR,
  ORBIT_CARD_SHARE,
  CARD_SHARE,
  SECTION_TILT,
  ABOUT_POLAR,
  ABOUT_ORBIT_RADIUS,
  ABOUT_CARD_SHARE,
  type Pose,
  type OrbitZoom,
} from "./worldLayout";
import { PLANET_TOUR, sectionU, facingSectionOnPlanet } from "./planet/tour";
import { PLANET_SECTION_KEYS, sectionDirection } from "./planet/sections";
import { sceneClock } from "./sceneClock";
import { aboutReturn } from "@/hub/about/aboutScroll";
import { useAppState, type SectionType } from "@/state/AppStateContext";

// Rotation sensitivity (kept gentle).
const DRAG_SENSITIVITY = 0.002; // radians per px of pointer drag, both axes
const WHEEL_SENSITIVITY = 0.0004; // radians (of great-circle arc) per unit of wheel deltaY
const AUTO_ORBIT_SPEED = 0.032; // radians (of great-circle arc) per second of idle drift

// How far apart two fingers must move, in px, before a pinch is read as a
// deliberate request to switch the free orbit's altitude — not a continuous
// dial, a single discrete step per gesture (see worldLayout.ts's `OrbitZoom`).
// Crossed once per two-finger gesture; the fingers have to lift and come back
// down for a second switch, rather than firing repeatedly on a long pinch.
const PINCH_THRESHOLD_PX = 60;

// How long the wheel must be quiet before a stream that began while the orbit
// was locked is trusted again. Longer than the gaps within a momentum tail,
// shorter than the pause between two deliberate gestures.
const WHEEL_REARM_MS = 220;

/**
 * How long a camera flight lasts, in seconds.
 *
 * Two values, and the one in play is chosen by whether the detail page was
 * covering the canvas when the flight began — not by which control started it.
 * The sheet takes roughly 0.3s to slide off the screen, and a flight underneath
 * it is a flight nobody sees; the longer figure is what leaves most of the
 * pull-back still to come at the moment the diorama is uncovered. With nothing
 * in the way there is nothing to wait for, and the same delay would only read
 * as the camera being slow off the mark.
 */
const FLIGHT_SECONDS = 1.1;
const RETURN_SECONDS = 1.6;

/**
 * The largest step one frame may contribute to a flight.
 *
 * A backstop for a stall part way through, not a frame-rate policy: the clamp
 * only bites below 10fps, where the flight would stretch in wall-clock time
 * rather than skip. Set at 1/30 first, which quietly turned every flight on a
 * device rendering slower than 30fps into a slow-motion one — measured at
 * headless SwiftShader's ~3fps, a 1.2s flight took twelve seconds.
 *
 * The case this was really reaching for — the render loop sitting at one frame
 * a second behind the detail page (see IdleHeartbeat), then handing the first
 * frame of the flight home a delta approaching a full second — is handled
 * where it belongs, by not charging a flight for time that passed before it
 * existed. See `primed` below.
 */
const MAX_FLIGHT_STEP = 1 / 10;

/** Scratch vectors for reading the camera's current state; never kept. */
const scratchPosition = new THREE.Vector3();
const scratchTarget = new THREE.Vector3();
const scratchOffset = new THREE.Vector3();

/** Elements whose gestures should NOT rotate the camera (real UI controls). */
function isInteractive(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest?.(
    "button, a, input, textarea, select, [data-ui]"
  );
}

/** The unit direction the free orbit's azimuth/polar pair currently points at. */
function directionAt(azimuth: number, polar: number): [number, number, number] {
  return orbitPose(azimuth, polar, 1).slice(0, 3) as [number, number, number];
}

/** Keeps a fraction wrapped into [0, 1) — `PLANET_TOUR`'s own convention. */
function wrap01(u: number): number {
  return ((u % 1) + 1) % 1;
}

/** Straight-line distance between two tracked pointers, in screen px. */
function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Only in the free orbit does dragging or the wheel move the camera (there is
 * nothing to scroll there otherwise). Whenever a section is focused — card or
 * full page — input is locked out, since the camera is driven by the
 * zoom/scroll logic instead; a stray gesture is simply ignored rather than
 * silently queued up for later. Listeners live on `window` so a gesture
 * anywhere over the canvas works, even though the canvas sits behind the
 * (mostly pointer-events-none) UI overlay.
 *
 * A drag moves both azimuth and polar directly — horizontal travel turns the
 * planet, vertical travel tips it — and keeps `tourURef` shadowing the
 * nearest point on the tour path throughout, not just once the drag ends, so
 * a scroll that starts mid-drag continues from nearby rather than reverting
 * to wherever the tour was left. The wheel instead advances `tourURef`
 * directly; it has no reason to leave the path at all.
 *
 * A second finger switches the gesture entirely: rather than a single-pointer
 * drag, the two points' separation is watched for a pinch past
 * `PINCH_THRESHOLD_PX`, which asks `onPinchZoom` for the free orbit's other
 * altitude (see worldLayout.ts's `OrbitZoom`) — a discrete step, not a
 * continuous dial, fired once per two-finger gesture.
 */
function useViewInput(
  azimuthTargetRef: React.RefObject<number>,
  polarTargetRef: React.RefObject<number>,
  tourURef: React.RefObject<number>,
  draggingRef: React.RefObject<boolean>,
  orbitLockedRef: React.RefObject<boolean>,
  flightRef: React.RefObject<unknown>,
  onPinchZoom: (zoom: OrbitZoom) => void
) {
  useEffect(() => {
    let down = false;
    let lastX = 0;
    let lastY = 0;

    // Pointers currently on the glass, keyed by pointerId — what turns a
    // second finger landing mid-drag into a pinch instead of both fingers'
    // moves being read as one confused single-pointer drag.
    const activePointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist: number | null = null;
    // True once this two-finger gesture has already fired a zoom switch —
    // the fingers have to lift and come back down for another one, rather
    // than a long pinch repeatedly re-crossing the threshold.
    let pinchConsumed = false;

    // A camera flight owns the camera outright; gestures during one would be
    // fighting it, and would land as a jump the moment it finished.
    const locked = () => orbitLockedRef.current || flightRef.current !== null;

    const resync = () => {
      tourURef.current = PLANET_TOUR.nearestU(directionAt(azimuthTargetRef.current, polarTargetRef.current));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (locked() || isInteractive(e.target)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2) {
        // A second finger arrived mid-drag: hand the gesture over to the
        // pinch entirely rather than letting the single-pointer drag below
        // keep reading whichever finger's events happen to interleave.
        down = false;
        draggingRef.current = false;
        const [a, b] = [...activePointers.values()];
        pinchStartDist = pointerDistance(a, b);
        pinchConsumed = false;
      } else if (activePointers.size === 1) {
        down = true;
        lastX = e.clientX;
        lastY = e.clientY;
        draggingRef.current = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (locked()) return;
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (activePointers.size >= 2) {
        const [a, b] = [...activePointers.values()];
        const dist = pointerDistance(a, b);
        if (pinchStartDist !== null && !pinchConsumed) {
          const spread = dist - pinchStartDist;
          if (spread > PINCH_THRESHOLD_PX) {
            onPinchZoom("near"); // fingers spreading apart — zoom in, closer
            pinchConsumed = true;
          } else if (spread < -PINCH_THRESHOLD_PX) {
            onPinchZoom("far"); // fingers pinching together — zoom out, further
            pinchConsumed = true;
          }
        }
        return; // a pinch in progress never also reads as a single-pointer drag
      }

      if (!down) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      // Horizontal drag turns the planet — subtracted, not added, because
      // CameraControls' azimuth increases clockwise seen from above (three.js's
      // `atan2(x, z)` convention), the opposite handedness of the drag
      // gesture's natural "grab and pull" direction.
      azimuthTargetRef.current -= dx * DRAG_SENSITIVITY;
      // Vertical drag tips it — dragging up (dy < 0) looks more from above
      // (polar decreases, towards the pole the same "up" points at), the same
      // "grab and pull" handedness as the horizontal case.
      polarTargetRef.current = Math.min(
        ORBIT_MAX_POLAR,
        Math.max(ORBIT_MIN_POLAR, polarTargetRef.current + dy * DRAG_SENSITIVITY)
      );
      resync();
    };

    const endDrag = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        pinchStartDist = null;
        pinchConsumed = false;
      }
      if (activePointers.size === 0) {
        down = false;
        draggingRef.current = false;
      }
      // A finger lifting out of a pinch, with one still down, does not
      // resume a single-pointer drag from whatever `lastX`/`lastY` happen to
      // be stale at — that finger's own drag only starts at its next
      // `pointerdown`.
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
      const deltaU = (-e.deltaY * WHEEL_SENSITIVITY) / PLANET_TOUR.length;
      tourURef.current = wrap01(tourURef.current + deltaU);
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
  }, [azimuthTargetRef, polarTargetRef, tourURef, draggingRef, orbitLockedRef, flightRef, onPinchZoom]);
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

/**
 * Hands the pause button's state to the diorama's clock, from inside the
 * Canvas where the renderer's own clock lives.
 */
function ScenePause() {
  const { paused } = useAppState();
  const clock = useThree((state) => state.clock);

  useEffect(() => {
    // The `elapsedTime` property, not getElapsedTime(): the getter advances the
    // clock as a side effect, and would eat the delta the next frame is owed.
    // Being up to one frame (16ms) behind at the moment of the press is not
    // something anyone can see; a swallowed frame is.
    sceneClock.setPaused(paused, clock.elapsedTime);
  }, [paused, clock]);

  return null;
}

function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection, pageOpen, homeNonce, facing, setFacing, turnRequest, paused, orbitZoom, setOrbitZoom } =
    useAppState();
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);

  const home = orbitAnglesOf(PLANET_TOUR.direction(0));
  // Which of the free orbit's two altitudes is currently in effect — read
  // fresh each render, same as `camera`/`activeSection` below, rather than
  // kept in a ref: nothing here needs its value to survive a render, only to
  // be current whenever `useFrame`'s closure (recreated every render) reads it.
  const currentOrbitRadius = orbitRadiusForZoom(orbitZoom);
  // The "near" altitude leans the planet towards the bottom-right of the
  // frame (reference/image5.png); "far" sits centred (aside from the
  // horizontal card clearance every altitude gets). Computed the same way
  // `currentOrbitRadius` is — fresh each render, for `useFrame`'s closure.
  const currentOffsetY = orbitZoom === "near" ? focalOffsetY(currentOrbitRadius, camera.fov, NEAR_VERTICAL_SHARE) : 0;

  // The free orbit's true state — see docs/planet-migration.md, "カメラの状態設計".
  // `azimuthTargetRef`/`polarTargetRef` are raw targets that jump the instant
  // a gesture or the tour asks for something new; `azimuthRef`/`polarRef` are
  // what actually gets rendered, damped towards those targets every frame.
  // Unlike the flat world's `azimuthAngle`, nothing here is read back from
  // CameraControls — the full pose is written with setLookAt every frame (see
  // useFrame below), so these refs are the only source of truth and there is
  // nothing to recover by inverting a transient world position.
  const azimuthTargetRef = useRef(home.azimuth);
  const polarTargetRef = useRef(home.polar);
  const azimuthRef = useRef(home.azimuth);
  const polarRef = useRef(home.polar);
  // Where along the tour path the camera is — meaningful whenever the free
  // orbit is driving the camera, and shadowed (not driving) during a drag or
  // while a section holds the camera parked.
  const tourURef = useRef(0);

  const draggingRef = useRef(false);
  const prevSectionRef = useRef<SectionType>(null);
  const prevNonceRef = useRef(homeNonce);
  const prevOrbitZoomRef = useRef(orbitZoom);
  const facingRef = useRef(facing);

  // About keeps orbiting slowly even though it isn't the free orbit — it has
  // no card to hold the camera clear of, so unlike every other focused
  // section there's no reason to park it. Just the one running azimuth: About
  // pivots on the planet's own centre at fixed ABOUT_POLAR/ABOUT_ORBIT_RADIUS,
  // not on the building, so there is nothing else about the shot left to
  // capture when it starts.
  const aboutAzimuthRef = useRef(0);

  /**
   * The flight in progress, if any — driven frame by frame in useFrame below
   * rather than handed to CameraControls.
   *
   * `setLookAt(..., true)` was what did this before, and its damping is the
   * wrong shape for the flight that matters: it spends most of its travel in
   * its opening moments, which for the trip home from a detail page are the
   * moments the sheet is still covering the canvas. Owning the clock means the
   * duration is a number rather than an emergent property of a spring, the
   * curve can hold still at the start (see easeInOutCubic), and a frame that
   * arrives late cannot skip the flight forward (see MAX_FLIGHT_STEP).
   */
  const glideRef = useRef<{
    from: Pose;
    to: Pose;
    fromOffsetX: number;
    toOffsetX: number;
    fromOffsetY: number;
    toOffsetY: number;
    elapsed: number;
    duration: number;
    /**
     * False until this flight has seen a frame. `delta` is the gap since the
     * *previous* frame, and a flight begins in an effect — after that frame,
     * before the next — so none of that gap is time the flight has run for.
     * Charging it anyway is harmless at 60fps and ruinous behind the detail
     * page, where the gap is the heartbeat's full second and would spend most
     * of the flight home on the frame it started.
     */
    primed: boolean;
  } | null>(null);

  const inFlight = () => glideRef.current !== null;
  const prevPageOpenRef = useRef(pageOpen);

  /**
   * Send the camera to `pose` over `duration` seconds, starting from wherever
   * it is now — including part way through a flight it is superseding, which
   * is what keeps a second destination chosen mid-flight from snapping.
   */
  const startGlide = (to: Pose, toOffsetX: number, toOffsetY: number, duration: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const position = controls.getPosition(scratchPosition, false);
    const target = controls.getTarget(scratchTarget, false);
    const currentOffset = controls.getFocalOffset(scratchOffset, false);
    glideRef.current = {
      from: [position.x, position.y, position.z, target.x, target.y, target.z],
      to,
      fromOffsetX: currentOffset.x,
      toOffsetX,
      fromOffsetY: currentOffset.y,
      toOffsetY,
      elapsed: 0,
      duration,
      primed: false,
    };
  };

  // Orbiting only makes sense in the free orbit — lock out drag/wheel input
  // whenever a section is focused (card or full page) so stray gestures can't
  // silently accumulate into the targets and cause a spin once we get back.
  const orbitLockedRef = useRef(pageOpen || !!activeSection);
  useEffect(() => {
    orbitLockedRef.current = pageOpen || !!activeSection;
  }, [pageOpen, activeSection]);

  useViewInput(azimuthTargetRef, polarTargetRef, tourURef, draggingRef, orbitLockedRef, glideRef, setOrbitZoom);

  const snapFocalOffset = (offsetX: number, offsetY: number = 0) => {
    controlsRef.current?.setFocalOffset(offsetX, offsetY, 0, false);
  };

  // The push is a fraction of the frame's *width*, so a resize changes it. Snap
  // rather than ease: a window being dragged is already moving, and easing
  // would trail the offset behind the frame it is measured against. Mid-flight
  // the flight owns the offset, so the new figure is handed to it as a
  // destination instead — snapping there would be undone on the next frame.
  //
  // Guarded on the frame's *dimensions*, via `frameSizeChanged`, so this only
  // ever acts on a real resize — see the note on `frameSizeChanged` itself for
  // why an identity comparison on `size` used to fire on every re-render.
  const lastSizeRef = useRef({ width: size.width, height: size.height });
  useEffect(() => {
    if (!frameSizeChanged(lastSizeRef.current, size)) return;
    lastSizeRef.current = { width: size.width, height: size.height };
    const glide = glideRef.current;
    const offsetX = activeSection
      ? glide?.toOffsetX ?? 0 // a section's own offset depends on that section's distance, not on the frame alone; leave it be outside a flight
      : focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, ORBIT_CARD_SHARE);
    // The vertical lean doesn't depend on the frame's width the way the card
    // clearance does (see focalOffsetY's own comment), so a resize never
    // actually changes it — carried along regardless, so this never clobbers
    // it back to 0 the way omitting it from snapFocalOffset's call would.
    const offsetY = activeSection ? glide?.toOffsetY ?? 0 : currentOffsetY;
    if (glide) {
      glide.toOffsetX = offsetX;
      glide.toOffsetY = offsetY;
    } else if (!activeSection) {
      snapFocalOffset(offsetX, offsetY);
    }
  }, [size, activeSection, camera, currentOrbitRadius, currentOffsetY]);

  // Pausing means "stop now", not "coast to a halt". The damp below is still
  // carrying the camera towards a target the idle drift left a fraction of a
  // second ahead of it, so without this the diorama would glide on for another
  // moment after the button was pressed. Dropping the remaining travel is
  // enough — the target stops growing on the same frame the clock freezes.
  // Never during a flight: the target is that flight's destination there, and
  // clobbering it would drag the camera back off the building on landing.
  useEffect(() => {
    if (!paused || inFlight()) return;
    azimuthTargetRef.current = azimuthRef.current;
    polarTargetRef.current = polarRef.current;
  }, [paused]);

  // Swiping the card asks for a spot. Steering tourURef directly is all it
  // takes — the idle loop eases the camera round from wherever it is, and the
  // card follows because it reads the direction rather than being set.
  useEffect(() => {
    if (!turnRequest) return;
    tourURef.current = sectionU(turnRequest.section);
  }, [turnRequest]);

  // Every camera destination is decided here, in one place, so the several
  // ways of arriving cannot disagree about where the camera should end up.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const cameFrom = prevSectionRef.current;
    prevSectionRef.current = activeSection;
    const wasReset = homeNonce !== prevNonceRef.current;
    prevNonceRef.current = homeNonce;
    const wasZoomChange = orbitZoom !== prevOrbitZoomRef.current;
    prevOrbitZoomRef.current = orbitZoom;

    // Whether the detail page was covering the canvas when this flight was
    // asked for, which is what decides how long it gets. Read before the ref
    // below is brought up to date, and kept in a ref rather than a dep because
    // this effect must not re-run merely because the page opened or closed.
    const wasCovered = prevPageOpenRef.current;
    const duration = wasCovered ? RETURN_SECONDS : FLIGHT_SECONDS;

    /** Point the free orbit's targets at `azimuth`/`polar` and fly there, at whichever altitude `orbitZoom` currently names. */
    const flyToOrbit = (azimuth: number, polar: number) => {
      azimuthTargetRef.current = azimuthRef.current + wrapAngle(azimuth - azimuthRef.current);
      polarTargetRef.current = polar;
      startGlide(
        orbitPose(azimuth, polar, currentOrbitRadius),
        focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, ORBIT_CARD_SHARE),
        currentOffsetY,
        duration
      );
    };

    // 1. A section was focused (not About): frame its building from its own
    //    local frame, backing off by however much that particular building
    //    needs. Reading the real bounds means a tall tower and a small house
    //    are each framed properly, instead of sharing one hardcoded distance.
    if (activeSection && activeSection !== "about" && PLANET_SECTION_KEYS.includes(activeSection)) {
      const building = scene.getObjectByName(activeSection);
      if (building) {
        const sphere = new THREE.Box3().setFromObject(building).getBoundingSphere(new THREE.Sphere());
        const target: [number, number, number] = [sphere.center.x, sphere.center.y, sphere.center.z];
        const distance = frameDistance(sphere.radius * FRAME_MARGIN, camera.fov, camera.aspect);
        const pose = sectionPose(target, distance, SECTION_TILT);
        startGlide(pose, focalOffsetX(distance, camera.fov, camera.aspect, CARD_SHARE), 0, duration);
      }
      return;
    }

    // 2. About was focused: fly to face it, at the wide, steeply-tilted orbit
    //    that pivots on the planet's own centre rather than on the small
    //    "about" building (see ABOUT_POLAR/ABOUT_ORBIT_RADIUS). The starting
    //    azimuth for its own continuing idle rotation (useFrame, below) is
    //    captured here, once, rather than every frame.
    if (activeSection === "about") {
      const azimuth = orbitAnglesOf(sectionDirection("about")).azimuth;
      aboutAzimuthRef.current = azimuthRef.current + wrapAngle(azimuth - azimuthRef.current);
      startGlide(
        orbitPose(aboutAzimuthRef.current, ABOUT_POLAR, ABOUT_ORBIT_RADIUS),
        focalOffsetX(ABOUT_ORBIT_RADIUS, camera.fov, camera.aspect, ABOUT_CARD_SHARE),
        0,
        duration
      );
      return;
    }

    // 3. A deliberate reset (logo / HOME) with no area to leave — the camera
    //    was already free, idle-drifting or dragged off to wherever, so there
    //    is nothing to pull back *from* and this is the one fixed default view
    //    every time: the start of the tour. If an area *was* focused, this
    //    falls through to 5 instead: pulling back facing that area is the same
    //    trip scrolling off the detail page makes.
    if (wasReset && !(cameFrom && cameFrom !== "about" && PLANET_SECTION_KEYS.includes(cameFrom))) {
      tourURef.current = 0;
      flyToOrbit(home.azimuth, home.polar);
      return;
    }

    // 4. About, read to the end. There is no flight to start: the column's own
    //    scroll flew this one, frame by frame, and the camera is already
    //    sitting wherever About's idle rotation left it. Anything launched
    //    here would be a second trip on top of an arrival that has already
    //    happened. Reconcile the free orbit's targets to that landing spot —
    //    off the tour path in general, the same way ending a drag leaves it —
    //    and let the ordinary idle drift ease it back onto the path from
    //    there, rather than snapping anywhere.
    if (cameFrom === "about" && aboutReturn.progress() >= 1) {
      azimuthTargetRef.current = aboutAzimuthRef.current;
      polarTargetRef.current = ABOUT_POLAR;
      azimuthRef.current = aboutAzimuthRef.current;
      polarRef.current = ABOUT_POLAR;
      tourURef.current = PLANET_TOUR.nearestU(directionAt(aboutAzimuthRef.current, ABOUT_POLAR));
      const landedOn = facingSectionOnPlanet(directionAt(aboutAzimuthRef.current, ABOUT_POLAR));
      facingRef.current = landedOn;
      setFacing(landedOn);
      return;
    }

    // 5. Left an area — by scrolling off the detail page, or by the logo /
    //    HOME while one was focused (3 falls through to here for that case).
    //    Either way: back out to the tour, turned so the area just read about
    //    is the thing facing the camera, and resume the tour from there.
    if (cameFrom && cameFrom !== "about" && PLANET_SECTION_KEYS.includes(cameFrom)) {
      const u = sectionU(cameFrom);
      tourURef.current = u;
      const { azimuth, polar } = orbitAnglesOf(PLANET_TOUR.direction(u));
      flyToOrbit(azimuth, polar);
      return;
    }

    // 6. The free orbit's altitude changed (a pinch, or the zoom control's far/
    //    near stage) while already resting in the orbit — nothing was entered
    //    or left, so glide to the very same azimuth/polar, just at the new
    //    radius, and leave tourURef untouched (this isn't a tour move).
    if (wasZoomChange && !activeSection) {
      flyToOrbit(azimuthRef.current, polarRef.current);
      return;
    }

    // 7. First mount. The Canvas only gets to set a camera *position*, never
    //    a target, so without this the orbit would run at whatever radius the
    //    initial position happened to imply while still aiming at the origin.
    //    Snap (no transition) so the first frame is already correct.
    azimuthTargetRef.current = home.azimuth;
    polarTargetRef.current = home.polar;
    azimuthRef.current = home.azimuth;
    polarRef.current = home.polar;
    snapFocalOffset(focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, ORBIT_CARD_SHARE), currentOffsetY);
    controls.setLookAt(...orbitPose(home.azimuth, home.polar, currentOrbitRadius), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, homeNonce, orbitZoom, scene, camera]);

  // Declared after the effect above so that effect always reads the *previous*
  // value. Its own effect rather than a line inside that one, because the page
  // can open without the focused area changing — tapping the card of an area
  // already zoomed into — and that effect does not run then.
  useEffect(() => {
    prevPageOpenRef.current = pageOpen;
  }, [pageOpen]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // A flight owns the camera outright while it runs, ahead of every branch
    // below — the destination effect has already decided where this is going,
    // and the only thing left is to walk there on a clock of our own.
    //
    // The real delta, not the diorama's: the pause button freezes the town,
    // not the reader. Stopping the camera part way between two framings would
    // strand it looking at nothing in particular, with no way back but to
    // press play.
    const glide = glideRef.current;
    if (glide) {
      if (glide.primed) glide.elapsed += Math.min(delta, MAX_FLIGHT_STEP);
      else glide.primed = true;
      const progress = Math.min(1, glide.elapsed / glide.duration);
      const eased = easeInOutCubic(progress);
      controls.setLookAt(...glidePose(glide.from, glide.to, eased), false);
      controls.setFocalOffset(
        glide.fromOffsetX + (glide.toOffsetX - glide.fromOffsetX) * eased,
        glide.fromOffsetY + (glide.toOffsetY - glide.fromOffsetY) * eased,
        0,
        false
      );
      if (progress >= 1) glideRef.current = null;
      return;
    }

    // The camera is only ever driven here in the free orbit — and in About,
    // which keeps slowly turning since it has no card to hold still for.
    // Every other focused section stays exactly where its flight parked it,
    // so nothing writes to the camera between flights there — one owner at a
    // time.
    if (activeSection) {
      if (activeSection === "about") {
        // A plain accumulator, not damped: nothing else ever writes this
        // azimuth (input is locked out while a section is focused), so there
        // is no jump here to smooth away, unlike the idle drift below.
        aboutAzimuthRef.current += sceneClock.delta(delta) * AUTO_ORBIT_SPEED;
        const pose = orbitPose(aboutAzimuthRef.current, ABOUT_POLAR, ABOUT_ORBIT_RADIUS);

        // Reading the column home. Past its half way mark the framing pulls
        // straight in from About's own distant radius towards the free
        // orbit's, at the *same* azimuth and polar — deliberately not
        // re-tilting towards wherever the tour happens to sit, which would
        // mean deciding a "correct" polar for every azimuth along the way.
        // Landing off the tour path this way is not a special case: it is
        // exactly the state a drag leaves the camera in, and the ordinary
        // idle drift (below) eases it back onto the path from there, the same
        // way it does after any free look.
        const homeward = orbitPose(aboutAzimuthRef.current, ABOUT_POLAR, currentOrbitRadius);
        const t = easeInOutCubic(aboutReturn.progress());
        controls.setLookAt(...(t > 0 ? glidePose(pose, homeward, t) : pose), false);

        const aboutOffsetX = focalOffsetX(ABOUT_ORBIT_RADIUS, camera.fov, camera.aspect, ABOUT_CARD_SHARE);
        const orbitOffsetX = focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, ORBIT_CARD_SHARE);
        controls.setFocalOffset(
          aboutOffsetX + (orbitOffsetX - aboutOffsetX) * t,
          currentOffsetY * t, // About itself has no vertical lean (0), blending towards the orbit's own
          0,
          false
        );

        // Where the idle drift picks up once the column is gone. Without this
        // it would resume from whatever target was left over from before
        // About was opened, and turn the camera to it the moment it landed.
        azimuthTargetRef.current = aboutAzimuthRef.current;
        polarTargetRef.current = ABOUT_POLAR;
      }
      return;
    }

    // Advance the tour position: the wheel already writes tourURef.current
    // directly (see useViewInput), so all that is left here is the part that
    // has no discrete event to hang off — idle drift. A drag shadows tourURef
    // continuously instead of driving it, so it is excluded the same way it
    // always was.
    if (!draggingRef.current && !inFlight()) {
      const duPerSecond = AUTO_ORBIT_SPEED / PLANET_TOUR.length;
      tourURef.current = wrap01(tourURef.current + sceneClock.delta(delta) * duPerSecond);
    }

    // Whether the wheel or idle drift moved tourURef, or a drag moved the
    // targets directly, the targets are re-derived from the tour position
    // whenever a drag is not actively driving them — this is what pulls the
    // camera back onto the tour path after a drag ends or About lands off it.
    if (!draggingRef.current) {
      const { azimuth, polar } = orbitAnglesOf(PLANET_TOUR.direction(tourURef.current));
      azimuthTargetRef.current += wrapAngle(azimuth - azimuthTargetRef.current);
      polarTargetRef.current = polar;
    }

    if (inFlight()) return;

    // Damp the actual, rendered azimuth/polar towards their targets — inertia
    // and smooth flowing rotation, the same shape a drag or a wheel flick has
    // always had. `wrapAngle` re-centres the target within one turn of the
    // current azimuth first, the same reason it always did: azimuthTargetRef
    // is a plain accumulator that can drift many turns from where
    // `azimuthRef` currently sits, and left alone `damp()` would chase that
    // raw numeric gap instead of the short physical distance.
    const current = azimuthRef.current;
    const target = current + wrapAngle(azimuthTargetRef.current - current);
    azimuthTargetRef.current = target;
    azimuthRef.current = THREE.MathUtils.damp(current, target, 5, delta);
    polarRef.current = THREE.MathUtils.damp(polarRef.current, polarTargetRef.current, 5, delta);

    controls.setLookAt(...orbitPose(azimuthRef.current, polarRef.current, currentOrbitRadius), false);
    controls.setFocalOffset(
      focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, ORBIT_CARD_SHARE),
      currentOffsetY,
      0,
      false
    );

    // Publish which area is in front. Only on a change — this runs every frame,
    // and a setState per frame would re-render the whole overlay at 60Hz on the
    // thread drawing the diorama.
    const facingNow = facingSectionOnPlanet(directionAt(azimuthRef.current, polarRef.current));
    if (facingNow !== facingRef.current) {
      facingRef.current = facingNow;
      setFacing(facingNow);
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      // Built-in pointer input is off — rotation is fully driven by our own
      // drag/swipe handler (useViewInput) and the auto-orbit above.
      // `enabled=false` only gates user input; setPosition/setLookAt calls
      // still work normally.
      enabled={false}
      minDistance={3}
      maxDistance={ABOUT_ORBIT_RADIUS + 20}
      // Opened all the way rather than clamped here: setLookAt rebuilds
      // _spherical from the camera's position every frame and never consults
      // minPolarAngle/maxPolarAngle (those only gate rotateTo), so a clamp
      // here would do nothing — see ORBIT_MIN_POLAR/ORBIT_MAX_POLAR, enforced
      // in this component's own useFrame instead.
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      makeDefault
    />
  );
}

export default function Scene({ obscured = false }: { obscured?: boolean }) {
  const home = orbitAnglesOf(PLANET_TOUR.direction(0));
  return (
    <Canvas
      shadows
      // Taken from orbitPose rather than written out, so the very first frame
      // — the one before CameraController's effect gets to place the camera —
      // is already on the orbit, at the free orbit's default altitude
      // (NEAR_ORBIT_RADIUS — CameraController's own mount effect has no
      // AppStateContext to consult yet either, so "near" is the one this
      // very first paint can assume rather than read).
      camera={{
        position: orbitPose(home.azimuth, home.polar, NEAR_ORBIT_RADIUS).slice(0, 3) as [number, number, number],
        fov: 45,
      }}
      dpr={[1, 2]}
      frameloop={obscured ? "demand" : "always"}
    >
      {/*
       * Stage 5 of docs/planet-migration.md: space, not atmosphere. Fog is
       * gone outright — there is nothing for light to scatter off between
       * here and the planet — and the flat cream backdrop (a stand-in since
       * stage 2) is a near-black navy instead. Kept in sync with the canvas
       * wrapper's own bg-[#070a14] in Hub.tsx, so there is no flash of the
       * old colour before WebGL paints.
       */}
      <color attach="background" args={["#070a14"]} />
      {/*
       * radius is the inner edge of the shell the points scatter across, and
       * has to clear the camera's farthest reach (About's maxDistance,
       * ABOUT_ORBIT_RADIUS + 20 ≈ 247) or the far side of the sphere would
       * poke through the star shell as the camera pulls back for About.
       * speed=0 keeps the twinkle shader frozen: Stars reads
       * state.clock.elapsedTime directly rather than sceneClock, so any
       * nonzero speed would be the one thing on screen the pause button
       * can't stop (see CLAUDE.md's "自分から動くものは sceneClock から").
       */}
      <Stars radius={320} depth={150} count={6500} factor={30} saturation={0} fade speed={0} />

      {/* Sunlight from one side, a dim cool starlight fill from the other —
          low ambient is what lets the two sides of the sphere read as day
          and night instead of one flat wash. */}
      <ambientLight intensity={0.2} />
      <hemisphereLight args={["#fff7e0", "#1c2440", 0.45]} />
      <directionalLight
        position={[18, 34, 14]}
        intensity={1.5}
        color="#fff3d6"
        castShadow
        // Halved from 2048. The shadows here are large soft shapes cast by
        // blocky geometry, where the extra resolution bought detail nobody
        // could see for four times the shadow-pass cost.
        shadow-mapSize={[1024, 1024]}
        /*
         * Stage 5: retuned for the current (halved-diameter) planet. The
         * ±48/1..140 shim from stage 2 was sized for the pre-halving radius
         * (33.6) and was never retightened when that became permanent — an
         * orthographic camera's left/right/top/bottom bound the true
         * projected size of what it frames, so the box only has to be the
         * scene's own bounding radius: SMOOTH_PLANET_RADIUS (16.8) + the
         * tallest building's peak above its own anchor (the pink tower's
         * antenna tip, voxel y=30 at VS=0.42 ≈ 12.9) ≈ 29.7, rounded up to
         * ±34 for margin. near/far are that same ±34 slid along the light's
         * own distance from the origin (hypot(18,34,14) ≈ 40.9): 40.9∓34 ≈
         * 6.9/74.9, rounded outward to 5/78.
         */
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={5}
        shadow-camera-far={78}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-20, 16, -18]} intensity={0.6} color="#dff0ff" />

      <Diorama />

      <CameraController />
      <ScenePause />
      <IdleHeartbeat obscured={obscured} />
    </Canvas>
  );
}
