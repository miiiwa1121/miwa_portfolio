"use client";

import { useEffect, useRef } from "react";
import { onMarkerScreen, type MarkerScreenPoint } from "@/components/3d/markerScreen";

/**
 * The zigzag trail from the card out to the marker floating over its area.
 *
 * DOM rather than 3D, deliberately: the trail is a flat annotation that should
 * always sit on top, so putting it in the scene would only buy it depth
 * testing it does not want. (The markers are the mirror image — they *do*
 * want to be hidden behind buildings, so they live in WebGL.)
 *
 * Nothing here goes through React state. The scene pushes the marker's screen
 * position every frame and the polyline's points are written straight to the
 * DOM; re-rendering this component sixty times a second would be competing
 * with the renderer for the same main thread.
 */

/**
 * Distance along the trail between successive vertices — half a zigzag.
 *
 * Fixed, and measured from the card end, so the peaks nearest the card never
 * move as the scene turns; only the far end gains and loses them. Letting the
 * step stretch to fit instead would shift every peak whenever the count
 * changed, which reads as the trail creeping in and out from under the card.
 */
const ZIGZAG_STEP = 11;

/** How far the peaks stand off the straight line between card and marker. */
const ZIGZAG_AMPLITUDE = 6;

/** Ceiling on vertices, so even the longest trail stays bounded. */
const MAX_VERTICES = 160;

const STROKE_WIDTH = 2.4;

/** Minimum clear space between the last peak and the edge of the dot. */
const MARKER_GAP = 4;

/**
 * How far the trail begins from the anchor dot on the card's corner. Enough
 * that it starts clear of the card rather than running underneath it.
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
  const lineRef = useRef<SVGPolylineElement | null>(null);

  useEffect(() => {
    if (hidden) return;

    const points: string[] = [];

    const draw = ({ x, y, radius, visible }: MarkerScreenPoint) => {
      const group = groupRef.current;
      const line = lineRef.current;
      const anchor = anchorRef.current;
      if (!group || !line || !anchor) return;

      const hide = () => {
        group.style.opacity = "0";
      };

      if (!visible) return hide();

      // The trail leaves from the dot on the card's top-right corner.
      const rect = anchor.getBoundingClientRect();
      const startX = rect.right - 20;
      const startY = rect.top + 20;

      const dx = x - startX;
      const dy = y - startY;
      const span = Math.hypot(dx, dy);

      // Stop short of the dot rather than running underneath it. The dot's
      // screen radius comes from the scene, since a sprite's pixel size
      // depends on how far away the camera is.
      const reach = span - radius - MARKER_GAP;
      if (reach < MIN_TRAIL + CARD_GAP) return hide();
      group.style.opacity = "1";

      const unitX = dx / span;
      const unitY = dy / span;
      // Perpendicular to the trail, for the peaks to stand off along.
      const sideX = -unitY;
      const sideY = unitX;

      // An even number of steps leaves the last vertex back on the baseline,
      // so the trail finishes pointing at the dot rather than off to one side.
      let steps = Math.floor((reach - CARD_GAP) / ZIGZAG_STEP);
      if (steps % 2 === 1) steps -= 1;
      steps = Math.min(steps, MAX_VERTICES - 1);
      if (steps < 2) return hide();

      points.length = 0;
      for (let i = 0; i <= steps; i++) {
        const along = CARD_GAP + i * ZIGZAG_STEP;
        // Peaks on the odd vertices, the even ones on the line itself — which
        // is what makes it read as ^^^^ rather than a symmetrical wave.
        const lift = i % 2 === 1 ? ZIGZAG_AMPLITUDE : 0;
        const px = startX + unitX * along + sideX * lift;
        const py = startY + unitY * along + sideY * lift;
        points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }

      line.setAttribute("points", points.join(" "));
    };

    return onMarkerScreen(draw);
  }, [anchorRef, hidden]);

  if (hidden) return null;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true">
      <g ref={groupRef} style={{ opacity: 0, transition: "opacity 240ms ease" }}>
        <polyline
          ref={lineRef}
          fill="none"
          stroke="rgba(66, 38, 18, 0.55)"
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
