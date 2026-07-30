import { describe, expect, it } from "vitest";
import {
  ABOUT_SETTLE_MS,
  aboutScrollProgress,
  shouldReturnHome,
} from "./aboutScroll";

describe("aboutScrollProgress", () => {
  it("is 0 at the top and 1 at the bottom", () => {
    expect(aboutScrollProgress(0, 2000, 800)).toBe(0);
    expect(aboutScrollProgress(1200, 2000, 800)).toBe(1);
  });

  it("reads the middle proportionally", () => {
    expect(aboutScrollProgress(600, 2000, 800)).toBeCloseTo(0.5, 9);
  });

  // The case that would send a first-time reader straight home: a viewport
  // tall enough to fit the whole column, where there is no scrolling to do.
  it("stays at 0 when there is nothing to scroll", () => {
    expect(aboutScrollProgress(0, 800, 800)).toBe(0);
    expect(aboutScrollProgress(0, 500, 800)).toBe(0);
  });

  it("clamps an overscroll rather than reporting past the end", () => {
    // Rubber-banding hands back a scrollTop beyond the maximum, and a negative
    // one at the top.
    expect(aboutScrollProgress(1500, 2000, 800)).toBe(1);
    expect(aboutScrollProgress(-80, 2000, 800)).toBe(0);
  });

  it("never leaves the 0..1 range for any input", () => {
    for (const top of [-500, 0, 37, 1199, 5000]) {
      for (const [height, client] of [[2000, 800], [801, 800], [800, 800], [3000, 400]]) {
        const progress = aboutScrollProgress(top, height, client);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("shouldReturnHome", () => {
  const settled = ABOUT_SETTLE_MS + 1;

  it("returns once the column has been read to the end", () => {
    expect(shouldReturnHome(1, settled)).toBe(true);
  });

  // A literal, not ABOUT_RETURN_AT: comparing the threshold against itself
  // holds for any threshold at all, including 1 — which is the setting this
  // is here to rule out. Momentum scrolling routinely stops a pixel or two
  // short of the bottom and then sends no further events, so demanding the
  // exact end would strand the reader there.
  it("tolerates momentum stopping a hair short", () => {
    expect(shouldReturnHome(0.997, settled)).toBe(true);
  });

  it("stays put part way down", () => {
    expect(shouldReturnHome(0, settled)).toBe(false);
    expect(shouldReturnHome(0.5, settled)).toBe(false);
    expect(shouldReturnHome(0.98, settled)).toBe(false);
  });

  // A wheel already coasting when the area was opened arrives during the
  // entrance animation, and without the delay would bounce it straight back.
  it("ignores a scroll that lands while the column is still arriving", () => {
    expect(shouldReturnHome(1, 0)).toBe(false);
    expect(shouldReturnHome(1, ABOUT_SETTLE_MS)).toBe(false);
  });
});
