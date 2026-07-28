"use client";

import { useEffect, useRef } from "react";
import { onMarkerScreen, type MarkerScreenPoint } from "@/components/3d/markerScreen";

/**
 * The dashed trail from the card out to the marker floating over its area.
 *
 * DOM rather than 3D, deliberately: the trail is a flat annotation that should
 * always sit on top, so putting it in the scene would only buy it depth
 * testing it does not want. (The markers are the mirror image — they *do*
 * want to be hidden behind buildings, so they live in WebGL.)
 *
 * Nothing here goes through React state. The scene pushes the marker's screen
 * position every frame and the dashes' attributes are written straight to the
 * DOM; re-rendering this component sixty times a second would be competing
 * with the renderer for the same main thread.
 */

/**
 * Distance between dashes, fixed. Everything is laid out from the card end, so
 * the dashes nearest the card never move at all as the scene turns — only the
 * far end grows and shrinks, adding and dropping dashes. That is how the
 * reference behaves, and it is what stops the trail appearing to slide in and
 * out from under the card.
 */
const DASH_SPACING = 20;

/** Enough nodes for the longest trail a viewport can hold. Never recreated. */
const MAX_DASHES = 72;

/** Every dash is the same, near end and far end alike. */
const DASH_LENGTH = 8;
const DASH_WIDTH = 2.6;

/** Minimum clear space between the last dash and the edge of the dot. */
const MARKER_GAP = 3;

/**
 * How far the trail begins from the anchor dot on the card's corner. Enough
 * that the dashes start clear of the card rather than running underneath it.
 */
const CARD_GAP = 26;

/** Below this there is no room for a trail worth drawing. */
const MIN_TRAIL = 48;

type Props = {
  /** The card the trail starts from. Hidden whenever this is absent. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Suppressed while the detail page covers everything. */
  hidden: boolean;
};

export default function CardLeaderLine({ anchorRef, hidden }: Props) {
  const groupRef = useRef<SVGGElement | null>(null);
  const dashesRef = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    if (hidden) return;

    const draw = ({ x, y, radius, visible }: MarkerScreenPoint) => {
      const group = groupRef.current;
      const anchor = anchorRef.current;
      if (!group || !anchor) return;

      const hide = () => {
        group.style.opacity = "0";
      };

      if (!visible) return hide();

      // Start at the card's top-right corner, the way the reference does.
      const rect = anchor.getBoundingClientRect();
      const startX = rect.right - 20;
      const startY = rect.top + 20;

      const dx = x - startX;
      const dy = y - startY;
      const span = Math.hypot(dx, dy);

      // Stop short of the dot rather than running underneath it: the marker is
      // the thing being pointed at, and a line crossing it reads as a line
      // going past it. The dot's screen radius comes from the scene, since a
      // sprite's pixel size depends on how far away the camera is.
      const reach = span - radius - MARKER_GAP;
      if (reach < MIN_TRAIL) return hide();
      group.style.opacity = "1";

      const unitX = dx / span;
      const unitY = dy / span;
      const half = DASH_LENGTH / 2;

      // Laid out from the card, at fixed spacing. Whatever the spacing does
      // not divide is left at the far end, where a slightly larger gap before
      // the dot goes unnoticed — as against the card end, where any variation
      // shows as the trail creeping in and out from behind it.
      const firstCentre = CARD_GAP + half;
      const count = Math.min(
        MAX_DASHES,
        Math.max(0, Math.floor((reach - firstCentre - half) / DASH_SPACING) + 1)
      );

      for (let i = 0; i < MAX_DASHES; i++) {
        const dash = dashesRef.current[i];
        if (!dash) continue;

        if (i >= count) {
          dash.setAttribute("stroke-width", "0");
          continue;
        }

        const along = firstCentre + i * DASH_SPACING;
        const px = startX + unitX * along;
        const py = startY + unitY * along;

        dash.setAttribute("x1", (px - unitX * half).toFixed(1));
        dash.setAttribute("y1", (py - unitY * half).toFixed(1));
        dash.setAttribute("x2", (px + unitX * half).toFixed(1));
        dash.setAttribute("y2", (py + unitY * half).toFixed(1));
        dash.setAttribute("stroke-width", String(DASH_WIDTH));
      }
    };

    return onMarkerScreen(draw);
  }, [anchorRef, hidden]);

  if (hidden) return null;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true">
      <g ref={groupRef} style={{ opacity: 0, transition: "opacity 240ms ease" }}>
        {Array.from({ length: MAX_DASHES }, (_, i) => (
          <line
            key={i}
            ref={(el) => {
              dashesRef.current[i] = el;
            }}
            x1={-100}
            y1={-100}
            x2={-100}
            y2={-100}
            stroke="rgba(66, 38, 18, 0.55)"
            strokeWidth={0}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
