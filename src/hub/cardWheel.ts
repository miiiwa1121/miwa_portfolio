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

/**
 * How far below its own peak a stream has to fall before it counts as coasting.
 *
 * A pause is not the only way one gesture ends: a momentum tail runs for a
 * second or two, and fingers going back on the trackpad inside that window
 * used to be swallowed whole — the new flick's events sat less than
 * GESTURE_GAP_MS from the tail's, so nothing looked like a fresh gesture and
 * the whole second flick bought nothing. That is what made stepping feel
 * unreliable: whether a scroll did anything came down to whether it happened
 * to land on top of the previous tail.
 *
 * Half, because the two things being told apart are a stream that only ever
 * decays and a stream that is being driven again, and half a peak is far below
 * anything a decaying tail climbs back to.
 */
export const REARM_DECAY_SHARE = 0.5;

/**
 * How much bigger than the event before it an event has to be to count as a
 * hand rather than a tail.
 *
 * Tails shrink smoothly, event to event, and never jump. Requiring a step
 * change means only a deliberate push qualifies. A flick's own rise, which is
 * every bit as steep, cannot trip this: while it is rising the previous event
 * *is* the peak, so REARM_DECAY_SHARE is never satisfied.
 */
export const REARM_RISE = 2.5;

/**
 * What one line and one page of wheel travel are worth in pixels.
 *
 * `deltaMode` says which unit `deltaY` is in, and browsers disagree: Chrome
 * reports one mouse notch as 100 pixels, Firefox reports the same notch as 3
 * lines. Without this, a threshold set in Chrome's units needs twenty-seven
 * notches in Firefox, which is a dead control rather than a stiff one.
 *
 * 33 is what makes those two agree — deliberately not a line's real height,
 * because the figure the threshold is calibrated against is a mouse notch, not
 * a line of text.
 */
const LINE_PX = 33;
const PAGE_PX = 400;

/** One wheel event's travel in pixels, whichever unit it arrived in. */
export function wheelPixels(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) return deltaY * LINE_PX;
  if (deltaMode === 2) return deltaY * PAGE_PX;
  return deltaY;
}

export type WheelState = {
  /** Travel banked since the start of this gesture. */
  accumulated: number;
  /** When the last event arrived, so a pause can be recognised. */
  lastAt: number;
  /** True once this gesture has had its card. Cleared by the next pause. */
  locked: boolean;
  /** Size of the last event, so a stream can be seen to be decaying. */
  last: number;
  /** The biggest event this gesture has reached, which is what it decays from. */
  peak: number;
};

export function initialWheelState(): WheelState {
  return { accumulated: 0, lastAt: -Infinity, locked: false, last: 0, peak: 0 };
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
  const magnitude = Math.abs(deltaY);

  // A pause ends the gesture: it clears the lock, and it discards whatever the
  // last one had banked. Without the second half, a flick that stopped just
  // short of a step would sit there and make the next, unrelated nudge fire
  // immediately.
  const quiet = at - state.lastAt > GESTURE_GAP_MS;

  // So does the stream picking itself back up. A tail only ever gets smaller,
  // so once it has fallen well below the peak it came from, an event that
  // jumps back up is fingers on the trackpad again — a second gesture that
  // deserves its own card even though the first one is still coasting.
  const decayed = state.last < state.peak * REARM_DECAY_SHARE;
  const climbing = decayed && magnitude > state.last * REARM_RISE;

  const fresh = quiet || climbing;
  const locked = fresh ? false : state.locked;
  const accumulated = (fresh ? 0 : state.accumulated) + deltaY;
  const peak = fresh ? magnitude : Math.max(state.peak, magnitude);
  const carried = { lastAt: at, last: magnitude, peak };

  if (locked || Math.abs(accumulated) < WHEEL_THRESHOLD) {
    return { state: { ...carried, accumulated, locked }, step: 0 };
  }

  return {
    state: { ...carried, accumulated: 0, locked: true },
    step: accumulated > 0 ? -1 : 1,
  };
}
