"use client";

import { useEffect, useRef } from "react";
import { MARKER_TRAIL_GLOW, MARKER_TRAIL_INK, markerClearance } from "@/scene/markerBolt";
import { onMarkerScreen, type MarkerScreenPoint } from "@/scene/markerScreen";
import { lightningPath } from "./lightningPath";

/**
 * The bolt of lightning from the card out to the marker floating over its area.
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
 * Both ends are measured the same way: from the *edge* of the mark they leave,
 * outwards by a fixed clearance. The card's dot is an element and is measured;
 * the marker is drawn in WebGL at a size the scene sets in screen pixels and
 * publishes, so neither end's extent is ever estimated here.
 *
 * The far end takes one extra step. The marker is a lightning bolt, not a disc,
 * so "the edge" depends on which way the trail is coming from — `halfHeight`
 * goes through `markerClearance()` with the trail's own direction rather than
 * being subtracted outright, which would leave the ink stopping five pixels
 * short whenever the trail arrives across the bolt rather than along it.
 *
 * The shape between those two ends belongs to `lightningPath()`, which is pure
 * and tested; this file only maps its axis-relative points onto the screen and
 * writes them out. It redraws itself whenever the scene's `strike` turns over —
 * the same instant the marker at the far end flashes, since both come off the
 * one `FLICKER_PERIOD` in `markerBolt.ts`. So it reads as a single strike
 * rather than as two animations sharing a screen.
 */

const STROKE_WIDTH = 2.4;

/** Forks are secondary: thinner than the trunk, and dimmer. */
const FORK_STROKE_WIDTH = 1.8;
const FORK_OPACITY = 0.7;

/** The halo, laid down as a much wider stroke along the trunk's own path. */
const GLOW_STROKE_WIDTH = 7;

/**
 * A round linecap puts ink half a stroke beyond the last vertex, at both ends.
 * Both clearances below are ink-to-ink, so that overhang comes off the top.
 */
const CAP = STROKE_WIDTH / 2;

/** Clear space between the marker bolt's edge and the start of the ink. */
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
  const glowRef = useRef<SVGPathElement | null>(null);
  const trunkRef = useRef<SVGPathElement | null>(null);
  const forksRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (hidden) return;

    const draw = ({ x, y, halfHeight, strike, visible }: MarkerScreenPoint) => {
      const group = groupRef.current;
      const glow = glowRef.current;
      const trunk = trunkRef.current;
      const forks = forksRef.current;
      if (!group || !glow || !trunk || !forks) return;

      /**
       * The dot on the card is the trail's near end, so it goes with the
       * trail — a lone dot in the corner of a card with nothing leaving it
       * reads as a stray mark, which is the same reason it is dropped
       * outright once an area is focused (`AreaCard`).
       *
       * It matters more than it used to. The trail is only drawn while the
       * facing area's marker is actually on screen, and at the "near" orbit's
       * lean (see `NEAR_VERTICAL_SHARE`) that area spends much of a lap below
       * the frame — so the trail comes and goes where it used to be more or
       * less permanent. Written straight to the style for the same reason
       * nothing else here goes through React: this runs every frame.
       */
      const setAnchorShown = (shown: boolean) => {
        const anchor = anchorRef.current;
        if (anchor) anchor.style.opacity = shown ? "1" : "0";
      };

      const hide = () => {
        group.style.opacity = "0";
        setAnchorShown(false);
      };

      // No anchor means there is nothing to draw *from*, so the trail goes
      // away — rather than returning and leaving the last frame's path on
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

      const unitX = dx / span;
      const unitY = dy / span;
      // Perpendicular to the trail, for the kinks to stand off along.
      const sideX = -unitY;
      const sideY = unitX;

      // Where the ink starts and stops, both a fixed clearance out from the
      // edge of the mark at that end. The marker's extent comes from the scene:
      // `halfHeight` is the number the sprite was sized to this very frame, in
      // the same CSS pixels this SVG is drawn in, and `markerClearance` turns
      // it into how far the bolt's ink actually reaches back along the trail —
      // the direction *from* the marker *towards* the card, which is why the
      // unit vector goes in negated.
      const from = startRadius + CARD_GAP + CAP;
      const reach = span - markerClearance(halfHeight, -unitX, -unitY) - MARKER_GAP - CAP;
      if (reach - from < MIN_TRAIL) return hide();
      group.style.opacity = "1";
      setAnchorShown(true);

      // `lightningPath` works in (along, lift): distance down the trail, and
      // offset from its axis. Turning that into screen pixels is this file's
      // only geometric job — which is what keeps the shape itself testable
      // without a DOM, and keeps it from depending on which way the trail
      // happens to be pointing.
      const subpath = (line: readonly (readonly [number, number])[]) =>
        line
          .map(([along, lift], i) => {
            const px = startX + unitX * along + sideX * lift;
            const py = startY + unitY * along + sideY * lift;
            return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
          })
          .join("");

      const bolt = lightningPath(from, reach, strike);
      const trunkPath = subpath(bolt.trunk);
      trunk.setAttribute("d", trunkPath);
      glow.setAttribute("d", trunkPath);
      // Every fork in one element, as separate subpaths — three more <path>
      // nodes to keep in sync would buy nothing, since they all share a stroke.
      forks.setAttribute("d", bolt.forks.map(subpath).join(""));
    };

    return onMarkerScreen(draw);
  }, [anchorRef, hidden]);

  if (hidden) return null;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true">
      <g ref={groupRef} style={{ opacity: 0, transition: "opacity 240ms ease" }}>
        {/* The halo first, so the trunk is drawn over its own light. */}
        <path
          ref={glowRef}
          fill="none"
          stroke={MARKER_TRAIL_GLOW}
          strokeWidth={GLOW_STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          ref={forksRef}
          fill="none"
          stroke={MARKER_TRAIL_INK}
          strokeOpacity={FORK_OPACITY}
          strokeWidth={FORK_STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          ref={trunkRef}
          fill="none"
          stroke={MARKER_TRAIL_INK}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
