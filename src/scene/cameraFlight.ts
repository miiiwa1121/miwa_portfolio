/**
 * A camera flight, and the one frame's worth of it that the frame loop applies.
 *
 * Split out of `Scene.tsx` for the reason every other piece of this scene's
 * arithmetic is: it can be run without a renderer, so the thing that actually
 * broke — what the free orbit believes once the flight is over — is a value a
 * test can look at rather than a side effect inside `useFrame`.
 *
 * `setLookAt(..., true)` was what did this before, and its damping is the wrong
 * shape for the flight that matters: it spends most of its travel in its
 * opening moments, which for the trip home from a detail page are the moments
 * the sheet is still covering the canvas. Owning the clock means the duration
 * is a number rather than an emergent property of a spring, the curve can hold
 * still at the start (see `easeInOutCubic`), and a frame that arrives late
 * cannot skip the flight forward (see `MAX_FLIGHT_STEP`).
 */

import { easeInOutCubic, glidePose, type OrbitAngles, type Pose } from "./worldLayout";
import { slerpDirection, type Direction } from "./planet/planetLayout";

/**
 * The largest step one frame may contribute to a flight, in seconds.
 *
 * A backstop for a stall part way through, not a frame-rate policy: the clamp
 * only bites below 10fps, where the flight would stretch in wall-clock time
 * rather than skip. Set at 1/30 first, which quietly turned every flight on a
 * device rendering slower than 30fps into a slow-motion one — measured at
 * headless SwiftShader's ~3fps, a 1.2s flight took twelve seconds.
 *
 * The case this was really reaching for — the render loop sitting at one frame
 * a second behind the detail page (see `IdleHeartbeat`), then handing the first
 * frame of the flight home a delta approaching a full second — is handled where
 * it belongs, by not charging a flight for time that passed before it existed.
 * See `primed`.
 */
export const MAX_FLIGHT_STEP = 1 / 10;

export type Flight = {
  from: Pose;
  to: Pose;
  fromOffsetX: number;
  toOffsetX: number;
  fromOffsetY: number;
  toOffsetY: number;
  /**
   * The roll, carried along with the position.
   *
   * A flight between the free orbit and a section crosses between two different
   * "up"s — the world's +Y and the building's own normal (see `sectionUp`) — and
   * they can be most of a right angle apart. Snapping at either end would spin
   * the frame in a single tick; slerping alongside the eased position turns it
   * over the length of the trip instead.
   */
  fromUp: Direction;
  toUp: Direction;
  elapsed: number;
  duration: number;
  /**
   * False until this flight has seen a frame. `delta` is the gap since the
   * *previous* frame, and a flight begins in an effect — after that frame,
   * before the next — so none of that gap is time the flight has run for.
   * Charging it anyway is harmless at 60fps and ruinous behind the detail page,
   * where the gap is the heartbeat's full second and would spend most of the
   * flight home on the frame it started.
   */
  primed: boolean;
  /**
   * The free orbit's angles at the far end, for the flights that land back on
   * it — and `null` for the ones that do not (a section parks the camera; About
   * drives its own angles every frame).
   *
   * **This is the whole reason a flight is more than a pose.** The rendered
   * azimuth/polar are a separate source of truth from the camera's transform
   * (see `azimuthRef` in Scene.tsx), and a flight writes the transform without
   * ever touching them. Land without handing these back and the next idle frame
   * damps from wherever the camera *was before the flight* — one frame at
   * `1 - exp(-λ/60)` = 8% of the gap, i.e. the other 92% of the trip undone in a
   * single tick, then re-flown over half a second. Measured at up to 36° leaving
   * a section and up to 180° for the logo, entirely depending on where the idle
   * drift happened to be when the section was opened, which is what made it read
   * as an intermittent stutter rather than as a bug.
   */
  land: OrbitAngles | null;
};

export type FlightFrame = {
  /** Where the camera goes this frame. */
  pose: Pose;
  /** Which way is up this frame — hand this to `camera.up` *before* the pose. */
  up: Direction;
  offsetX: number;
  offsetY: number;
  /** True on the frame the flight reaches its destination, and only that one. */
  done: boolean;
  /**
   * The angles the free orbit must take up, on the landing frame of a flight
   * that has them — `null` on every other frame and for every flight without a
   * `land`. Applying this is not optional; see `Flight.land`.
   */
  landed: OrbitAngles | null;
};

/** Set a flight running towards `to`, from wherever the camera is now. */
export function beginFlight(flight: Omit<Flight, "elapsed" | "primed">): Flight {
  return { ...flight, elapsed: 0, primed: false };
}

/**
 * Walk `flight` forward by one frame and report what to apply.
 *
 * Advances the flight in place, the way the frame loop has always run it: the
 * flight is the loop's own mutable clock, not a value it recomputes.
 */
export function advanceFlight(flight: Flight, delta: number): FlightFrame {
  if (flight.primed) flight.elapsed += Math.min(delta, MAX_FLIGHT_STEP);
  else flight.primed = true;

  const progress = Math.min(1, flight.elapsed / flight.duration);
  const eased = easeInOutCubic(progress);
  const done = progress >= 1;

  return {
    pose: glidePose(flight.from, flight.to, eased),
    up: slerpDirection(flight.fromUp, flight.toUp, eased),
    offsetX: flight.fromOffsetX + (flight.toOffsetX - flight.fromOffsetX) * eased,
    offsetY: flight.fromOffsetY + (flight.toOffsetY - flight.fromOffsetY) * eased,
    done,
    landed: done ? flight.land : null,
  };
}
