"use client";

import { useRef } from "react";

/**
 * Tap versus vertical swipe on the card.
 *
 * The canvas already treats a vertical swipe as "rotate the diorama", so the
 * card has to claim the gesture rather than share it — see `isInteractive` in
 * Scene, which skips anything marked `data-ui`. The card carries that marker,
 * and these handlers decide what the gesture meant once it ends.
 */

/** Movement below this is a tap, not a drag. Roughly a fingertip's wobble. */
const TAP_SLOP = 10;

/** Vertical travel needed before a drag counts as a deliberate swipe. */
const SWIPE_THRESHOLD = 44;

type Options = {
  onTap: () => void;
  /** step is -1 for a swipe up (next spot) and +1 for a swipe down. */
  onSwipe: (step: number) => void;
};

export function useCardGestures({ onTap, onSwipe }: Options) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    "data-ui": true,
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;

      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;

      if (Math.hypot(dx, dy) < TAP_SLOP) {
        onTap();
        return;
      }
      if (Math.abs(dy) >= SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        // Swiping up pulls the next card into view, the way a feed does.
        onSwipe(dy < 0 ? -1 : 1);
      }
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
