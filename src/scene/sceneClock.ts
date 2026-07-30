/**
 * The diorama's own sense of time, which the pause button can stop.
 *
 * Everything that moves on its own reads this instead of the renderer's clock,
 * so one flag freezes the ferris wheel, the tram, the clouds, the villagers,
 * the confetti, the marker pulse and the idle orbit together, on the frame the
 * button was pressed — rather than each of them needing its own pause branch.
 *
 * The paused span is *discounted*, not reset: resuming carries on from the
 * exact instant it stopped, so nothing jumps forward by however long the pause
 * lasted. That matters most for the circling tram and villagers, whose position
 * is a function of time alone — a five-minute pause would otherwise teleport
 * them a quarter of the way round the island.
 *
 * Deliberately not React state. It is read inside `useFrame` by components
 * that must never re-render at 60Hz, the same reasoning as `markerScreen.ts`.
 */

export type SceneClock = {
  /** Scene time, given the renderer's own elapsed time for this frame. */
  time(elapsed: number): number;
  /** This frame's step — zero while paused, so delta-driven motion stops too. */
  delta(realDelta: number): number;
  paused(): boolean;
  /** `elapsed` is the renderer's reading at the moment the button was hit. */
  setPaused(paused: boolean, elapsed: number): void;
};

export function createSceneClock(): SceneClock {
  /** Total real seconds spent paused, subtracted from every reading. */
  let skipped = 0;
  /** The reading time was frozen at; null while running. */
  let frozenAt: number | null = null;

  return {
    time: (elapsed) => (frozenAt ?? elapsed) - skipped,
    delta: (realDelta) => (frozenAt === null ? realDelta : 0),
    paused: () => frozenAt !== null,
    setPaused(paused, elapsed) {
      // Both directions are idempotent: the flag comes from React state, and a
      // re-run of the effect that syncs it must not bank a second pause (which
      // would move the freeze point) or a second resume (which would double the
      // discount and rewind the scene).
      if (paused) {
        if (frozenAt === null) frozenAt = elapsed;
        return;
      }
      if (frozenAt === null) return;
      skipped += elapsed - frozenAt;
      frozenAt = null;
    },
  };
}

/** The one clock the whole diorama shares. */
export const sceneClock = createSceneClock();
