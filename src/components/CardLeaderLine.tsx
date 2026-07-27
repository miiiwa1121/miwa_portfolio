"use client";

import { useEffect, useRef } from "react";
import { onMarkerScreen, type MarkerScreenPoint } from "@/components/3d/markerScreen";

/**
 * The dotted trail from the card out to the marker floating over its area.
 *
 * DOM rather than 3D, deliberately: the line is a flat annotation that should
 * always sit on top, so putting it in the scene would only buy it depth
 * testing it does not want. (The markers are the mirror image — they *do*
 * want to be hidden behind buildings, so they live in WebGL.)
 *
 * Nothing here goes through React state. The scene pushes the marker's screen
 * position every frame and the circles' attributes are written straight to the
 * DOM; re-rendering this component sixty times a second would be competing
 * with the renderer for the same main thread.
 */

/** Number of dots along the trail. Fixed, so the nodes are written, never recreated. */
const DOT_COUNT = 20;

/** Dot radius at the card end and at the marker end, in px. */
const NEAR_RADIUS = 4.5;
const FAR_RADIUS = 1.8;

/** How far the trail bows away from the straight chord, as a fraction of its length. */
const BOW = 0.12;

type Props = {
  /** The card the trail starts from. Hidden whenever this is absent. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Suppressed while the detail page covers everything. */
  hidden: boolean;
};

export default function CardLeaderLine({ anchorRef, hidden }: Props) {
  const groupRef = useRef<SVGGElement | null>(null);
  const dotsRef = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    if (hidden) return;

    const draw = ({ x, y, visible }: MarkerScreenPoint) => {
      const group = groupRef.current;
      const anchor = anchorRef.current;
      if (!group || !anchor) return;

      if (!visible) {
        group.style.opacity = "0";
        return;
      }

      // Start at the card's top-right corner, the way the reference does.
      const rect = anchor.getBoundingClientRect();
      const startX = rect.right - 20;
      const startY = rect.top + 20;

      const dx = x - startX;
      const dy = y - startY;
      const length = Math.hypot(dx, dy);

      // Too short to read as a trail, and the dots would just pile up on the
      // card's corner.
      if (length < 60) {
        group.style.opacity = "0";
        return;
      }
      group.style.opacity = "1";

      // Bow the trail perpendicular to the chord so it arcs rather than
      // cutting a hard diagonal across the scene.
      const controlX = (startX + x) / 2 - dy * BOW;
      const controlY = (startY + y) / 2 + dx * BOW;

      for (let i = 0; i < DOT_COUNT; i++) {
        const dot = dotsRef.current[i];
        if (!dot) continue;

        const t = i / (DOT_COUNT - 1);
        const inverse = 1 - t;
        // Quadratic bezier: start -> control -> marker.
        const px = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * x;
        const py = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * y;

        dot.setAttribute("cx", px.toFixed(1));
        dot.setAttribute("cy", py.toFixed(1));
        dot.setAttribute("r", (NEAR_RADIUS + (FAR_RADIUS - NEAR_RADIUS) * t).toFixed(2));
      }
    };

    return onMarkerScreen(draw);
  }, [anchorRef, hidden]);

  if (hidden) return null;

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-30"
      aria-hidden="true"
    >
      <g ref={groupRef} style={{ opacity: 0, transition: "opacity 240ms ease" }}>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <circle
            key={i}
            ref={(el) => {
              dotsRef.current[i] = el;
            }}
            r={NEAR_RADIUS}
            cx={-100}
            cy={-100}
            fill="rgba(66, 38, 18, 0.55)"
          />
        ))}
      </g>
    </svg>
  );
}
