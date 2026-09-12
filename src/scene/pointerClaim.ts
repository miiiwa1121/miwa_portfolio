/**
 * Which pointer, if any, an object in the scene has taken for itself.
 *
 * A tap on empty sky pauses the diorama (see `useTapGesture` in Scene.tsx),
 * and "empty" has to exclude the things in the scene that answer a tap of
 * their own — the area markers and the sun. Neither of those is a DOM
 * element, so `isInteractive`, which walks up from `event.target`, cannot see
 * them: to the DOM every one of these gestures lands on the same canvas.
 *
 * A module-level value rather than a ref threaded down through `PlanetScene`,
 * for the reason the other three channels here exist (`sceneClock`,
 * `camera/markerScreen`, `state/facingChannel`): anything carried through
 * React from above the `<Canvas>` re-renders the whole three.js tree, and
 * this is read inside a pointer handler that is running anyway. See
 * docs/scene-invariants.md, "React / R3F の境界".
 *
 * **The ordering this relies on is the DOM's, and it is not incidental.**
 * R3F listens on the canvas's container; `useViewInput` listens on `window`.
 * A pointer event reaches the container first and window last, so an object's
 * `onPointerDown` has always run by the time the window handler asks whether
 * the gesture was claimed. `Sun` already depends on exactly this to stop a
 * drag of the sun from also spinning the planet.
 */

let claimed: number | null = null;

export const pointerClaim = {
  /** Called by an object in the scene that is answering this gesture itself. */
  claim(pointerId: number): void {
    claimed = pointerId;
  },
  /** Whether this pointer was spoken for before it reached the window. */
  isClaimed(pointerId: number): boolean {
    return claimed === pointerId;
  },
  /**
   * Forgotten once the gesture is over. Keyed by id rather than cleared
   * blindly: a second finger lifting must not release the first finger's
   * claim, which is still being tracked.
   */
  release(pointerId: number): void {
    if (claimed === pointerId) claimed = null;
  },
};
