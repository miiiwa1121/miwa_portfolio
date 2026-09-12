import { describe, expect, it } from "vitest";
import {
  RAIL_NEIGHBOUR_SHARE,
  RAIL_ORDER,
  isRailTap,
  railOffsetPx,
  railWindow,
  stepForRailDrag,
} from "./railLayout";
import { adjacentOnTour } from "@/scene/planet/tour";

describe("railWindow", () => {
  it("puts the area in front in the middle", () => {
    for (const section of RAIL_ORDER) {
      const middle = railWindow(section).find((card) => card.slot === 0);
      expect(middle?.section).toBe(section);
    }
  });

  it("shows three distinct areas, whichever one is in front", () => {
    for (const section of RAIL_ORDER) {
      const sections = railWindow(section).map((card) => card.section);
      expect(new Set(sections).size).toBe(3);
    }
  });

  it("lays the slots out left to right", () => {
    expect(railWindow("about").map((card) => card.slot)).toEqual([-1, 0, 1]);
  });

  // The seam is the whole reason the rail is a travelling window rather than
  // a fixed strip of five: standing on either end of TOUR_ORDER has to look
  // exactly like standing anywhere else.
  it("has no seam at the ends of the tour", () => {
    const first = RAIL_ORDER[0];
    const last = RAIL_ORDER[RAIL_ORDER.length - 1];

    expect(railWindow(first)[0].section).toBe(last);
    expect(railWindow(last)[2].section).toBe(first);
  });

  it("agrees with the step the swipe asks the camera for", () => {
    // Dragging left asks for +1 and must land on the card that was peeking in
    // from the right — if these two disagree, the card the reader aimed at is
    // not the one that arrives.
    for (const section of RAIL_ORDER) {
      const right = railWindow(section)[2].section;
      expect(adjacentOnTour(section, stepForRailDrag(-100, 0))).toBe(right);

      const left = railWindow(section)[0].section;
      expect(adjacentOnTour(section, stepForRailDrag(100, 0))).toBe(left);
    }
  });
});

describe("stepForRailDrag", () => {
  it("advances along the tour when the strip is pulled left", () => {
    expect(stepForRailDrag(-80, 0)).toBe(1);
  });

  it("goes back when the strip is pulled right", () => {
    expect(stepForRailDrag(80, 0)).toBe(-1);
  });

  // Literals, not the constant: comparing the threshold against itself would
  // stay green at any value (docs/testing.md).
  it("refuses a drag shorter than the threshold", () => {
    expect(stepForRailDrag(35, 0)).toBe(0);
    expect(stepForRailDrag(-35, 0)).toBe(0);
    expect(stepForRailDrag(36, 0)).toBe(-1);
    expect(stepForRailDrag(-36, 0)).toBe(1);
  });

  // A mostly-vertical drag over the rail is someone reaching past it to tip
  // the planet. Answering it with a step would make the rail feel like it
  // were swallowing gestures aimed at the diorama behind it.
  it("refuses a drag that is mostly vertical, however long", () => {
    expect(stepForRailDrag(-60, -200)).toBe(0);
    expect(stepForRailDrag(60, 200)).toBe(0);
  });

  it("takes a diagonal that is mostly horizontal", () => {
    expect(stepForRailDrag(-100, 40)).toBe(1);
  });
});

describe("isRailTap", () => {
  it("lets a fingertip wobble still count as a tap", () => {
    expect(isRailTap(4, 4)).toBe(true);
  });

  it("is measured as a distance, not per axis", () => {
    // 8px on each axis is 11.3px of travel — past the slop, even though
    // neither axis alone is. An `||` of two per-axis tests would pass this.
    expect(isRailTap(8, 8)).toBe(false);
  });

  it("does not count a deliberate drag as a tap", () => {
    expect(isRailTap(40, 0)).toBe(false);
  });

  // A drag can be both "not a tap" and "not a step" — short enough to mean
  // nothing but too long to open a page. Opening on it would mean a reader
  // who started to swipe and changed their mind lands on a detail page.
  it("leaves a dead band between a tap and a step", () => {
    expect(isRailTap(20, 0)).toBe(false);
    expect(stepForRailDrag(20, 0)).toBe(0);
  });
});

describe("railOffsetPx", () => {
  it("centres the card in front", () => {
    expect(railOffsetPx(0, 300)).toBe(0);
  });

  it("puts the neighbours symmetrically either side", () => {
    expect(railOffsetPx(-1, 300)).toBe(-railOffsetPx(1, 300));
  });

  // Over one card's width, so a neighbour clears the middle card's edge
  // instead of covering it — the gap is what makes them read as separate
  // cards rather than one stack.
  it("leaves a gap between a neighbour and the middle card", () => {
    expect(Math.abs(railOffsetPx(1, 300))).toBeGreaterThan(300);
    expect(RAIL_NEIGHBOUR_SHARE).toBeGreaterThan(1);
  });

  // The gap is a seam, not a second column: past a fifth of a card the
  // neighbour has left the screen entirely at 390px and stops saying there
  // is one either way.
  it("keeps the gap narrow enough for the neighbour to stay on screen", () => {
    expect(Math.abs(railOffsetPx(1, 300))).toBeLessThan(360);
  });
});
