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
 * Dashes are spaced a fixed distance apart, so a long trail simply has more
 * of them. A fixed count would stretch the gaps as the marker moved away and
 * bunch them up as it came close, which reads as the trail breathing.
 */
const DASH_SPACING = 20;

/** Enough nodes for the longest trail a viewport can hold. Never recreated. */
const MAX_DASHES = 72;

/** Dash length at the card end and at the marker end, in px. */
const NEAR_LENGTH = 9;
const FAR_LENGTH = 4;

/** Stroke width at each end, tapering with distance for a sense of depth. */
const NEAR_WIDTH = 3.4;
const FAR_WIDTH = 1.6;

/** How far the trail bows away from the straight chord, as a fraction of its length. */
const BOW = 0.12;

/** Samples used to measure the curve before walking it at even spacing. */
const ARC_SAMPLES = 160;

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

    // Reused across frames so walking the curve allocates nothing.
    const xs = new Float64Array(ARC_SAMPLES + 1);
    const ys = new Float64Array(ARC_SAMPLES + 1);
    const lengths = new Float64Array(ARC_SAMPLES + 1);

    const draw = ({ x, y, visible }: MarkerScreenPoint) => {
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
      if (Math.hypot(dx, dy) < 60) return hide(); // too short to read as a trail
      group.style.opacity = "1";

      // Bow the trail perpendicular to the chord so it arcs rather than
      // cutting a hard diagonal across the scene.
      const controlX = (startX + x) / 2 - dy * BOW;
      const controlY = (startY + y) / 2 + dx * BOW;

      // Sample the curve and accumulate arc length, so dashes can be placed at
      // even distances rather than at even values of the bezier parameter —
      // which are not the same thing, and would crowd the dashes into the bend.
      let total = 0;
      for (let i = 0; i <= ARC_SAMPLES; i++) {
        const t = i / ARC_SAMPLES;
        const inverse = 1 - t;
        const px = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * x;
        const py = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * y;
        if (i > 0) total += Math.hypot(px - xs[i - 1], py - ys[i - 1]);
        xs[i] = px;
        ys[i] = py;
        lengths[i] = total;
      }

      const count = Math.min(MAX_DASHES, Math.floor(total / DASH_SPACING));
      let sample = 0;

      for (let i = 0; i < MAX_DASHES; i++) {
        const dash = dashesRef.current[i];
        if (!dash) continue;

        if (i >= count) {
          dash.setAttribute("stroke-width", "0");
          continue;
        }

        // Walk forward to the sample holding this dash's distance along the arc.
        const along = (i + 0.5) * DASH_SPACING;
        while (sample < ARC_SAMPLES && lengths[sample + 1] < along) sample++;

        const span = lengths[sample + 1] - lengths[sample] || 1;
        const blend = (along - lengths[sample]) / span;
        const px = xs[sample] + (xs[sample + 1] - xs[sample]) * blend;
        const py = ys[sample] + (ys[sample + 1] - ys[sample]) * blend;

        // Lay each dash along the curve's local direction so the trail reads
        // as one dashed line rather than a scatter of ticks.
        const tangentX = xs[sample + 1] - xs[sample];
        const tangentY = ys[sample + 1] - ys[sample];
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;

        const progress = along / total;
        const half = (NEAR_LENGTH + (FAR_LENGTH - NEAR_LENGTH) * progress) / 2;
        const offsetX = (tangentX / tangentLength) * half;
        const offsetY = (tangentY / tangentLength) * half;

        dash.setAttribute("x1", (px - offsetX).toFixed(1));
        dash.setAttribute("y1", (py - offsetY).toFixed(1));
        dash.setAttribute("x2", (px + offsetX).toFixed(1));
        dash.setAttribute("y2", (py + offsetY).toFixed(1));
        dash.setAttribute(
          "stroke-width",
          (NEAR_WIDTH + (FAR_WIDTH - NEAR_WIDTH) * progress).toFixed(2)
        );
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
