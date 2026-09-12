import type { SectionType } from "@/types";
import { adjacentOnTour, TOUR_ORDER } from "@/scene/planet/tour";

/**
 * The arithmetic behind the handheld card rail — which cards are on screen,
 * and what a horizontal drag across them meant.
 *
 * Free of React and the DOM for the usual reason: the awkward parts are the
 * wrap-around at the ends of the tour and the point at which a drag stops
 * being a tap, and both are worth pinning down without a browser.
 */

/** Where a card sits on the rail: the one being described, or either side. */
export type RailSlot = -1 | 0 | 1;

export type RailCard = { section: NonNullable<SectionType>; slot: RailSlot };

/**
 * The three cards the rail shows: the area in front, and its two neighbours
 * peeking in from the edges.
 *
 * **Three, not all five.** The tour is a closed loop, so a strip of five in a
 * fixed order has to jump from one end to the other when the camera crosses
 * the seam — and the seam is not a real place, it is an artefact of having
 * laid a loop out as a line. A window that travels with the camera has no
 * seam: stepping off `TOUR_ORDER`'s last entry simply brings its first in
 * from the right, the same as any other step. Two peeking neighbours are
 * also all that fits beside a card at 390px and still leaves the middle one
 * readable.
 *
 * Slot order is the order they are laid out in, left to right, which is the
 * direction `TOUR_ORDER`'s own index runs — so a drag that pulls the strip
 * leftwards advances along the tour, the same way the idle drift does.
 */
export function railWindow(active: NonNullable<SectionType>): RailCard[] {
  return [
    { section: adjacentOnTour(active, -1), slot: -1 },
    { section: active, slot: 0 },
    { section: adjacentOnTour(active, 1), slot: 1 },
  ];
}

/**
 * Movement below this, in px, is a tap rather than a drag — a fingertip's own
 * wobble while pressing. Shared with the vertical card gesture it replaces
 * (`useCardGestures`) so a tap means the same travel wherever it lands.
 */
export const RAIL_TAP_SLOP = 10;

/**
 * Horizontal travel needed before a drag counts as a deliberate step, in px.
 *
 * Lower than the vertical swipe's 44px it replaces. The rail is a strip laid
 * across a 390px screen and the cards either side are visible the whole time,
 * so the gesture has a target the reader can see themselves moving towards;
 * a vertical swipe on the old stacked card was aimed at something hidden
 * behind the front card, and wanted more commitment before it fired.
 */
export const RAIL_SWIPE_THRESHOLD = 36;

/**
 * What a finished drag across the rail asked for: a step along the tour, or
 * nothing.
 *
 * **Dragging left advances** (`+1`). The strip's own order runs the way
 * `TOUR_ORDER`'s index does, so pulling it leftwards brings the card on the
 * right into the middle — and that card is the next one along the tour, the
 * one the idle drift would have reached on its own. A carousel that moved
 * the other way would have the planet turning against the thumb.
 *
 * Vertical dominance is refused rather than ignored: a mostly-vertical drag
 * over the rail is somebody trying to turn the planet, not step the card, and
 * answering it with a step would make the rail feel like it was catching
 * gestures meant for the diorama.
 */
export function stepForRailDrag(dx: number, dy: number): number {
  if (Math.abs(dx) < RAIL_SWIPE_THRESHOLD) return 0;
  if (Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/** Whether a finished pointer gesture was a tap rather than a drag. */
export function isRailTap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) < RAIL_TAP_SLOP;
}

/**
 * How far a neighbour sits from the middle, as a share of one card's width.
 *
 * Under 1, so the neighbours overlap the middle card's edges rather than
 * sitting clear of them: at 390px a card is 78vw ≈ 304px, and two clear
 * neighbours would need 912px of rail. Overlapping puts a readable sliver of
 * each on screen — enough to say "there is one either way" — inside the
 * width there actually is.
 */
export const RAIL_NEIGHBOUR_SHARE = 0.84;

/** Where a card in `slot` sits, in px, given one card's width. */
export function railOffsetPx(slot: RailSlot, cardWidth: number): number {
  return slot * RAIL_NEIGHBOUR_SHARE * cardWidth;
}

/** The five areas, in the order the rail steps through them. */
export const RAIL_ORDER = TOUR_ORDER;
