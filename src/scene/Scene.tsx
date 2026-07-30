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
  frameSizeChanged,
  homePose,
  homeFocalOffsetX,
  wrapAngle,
  glidePose,
  easeInOutCubic,
  HOME_ANGLE,
  ABOUT_TILT,
  ABOUT_DISTANCE,
  ABOUT_TARGET_Y,
  ABOUT_CARD_SHARE,
  type Pose,
} from "./worldLayout";
import { sceneClock } from "./sceneClock";
import { aboutReturn } from "@/hub/about/aboutScroll";
import { useAppState, type SectionType } from "@/state/AppStateContext";

// Rotation sensitivity (kept gentle).
const DRAG_SENSITIVITY = 0.002; // radians per px of pointer drag
const WHEEL_SENSITIVITY = 0.0004; // radians per unit of wheel deltaY
const AUTO_ORBIT_SPEED = 0.032; // radians per second of idle drift

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
  flightRef: React.RefObject<unknown>
) {
  useEffect(() => {
    let down = false;
    let lastX = 0;
    let lastY = 0;
    let pointerType = "mouse";

    // A camera flight owns the camera outright; gestures during one would be
    // fighting it, and would land as a jump the moment it finished.
    const locked = () => orbitLockedRef.current || flightRef.current !== null;

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
  const { activeSection, pageOpen, homeNonce, facing, setFacing, turnRequest, paused } = useAppState();
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);

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

  // About keeps orbiting slowly even though it isn't the free home view — it
  // has no card to hold the camera clear of, so unlike every other focused
  // section there's no reason to park it. Distance and sideways offset are
  // captured once, when the flight there lands, and reused every frame: they
  // only depend on the building's bounds and the viewport, recomputing them
  // per frame would just repeat the same trig for no different an answer.
  const aboutOrbitRef = useRef<{
    target: [number, number, number];
    distance: number;
    sideways: number;
    azimuth: number;
  } | null>(null);

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
   *
   * It also retires the tokens this used to need. CameraControls'
   * `_createOnRestPromise` has no per-call identity — it resolves on the next
   * `rest` event whatever caused it — so a stale `.then` from a superseded
   * flight could declare a newer one finished, leaving useFrame writing the
   * camera on top of it. A superseded flight here is simply overwritten.
   */
  const glideRef = useRef<{
    from: Pose;
    to: Pose;
    /** The sideways push travels with the flight, on the same curve. */
    fromOffsetX: number;
    toOffsetX: number;
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
  const startGlide = (to: Pose, duration: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    // `false` for where the camera *is*, not where it was last told to go.
    // The two are the same here (every write below is untransitioned, so
    // CameraControls' current and end states never diverge), but a flight has
    // to start from the live camera by definition, and the default is the
    // other one.
    const position = controls.getPosition(scratchPosition, false);
    const target = controls.getTarget(scratchTarget, false);
    glideRef.current = {
      from: [position.x, position.y, position.z, target.x, target.y, target.z],
      to,
      fromOffsetX: controls.getFocalOffset(scratchOffset, false).x,
      toOffsetX: focalOffsetX(),
      elapsed: 0,
      duration,
      primed: false,
    };
  };

  // Orbiting only makes sense in the free home view — lock out drag/wheel input
  // whenever a section is focused (card or full page) so stray gestures can't
  // silently accumulate into azimuthTargetRef and cause a spin once we get home.
  const orbitLockedRef = useRef(pageOpen || !!activeSection);
  useEffect(() => {
    orbitLockedRef.current = pageOpen || !!activeSection;
  }, [pageOpen, activeSection]);

  useViewInput(azimuthTargetRef, draggingRef, orbitLockedRef, glideRef);

  /**
   * The sideways push that keeps the island clear of the card on the left.
   *
   * Set alongside the destination rather than anywhere else, because it *is*
   * part of the destination — it decides where in the frame the thing being
   * looked at ends up. Sections take none of it: they aim to the side through
   * `framePose`'s own `sideways` yaw, and stacking the two would push them
   * twice as far. See `homeFocalOffsetX` for why the home view can't use that
   * same yaw.
   */
  const focalOffsetX = () =>
    activeSection ? 0 : homeFocalOffsetX(camera.fov, camera.aspect);

  const snapFocalOffset = () => {
    controlsRef.current?.setFocalOffset(focalOffsetX(), 0, 0, false);
  };

  // The push is a fraction of the frame's *width*, so a resize changes it. Snap
  // rather than ease: a window being dragged is already moving, and easing
  // would trail the offset behind the frame it is measured against. Mid-flight
  // the flight owns the offset, so the new figure is handed to it as a
  // destination instead — snapping there would be undone on the next frame.
  //
  // Guarded on the frame's *dimensions*, via `frameSizeChanged`, so this only
  // ever acts on a real resize. It used to compare `size` by identity, and
  // `useThree` hands back a fresh object on re-renders that are not resizes at
  // all — so this ran on every re-render, including the one that focuses an
  // area or leaves it. Since it runs *before* the destination effect below, it
  // snapped the offset to that destination before the flight could read it as
  // its starting value, and the flight then travelled from the destination to
  // the destination: the sideways push arrived in a single frame as a 141px
  // jump instead of easing in over the trip. `activeSection` is in the deps to
  // keep the closure above current, not as a reason to run.
  const lastSizeRef = useRef({ width: size.width, height: size.height });
  useEffect(() => {
    if (!frameSizeChanged(lastSizeRef.current, size)) return;
    lastSizeRef.current = { width: size.width, height: size.height };
    const glide = glideRef.current;
    if (glide) glide.toOffsetX = focalOffsetX();
    else snapFocalOffset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, activeSection, camera]);

  // Pausing means "stop now", not "coast to a halt". The damp below is still
  // carrying the camera towards a target the idle drift left a fraction of a
  // second ahead of it, so without this the diorama would glide on for another
  // moment after the button was pressed. Dropping the remaining travel is
  // enough — the target stops growing on the same frame the clock freezes.
  // Never during a flight: the target is that flight's destination there, and
  // clobbering it would drag the camera back off the building on landing.
  useEffect(() => {
    if (!paused || inFlight()) return;
    const controls = controlsRef.current;
    if (controls) azimuthTargetRef.current = controls.azimuthAngle;
  }, [paused]);

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

    // Whether the detail page was covering the canvas when this flight was
    // asked for, which is what decides how long it gets. Read before the ref
    // below is brought up to date, and kept in a ref rather than a dep because
    // this effect must not re-run merely because the page opened or closed.
    const wasCovered = prevPageOpenRef.current;

    const flyTo = (pose: Pose, azimuth: number) => {
      azimuthTargetRef.current = azimuth;
      startGlide(pose, wasCovered ? RETURN_SECONDS : FLIGHT_SECONDS);
    };

    // 1. A section was focused: frame its building from the area's own angle,
    //    backing off by however much that particular building needs. Reading
    //    the real bounds means a 12-unit tower and a 4-unit library are each
    //    framed properly, instead of sharing one hardcoded distance.
    if (activeSection && sectionTargets[activeSection]) {
      const building = scene.getObjectByName(activeSection);
      if (building) {
        // About has no card to clear and no single building to crop in on —
        // it pivots on the island's own centre, same as the free/home view,
        // just backed off further and tilted down more steeply. Every other
        // section still frames its own building's real bounds, so a 12-unit
        // tower and a 4-unit library are each framed properly instead of
        // sharing one hardcoded distance.
        const isAbout = activeSection === "about";
        let target: [number, number, number];
        let distance: number;
        if (isAbout) {
          target = [0, ABOUT_TARGET_Y, 0];
          distance = ABOUT_DISTANCE;
        } else {
          const sphere = new THREE.Box3()
            .setFromObject(building)
            .getBoundingSphere(new THREE.Sphere());
          target = [sphere.center.x, sphere.center.y, sphere.center.z];
          distance = frameDistance(sphere.radius * FRAME_MARGIN, camera.fov, camera.aspect);
        }
        const sideways = aimOffset(distance, camera.fov, camera.aspect, isAbout ? ABOUT_CARD_SHARE : undefined);
        const azimuth = sectionAzimuth(activeSection);
        const pose = framePose(target, azimuth, distance, isAbout ? ABOUT_TILT : undefined, sideways);
        // Cached for the idle orbit in useFrame to keep turning from, once
        // this flight lands — same target/distance/sideways, just a moving
        // azimuth instead of this one fixed value.
        aboutOrbitRef.current = isAbout ? { target, distance, sideways, azimuth } : null;
        // `pose` carries its own sideways aim, so the focal offset goes to zero
        // — the glide walks it there rather than snapping it away underneath a
        // flight that is still crossing the frame.
        startGlide(pose, wasCovered ? RETURN_SECONDS : FLIGHT_SECONDS);
      }
      return;
    }

    // 2. A deliberate reset (logo / HOME) with no area to leave — the camera
    //    was already free, idle-orbiting or dragged off to wherever, so there
    //    is nothing to pull back *from* and this is the one fixed default view
    //    every time. If an area *was* focused, this falls through to 4 instead:
    //    pulling back facing that area is the same trip scrolling off the
    //    detail page makes, and re-aiming at HOME_ANGLE on top of it used to
    //    spend the flight sweeping the whole distance between the two angles —
    //    at 45° and the reset button doubling as "spin most of the way round
    //    the island" for every area that didn't happen to sit near there.
    if (wasReset && !(cameFrom && sectionTargets[cameFrom])) {
      flyTo(homePose(HOME_ANGLE), HOME_ANGLE);
      return;
    }

    // 3. About, read to the end. There is no flight to start: the column's own
    //    scroll flew this one, frame by frame, and the camera is already
    //    sitting in the home framing at whatever angle the orbit had drifted
    //    to (see the About branch of useFrame). Anything launched here would
    //    be a second trip on top of an arrival that has already happened —
    //    most visibly a turn back to About's own azimuth, undoing the reading.
    //    The idle drift picks the angle up from where it stands, and the card
    //    is told which area that leaves in front, since the free orbit below
    //    only publishes on a change and this is not one.
    if (cameFrom === "about" && aboutReturn.progress() >= 1) {
      aboutOrbitRef.current = null;
      azimuthTargetRef.current = controls.azimuthAngle;
      const landedOn = facingSection(controls.azimuthAngle);
      facingRef.current = landedOn;
      setFacing(landedOn);
      return;
    }

    // 4. Left an area — by scrolling off the detail page, or by the logo /
    //    HOME while one was focused (2 falls through to here for that case).
    //    Either way: back out to the overview distance, but turned so the area
    //    just read about is the thing facing the camera, not spun round to a
    //    fixed angle that has nothing to do with where the camera already was.
    if (cameFrom && sectionTargets[cameFrom]) {
      const azimuth = sectionAzimuth(cameFrom);
      flyTo(homePose(azimuth), azimuth);
      return;
    }

    // 5. First mount. The Canvas only gets to set a camera *position*, never
    //    a target, so without this the orbit would run at whatever radius the
    //    initial position happened to imply while still aiming at the origin —
    //    which tilted the view down far enough to cut the top off the tallest
    //    tower. Snap (no transition) so the first frame is already correct.
    azimuthTargetRef.current = HOME_ANGLE;
    snapFocalOffset();
    controls.setLookAt(...homePose(HOME_ANGLE), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, homeNonce, scene, camera]);

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
        0,
        0,
        false
      );
      if (progress >= 1) glideRef.current = null;
      return;
    }

    // The camera is only ever driven here in the free home view — and in
    // About, which keeps slowly turning since it has no card to hold still
    // for. Every other focused section stays exactly where its flight parked
    // it, so nothing writes to the camera between flights there — one owner
    // at a time.
    //
    // This used to also run a scroll-linked lerp from the building framing
    // back to the home framing, every frame, for the entire time the detail
    // page was open. That was invisible (the page covers the canvas) and it
    // was the last camera bug: the branch was chosen from `activeSection`,
    // React state, while its input came from a ref written synchronously on
    // scroll. goHome() changed the ref first and the state a render later, so
    // a frame in between ran the lerp at progress 0 and snapped the camera
    // back onto the building before the flight home even started.
    if (activeSection) {
      const orbit = aboutOrbitRef.current;
      if (activeSection === "about" && orbit && !inFlight()) {
        // A plain accumulator, not damped: nothing else ever writes this
        // azimuth (input is locked out while a section is focused), so there
        // is no jump here to smooth away, unlike the idle drift below.
        orbit.azimuth += sceneClock.delta(delta) * AUTO_ORBIT_SPEED;
        const pose = framePose(orbit.target, orbit.azimuth, orbit.distance, ABOUT_TILT, orbit.sideways);

        // Reading the column home. Past its half way mark the framing walks
        // from About's distant, steeply tilted one to the free view's, so the
        // island closes in as the text goes up and the last line leaving the
        // screen is the same instant as the arrival — rather than the reading
        // finishing and an animation then playing.
        //
        // Scroll-linked, not a flight: the reader owns the clock, which is
        // what lets them scroll back up and have the camera go back out with
        // them. Both ends are rebuilt from the live azimuth every frame rather
        // than captured when the trip began, so the orbit keeps turning right
        // through the approach instead of freezing the moment they cross the
        // half way mark. (An earlier scroll-linked lerp here was the last
        // camera bug on this page: it chose its branch from React state while
        // reading a ref written on scroll, and a frame in between snapped the
        // camera back. This one cannot — the trip only ever runs while About
        // is the focused section, and finishing it is the one thing that
        // unfocuses About.)
        const t = easeInOutCubic(aboutReturn.progress());
        controls.setLookAt(
          ...(t > 0 ? glidePose(pose, homePose(orbit.azimuth), t) : pose),
          false
        );
        // The home view's sideways push is a focal offset rather than part of
        // the pose (see homeFocalOffsetX), so it has to travel on the same
        // curve to arrive with it. Written every frame, including at t = 0
        // where it is About's own zero: scrolling back up has to take the push
        // away again, and a branch that only ever set it would leave the last
        // value it reached standing.
        controls.setFocalOffset(homeFocalOffsetX(camera.fov, camera.aspect) * t, 0, 0, false);

        // Where the idle drift picks up once the column is gone. Without this
        // it would resume from whatever target was left over from before
        // About was opened, and turn the camera to it the moment it landed.
        azimuthTargetRef.current = orbit.azimuth;
      }
      return;
    }

    if (!draggingRef.current && !inFlight()) {
      // Idle drift, and the diorama's clock is what decides whether "idle"
      // still means "moving" — paused, the step is zero and the target stops
      // growing, while dragging still works because the damp below is fed the
      // real delta.
      azimuthTargetRef.current += sceneClock.delta(delta) * AUTO_ORBIT_SPEED;
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

    // Publish which area is in front. Only on a change — this runs every frame,
    // and a setState per frame would re-render the whole overlay at 60Hz on the
    // thread drawing the diorama.
    //
    // Deliberately ungated. This used to hold the choice still whenever the
    // camera was turning faster than 1 rad/s, on the grounds that the trail's
    // far end jumps to the new marker while that marker's own highlight is
    // still easing in, so a quick flick left the line ending on a small pale
    // dot. That was since fixed at the source — the spotlight dot no longer
    // eases (see AreaMarkers) — and all the gate did afterwards was strand the
    // card, the highlight and the trail on an area that had already turned off
    // the screen, for as long as the scroll kept going. A boundary is crossed
    // at most five times a revolution, which is leafing through the areas
    // rather than strobing, and the card is keyed on `activeSection` so a new
    // area swaps its text without remounting or replaying the fade.
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
      // Taken from homePose rather than written out, so the very first frame —
      // the one before CameraController's effect gets to place the camera — is
      // already on the orbit circle. As two hand-typed 18.4s it silently meant
      // "radius 26 at 45°", and stayed meaning that when the radius changed.
      camera={{ position: homePose(HOME_ANGLE).slice(0, 3) as [number, number, number], fov: 45 }}
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
        // Halved from 2048. The shadows here are large soft shapes cast by
        // blocky geometry, where the extra resolution bought detail nobody
        // could see for four times the shadow-pass cost.
        shadow-mapSize={[1024, 1024]}
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
      <ScenePause />
      <IdleHeartbeat obscured={obscured} />
    </Canvas>
  );
}
