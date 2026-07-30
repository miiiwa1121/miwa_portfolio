import { describe, expect, it } from "vitest";
import {
  ABOUT_RETURN_AT,
  ABOUT_SETTLE_MS,
  aboutReturn,
  aboutReturnProgress,
  aboutScrollProgress,
  settleRetryDelay,
  shouldReturnHome,
  wheelScrollStep,
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

describe("wheelScrollStep", () => {
  // Literals, not ABOUT_SCROLL_RATE: written against the constant every one of
  // these holds at a rate of 1, which is the setting they exist to rule out —
  // it is the browser's own pace, i.e. the thing this replaced.
  it("carries the column half as far as the wheel asks", () => {
    expect(wheelScrollStep(100, 0, 950)).toBe(50);
    expect(wheelScrollStep(240, 0, 950)).toBe(120);
  });

  it("scrolls back up as readily as down", () => {
    expect(wheelScrollStep(-100, 0, 950)).toBe(-50);
  });

  // Firefox reports lines, not pixels: three of them damped as though they
  // were three pixels would leave the column all but frozen.
  it("reads a delta in lines as lines", () => {
    expect(wheelScrollStep(3, 1, 950)).toBe(60);
    expect(wheelScrollStep(-3, 1, 950)).toBe(-60);
  });

  // A page is the reader's own viewport, so this one cannot be a fixed figure.
  it("reads a delta in pages against the column's own height", () => {
    expect(wheelScrollStep(1, 2, 950)).toBe(475);
    expect(wheelScrollStep(1, 2, 600)).toBe(300);
  });

  it("never travels further than the browser would have", () => {
    for (const delta of [-500, -100, -1, 1, 16, 100, 2000]) {
      expect(Math.abs(wheelScrollStep(delta, 0, 950))).toBeLessThan(Math.abs(delta));
    }
  });
});

describe("settleRetryDelay", () => {
  // The case it exists for: a flick that reaches the bottom during the
  // entrance is refused, and at the bottom there is no further scroll event
  // to ask again with — the reader would be left facing a screen the text has
  // already left. A literal, not ABOUT_SETTLE_MS - 100: the delay has to
  // outlast the window from *this* moment, not from the opening.
  it("waits out what is left of the window", () => {
    expect(settleRetryDelay(1, 100)).toBe(401);
    expect(settleRetryDelay(1, 400)).toBe(101);
  });

  it("does not wait once the window has passed — that scroll went home", () => {
    expect(settleRetryDelay(1, ABOUT_SETTLE_MS + 1)).toBe(0);
    expect(settleRetryDelay(1, 5000)).toBe(0);
  });

  // Part way down the column there is nothing to reconsider: the reader has
  // more to scroll, and scrolling it will ask again by itself.
  it("does not wait part way down the column", () => {
    expect(settleRetryDelay(0, 100)).toBe(0);
    expect(settleRetryDelay(0.9, 100)).toBe(0);
  });

  // Whatever the retry waits, waking on it has to be enough: shouldReturnHome
  // wants the age *past* the window, not level with it.
  it("wakes late enough for the return to be allowed", () => {
    const arrivedAt = 120;
    const delay = settleRetryDelay(1, arrivedAt);
    expect(shouldReturnHome(1, arrivedAt + delay)).toBe(true);
  });
});

describe("aboutReturnProgress", () => {
  // Literals rather than ABOUT_RETURN_FROM: what is being pinned down is that
  // the camera holds still for the *first half* and not for some other share
  // of the column. Written against the constant, every one of these would hold
  // for any starting point at all, including 0 (a camera already leaving while
  // the first paragraph is being read) and 0.99 (a snap at the end).
  it("holds still through the first half of the column", () => {
    expect(aboutReturnProgress(0)).toBe(0);
    expect(aboutReturnProgress(0.25)).toBe(0);
    expect(aboutReturnProgress(0.5)).toBe(0);
  });

  it("spends the second half getting home", () => {
    expect(aboutReturnProgress(0.625)).toBeCloseTo(0.25, 9);
    expect(aboutReturnProgress(0.75)).toBeCloseTo(0.5, 9);
    expect(aboutReturnProgress(0.875)).toBeCloseTo(0.75, 9);
  });

  it("has landed by the bottom of the column", () => {
    expect(aboutReturnProgress(1)).toBe(1);
  });

  // The two ends have to agree: the column stops scrolling and hands over at
  // ABOUT_RETURN_AT, and whatever is left of the trip at that moment is a jump
  // the camera makes with nobody scrolling. Not a constant compared with
  // itself — this fails outright if the handover moves earlier or the trip
  // starts later.
  it("is all but home at the point the column returns", () => {
    expect(aboutReturnProgress(ABOUT_RETURN_AT)).toBeGreaterThan(0.98);
  });

  // Rubber-banding hands back positions past both ends, and this feeds an
  // interpolation between two framings: outside 0..1 it does not read as
  // "past the end" but as a camera thrown somewhere neither framing is.
  it("clamps an overscroll at either end", () => {
    expect(aboutReturnProgress(1.4)).toBe(1);
    expect(aboutReturnProgress(-0.2)).toBe(0);
  });
});

describe("aboutReturn", () => {
  it("hands the column's latest reading to whoever asks", () => {
    aboutReturn.publish(0);
    expect(aboutReturn.progress()).toBe(0);
    aboutReturn.publish(0.4);
    expect(aboutReturn.progress()).toBe(0.4);
    aboutReturn.publish(1);
    expect(aboutReturn.progress()).toBe(1);
    // Reversible: scrolling back up has to take the camera back out again.
    aboutReturn.publish(0.2);
    expect(aboutReturn.progress()).toBe(0.2);
  });
});
