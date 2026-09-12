"use client";

import { X } from "lucide-react";

/**
 * The way back to the default view, from an area the camera has flown into.
 *
 * One component for both layouts because it is one control: a desktop pins it
 * to the bottom of the frame, a phone puts it just above the card rail (the
 * bottom of a phone's frame is the rail). Only where it sits differs, so only
 * that is a prop — the label, the icon and the shape are stated once here
 * rather than in two places that would drift.
 *
 * Both callers show it under the same condition: an area is focused and the
 * detail page is not open. Offering "go home" while already home is a control
 * that does nothing, and About is excluded because reading its column to the
 * end is what leaves it — a button beside that would be a second, competing
 * way out of the one area that already has a natural one.
 */
export default function HomeButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  /** Where it sits. Everything else about it is fixed. */
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="HOME"
      className={`z-30 pointer-events-auto flex items-center gap-2 bg-white text-gray-800 font-bold py-3 px-7 rounded-full border border-black/5 shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-transform ${className}`}
    >
      <X size={18} /> HOME
    </button>
  );
}
