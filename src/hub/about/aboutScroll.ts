/**
 * Reading the About column to the end is how you leave it.
 *
 * It is the one area with no detail sheet — the text sits straight over the
 * diorama — so it had no way home but the HOME button, which is a control
 * asking to be noticed rather than a way of finishing. Scrolling to the bottom
 * of what there is to read *is* finishing, so that is what returns.
 *
 * The scroll does not merely *trigger* the return, it *is* the return: past
 * the half way mark the same gesture that carries the text away into its
 * Star Wars-style crawl fade carries the camera back to the home framing, and
 * the two land together. See `aboutReturnProgress` below and the About branch
 * of `3d/Scene.tsx`'s frame loop.
 *
 * The arithmetic lives here rather than inline for the same reason the sheet's
 * does: the awkward cases are all about numbers (the entrance settle window, a
 * reader who reaches the end before the return blend has anywhere to land)
 * and they are worth pinning down without a DOM.
 */

/**
 * The scroll progress (see `aboutScrollProgress`) that counts as "done".
 *
 * Exactly 1, not a hair before it — the previous version of this fired at
 * 0.995 to dodge momentum scrolling stopping a pixel or two short of the
 * column's actual scroll ceiling, but that meant the camera (and the "close
 * About" call) went home while a sliver of the last line was still on
 * screen, which is the opposite of what was asked for. Now that progress 1
 * means "the prose block's own bottom edge has scrolled past the top of the
 * box" rather than "the column has reached its scroll ceiling" (see
 * `aboutScrollProgress`), there is real headroom past that point before the
 * ceiling — the trailing spacer in About.tsx is sized to guarantee it — so a
 * browser stopping short of its true maximum has nothing to strand here.
 */
export const ABOUT_RETURN_AT = 1;

/**
 * How long after the column appears before scrolling can send it away.
 *
 * The entrance animation slides the text in, and a wheel already in motion
 * when the area was opened would otherwise arrive during it and bounce
 * straight back home.
 */
export const ABOUT_SETTLE_MS = 500;

/**
 * How far a wheel gesture carries the column, as a share of the travel the
 * browser would have given it.
 *
 * One-fifth speed. The column is not a document being skimmed for a heading —
 * it is a piece of writing that also flies the camera home, and at the
 * browser's own rate one flick of a trackpad crosses most of it, taking the
 * diorama with it. Cutting the travel down makes the same gesture read a
 * paragraph rather than a page, and gives the return the length of a trip
 * instead of a jump cut.
 *
 * The one number to change if it still wants tuning.
 */
export const ABOUT_SCROLL_RATE = 0.2;

/**
 * A wheel notch in lines, in pixels.
 *
 * Firefox reports wheel deltas in lines rather than pixels (and, on a page-up
 * key or an unusual mouse, in pages). Multiplying by 40 is what the browsers
 * themselves land near for a notch, and is the figure the wheel-normalising
 * libraries settled on; the alternative — reading the column's own
 * line-height — would make a notch travel a different distance in Firefox than
 * everywhere else, which is the opposite of what normalising is for.
 */
const WHEEL_LINE_PX = 40;

/**
 * How far the column should move for one wheel event, in pixels.
 *
 * `deltaMode` first, then the rate: a Firefox delta of 3 is three *lines*, and
 * damping it as though it were three pixels would leave the column all but
 * frozen there.
 */
export function wheelScrollStep(
  deltaY: number,
  deltaMode: number,
  viewportHeight: number
): number {
  const pixels =
    deltaMode === 1 ? deltaY * WHEEL_LINE_PX : deltaMode === 2 ? deltaY * viewportHeight : deltaY;
  return pixels * ABOUT_SCROLL_RATE;
}

/**
 * How fast the column advances on its own, once open, in **lines of text per
 * real second**.
 *
 * A real crawl runs with nobody's hand on it — reaching for a wheel to move
 * something styled after one would be a strange first ask of a reader. Slow
 * on purpose: this is the piece of the page meant to be read, not scrolled
 * past, and the wheel (`wheelScrollStep`) is still there for anyone who wants
 * to go faster or back up to re-read a line.
 *
 * **Lines, not pixels** — it was 22px/s, then 14px/s. A pixel rate silently
 * encodes a type size: when the crawl was resized to match
 * `reference/image9.jpg` (roughly 14 characters to a line, a character about
 * a tenth of the frame's height) the column grew from 3,553px to 7,881px for
 * exactly the same words, and 14px/s turned a 115-second read into an
 * eight-minute one without anybody changing the speed. It also meant the
 * crawl ran at four different reading speeds across the four breakpoints the
 * type steps through. A line is the unit a reader actually consumes, so
 * holding *that* rate fixed is what keeps the pace the same everywhere.
 *
 * Half a line a second is a deliberate amble — comfortably slower than
 * reading speed for a 14-character line, so the wheel is an accelerator
 * rather than a necessity.
 */
export const ABOUT_AUTO_SCROLL_LINES_PER_SECOND = 0.5;

/**
 * The most one frame of auto-scroll is allowed to advance the column, in
 * seconds of (already pause-discounted) time.
 *
 * Same reasoning as `MAX_FLIGHT_STEP` in `Scene.tsx`: a backgrounded tab's
 * next `requestAnimationFrame` can arrive with a multi-second gap since the
 * last one, and advancing the column by that much in one step would jump
 * straight over lines — or over `ABOUT_RETURN_AT`; a reader stepping back to
 * the tab could find the column already gone.
 */
