"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useCardGestures } from "./useCardGestures";
import { useStepGate } from "./useStepGate";
import { initialWheelState, stepForWheel, wheelPixels } from "./cardWheel";
import { MARKER_TRAIL_INK } from "@/scene/markerBolt";
import { useFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";
import { CARD_COPY } from "./cardCopy";

/**
 * The contextual card over the diorama, drawn as a stack.
 *
 * The card describes whichever area is in front, so there is always a next one
 * behind it — the stack is what says so, and what makes stepping through them
 * an obvious thing to try. The two layers behind carry no text: only a
 * fingernail's width of each is ever visible, and giving them real content
 * would tie their height to copy nobody can read.
 *
 * Which area it shows is not decided here. It reads `section` and asks for a
 * step; the camera turns, and the area it ends up facing comes back down as a
 * new `section`. Card and camera never write to each other — see
 * `facingSection` in cameraLayout for why that direction matters.
 */

/** How far each layer behind sits below the front card, in px. */
const PEEK_OFFSETS = [11, 21];

/**
 * 3D Deck Card Shuffle:
 * Cards transition like a deck of playing cards being dealt or shuffled.
 * The exiting card peels off with a subtle tilt and rotation, while the
 * incoming card rises from the stack with smooth spring physics.
 */
const CARD_VARIANTS: Variants = {
  enter: (step: number) => ({
    opacity: 0,
    y: step < 0 ? 52 : -52,
    x: step < 0 ? -24 : 24,
    rotateZ: step < 0 ? -4.5 : 4.5,
    rotateX: step < 0 ? -8 : 8,
    scale: 0.93,
    filter: "blur(2px)",
  }),
  center: {
    opacity: 1,
    y: 0,
    x: 0,
    rotateZ: 0,
    rotateX: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 26,
      mass: 0.85,
    },
  },
  exit: (step: number) => ({
    opacity: 0,
    y: step < 0 ? -64 : 64,
    x: step < 0 ? 36 : -36,
    rotateZ: step < 0 ? 6.5 : -6.5,
    rotateX: step < 0 ? 10 : -10,
    scale: 0.91,
    filter: "blur(3px)",
    transition: {
      duration: 0.28,
      ease: [0.32, 0, 0.67, 0],
    },
  }),
};

type Props = {
  /**
   * The area the camera has been sent to, or null in the free orbit — where the
   * card follows whatever is in front instead.
   */
  focusedSection: SectionType;
  isJa: boolean;
  /** The dot the leader line leaves from; measured, never restated. */
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  onOpen: () => void;
  /** -1 is the next spot round the island, matching the swipe convention. */
  onStep: (step: number) => void;
};

export default function SectionCard({
  focusedSection,
  isJa,
  anchorRef,
  onOpen,
  onStep,
}: Props) {
  // Subscribed here rather than handed down from `Hub`. The area in front
  // changes several times a lap, and `Hub` sits above the `<Canvas>` — a
  // re-render there re-renders the entire three.js tree (see `facingChannel`).
  // This is the one place the answer is displayed, so this is the one place
  // that has any reason to re-render for it.
  const facing = useFacing();
  const section = focusedSection ?? facing;
  /** True once an area is focused, which retires the trail and its anchor. */
  const focused = !!focusedSection;
  const card = CARD_COPY[section];

  // Stepping is browsing, and browsing is over once an area is focused: the
  // camera is parked on that building and the orbit is locked out, so a step
  // would swap the card for one describing somewhere the view is not. The
  // stack loses its layers in the same breath, so it stops offering.
  const browsable = !focused;

  // The wait-for-arrival gate, shared with the handheld rail.
  const { takeStep, lastStep } = useStepGate({ section, browsable, onStep });

  const gestures = useCardGestures({ onTap: onOpen, onSwipe: takeStep });

  // The wheel is bound by hand rather than through React's `onWheel`, which is
  // registered passively at the root: preventDefault there is ignored, and the
  // page would rubber-band behind the card. Stopping propagation is the other
  // half — the scene listens for wheels on `window` to orbit the diorama, and
  // without this the same gesture would both step the card and spin the town.
  const stackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = stackRef.current;
    if (!element) return;

    let wheel = initialWheelState();
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // `deltaY` is in whatever unit `deltaMode` names, and the threshold is
      // in pixels. A gesture the gate turns away is still spent, on purpose:
      // keeping its travel banked would mean the moment the gate opened, a
      // momentum tail nobody is driving any more would buy the next card.
      const travel = wheelPixels(event.deltaY, event.deltaMode);
      const result = stepForWheel(wheel, travel, event.timeStamp);
      wheel = result.state;
      if (result.step !== 0) takeStep(result.step);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [takeStep]);

  return (
    <div
      ref={stackRef}
      {...gestures}
      className="relative w-full max-w-xs sm:max-w-sm cursor-pointer select-none touch-none pointer-events-auto [perspective:1000px]"
    >
      {/* The rest of the stack. Positioned, so they paint under the card,
          which takes a stacking context of its own below. */}
      {browsable && PEEK_OFFSETS.map((offset, i) => (
        <div
          key={offset}
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl border border-black/5 shadow-md pointer-events-none transition-transform duration-300"
          style={{
            transform: `translateY(${offset}px) scale(${1 - (i + 1) * 0.04}) rotate(${i === 0 ? -1.2 : 1.5}deg)`,
            background: i === 0 ? "#fcfbf7" : "#f5f4ee",
          }}
        />
      ))}

      {/* Where the trail leaves the card, and the trail's near end. */}
      {!focused && (
        <span
          ref={anchorRef}
          aria-hidden="true"
          style={{
            opacity: 0,
            transition: "opacity 240ms ease",
            backgroundColor: MARKER_TRAIL_INK,
          }}
          className="absolute top-5 right-5 z-20 w-[9px] h-[9px] rounded-full"
        />
      )}

      <AnimatePresence mode="popLayout" initial={false} custom={lastStep}>
        <motion.div
          key={section}
          custom={lastStep}
          variants={CARD_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          whileHover={{ y: -5, rotateZ: 0.8, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative z-10 bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-xl shadow-black/5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-orange-700 bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 rounded-full">
              {card.sub}
            </span>
          </div>

          <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            {isJa ? card.jaTitle : card.enTitle}
          </h3>

          <p className="text-gray-600 text-sm leading-relaxed mb-6 font-normal">
            {isJa ? card.ja : card.en}
          </p>

          <button
            onClick={onOpen}
            className="group/btn inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-2.5 px-6 rounded-full shadow-[0_4px_0_#9a3412] hover:shadow-[0_2px_0_#9a3412] hover:translate-y-[2px] active:shadow-none active:translate-y-1 transition-all text-sm"
          >
            <span>{isJa ? "詳しく見る" : "More"}</span>
            <ChevronRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
