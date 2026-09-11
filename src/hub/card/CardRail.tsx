"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpLeft } from "lucide-react";
import { CARD_COPY } from "./cardCopy";
import {
  isRailTap,
  RAIL_ORDER,
  railOffsetPx,
  railWindow,
  stepForRailDrag,
  type RailSlot,
} from "./railLayout";
import { useStepGate } from "./useStepGate";
import { MARKER_TRAIL_INK } from "@/scene/markerBolt";
import { useFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";

/**
 * The handheld version of the contextual card: a strip along the bottom of
 * the screen that you slide sideways to fly around the planet.
 *
 * The desktop card is a stack in the middle of the frame, stepped with a
 * wheel or a vertical swipe. Neither half of that survives a phone. The stack
 * sat where the planet is, and at 390px a card is 86% of the width — measured
 * — so "the camera aims past the card" (`CARD_SHARE`) had nothing left to aim
 * into and the framed building stayed behind it. And a vertical swipe is the
 * same gesture that tips the diorama, so the card had to claim it from the
 * scene on a screen where the scene is the whole background.
 *
 * Moving it to the bottom and turning the gesture sideways settles both: the
 * top of the frame is free for the planet (see `HANDHELD_VERTICAL_SHARE` in
 * cameraLayout), and a horizontal drag is a gesture the diorama does not
 * otherwise want at the bottom edge.
 *
 * **Still one-way.** A drag asks `onStep` for a step along the tour; the
 * camera turns; the area it ends up facing comes back down through `facing`
 * and moves the strip. Nothing here writes a position the camera then reads —
 * see docs/scene-invariants.md, "カードとカメラを相互に更新しない". That is
 * also why this is a three-card window animated between discrete positions
 * rather than a native scroll container: a scroller's position *is* state,
 * and having the camera chase it would close exactly that loop.
 */

/**
 * The strip's fixed height, in px — content box, before the rail's padding.
 *
 * Fixed rather than grown from the copy, because all three cards are
 * absolutely positioned (the middle one has to be able to slide out from
 * under the two beside it) and so none of them can give the strip a height.
 * 132 is what the simplified card needs at 390px: the eyebrow, one line of
 * title, and two lines of description clamped.
 */
const CARD_HEIGHT = 132;

type Props = {
  /** The area the camera has been sent to, or null in the free orbit. */
  focusedSection: SectionType;
  isJa: boolean;
  /** The dot the leader line leaves from; measured, never restated. */
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  onOpen: () => void;
  onStep: (step: number) => void;
};

export default function CardRail({
  focusedSection,
  isJa,
  anchorRef,
  onOpen,
  onStep,
}: Props) {
  // Subscribed here, not handed down: `Hub` sits above the `<Canvas>`, and
  // re-rendering it re-renders the whole three.js tree (see `facingChannel`).
  const facing = useFacing();
  const section = focusedSection ?? facing;
  const focused = !!focusedSection;
  const browsable = !focused;

  const { takeStep, lastStep } = useStepGate({ section, browsable, onStep });

  // One card's width in px, measured rather than restated: the card is sized
  // in `vw` with a cap, so the only honest source for "how far along is a
  // neighbour" is the box the browser actually laid out.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setCardWidth(frame.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Where the gesture began. A ref, not state: nothing renders from it, and a
  // setState per pointermove would re-render the strip sixty times a drag.
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const from = dragStart.current;
    dragStart.current = null;
    if (!from) return;

    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;

    if (isRailTap(dx, dy)) {
      onOpen();
      return;
    }
    const step = stepForRailDrag(dx, dy);
    if (step !== 0) takeStep(step);
  };

  // A pointer leaving the element mid-drag ends the gesture rather than
  // leaving `dragStart` armed for a later, unrelated pointerup.
  const onPointerCancel = () => {
    dragStart.current = null;
  };

  const cards = railWindow(section);
  const activeIndex = RAIL_ORDER.indexOf(section);

  return (
    <div
      // `data-ui` is what keeps the scene's own drag handler off this strip —
      // see `isInteractive` in Scene.tsx. `touch-none` stops the browser
      // claiming the horizontal drag as a scroll before these handlers see it.
      data-ui
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className="pointer-events-auto select-none touch-none w-full"
    >
      {/* The frame is exactly one card wide and centred; everything below is
          positioned against it, including the arrow, which hangs off its
          top-right corner — outside the card, in the rail's own stable
          markup. The anchor for the leader line must not live inside a card,
          which AnimatePresence rebuilds on every step (the exiting card's ref
          callback fires with null afterwards and freezes the trail mid-draw).
          See docs/scene-invariants.md, "マーカー・点線・カード". */}
      <div
        ref={frameRef}
        className="relative mx-auto w-[min(78vw,20rem)]"
        style={{ height: CARD_HEIGHT }}
      >
        <AnimatePresence initial={false} custom={lastStep}>
          {cards.map(({ section: key, slot }) => (
            <RailCardFace
              key={key}
              section={key}
              slot={slot}
              isJa={isJa}
              cardWidth={cardWidth}
              lastStep={lastStep}
            />
          ))}
        </AnimatePresence>

        {/* The way in. The card itself carries no button any more — at this
            size a full-width "More" bar was most of the card — so the action
            moves outside its top-right corner, where it points back up at the
            planet the card is describing and doubles as the leader line's
            near end. */}
        <button
          onClick={onOpen}
          aria-label={isJa ? "詳しく見る" : "Open"}
          className="absolute -top-4 -right-3 z-20 w-11 h-11 rounded-full bg-[#ea580c] text-white flex items-center justify-center shadow-lg shadow-black/30 border border-white/15 active:scale-95 transition-transform"
        >
          <ArrowUpLeft size={20} strokeWidth={2.6} />
          {/* The trail's own end point, inside the button so it tracks it
              exactly. Invisible: the trail is the visible part, and the
              button is already a mark in the same spot. */}
          <span
            ref={anchorRef}
            aria-hidden="true"
            style={{ backgroundColor: MARKER_TRAIL_INK, opacity: 0 }}
            className="absolute inset-0 m-auto w-[9px] h-[9px] rounded-full"
          />
        </button>
      </div>

      {/* How many there are and where you are among them. The peeking
          neighbours say "there is one either way"; only this says "five". */}
      <div className="flex justify-center gap-1.5 pt-3.5" aria-hidden="true">
        {RAIL_ORDER.map((key, i) => (
          <span
            key={key}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/35"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One card on the strip.
 *
 * Split out so the slot-driven animation is stated once. The middle card and
 * the two peeking either side differ only in where they sit, how big they are
 * and how faded — a step simply changes which slot each one is in, and
 * framer-motion slides them between the two.
 */
function RailCardFace({
  section,
  slot,
  isJa,
  cardWidth,
  lastStep,
}: {
  section: NonNullable<SectionType>;
  slot: RailSlot;
  isJa: boolean;
  cardWidth: number;
  lastStep: number;
}) {
  const copy = CARD_COPY[section];
  const middle = slot === 0;

  return (
    <motion.div
      custom={lastStep}
      // A card arriving comes from one slot further out than it lands, on the
      // side the step came from — so a drag leftwards brings it in from the
      // right, the direction the thumb was travelling.
      initial={{
        x: railOffsetPx(lastStep > 0 ? 1 : -1, cardWidth) * 2,
        scale: 0.88,
        opacity: 0,
      }}
      animate={{
        x: railOffsetPx(slot, cardWidth),
        scale: middle ? 1 : 0.9,
        opacity: middle ? 1 : 0.45,
      }}
      exit={{
        x: railOffsetPx(lastStep > 0 ? -1 : 1, cardWidth) * 2,
        scale: 0.88,
        opacity: 0,
      }}
      transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.8 }}
      style={{ zIndex: middle ? 10 : 0 }}
      className="absolute inset-0 rounded-3xl bg-white border border-black/10 shadow-xl shadow-black/20 p-4 flex flex-col"
      // Only the middle card is being described; the two beside it are a
      // preview, and a screen reader announcing all three would say the
      // camera is facing three places at once.
      aria-hidden={!middle}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700 shrink-0">
        {copy.sub}
      </span>
      <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1 shrink-0">
        {isJa ? copy.jaTitle : copy.enTitle}
      </h3>
      <p className="text-[13px] leading-snug text-gray-600 mt-1.5 line-clamp-2">
        {isJa ? copy.ja : copy.en}
      </p>
    </motion.div>
  );
}
