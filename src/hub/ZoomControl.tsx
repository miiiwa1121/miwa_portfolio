"use client";

import { ZoomIn } from "lucide-react";

export type ZoomStage = "far" | "near" | "building";

type Props = {
  isJa: boolean;
  stage: ZoomStage;
  onSelect: (stage: ZoomStage) => void;
};

const STAGES: { key: ZoomStage; ja: string; en: string }[] = [
  { key: "far", ja: "俯瞰", en: "Overview" },
  { key: "near", ja: "標準", en: "Default" },
  { key: "building", ja: "正面の建物", en: "Facing area" },
];

const NEXT: Record<ZoomStage, ZoomStage> = {
  far: "near",
  near: "building",
  building: "far",
};

// Fill goes from white to solid orange as the stages step inward, so the
// button's own color carries "how zoomed in" — no separate legend needed.
const FILL: Record<ZoomStage, string> = {
  far: "bg-white text-gray-800",
  near: "bg-orange-300 text-gray-900",
  building: "bg-orange-500 text-white",
};

/**
 * The desktop/no-touch equivalent of the two-finger pinch (Scene.tsx's
 * `useViewInput`): far/near switch the free orbit's altitude the same way a
 * pinch does, and a third stage — reached by neither pinch nor drag — jumps
 * straight to whichever section the camera is currently facing, the same
 * destination a marker click reaches.
 *
 * One button, stepped through the three stages by successive clicks
 * (far → near → building → far …) rather than a hover-revealed picker: a
 * control that has to appear on hover before it can be used doesn't have a
 * touch equivalent, and this one does — every stage is reachable with a tap.
 */
export default function ZoomControl({ isJa, stage, onSelect }: Props) {
  const current = STAGES.find((s) => s.key === stage) ?? STAGES[1];
  const label = isJa ? current.ja : current.en;

  return (
    <button
      onClick={() => onSelect(NEXT[stage])}
      title={isJa ? `ズーム: ${label}` : `Zoom: ${label}`}
      aria-label={isJa ? `ズーム: ${label}` : `Zoom: ${label}`}
      className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform border border-black/5 pointer-events-auto ${FILL[stage]}`}
    >
      <ZoomIn size={20} />
    </button>
  );
}
