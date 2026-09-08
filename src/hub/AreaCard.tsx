"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useCardGestures } from "./useCardGestures";
import { initialWheelState, stepForWheel, wheelPixels } from "./cardWheel";
import { MARKER_TRAIL_INK } from "@/scene/markerBolt";
import { useFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";

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
 * `facingSection` in worldLayout for why that direction matters.
 */

/** Contextual copy — swaps as the camera flies to each building. */
const CARD: Record<
  NonNullable<SectionType>,
  { jaTitle: string; enTitle: string; sub: string; ja: string; en: string }
> = {
  about: {
    jaTitle: "自己紹介",
    enTitle: "About",
    sub: "About Me",
    ja: "「面白いを最優先！」がモットー。新規性を重視し、まだこの世にないものを探し求めている27卒の学生エンジニアです。",
    en: "My motto is \"Fun First!\" A Class-of-'27 student engineer who values novelty and searches for things that don't exist yet.",
  },
  products: {
    jaTitle: "制作実績",
    enTitle: "Products",
    sub: "Works",
    ja: "アイデアを形にしてきたプロダクトたち。ゲームからWebアプリまで、遊び心と技術を詰め込みました。",
    en: "Products where ideas took shape — from games to web apps, packed with playfulness and craft.",
  },
  skills: {
    jaTitle: "技術スタック",
    enTitle: "Skills",
    sub: "Tech Stack",
    ja: "フロントエンドを中心に、UXとデザインにこだわりながら日々新しい技術へ挑戦しています。",
    en: "Front-end focused, obsessed with UX and design, and always challenging new technology.",
  },
  experience: {
    jaTitle: "経歴・活動",
    enTitle: "Experience",
    sub: "Journey",
    ja: "これまでの学び・挑戦・活動の記録。学生ながら幅広くものづくりに取り組んできました。",
    en: "A record of learning, challenges, and activity — a wide range of making, all while studying.",
  },
  contact: {
    jaTitle: "お問い合わせ",
    enTitle: "Contact",
    sub: "Get in touch",
    ja: "お気軽にご連絡ください！SNSやフォームからいつでもどうぞ。",
    en: "Feel free to reach out — anytime via social links or the form.",
  },
};

/** How far each layer behind sits below the front card, in px. */
const PEEK_OFFSETS = [11, 21];

/**
 * Cards enter from the side the gesture pulled them from, so the movement
 * agrees with the hand that caused it: scrolling down (step -1) pulls the next
 * card up from below, and the one being replaced leaves through the top.
 */
const CARD_VARIANTS = {
  enter: (step: number) => ({ opacity: 0, y: step < 0 ? 34 : -34, scale: 0.97 }),
  center: { opacity: 1, y: 0, scale: 1 },
  exit: (step: number) => ({ opacity: 0, y: step < 0 ? -34 : 34, scale: 0.97 }),
};

const CARD_SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.7 } as const;

/**
 * How long a card that has just arrived gets before another step is taken.
 *
 * Counted from the card actually changing, not from the step that asked for
 * it: the camera has to swing far enough for another area to be in front
 * before `section` comes back down at all, which is around 0.13s at the
 * orbit's damping. This is the part after that — CARD_SPRING is a whisker
 * overdamped (ζ ≈ 1.11), its slow pole a time constant of about 64ms, so by
 * 160ms the card is nine tenths of the way onto the screen and unmistakably
 * there. Together they are what "you cannot skip a card you never saw" means
 * in wall-clock terms: about a third of a second, three cards a second.
 */
const CARD_SETTLE_MS = 160;

/**
 * How long a step is given to land before the gate opens anyway.
 *
 * Only a backstop. The camera's damping closes 99% of the gap inside a second,
 * so a `section` that has not changed by then means the request never took —
 * and a gate with no way out would leave the stack dead to every later scroll.
 */
const STEP_TIMEOUT_MS = 1000;

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

