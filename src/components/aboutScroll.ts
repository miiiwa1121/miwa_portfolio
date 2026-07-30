/**
 * Reading the About column to the end is how you leave it.
 *
 * It is the one area with no detail sheet — the text sits straight over the
 * diorama — so it had no way home but the HOME button, which is a control
 * asking to be noticed rather than a way of finishing. Scrolling to the bottom
 * of what there is to read *is* finishing, so that is what returns.
 *
 * The arithmetic lives here rather than inline for the same reason the sheet's
 * does: the awkward cases are all about numbers (a column too short to scroll,
 * a browser that overshoots) and they are worth pinning down without a DOM.
 */

/**
 * Fire slightly before the very end. Momentum scrolling routinely stops a
 * pixel or two short, and with no further scroll events that would strand the
 * reader at the bottom of the text with nothing left to do.
 */
export const ABOUT_RETURN_AT = 0.995;

/**
 * How long after the column appears before scrolling can send it away.
 *
 * The entrance animation slides the text in, and a wheel already in motion
 * when the area was opened would otherwise arrive during it and bounce
 * straight back home.
 */
export const ABOUT_SETTLE_MS = 500;

/**
 * How far through the column the reader is, 0 to 1.
 *
 * Returns 0 when there is nothing to scroll, which is the case that matters:
 * on a tall enough viewport the text fits outright, and `scrollTop / 0` would
 * otherwise read as "read to the end" on the first frame and throw the reader
 * home before they had seen a word of it.
 */
export function aboutScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / scrollable));
}

/** Whether this scroll position, at this age, means "take me home". */
export function shouldReturnHome(progress: number, sinceOpenedMs: number): boolean {
  return progress >= ABOUT_RETURN_AT && sinceOpenedMs > ABOUT_SETTLE_MS;
}
