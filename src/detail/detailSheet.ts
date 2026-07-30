/** Which way the detail sheet travels as it leaves. */
export type ExitDirection = "up" | "down";

/**
 * The sheet always rises into place, but it must leave in whichever direction
 * the reader was already scrolling.
 *
 * Leaving through the bottom spacer parks the panel's lower edge right at the
 * top of the viewport, so sending it *down* from there drags the panel — and
 * the wide shadow under its edge — back across the whole screen before it
 * clears. Continuing upward moves it away immediately. The top spacer is the
 * mirror image, hence "follow the scroll" rather than a fixed direction.
 *
 * @param upward   progress toward the top spacer's end, 0..1
 * @param downward progress toward the bottom spacer's end, 0..1
 */
export function exitDirectionFor(upward: number, downward: number): ExitDirection {
  // Scrolling down moved the content up, so the sheet keeps going up.
  return downward >= upward ? "up" : "down";
}

/** Framer Motion variants for the sheet. `exit` reads the direction as custom. */
export const SHEET_VARIANTS = {
  hidden: { y: "100%" },
  visible: { y: 0 },
  exit: (direction: ExitDirection) => ({ y: direction === "up" ? "-100%" : "100%" }),
};
