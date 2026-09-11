"use client";

import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";

/**
 * The brief play/pause badge a tap on empty sky leaves behind.
 *
 * On a phone the pause button is gone and tapping the diorama is what freezes
 * it (see `useTapGesture` in Scene.tsx). A gesture with no button has no
 * resting state to read, so the only thing that can say what just happened is
 * the moment itself — hence a badge that states the new state and leaves,
 * the way a video player's does. It is deliberately *not* a persistent
 * indicator: a permanent "paused" chip over the planet would be one more
 * thing occupying a screen this whole redesign is trying to clear.
 *
 * Shown only for the tap. The desktop header still has a real pause button
 * whose own fill says whether the town is frozen, so flashing this there
 * would be announcing something already on screen.
 */

/**
 * How long the badge stays, in seconds.
 *
 * Long enough to be read as a state ("it is paused now") rather than seen as
 * a flicker, short enough that a second tap during the first badge's exit is
 * not a common case. Matched to the ~0.6s video players settle on.
 */
const FLASH_SECONDS = 0.6;

export default function PauseFlash({
  paused,
  onDone,
}: {
  paused: boolean;
  /**
   * Called once the badge has finished fading, so the caller can unmount it.
   *
   * Without this the element stays in the tree at `opacity: 0` for the life
   * of the page — invisible, but a fixed full-screen div that every later
   * hit-test still walks, and a piece of state that never returns to null.
   */
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 1.35] }}
      transition={{ duration: FLASH_SECONDS, times: [0, 0.18, 0.55, 1], ease: "easeOut" }}
      onAnimationComplete={onDone}
      aria-hidden="true"
      className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none"
    >
      <span className="w-20 h-20 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center">
        {paused ? (
          <Pause size={32} fill="currentColor" />
        ) : (
          <Play size={32} fill="currentColor" className="translate-x-[2px]" />
        )}
      </span>
    </motion.div>
  );
}
