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
 *
 * Both ends are measured the same way: from the *edge* of the dot they leave,
 * outwards by a fixed clearance. The card's dot is an element and is measured;
 * the marker's dot is drawn in WebGL at a size the scene sets in screen pixels
 * and publishes, so neither radius is ever estimated here.
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

/** One full zigzag: up to a peak and back down to the baseline. */
const ZIGZAG_PERIOD = ZIGZAG_STEP * 2;

/** Ceiling on whole zigzags, so even the longest trail stays bounded. */
const MAX_CYCLES = 80;

const STROKE_WIDTH = 2.4;

/**
 * A round linecap puts ink half a stroke beyond the last vertex, at both ends.
 * Both clearances below are ink-to-ink, so that overhang comes off the top.
 */
const CAP = STROKE_WIDTH / 2;

/** Clear space between the marker dot's edge and the start of the ink. */
const MARKER_GAP = 9;

/** Clear space between the card's anchor dot and the start of the ink. */
const CARD_GAP = 17;

/** Below this there is no room for a trail worth drawing. */
const MIN_TRAIL = 48;

type Props = {
  /**
   * The dot on the card that the trail leaves from — the element itself, so
   * its centre and radius are measured rather than restated here. Hidden
   * whenever this is absent.
   */
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
      if (!group || !line) return;

      const hide = () => {
        group.style.opacity = "0";
      };

      // No anchor means there is nothing to draw *from*, so the trail goes
      // away — rather than returning and leaving the last frame's polyline on
      // screen. A stale line is the worse failure of the two: it stays put
      // while the scene turns under it, which reads as the trail having come
      // loose from the dot rather than as anything being missing.
      const anchor = anchorRef.current;
      if (!anchor || !visible) return hide();

      const rect = anchor.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const startRadius = Math.max(rect.width, rect.height) / 2;

      const dx = x - startX;
      const dy = y - startY;
      const span = Math.hypot(dx, dy);

      // Where the ink starts and stops, both a fixed clearance out from the
      // edge of the dot at that end. The marker's radius comes from the scene:
      // it is the number the sprite was sized to this very frame, in the same
      // CSS pixels this SVG is drawn in.
      const from = startRadius + CARD_GAP + CAP;
      const reach = span - radius - MARKER_GAP - CAP;
      if (reach - from < MIN_TRAIL) return hide();
      group.style.opacity = "1";

      const unitX = dx / span;
      const unitY = dy / span;
      // Perpendicular to the trail, for the peaks to stand off along.
      const sideX = -unitY;
      const sideY = unitX;

      const vertex = (along: number, lift: number) => {
        const px = startX + unitX * along + sideX * lift;
        const py = startY + unitY * along + sideY * lift;
        points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      };

      // Both ends are pinned on the straight line between the two dots: the
      // first vertex at `from`, the last exactly at `reach`. Only the last
      // peak — the one nearest the marker — takes up the slack.
      //
      // Ending on an interpolated point of the zigzag instead let the tip drift
      // up to the full amplitude off the axis as the trail's length changed,
      // and with it the gap to the dot: the trail looked welded to the card but
      // loose at the dot, which is exactly the asymmetry being fixed here.
      const trail = reach - from;
      const cycles = Math.min(Math.floor(trail / ZIGZAG_PERIOD), MAX_CYCLES);

      points.length = 0;
      for (let i = 0; i < cycles; i++) {
        // Peak, then back down to the baseline — which is what makes it read as
        // ^^^^ rather than a symmetrical wave.
        vertex(from + i * ZIGZAG_PERIOD, 0);
        vertex(from + i * ZIGZAG_PERIOD + ZIGZAG_STEP, ZIGZAG_AMPLITUDE);
      }
      // The leftover grows a peak of its own, its height rising with the room
      // it has. At a full period that peak is indistinguishable from the whole
      // ones, so the moment it is absorbed into the loop above nothing moves —
      // the trail still lengthens continuously, just from a fixed far end.
      const whole = cycles * ZIGZAG_PERIOD;
      const slack = trail - whole;
      if (slack > 0.5) {
        vertex(from + whole, 0);
        const lift = Math.min(ZIGZAG_AMPLITUDE, (ZIGZAG_AMPLITUDE * slack) / ZIGZAG_PERIOD);
        vertex(from + whole + slack / 2, lift);
      }
      vertex(reach, 0);

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
