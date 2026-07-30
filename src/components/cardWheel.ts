/**
 * Turning a wheel into whole card steps.
 *
 * A wheel is not a discrete control. One flick of a trackpad arrives as dozens
 * of events over a second or more, tapering off into a momentum tail that
 * keeps coming long after the fingers have left; one click of a mouse wheel
 * arrives as a single event of a hundred-odd pixels. The card stack has to
 * answer both with the same thing — one gesture, one card — so the raw deltas
 * are accumulated and then locked out rather than acted on as they come.
 *
 * One card per gesture, rather than a step for every threshold's worth of
 * travel, because a step is not free: it turns the camera to that area, and
 * the camera eases round over the best part of a second. Letting a hard flick
 * spend three or four steps would leave the diorama still swinging through
 * areas nobody asked to see well after the gesture ended — the same runaway
 * the scene's own wheel handler re-arms against.
 *
 * Pure, and given the timestamp rather than reading a clock, so the awkward
 * cases (a tail that outlasts the gesture, a nudge banked from a minute ago)
 * can be tested without waiting for real time to pass.
 */

/** Wheel travel, in deltaY units, that adds up to one card. */
export const WHEEL_THRESHOLD = 80;

/**
 * Quiet for this long and the next event begins a fresh gesture.
 *
 * The same figure as the scene's `WHEEL_REARM_MS`, for the same reason: longer
 * than the gaps inside one momentum tail, shorter than the pause between two
 * deliberate gestures. A tail is therefore read as part of the flick that
 * threw it rather than as the beginning of the next one.
 */
export const GESTURE_GAP_MS = 220;

export type WheelState = {
  /** Travel banked since the start of this gesture. */
  accumulated: number;
  /** When the last event arrived, so a pause can be recognised. */
  lastAt: number;
  /** True once this gesture has had its card. Cleared by the next pause. */
  locked: boolean;
};

export function initialWheelState(): WheelState {
  return { accumulated: 0, lastAt: -Infinity, locked: false };
}

/**
 * Feed one wheel event in; get the state to keep and how far to step.
 *
 * `step` follows the same convention as the card's swipe gesture: negative is
 * the next spot round the island, which is what scrolling *down* asks for —
 * the content moves up and the next card comes into view from below, the way a
 * feed reads.
 */
export function stepForWheel(
  state: WheelState,
  deltaY: number,
  at: number
): { state: WheelState; step: number } {
  // A pause ends the gesture: it clears the lock, and it discards whatever the
  // last one had banked. Without the second half, a flick that stopped just
  // short of a step would sit there and make the next, unrelated nudge fire
  // immediately.
  const resumed = at - state.lastAt > GESTURE_GAP_MS;
  const locked = resumed ? false : state.locked;
  const accumulated = (resumed ? 0 : state.accumulated) + deltaY;

  if (locked || Math.abs(accumulated) < WHEEL_THRESHOLD) {
    return { state: { accumulated, lastAt: at, locked }, step: 0 };
  }

  return {
    state: { accumulated: 0, lastAt: at, locked: true },
    step: accumulated > 0 ? -1 : 1,
  };
}
