"use client";

import { useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import PlanetScene from "./objects/PlanetScene";
import {
  frameDistance,
  focalOffsetX,
  focalOffsetY,
  FRAME_MARGIN,
  frameSizeChanged,
  orbitPose,
  orbitAnglesOf,
  sectionPose,
  sectionUp,
  ORBIT_UP,
  wrapAngle,
  glidePose,
  easeInOutCubic,
  NEAR_ORBIT_RADIUS,
  CAMERA_FOV,
  nearVerticalShare,
  HANDHELD_VERTICAL_SHARE,
  orbitRadiusForZoom,
  ORBIT_MIN_POLAR,
  ORBIT_MAX_POLAR,
  type OrbitAngles,
  AUTO_ORBIT_SPEED,
  ORBIT_RETURN_SPEED,
  orbitStepFraction,
  orbitCardShare,
  sectionCardShare,
  SECTION_TILT,
  ABOUT_POLAR,
  ABOUT_ORBIT_RADIUS,
  ABOUT_CARD_SHARE,
  type Pose,
  type OrbitZoom,
} from "./camera/cameraLayout";
import { PLANET_TOUR, sectionU, facingSectionOnPlanet } from "./planet/tour";
import { PLANET_SECTION_KEYS, sectionDirection } from "./planet/sections";
import { type Direction } from "./planet/geometry";
import { advanceFlight, beginFlight, type Flight } from "./camera/cameraFlight";
import { sceneClock } from "./sceneClock";
import { pointerClaim } from "./pointerClaim";
import { aboutReturn } from "@/hub/about/aboutScroll";
import { useAppState } from "@/state/AppStateContext";
import { useHandheld } from "@/state/useHandheld";
import { publishFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";
import Sun from "./objects/Sun";

// Rotation sensitivity (kept gentle).
const DRAG_SENSITIVITY = 0.002; // radians per px of pointer drag, both axes
const WHEEL_SENSITIVITY = 0.0004; // radians (of great-circle arc) per unit of wheel deltaY
// AUTO_ORBIT_SPEED — the idle drift's own pace — now lives in cameraLayout.ts,
// next to the ORBIT_RETURN_SPEED derived from it.

// How far apart two fingers must move, in px, before a pinch is read as a
// deliberate request to switch the free orbit's altitude — not a continuous
// dial, a single discrete step per gesture (see cameraLayout.ts's `OrbitZoom`).
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
 * altitude (see cameraLayout.ts's `OrbitZoom`) — a discrete step, not a
 * continuous dial, fired once per two-finger gesture.
 *
 * `returningRef` is the one piece of state a gesture leaves behind it: letting
 * go of a drag hands the camera back to the tour path, and it is only *that*
 * trip which is held to the idle drift's own pace (see `ORBIT_RETURN_SPEED`).
 * Both other things this hook does — the drag itself, and the wheel's travel
 * along the path — are the reader steering, and get the damp's full
 * responsiveness back the moment they start.
 */
function useViewInput(
  azimuthTargetRef: React.RefObject<number>,
  polarTargetRef: React.RefObject<number>,
  tourURef: React.RefObject<number>,
  draggingRef: React.RefObject<boolean>,
  returningRef: React.RefObject<boolean>,
  orbitLockedRef: React.RefObject<boolean>,
  flightRef: React.RefObject<unknown>,
  sunDraggingRef: React.RefObject<boolean>,
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
    // fighting it, and would land as a jump the moment it finished. A hand on
    // the sun is the same press this would otherwise read as a drag of the
    // planet — the sun claims it first (see `Sun`), and this is where that is
    // honoured.
    const locked = () =>
      orbitLockedRef.current || flightRef.current !== null || sunDraggingRef.current;

    const resync = () => {
      tourURef.current = PLANET_TOUR.nearestU(directionAt(azimuthTargetRef.current, polarTargetRef.current));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (locked() || isInteractive(e.target)) return;
      // A hand back on the planet ends any drift back towards the path — the
      // drag below has to track the pointer, not crawl after it at
      // ORBIT_RETURN_SPEED. Cleared on the way down rather than on the first
      // move, so even a drag begun mid-return starts responsive.
      returningRef.current = false;
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
      // Whatever this pointer was, it is over: an object that claimed it (a
      // marker, the sun) has had its chance. Keyed by id, so a second finger
      // lifting cannot release the first one's claim.
      pointerClaim.release(e.pointerId);
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        pinchStartDist = null;
        pinchConsumed = false;
      }
      if (activePointers.size === 0) {
        // Letting go is what starts the trip home, and the only thing that
        // does: from here until the camera is back on the path (or another
        // gesture takes over) the frame loop holds it to ORBIT_RETURN_SPEED.
        // Set even for a drag that never moved — the gap is nil there, the cap
        // never binds, and the flag clears itself on the next frame.
        if (draggingRef.current) returningRef.current = true;
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
      // Travel along the path the reader just asked for, not a return to it:
      // the same 0.4 rad that should take six seconds to drift back would read
      // as a dead scroll wheel if it took six seconds to answer a flick.
      returningRef.current = false;
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
  }, [
    azimuthTargetRef,
    polarTargetRef,
    tourURef,
    draggingRef,
    returningRef,
    orbitLockedRef,
    flightRef,
    sunDraggingRef,
    onPinchZoom,
  ]);
}

/** Stands in for an absent `onEmptyTap`; the hook is disabled in that case anyway. */
function noop() {}

/** Movement below this, in px, is a tap rather than the start of a drag. */
const TAP_SLOP_PX = 10;

/**
 * A press held longer than this is not a tap, in ms.
 *
 * There has to be an upper bound as well as a movement one: a finger resting
 * on the glass while the reader decides what to do drifts less than the slop,
 * and lifting it half a second later should not read as having asked for
 * anything. 350ms is the usual figure for the boundary between a tap and a
 * press, and it is comfortably longer than the ~120ms a deliberate tap takes.
 */
const TAP_MAX_MS = 350;

/**
 * A tap on empty sky, which is how a phone pauses the diorama.
 *
 * The pause button is gone on a handheld (see `useHandheld`); this replaces
 * it. "Empty" has three exclusions and each is a different kind of thing:
 *
 *  - **A real control** — the header, the card rail, the terminal. Found by
 *    walking up the DOM from the target (`isInteractive`).
 *  - **An object in the scene** — an area marker, the sun. Invisible to the
 *    DOM, since every one of these lands on the same canvas, so they say so
 *    themselves on the way down (`pointerClaim`).
 *  - **A gesture that turned out to be something else** — a drag of the
 *    planet, or a second finger arriving for a pinch. Both are ruled out
 *    here rather than negotiated with `useViewInput`: this hook watches the
 *    same events and cancels its own candidate, so the two never need to
 *    agree about anything.
 *
 * Deliberately separate from `useViewInput` rather than another branch inside
 * it. That hook is about where the camera points; this one is about a button
 * that is not there any more, and the only thing they share is the stream of
 * events.
 */
function useTapGesture(enabled: boolean, flightRef: React.RefObject<unknown>, onTap: () => void) {
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    if (!enabled) return;

    let candidate: { id: number; x: number; y: number; at: number } | null = null;
    let pointersDown = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointersDown += 1;
      // A second finger means a pinch. The first finger's candidate goes with
      // it — lifting out of a pinch is not a tap, however still the fingers
      // were.
      if (pointersDown > 1) {
        candidate = null;
        return;
      }
      if (isInteractive(e.target)) return;
      if (pointerClaim.isClaimed(e.pointerId)) return;
      // A flight owns the camera; a tap landing mid-flight is someone trying
      // to interrupt it, and pausing the town is not what they asked for.
      if (flightRef.current !== null) return;
      candidate = { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!candidate || e.pointerId !== candidate.id) return;
      if (Math.hypot(e.clientX - candidate.x, e.clientY - candidate.y) > TAP_SLOP_PX) {
        candidate = null; // it became a drag
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointersDown = Math.max(0, pointersDown - 1);
      const tap = candidate;
      candidate = null;
      if (!tap || e.pointerId !== tap.id) return;
      if (e.timeStamp - tap.at > TAP_MAX_MS) return;
      // Checked again on the way up as well as on every move: a pointer can
      // land and lift with no `pointermove` in between and still have
      // travelled, and a coarse pointer reports its position generously.
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP_PX) return;
      onTapRef.current();
    };

    const onPointerCancel = () => {
      pointersDown = Math.max(0, pointersDown - 1);
      candidate = null;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enabled, flightRef]);
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

function CameraController({
  sunDraggingRef,
  onEmptyTap,
}: {
  sunDraggingRef: React.RefObject<boolean>;
  onEmptyTap?: () => void;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const { activeSection, pageOpen, homeNonce, turnRequest, paused, orbitZoom, setOrbitZoom } = useAppState();
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);

  const home = orbitAnglesOf(PLANET_TOUR.direction(0));
  // Which of the free orbit's two altitudes is currently in effect — read
  // fresh each render, same as `camera`/`activeSection` below, rather than
  // kept in a ref: nothing here needs its value to survive a render, only to
  // be current whenever `useFrame`'s closure (recreated every render) reads it.
  const currentOrbitRadius = orbitRadiusForZoom(orbitZoom);
  // Whether the card is the strip along the bottom rather than the panel on
  // the left — which is what decides both how the subject is cleared (up,
  // not sideways) and by how much. Read here rather than passed in: it is the
  // same question `Hub` asks to decide which card to render, and the two must
  // never disagree about it. Changes only on a rotation, so a re-render of
  // this component for it costs nothing per frame.
  const handheld = useHandheld();
  const cardShareOrbit = orbitCardShare(handheld);
  const cardShareSection = sectionCardShare(handheld);
  /**
   * How far to lift a framed building so the card rail does not cover it, in
   * world units at that building's own distance. Zero on a desktop, where the
   * card is beside the subject rather than under it.
   *
   * A function of distance rather than a constant: `frameDistance` puts the
   * camera a different distance from each building, and a share of the frame
   * is only a number of world units once you know how far away the frame is.
   */
  const sectionOffsetY = useCallback(
    (distance: number) =>
      handheld ? focalOffsetY(distance, camera.fov, HANDHELD_VERTICAL_SHARE) : 0,
    [handheld, camera]
  );
  // The "near" altitude leans the planet towards the bottom-right of the
  // frame (reference/image5.png); "far" sits centred (aside from the
  // horizontal card clearance every altitude gets). Computed the same way
  // `currentOrbitRadius` is — fresh each render, for `useFrame`'s closure.
  const currentOffsetY =
    orbitZoom === "near" ? focalOffsetY(currentOrbitRadius, camera.fov, nearVerticalShare(handheld)) : 0;

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
  /**
   * Whether the camera is currently drifting back onto the tour path after a
   * drag let go — the one journey held to `ORBIT_RETURN_SPEED` rather than
   * damped home in half a second.
   *
   * A mode rather than a property of the gap itself, because the gap alone
   * cannot tell the two apart: a wheel flick and a released drag both leave
   * the camera some arc away from where the tour says it should be, and only
   * one of them is a return. Set by letting go (see `useViewInput`), cleared
   * by anything that is the reader steering again — a new drag, the wheel, the
   * card's swipe, any flight — and by arriving.
   */
  const returningRef = useRef(false);
  const prevSectionRef = useRef<SectionType>(null);
  const prevNonceRef = useRef(homeNonce);
  const prevOrbitZoomRef = useRef(orbitZoom);

  // About keeps orbiting slowly even though it isn't the free orbit — it has
  // no card to hold the camera clear of, so unlike every other focused
  // section there's no reason to park it. Just the one running azimuth: About
  // pivots on the planet's own centre at fixed ABOUT_POLAR/ABOUT_ORBIT_RADIUS,
  // not on the building, so there is nothing else about the shot left to
  // capture when it starts.
  const aboutAzimuthRef = useRef(0);

  /**
   * The flight in progress, if any — driven frame by frame in useFrame below
   * rather than handed to CameraControls. The record and its per-frame step
   * live in `cameraFlight.ts`, where they can be run without a renderer.
   */
  const glideRef = useRef<Flight | null>(null);

  /**
   * The building bounds the flight in progress was framed from, or null when it
   * is not a section close-up.
   *
   * The one thing about a flight that a resize invalidates. `sectionPose`'s
   * distance comes from `frameDistance(radius, fov, aspect)`, so a window
   * reshaped mid-flight would otherwise land the camera at a distance framed
   * for the aspect ratio the flight started under, with nothing afterwards to
   * correct it.
   */
  const flightFramingRef = useRef<{ target: [number, number, number]; radius: number } | null>(null);

  const inFlight = () => glideRef.current !== null;
  const prevPageOpenRef = useRef(pageOpen);

  /**
   * Which way is up for the camera right now.
   *
   * Kept here rather than read back off `camera.up`, for the same reason
   * `viewRef` is not read back off `CameraControls.azimuthAngle`: this is the
   * value we write every frame, and reading it back would only ever tell us
   * what we last said.
   */
  const upRef = useRef<Direction>(ORBIT_UP);

  /**
   * Hand `up` to the camera before a `setLookAt`.
   *
   * `updateCameraUp()` first, always: camera-controls decomposes the position
   * it is given into a spherical about `camera.up` (via `_yAxisUpSpace`, which
   * only `updateCameraUp` rebuilds), and re-composes it the same way before
   * calling `camera.lookAt(target)`. Writing `camera.up` without it would leave
   * the decomposition happening in the previous frame's up-space.
   */
  const applyUp = (controls: CameraControls, up: Direction) => {
    const current = upRef.current;
    // Skipped when nothing moved, which is every frame outside a flight —
    // `updateCameraUp` rebuilds two quaternions, and the orbit and About both
    // sit on `ORBIT_UP` indefinitely. Safe as a no-op on the very first frame
    // too: camera-controls' own constructor has already synced (0, 1, 0).
    if (current[0] === up[0] && current[1] === up[1] && current[2] === up[2]) return;
    upRef.current = up;
    camera.up.set(up[0], up[1], up[2]);
    controls.updateCameraUp();
  };

  /**
   * Send the camera to `pose` over `duration` seconds, starting from wherever
   * it is now — including part way through a flight it is superseding, which
   * is what keeps a second destination chosen mid-flight from snapping.
   *
   * `land` is the free orbit's angles at the far end, for the flights that end
   * up back on it, and null for the ones that do not. Getting it wrong is not
   * cosmetic — see `Flight.land`.
   */
  const startGlide = (
    to: Pose,
    toOffsetX: number,
    toOffsetY: number,
    duration: number,
    toUp: Direction,
    land: OrbitAngles | null
  ) => {
    const controls = controlsRef.current;
    if (!controls) return;
    // A flight supersedes a drift home: it has its own clock and its own
    // destination, and leaving the flag set would hand the leftovers of an old
    // return to the idle loop the flight lands in.
    returningRef.current = false;
    // Only `focusSection` has a framing to re-derive, and it re-records it
    // immediately after this call. Cleared here so that every other flight —
    // and any flight this one supersedes — cannot leave a stale one behind for
    // a resize to aim at.
    flightFramingRef.current = null;
    const position = controls.getPosition(scratchPosition, false);
    const target = controls.getTarget(scratchTarget, false);
    const currentOffset = controls.getFocalOffset(scratchOffset, false);
    glideRef.current = beginFlight({
      from: [position.x, position.y, position.z, target.x, target.y, target.z],
      to,
      fromOffsetX: currentOffset.x,
      toOffsetX,
      fromOffsetY: currentOffset.y,
      toOffsetY,
      fromUp: upRef.current,
      toUp,
      duration,
      land,
    });
  };

  /**
   * Fly to a section's own close-up, framed from that building's real bounds.
   *
   * Reading the bounds beats hand-tuned heights: the buildings are procedural
   * and still changing shape, so a tall tower and a small house are each framed
   * properly instead of sharing one hardcoded distance.
   *
   * Returns false when the building is not in the scene yet — which is a real
   * case, not a defensive check: a direct link to `#products` applies its
   * section a frame after mount (see `applyUrl`), and R3F commits the Canvas's
   * children behind an `await`. The caller retries rather than giving up; this
   * used to return silently and leave the camera parked in the orbit with a
   * section supposedly focused and nothing to say so.
   */
  const focusSection = (section: NonNullable<SectionType>, duration: number): boolean => {
    const building = scene.getObjectByName(section);
    if (!building) return false;
    const sphere = new THREE.Box3().setFromObject(building).getBoundingSphere(new THREE.Sphere());
    const target: [number, number, number] = [sphere.center.x, sphere.center.y, sphere.center.z];
    const distance = frameDistance(sphere.radius * FRAME_MARGIN, camera.fov, camera.aspect);
    startGlide(
      sectionPose(target, distance, SECTION_TILT),
      focalOffsetX(distance, camera.fov, camera.aspect, cardShareSection),
      sectionOffsetY(distance),
      duration,

      // The building's own normal, not the world's +Y — the whole shot is built
      // in this building's tangent frame, and the roll is the half of it that
      // used to be left behind in world coordinates. See `sectionUp` for what
      // that cost.
      sectionUp(target),
      // Nothing to hand over: a focused section parks the camera, and the free
      // orbit does not drive it again until the flight back out — which brings
      // its own landing angles.
      null
    );
    // Recorded after `startGlide`, which clears it: a section flight's
    // destination depends on the frame's aspect ratio (through `frameDistance`)
    // and so has to be recomputed if the window is resized mid-flight.
    flightFramingRef.current = { target, radius: sphere.radius };
    return true;
  };

  /** A section close-up waiting for its building to appear; see `focusSection`. */
  const pendingFocusRef = useRef<{ section: NonNullable<SectionType>; duration: number } | null>(null);

  // Orbiting only makes sense in the free orbit — lock out drag/wheel input
  // whenever a section is focused (card or full page) so stray gestures can't
  // silently accumulate into the targets and cause a spin once we get back.
  const orbitLockedRef = useRef(pageOpen || !!activeSection);
  useEffect(() => {
    orbitLockedRef.current = pageOpen || !!activeSection;
  }, [pageOpen, activeSection]);

  useViewInput(
    azimuthTargetRef,
    polarTargetRef,
    tourURef,
    draggingRef,
    returningRef,
    orbitLockedRef,
    glideRef,
    sunDraggingRef,
    setOrbitZoom
  );

  // The tap that replaces the pause button. Off while the detail sheet covers
  // the canvas — every gesture there lands on the sheet, which is a plain
  // scrolling div and so not something `isInteractive` recognises — and off
  // during About, where the whole screen belongs to the crawl and freezing it
  // is not what a tap beside the text is asking for.
  useTapGesture(
    !!onEmptyTap && !pageOpen && activeSection !== "about",
    glideRef,
    onEmptyTap ?? noop
  );

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
  // Going handheld is the other thing that changes what the offsets should
  // be — it swaps the sideways clearance for an upward one — and it is not a
  // property of the frame's dimensions, so `frameSizeChanged` cannot see it.
  // In practice a rotation changes both at once and either test would do;
  // tracked separately anyway so that a media query flipping on its own (a
  // mouse plugged into a tablet) does not leave the camera aimed for the
  // layout it is no longer showing.
  const lastHandheldRef = useRef(handheld);
  useEffect(() => {
    const resized = frameSizeChanged(lastSizeRef.current, size);
    const clearanceChanged = lastHandheldRef.current !== handheld;
    if (!resized && !clearanceChanged) return;
    lastSizeRef.current = { width: size.width, height: size.height };
    lastHandheldRef.current = handheld;
    const glide = glideRef.current;
    const offsetX = activeSection
      ? glide?.toOffsetX ?? 0 // a section's own offset depends on that section's distance, not on the frame alone; leave it be outside a flight
      : focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, cardShareOrbit);
    // The vertical lean doesn't depend on the frame's width the way the card
    // clearance does (see focalOffsetY's own comment), so a resize never
    // actually changes it — carried along regardless, so this never clobbers
    // it back to 0 the way omitting it from snapFocalOffset's call would.
    const offsetY = activeSection ? glide?.toOffsetY ?? 0 : currentOffsetY;
    if (glide) {
      glide.toOffsetX = offsetX;
      glide.toOffsetY = offsetY;
      // A section close-up is framed against the aspect ratio too, not just
      // pushed aside by it: `frameDistance` is how far back the camera has to
      // sit for this building to fit *this* frame. Re-aimed rather than left
      // alone, since nothing after the landing would ever correct it.
      const framing = flightFramingRef.current;
      if (framing) {
        const distance = frameDistance(framing.radius * FRAME_MARGIN, camera.fov, camera.aspect);
        glide.to = sectionPose(framing.target, distance, SECTION_TILT);
        glide.toOffsetX = focalOffsetX(distance, camera.fov, camera.aspect, cardShareSection);
        glide.toOffsetY = sectionOffsetY(distance);
      }
    } else if (!activeSection) {
      snapFocalOffset(offsetX, offsetY);
    }
  }, [
    size,
    activeSection,
    camera,
    currentOrbitRadius,
    currentOffsetY,
    handheld,
    cardShareOrbit,
    cardShareSection,
    sectionOffsetY,
  ]);

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
    // Somewhere asked for, not a drift home — the swipe gets the damp's own
    // pace, the same way the wheel does (see `returningRef`).
    returningRef.current = false;
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
    // Whatever this run decides supersedes a close-up still waiting for its
    // building, the same way a new flight supersedes one in progress.
    pendingFocusRef.current = null;

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
        focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, cardShareOrbit),
        currentOffsetY,
        duration,
        // Back onto the satellite orbit, so back to the world's own up —
        // whatever building's normal the camera may have been rolled to.
        ORBIT_UP,
        // This flight ends in the free orbit, so it owes the free orbit the
        // angles it left the camera at. Without them the first idle frame damps
        // from wherever the camera stood *before* the flight and undoes most of
        // the trip in a single tick — see `Flight.land`.
        { azimuth, polar }
      );
    };

    // 1. A section was focused (not About): frame its building from its own
    //    local frame, backing off by however much that particular building
    //    needs (see `focusSection`).
    if (activeSection && activeSection !== "about" && PLANET_SECTION_KEYS.includes(activeSection)) {
      if (!focusSection(activeSection, duration)) {
        pendingFocusRef.current = { section: activeSection, duration };
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
        duration,
        // About pivots on the planet's centre like the free orbit does, so it
        // keeps the world's up rather than any one building's.
        ORBIT_UP,
        // Nothing to hand over either: About's own frame-loop branch writes
        // azimuthRef/polarRef every frame it runs (it rides the tour path home
        // as the column is read), so it never reads what a flight left behind.
        null
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

    // 4. About, read to the end. There is no flight to start: the column's
    //    own scroll flew this one, frame by frame, riding the tour path home
    //    (see the About branch of the frame loop, below) — azimuthRef/
    //    polarRef/tourURef are already sitting on the tour's own landing
    //    point by the last frame that ran there, and the ordinary idle drift
    //    picks them up with nothing left to damp. Only the facing card needs
    //    a nudge here, so it doesn't wait one more frame for the idle loop's
    //    own facing check (below) to catch up.
    //
    //    wasReset can't also be true here: leaving About via the logo/HOME
    //    bumps homeNonce and calls closePage in the same breath (see goHome
    //    in AppStateContext), and branch 3 above already returns for that
    //    case before this one runs.
    if (cameFrom === "about") {
      publishFacing(facingSectionOnPlanet(directionAt(azimuthRef.current, polarRef.current)));
      return;
    }

    // 5. Left an area — by scrolling off the detail page, or by the logo /
    //    HOME while one was focused (3 falls through to here for that case).
    //    Either way: back out to the tour, turned so the area just read about
    //    is the thing facing the camera, and resume the tour from there.
    //    `cameFrom === "about"` is excluded by construction, not by a check
    //    here — PLANET_SECTION_KEYS never contains "about" (see
    //    planet/sections.ts), and branch 4 above has already returned for
    //    every other way "about" could reach this point.
    if (cameFrom && PLANET_SECTION_KEYS.includes(cameFrom)) {
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
    snapFocalOffset(focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, cardShareOrbit), currentOffsetY);
    applyUp(controls, ORBIT_UP);
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
      const step = advanceFlight(glide, delta);
      // Before the pose, not after: setLookAt decomposes the position it is
      // handed into the up-space that is current at that moment.
      applyUp(controls, step.up);
      controls.setLookAt(...step.pose, false);
      controls.setFocalOffset(step.offsetX, step.offsetY, 0, false);

      // Hand the free orbit the angles this flight actually finished on, before
      // letting go of the camera. `azimuthRef`/`polarRef` are a separate source
      // of truth from the camera's transform and a flight never touches them,
      // so skipping this leaves the idle damp below resuming from wherever the
      // camera stood before the flight — one frame at 8% of that gap, i.e. most
      // of the trip undone in a single tick. See `Flight.land` for the measured
      // sizes; About solves the same problem its own way (below).
      if (step.landed) {
        azimuthRef.current = step.landed.azimuth;
        polarRef.current = step.landed.polar;
        azimuthTargetRef.current = step.landed.azimuth;
        polarTargetRef.current = step.landed.polar;
      }
      if (step.done) glideRef.current = null;
      return;
    }

    // The camera is only ever driven here in the free orbit — and in About,
    // which keeps slowly turning since it has no card to hold still for.
    // Every other focused section stays exactly where its flight parked it,
    // so nothing writes to the camera between flights there — one owner at a
    // time.
    if (activeSection) {
      // A close-up whose building had not been committed to the scene when it
      // was asked for. Retried here rather than abandoned — see `focusSection`.
      const pending = pendingFocusRef.current;
      if (pending && pending.section === activeSection && focusSection(pending.section, pending.duration)) {
        pendingFocusRef.current = null;
      }

      if (activeSection === "about") {
        // A plain accumulator, not damped: nothing else ever writes this
        // azimuth (input is locked out while a section is focused), so there
        // is no jump here to smooth away, unlike the idle drift below.
        aboutAzimuthRef.current += sceneClock.delta(delta) * AUTO_ORBIT_SPEED;
        const pose = orbitPose(aboutAzimuthRef.current, ABOUT_POLAR, ABOUT_ORBIT_RADIUS);

        // The tour keeps advancing the whole time About is open — at the
        // same rate the idle drift below uses — rather than sitting frozen
        // wherever it was when About was entered. That makes "the landing
        // point" below a point already moving at the tour's own speed by the
        // time the return blend reaches it, so arriving there (t = 1) is a
        // velocity match, not a stop: idle drift has nothing left to damp
        // and simply continues, instead of the camera arriving still and
        // then having to be pulled onto a path it was never moving along.
        const duPerSecond = AUTO_ORBIT_SPEED / PLANET_TOUR.length;
        tourURef.current = wrap01(tourURef.current + sceneClock.delta(delta) * duPerSecond);
        const { azimuth: tourAzimuth, polar: tourPolar } = orbitAnglesOf(PLANET_TOUR.direction(tourURef.current));

        // Reading the column home. Past its half way mark the framing pulls
        // straight in from About's own distant radius towards the free
        // orbit's, tilting from ABOUT_POLAR towards the tour's own polar
        // angle at this point along the way — re-tilting per-azimuth like
        // this only works because the target is the tour path itself, the
        // one curve that already has a "correct" polar defined for every
        // azimuth (see PLANET_TOUR's own "interpolated in latitude and
        // longitude" note in planet/tour.ts). Landing anywhere else on this
        // curve is not a special case: it is exactly where idle drift was
        // always going to carry the camera, About or not.
        const homeward = orbitPose(tourAzimuth, tourPolar, currentOrbitRadius);
        const t = easeInOutCubic(aboutReturn.progress());
        // Both ends of About's own trip pivot on the planet's centre, so the
        // roll never leaves the world's up here — no slerp to run.
        applyUp(controls, ORBIT_UP);
        controls.setLookAt(...(t > 0 ? glidePose(pose, homeward, t) : pose), false);

        const aboutOffsetX = focalOffsetX(ABOUT_ORBIT_RADIUS, camera.fov, camera.aspect, ABOUT_CARD_SHARE);
        const orbitOffsetX = focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, cardShareOrbit);
        controls.setFocalOffset(
          aboutOffsetX + (orbitOffsetX - aboutOffsetX) * t,
          currentOffsetY * t, // About itself has no vertical lean (0), blending towards the orbit's own
          0,
          false
        );

        // Where the idle drift picks up once the column is gone — written
        // every frame (not just once the column closes), so there is never a
        // leftover target from before About was opened for the very first
        // idle frame to lurch towards. Input is locked out for the whole
        // time a section is focused (see orbitLockedRef), so nothing else
        // writes azimuthRef/polarRef while this runs.
        azimuthRef.current = tourAzimuth;
        polarRef.current = tourPolar;
        azimuthTargetRef.current = tourAzimuth;
        polarTargetRef.current = tourPolar;
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

    // Move the rendered azimuth/polar towards their targets — inertia and
    // smooth flowing rotation, the same shape a drag or a wheel flick has
    // always had. `wrapAngle` re-centres the target within one turn of the
    // current azimuth first, the same reason it always did: azimuthTargetRef
    // is a plain accumulator that can drift many turns from where
    // `azimuthRef` currently sits, and left alone the chase would follow that
    // raw numeric gap instead of the short physical distance.
    const current = azimuthRef.current;
    const target = current + wrapAngle(azimuthTargetRef.current - current);
    azimuthTargetRef.current = target;

    // One fraction of the gap, applied to both angles, which is exactly what
    // the pair of `MathUtils.damp` calls here before did (see
    // `orbitStepFraction`) — with one addition: a camera on its way back from
    // a drag is also held to `ORBIT_RETURN_SPEED`, so how far the drag went no
    // longer decides how fast the planet is taken back off the reader.
    const from = { azimuth: current, polar: polarRef.current };
    const to = { azimuth: target, polar: polarTargetRef.current };
    const damped = orbitStepFraction(from, to, delta);
    let fraction = damped;
    if (returningRef.current) {
      fraction = orbitStepFraction(from, to, delta, ORBIT_RETURN_SPEED);
      // The cap ceasing to bite *is* the arrival: within about
      // ORBIT_RETURN_SPEED/ORBIT_DAMP_LAMBDA radians of the path the damp is
      // the slower of the two, and the last fraction of a degree is better
      // eased than crawled. No threshold of its own to keep in step.
      if (fraction >= damped) returningRef.current = false;
    }
    azimuthRef.current = current + (target - current) * fraction;
    polarRef.current = from.polar + (to.polar - from.polar) * fraction;

    applyUp(controls, ORBIT_UP);
    controls.setLookAt(...orbitPose(azimuthRef.current, polarRef.current, currentOrbitRadius), false);
    controls.setFocalOffset(
      focalOffsetX(currentOrbitRadius, camera.fov, camera.aspect, cardShareOrbit),
      currentOffsetY,
      0,
      false
    );

    // Publish which area is in front. A subscription rather than a setState,
    // because this runs every frame and everything above the canvas is a
    // consumer — see `facingChannel`. `publishFacing` is its own no-op when
    // nothing changed, so this needs no guard of its own.
    publishFacing(facingSectionOnPlanet(directionAt(azimuthRef.current, polarRef.current)));
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

export default function Scene({
  obscured = false,
  interactive = true,
  onEmptyTap,
}: {
  obscured?: boolean;
  /**
   * Called when a handheld reader taps empty sky — the gesture that replaces
   * the pause button there (see `useTapGesture`). Absent on a desktop, which
   * still has the button, and absence is what switches the gesture off.
   *
   * **Must be stable.** It is handed across the `<Canvas>` boundary, and a new
   * identity every render would rebind the listeners — see `facingChannel`
   * for why anything crossing that boundary is treated carefully.
   */
  onEmptyTap?: () => void;
  /**
   * Whether the canvas should accept pointer events right now. `<Canvas>`'s
   * own outermost div sets an inline `pointerEvents` style unconditionally
   * (`'auto'` whenever no `eventSource` is given, which is always, here) —
   * that inline value beats any CSS trying to turn it off from an ancestor,
   * since inheritance only ever loses to an element's own explicit style.
   * The `style` prop below is the one place that inline value can be
   * overridden, because R3F spreads `...style` *after* its own `pointerEvents`
   * key. Hub.tsx's own wrapper div around this component still needs its own
   * matching `pointer-events-none` too — turning off *this* div alone does
   * not make its ancestor transparent, only the reverse.
   */
  interactive?: boolean;
}) {
  const home = orbitAnglesOf(PLANET_TOUR.direction(0));
  // Shared by the two things that read the same pointer press: the sun raises
  // it when it is grabbed, and the free orbit's drag stands down while it is up.
  // A ref rather than state — it flips on `pointerdown` and must not re-render
  // the Canvas (see facingChannel for what that costs).
  const sunDraggingRef = useRef(false);
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
        fov: CAMERA_FOV,
      }}
      dpr={[1, 2]}
      frameloop={obscured ? "demand" : "always"}
      style={interactive ? undefined : { pointerEvents: "none" }}
    >
      {/*
       * No `<color attach="background">` here, and no fog either — space has
       * nothing for light to scatter off between here and the planet, so
       * there is no atmosphere-haze role for either to fill. The canvas is
       * left transparent on purpose (R3F's own `alpha: true` default) so the
       * self-intro crawl, which now sits in its own DOM layer *behind* this
       * canvas (see Hub.tsx), shows through everywhere the scene hasn't
       * painted an opaque pixel — that is what lets the planet and buildings
       * occlude the crawl text per-pixel instead of by z-index. The
       * near-black navy (`#070a14`) that used to be painted here lives on a
       * plain background-colour div beneath both layers in Hub.tsx now, kept
       * in sync there rather than duplicated in two places.
       */}
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

      {/* A low ambient and a dim cool fill from the far side; the sun itself
          is `SunLight` below, which rides with the camera. The fill stays put
          on purpose — it is starlight, and keeping one light fixed leaves a
          cool rim on the night limb, which is part of what says there is a
          universe outside the frame rather than a studio. */}
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#fff7e0", "#2b3654", 0.52]} />
      <Sun draggingRef={sunDraggingRef} />
      <directionalLight position={[-20, 16, -18]} intensity={0.6} color="#dff0ff" />

      <PlanetScene />

      <CameraController sunDraggingRef={sunDraggingRef} onEmptyTap={onEmptyTap} />
      <ScenePause />
      <IdleHeartbeat obscured={obscured} />
    </Canvas>
  );
}
