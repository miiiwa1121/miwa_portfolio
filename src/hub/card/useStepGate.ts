"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SectionType } from "@/types";

/**
 * The gate that makes a card step wait for the camera to arrive.
 *
 * Shared by the desktop stack (`SectionCard`) and the handheld rail
 * (`CardRail`): both send the same kind of request and both have to refuse
 * the next one until it has landed, and two copies of the reasoning would be
 * two things to keep in step.
 *
 * **A step is a request, not a change.** It turns the camera, and the area
 * that ends up in front comes back down as a new `section` some fraction of a
 * second later. Two things go wrong if the next one is taken before that has
 * happened: the caller hands `adjacentOnTour` the card already on its way out,
 * so it asks for the spot the reader is heading to anyway and the gesture does
 * nothing — and when it does not do nothing, it steps past a card that never
 * finished arriving. So the gate is arrival itself: `pendingSince` is set when
 * a step goes out and cleared by the card actually changing.
 *
 * See docs/scene-invariants.md, "マーカー・点線・カード".
 */

/**
 * How long a card that has just arrived gets before another step is taken.
 *
 * Counted from the card actually changing, not from the step that asked for
 * it: the camera has to swing far enough for another area to be in front
 * before `section` comes back down at all, which is around 0.13s at the
 * orbit's damping. This is the part after that — the card's spring is a
 * whisker overdamped (ζ ≈ 1.11), its slow pole a time constant of about 64ms,
 * so by 160ms the card is nine tenths of the way onto the screen and
 * unmistakably there. Together they are what "you cannot skip a card you never
 * saw" means in wall-clock terms: about a third of a second, three cards a
 * second.
 */
export const CARD_SETTLE_MS = 160;

/**
 * How long a step is given to land before the gate opens anyway.
 *
 * Only a backstop. The camera's damping closes 99% of the gap inside a second,
 * so a `section` that has not changed by then means the request never took —
 * and a gate with no way out would leave the card dead to every later gesture.
 */
export const STEP_TIMEOUT_MS = 1000;

type Options = {
  /** The area currently shown. Its changing is what counts as an arrival. */
  section: NonNullable<SectionType>;
  /** False while an area is focused, which is when stepping is not offered. */
  browsable: boolean;
  /** Sends the step on once the gate allows it. */
  onStep: (step: number) => void;
};

export function useStepGate({ section, browsable, onStep }: Options) {
  // Which way the last accepted step went, so an entering card knows which
  // side to come from. It is asked for well before it is needed: the step
  // turns the camera, and `section` only changes once the camera has swung
  // far enough for another area to be in front.
  const [lastStep, setLastStep] = useState(-1);

  // Held in a ref so a listener bound once, for the life of the card, does not
  // have to be torn down and rebuilt whenever the parent hands down a new
  // closure. Written in an effect, never during a render.
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const pendingSince = useRef<number | null>(null);
  const armedAt = useRef(0);

  useEffect(() => {
    if (pendingSince.current === null) return; // the first render, not an arrival
    pendingSince.current = null;
    armedAt.current = performance.now() + CARD_SETTLE_MS;
  }, [section]);

  // Focusing an area throws away whatever was in flight. The card is set from
  // the section being opened rather than from a turn, so nothing is coming to
  // clear the gate, and leaving it shut would make the card ignore the first
  // gesture after the reader comes back out.
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

  return { takeStep, lastStep };
}
