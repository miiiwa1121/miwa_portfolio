"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this is a phone-sized touch screen — the one place that question is
 * answered.
 *
 * Several of the mobile differences are *behaviour*, not styling: the pause
 * and zoom buttons are replaced by a tap and a pinch, the card becomes a rail
 * along the bottom, and the camera leans the planet the other way to make room
 * for it. None of that can be expressed as a Tailwind breakpoint, so the
 * question has to be asked in JavaScript — and asked in exactly one place,
 * since a second copy of the predicate is a second thing to keep in step.
 *
 * **Both halves are load-bearing.** `pointer: coarse` alone would strip the
 * buttons from a touchscreen laptop, which has a mouse as well and nothing to
 * pinch with; `max-width` alone would strip them from a narrow desktop window,
 * where the replacement gestures do not exist at all. Together they mean "a
 * screen held in a hand", which is what the replacements assume.
 *
 * The width matches Tailwind's `lg` (1024px), the breakpoint the header
 * already switches the navigation at, so the CSS-only parts of the mobile
 * layout and the JavaScript-driven parts flip at the same instant. A tablet
 * held in portrait counts as handheld; the same tablet in landscape does not,
 * which is the right answer for a layout whose whole problem is vertical.
 */
const HANDHELD_QUERY = "(pointer: coarse) and (max-width: 1023px)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(HANDHELD_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(HANDHELD_QUERY).matches;
}

/**
 * False during the prerender and the hydration pass that matches it.
 *
 * The site is `output: 'export'`, so the markup is built with no window to ask
 * — and answering differently on the server than on the first client render is
 * a hydration mismatch. Handing back the desktop answer and correcting it
 * immediately afterwards is the one option that cannot tear: React renders
 * again as soon as hydration finishes, before the canvas has drawn a frame.
 */
function getServerSnapshot(): boolean {
  return false;
}

export function useHandheld(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