const MAX_AUTO_SCROLL_STEP_SECONDS = 0.1;

/**
 * How far the column should auto-advance for one frame's real time step, in
 * pixels.
 *
 * Takes the step already run through `sceneClock.delta()` — zero while
 * paused — so the caller doesn't need its own pause branch; a zero in is a
 * zero out.
 *
 * `lineHeightPx` is the column's own computed line height, read from the DOM
 * by the caller rather than restated here: it is the one number that already
 * tracks every breakpoint's type size, and it is what turns a rate in lines
 * into a rate in pixels. A non-finite or zero value (a browser that has not
 * laid the column out yet, or reports `line-height: normal`) yields no
 * movement rather than a NaN scrollTop that would strand the column.
 */
export function autoScrollStep(deltaSeconds: number, lineHeightPx: number): number {
  if (!Number.isFinite(lineHeightPx) || lineHeightPx <= 0) return 0;
  return (
    Math.min(deltaSeconds, MAX_AUTO_SCROLL_STEP_SECONDS) *
    ABOUT_AUTO_SCROLL_LINES_PER_SECOND *
    lineHeightPx
  );
}

/**
 * How far through the column the reader is, 0 to 1 — measured against the
 * prose block's own bottom edge, not the column's total scroll range.
 *
 * `proseBottom` is `proseRef.offsetTop + proseRef.offsetHeight` (About.tsx):
 * a fixed document-space pixel, the position the last line sits at before any
 * scrolling. Once `scrollTop` reaches it, that line has scrolled past the top
 * of the box — the same document position the browser's own overflow clip
 * removes it at — so progress reaching 1 and the text actually being gone are
 * the same event, not an early proxy for it. This used to be measured against
 * `scrollHeight - clientHeight` (the column's true scroll ceiling), which
 * doesn't distinguish "the text is gone" from "there's a trailing spacer's
 * worth of nothing still left to scroll through" — the column could report
 * 1.0 while a fully legible line was still on screen, or the reverse.
 *
 * Returns 0 when `proseBottom` isn't known yet (a ref not mounted, or a first
 * frame before layout), rather than `scrollTop / 0` reading as "read to the
 * end" and throwing the reader home before they had seen a word of it.
 */
export function aboutScrollProgress(scrollTop: number, proseBottom: number): number {
  if (proseBottom <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / proseBottom));
}

/** Whether this scroll position, at this age, means "take me home". */
export function shouldReturnHome(progress: number, sinceOpenedMs: number): boolean {
  return progress >= ABOUT_RETURN_AT && sinceOpenedMs > ABOUT_SETTLE_MS;
}

/**
 * How long to wait before reconsidering a scroll that arrived too early, or 0
 * when there is nothing to reconsider.
 *
 * The settle window refuses a scroll that lands during the entrance, and at
 * the bottom of the column there is no further scroll event to change its
 * mind with — the reader has already run out of things to scroll. That used to
 * merely leave them at the end of the text; now that the text scrolls clean
 * off the top of the screen it would leave them facing an empty one, with the
 * writing gone and no way back but the logo.
 */
export function settleRetryDelay(progress: number, sinceOpenedMs: number): number {
  if (progress < ABOUT_RETURN_AT) return 0; // not at the end; a scroll will come
  if (sinceOpenedMs > ABOUT_SETTLE_MS) return 0; // it went home already
  return ABOUT_SETTLE_MS - sinceOpenedMs + 1;
}

/**
 * How far down the column the camera starts making its way home.
 *
 * The trip home is not a flight of its own here — the scroll drives it, so
 * that reading the back half of the column *is* the return. Starting it half
 * way rather than at the end means the diorama is already coming back and
 * already growing while there is still text to read, and the last line
 * leaving the screen and the camera arriving are one moment instead of two.
 */
export const ABOUT_RETURN_FROM = 0.5;

/**
 * How far through its trip home the camera should be, for a column scrolled
 * `progress` of the way through.
 *
 * Clamped at both ends rather than trusted: this feeds an interpolation
 * between two framings, where a value outside 0..1 does not read as "past the
 * end" but as a camera thrown somewhere neither framing ever put it.
 */
export function aboutReturnProgress(progress: number): number {
  const span = 1 - ABOUT_RETURN_FROM;
  return Math.max(0, Math.min(1, (progress - ABOUT_RETURN_FROM) / span));
}

/**
 * The trip's progress, handed from the column to the camera.
 *
 * Deliberately not React state: the scene reads it inside `useFrame`, and the
 * column writes it on every scroll event — routing that through a setState
 * would re-render the whole overlay on the same thread that is drawing the
 * diorama, for a number no DOM node displays. Same reasoning as
 * `3d/markerScreen.ts` and `3d/sceneClock.ts`.
 *
 * A single number rather than a subscription because the reader is a frame
 * loop that is running anyway: there is nothing to wake up.
 */
let returnProgress = 0;

export const aboutReturn = {
  /** 0 while there is still reading to do, 1 once the column has gone. */
  progress: () => returnProgress,
  publish(value: number) {
    returnProgress = value;
  },
};