export default function AreaCard({
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
  const card = CARD[section];

  // Which way the last step went, so the entering card knows which side to
  // come from. It is asked for well before it is needed: the step turns the
  // camera, and `section` only changes once the camera has swung far enough
  // for another area to be in front — by which time this has long settled.
  const [lastStep, setLastStep] = useState(-1);

  // Held in a ref so the wheel listener below can be bound once, for the life
  // of the card, rather than torn down and rebuilt whenever the parent hands
  // down a new closure. Written in an effect, never during a render.
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  // A step is a request, not a change. It turns the camera, and the area that
  // ends up in front comes back down as a new `section` some fraction of a
  // second later. Two things go wrong if the next one is taken before that has
  // happened: `onStep` is handed the card already on its way out, so it asks
  // for the spot the reader is heading to anyway and the scroll does nothing —
  // and when it does not do nothing, it steps past a card that never finished
  // arriving. So the gate is arrival itself: `pendingSince` is set when a step
  // goes out and cleared by the card actually changing.
  const pendingSince = useRef<number | null>(null);
  const armedAt = useRef(0);

  useEffect(() => {
    if (pendingSince.current === null) return; // the first render, not an arrival
    pendingSince.current = null;
    armedAt.current = performance.now() + CARD_SETTLE_MS;
  }, [section]);

  // Stepping is browsing, and browsing is over once an area is focused: the
  // camera is parked on that building and the orbit is locked out, so a step
  // would swap the card for one describing somewhere the view is not. The
  // stack loses its layers in the same breath, so it stops offering.
  const browsable = !focused;

  // Focusing an area throws away whatever was in flight. The card is set from
  // the section being opened rather than from a turn, so nothing is coming to
  // clear the gate, and leaving it shut would make the stack ignore the first
  // scroll after the reader comes back out.
  useEffect(() => {
    if (browsable) return;
    pendingSince.current = null;
    armedAt.current = 0;
  }, [browsable]);

  const takeStep = useCallback(
    (step: number) => {
      if (!browsable) return;
      const now = performance.now();
      if (pendingSince.current !== null) {
        if (now - pendingSince.current < STEP_TIMEOUT_MS) return;
      } else if (now < armedAt.current) {
        return;
      }
      pendingSince.current = now;
      setLastStep(step);
      onStepRef.current(step);
    },
    [browsable]
  );

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
      className="relative w-full max-w-xs sm:max-w-sm cursor-pointer select-none touch-none pointer-events-auto"
    >
      {/* The rest of the stack. Positioned, so they paint under the card,
          which takes a stacking context of its own below. */}
      {browsable && PEEK_OFFSETS.map((offset, i) => (
        <div
          key={offset}
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl border border-black/5"
          style={{
            transform: `translateY(${offset}px) scaleX(${1 - (i + 1) * 0.045})`,
            background: "#ffffff",
          }}
        />
      ))}

      {/* Where the trail leaves the card, and the trail's near end.
          On the stack rather than on the card, though it is the card's corner
          it marks — the stack is what stays put. The card inside is keyed on
          the area and remounts every time another one comes round, and with
          two copies briefly alive during the swap, the *outgoing* one's ref
          callback fires with null after the incoming one has already claimed
          it. That left `anchorRef.current` empty, the trail's draw() bailing
          on every frame afterwards, and the line frozen at wherever it had
          last been drawn — a stale line, detached from the dot, from the first
          time the card changed.
          Gone once an area is focused, along with the trail itself: it is the
          trail's near end, and a lone dot on the corner of the card with
          nothing leaving it reads as a stray mark. */}
      {!focused && (
        <span
          ref={anchorRef}
          aria-hidden="true"
          // Starts hidden and is shown by CardLeaderLine, which is the thing
          // that knows whether there is a trail to leave from it. Fading
          // rather than switching, so an area passing behind the card does
          // not make the dot blink.
          // The colour lives in `markerBolt.ts` with the trail's, not in a
          // Tailwind arbitrary value: the class scanner needs a literal, and a
          // second literal is a second thing to forget when the marker's blue
          // is next adjusted.
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
          whileHover={{ y: -4 }}
          transition={CARD_SPRING}
          className="relative z-10 bg-white rounded-3xl p-6 sm:p-8 border border-black/5"
        >
          <p className="text-orange-500 font-black text-lg">
            {isJa ? card.jaTitle : card.enTitle}
          </p>
          <p className="text-xs text-gray-400 font-bold mb-4 uppercase tracking-[0.2em]">
            {card.sub}
          </p>
          <p className="text-gray-700 font-medium mb-6 leading-relaxed text-sm">
            {isJa ? card.ja : card.en}
          </p>
          <button
            onClick={onOpen}
            className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-7 rounded-full shadow-[0_4px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-1 transition-all items-center gap-1.5"
          >
            {isJa ? "詳しく見る" : "More"} <ChevronRight size={18} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
