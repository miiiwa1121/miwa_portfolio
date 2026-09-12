/**
 * What a two-finger gesture over the diorama is asking for.
 *
 * Pure, and free of three.js and React for the usual reason (see
 * `hub/card/railLayout.ts`, which does the same for the card rail's swipe):
 * this is a rule, the rule has an awkward case, and the awkward case is
 * impossible to poke at through a browser one finger-pair at a time.
 */

/**
 * Which of the two gestures two fingers are performing, or `null` while it is
 * still too early to say.
 *
 * - `spread` — how much the distance between the fingers has changed since
 *   they landed, in px. Positive is apart.
 * - `travel` — how far their midpoint has moved since they landed, in px.
 *
 * **Told apart by which moved more, not by which threshold was crossed
 * first.** A pinch performed with one finger anchored — the common way to do
 * it one-handed — moves the midpoint by half of whatever the separation
 * changes by, so a plain race between the two thresholds hands every such
 * pinch to the scroll: 24px of travel arrives while the separation has only
 * opened 48 of the 60 it needs. Comparing the two distances directly is what
 * keeps that gesture a pinch (48 > 24, so nothing is decided yet) while still
 * catching a two-finger swipe, where the separation barely changes at all.
 *
 * The caller latches the answer for the rest of the gesture: a scroll must not
 * turn into a zoom halfway through a swipe, and the zoom is a single discrete
 * step rather than a dial (see `OrbitZoom`).
 */
export function twoFingerGesture(
  spread: number,
  travel: number,
  pinchThresholdPx: number,
  scrollThresholdPx: number
): "zoom" | "scroll" | null {
  const separation = Math.abs(spread);
  const together = Math.abs(travel);
  if (separation >= pinchThresholdPx && separation >= together) return "zoom";
  if (together >= scrollThresholdPx && together > separation) return "scroll";
  return null;
}
