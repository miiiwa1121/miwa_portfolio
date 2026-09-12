"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import { CARD_COPY } from "./cardCopy";
import HomeButton from "../HomeButton";
import {
  isRailTap,
  RAIL_NEIGHBOUR_SHARE,
  RAIL_ORDER,
  railOffsetPx,
  railWindow,
  stepForRailDrag,
  type RailSlot,
} from "./railLayout";
import { useStepGate } from "./useStepGate";
import { MARKER_TRAIL_INK } from "@/scene/markerBolt";
import { useFacing } from "@/state/facingChannel";
import { adjacentOnTour } from "@/scene/planet/tour";
import type { SectionType } from "@/types";

/**
 * The handheld version of the contextual card: a strip along the bottom of
 * the screen that you slide sideways to fly around the planet.
 */

/**
 * The strip's fixed height, in px — content box, before the rail's padding.
 */
const CARD_HEIGHT = 132;

/**
 * The spring the rail settles with — both a card sliding into its resting
 * slot and a drag easing back to 0 use this same one, so a release never
 * hands off from one feel to a different one mid-motion.
 */
const RAIL_SPRING = { type: "spring", stiffness: 340, damping: 30, mass: 0.8 } as const;

type Props = {
  /** The area the camera has been sent to, or null in the free orbit. */
  focusedSection: SectionType;
  isJa: boolean;
  /** The dot the leader line leaves from; measured, never restated. */
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  onOpen: () => void;
  onStep: (step: number) => void;
  /** Full reset — what the desktop HOME button does. */
  onHome: () => void;
};

/** Returns the set of cards to render given the active section and swipe slide step. */
function railCardsForStep(
  active: NonNullable<SectionType>,
  slideStep: number
): { section: NonNullable<SectionType>; slot: RailSlot }[] {
  if (slideStep > 0) {
    return [
      { section: adjacentOnTour(active, -1), slot: -1 },
      { section: active, slot: 0 },
      { section: adjacentOnTour(active, 1), slot: 1 },
      { section: adjacentOnTour(active, 2), slot: 2 },
    ];
  }
  if (slideStep < 0) {
    return [
      { section: adjacentOnTour(active, -2), slot: -2 },
      { section: adjacentOnTour(active, -1), slot: -1 },
      { section: active, slot: 0 },
      { section: adjacentOnTour(active, 1), slot: 1 },
    ];
  }
  return railWindow(active);
}

export default function CardRail({
  focusedSection,
  isJa,
  anchorRef,
  onOpen,
  onStep,
  onHome,
}: Props) {
  const facing = useFacing();
  const section = focusedSection ?? facing;
  const focused = !!focusedSection;
  const browsable = !focused;

  const { takeStep } = useStepGate({ section, browsable, onStep });

  // The active section currently displayed in slot 0 on the rail.
  const [activeSection, setActiveSection] = useState(section);
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;

  // True while a release or external step animation is in flight.
  const isAnimating = useRef(false);

  // Direction of the active slide (+1: advancing/left, -1: back/right, 0: at rest).
  const [slideStep, setSlideStep] = useState(0);

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

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragX = useMotionValue(0);

  // Sync external section changes (e.g. idle planet orbit or HOME button).
  useEffect(() => {
    if (isAnimating.current) return;
    if (section === activeSectionRef.current) return;

    if (focused || cardWidth === 0) {
      setActiveSection(section);
      dragX.set(0);
      setSlideStep(0);
      return;
    }

    const forwardNext = adjacentOnTour(activeSectionRef.current, 1);
    const step = forwardNext === section ? 1 : -1;
    const targetOffset = -step * cardWidth * RAIL_NEIGHBOUR_SHARE;

    isAnimating.current = true;
    setSlideStep(step);

    animate(dragX, targetOffset, {
      ...RAIL_SPRING,
      onComplete: () => {
        setActiveSection(section);
        dragX.set(0);
        setSlideStep(0);
        isAnimating.current = false;
      },
    });
  }, [section, focused, cardWidth, dragX]);

  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement | null)?.closest?.("button, a")) return;
    if (isAnimating.current) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    dragX.set(0);
    setSlideStep(0);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const from = dragStart.current;
    if (!from || isAnimating.current) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (Math.abs(dx) <= Math.abs(dy)) {
      dragX.set(0);
      setSlideStep(0);
      return;
    }
    const maxDrag = cardWidth * RAIL_NEIGHBOUR_SHARE;
    const clampedDx = Math.max(-maxDrag, Math.min(maxDrag, dx));
    dragX.set(clampedDx);
    setSlideStep(clampedDx < 0 ? 1 : clampedDx > 0 ? -1 : 0);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const from = dragStart.current;
    dragStart.current = null;
    if (!from || isAnimating.current) return;

    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;

    if (isRailTap(dx, dy)) {
      animate(dragX, 0, RAIL_SPRING);
      setSlideStep(0);
      onOpen();
      return;
    }

    const step = stepForRailDrag(dx, dy);
    if (step === 0 || !browsable || cardWidth === 0) {
      setSlideStep(0);
      animate(dragX, 0, RAIL_SPRING);
      return;
    }

    const targetOffset = -step * cardWidth * RAIL_NEIGHBOUR_SHARE;
    const nextSection = adjacentOnTour(activeSectionRef.current, step);

    isAnimating.current = true;
    setSlideStep(step);
    takeStep(step);

    animate(dragX, targetOffset, {
      ...RAIL_SPRING,
      onComplete: () => {
        setActiveSection(nextSection);
        dragX.set(0);
        setSlideStep(0);
        isAnimating.current = false;
      },
    });
  };

  const onPointerCancel = () => {
    if (dragStart.current && !isAnimating.current) {
      dragStart.current = null;
      animate(dragX, 0, RAIL_SPRING);
      setSlideStep(0);
    }
  };

  const cards = railCardsForStep(activeSection, slideStep);
  const activeIndex = RAIL_ORDER.indexOf(activeSection);

  return (
    <div
      data-ui
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className="pointer-events-auto select-none touch-none w-full"
    >
      <div
        ref={frameRef}
        className="relative mx-auto w-[min(78vw,20rem)]"
        style={{ height: CARD_HEIGHT }}
      >
        <motion.div style={{ x: dragX }} className="absolute inset-0">
          {cards.map(({ section: key, slot }) => (
            <RailCardFace
              key={key}
              section={key}
              slot={slot}
              isJa={isJa}
              cardWidth={cardWidth}
            />
          ))}
        </motion.div>

        <span
          ref={anchorRef}
          aria-hidden="true"
          style={{ backgroundColor: MARKER_TRAIL_INK, opacity: 0 }}
          className="absolute -top-1 right-3 w-[9px] h-[9px] rounded-full"
        />

        {focused && (
          <HomeButton onClick={onHome} className="absolute -top-16 left-1/2 -translate-x-1/2" />
        )}
      </div>

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
 * One card on the strip, positioned at its slot offset.
 */
function RailCardFace({
  section,
  slot,
  isJa,
  cardWidth,
}: {
  section: NonNullable<SectionType>;
  slot: RailSlot;
  isJa: boolean;
  cardWidth: number;
}) {
  const copy = CARD_COPY[section];
  const middle = slot === 0;

  return (
    <div
      style={{
        transform: `translateX(${railOffsetPx(slot, cardWidth)}px)`,
        zIndex: middle ? 10 : 0,
      }}
      className="absolute inset-0 rounded-xl bg-white border border-black/10 shadow-md shadow-black/10 p-4 flex flex-col pointer-events-none select-none"
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
    </div>
  );
}
