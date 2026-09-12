import { describe, expect, it } from "vitest";
import { twoFingerGesture } from "./viewGesture";

// The two thresholds Scene.tsx passes in, so the cases below read as the
// gestures they describe rather than as bare numbers.
const PINCH = 60;
const SCROLL = 24;
const read = (spread: number, travel: number) => twoFingerGesture(spread, travel, PINCH, SCROLL);

describe("twoFingerGesture", () => {
  it("says nothing until a threshold is crossed", () => {
    expect(read(0, 0)).toBeNull();
    expect(read(20, 10)).toBeNull();
    expect(read(-20, -10)).toBeNull();
  });

  it("reads fingers travelling together as a scroll, either way up", () => {
    expect(read(2, 40)).toBe("scroll");
    expect(read(-3, -40)).toBe("scroll");
  });

  it("reads a symmetric pinch as a zoom, opening or closing", () => {
    expect(read(70, 0)).toBe("zoom");
    expect(read(-70, 1)).toBe("zoom");
  });

  /**
   * The case the rule exists for. One thumb planted, one finger sliding — the
   * one-handed pinch — changes the separation twice as fast as it moves the
   * midpoint. A "first past the post" race between the thresholds would call
   * it a scroll at travel 24 (separation 48, still short of 60) and the
   * altitude would never switch on a phone held in one hand.
   */
  it("keeps a one-finger-anchored pinch a pinch", () => {
    expect(read(48, 24)).toBeNull(); // partway: neither owns it yet
    expect(read(60, 30)).toBe("zoom"); // the separation gets there first
    expect(read(-60, -30)).toBe("zoom");
  });

  it("still calls it a scroll when the fingers drift apart a little on the way", () => {
    // A swipe is never perfectly parallel; what matters is that the drift is
    // small next to the travel.
    expect(read(8, 30)).toBe("scroll");
    expect(read(-8, 30)).toBe("scroll");
  });

  it("refuses to answer 'scroll' for a gesture that is mostly separation", () => {
    // Travel is past its threshold but the fingers are opening faster than
    // they are moving — this is a pinch that has not finished arriving.
    expect(read(50, 30)).toBeNull();
  });
});
