import { describe, expect, it } from "vitest";
import {
  ABOUT_SETTLE_MS,
  aboutReturn,
  aboutReturnProgress,
  aboutScrollProgress,
  autoScrollStep,
  scrollCatchUp,
  settleRetryDelay,
  shouldReturnHome,
  wheelScrollStep,
} from "./aboutScroll";

describe("aboutScrollProgress", () => {
  it("is 0 at the top and 1 once scrollTop reaches proseBottom", () => {
    expect(aboutScrollProgress(0, 2000)).toBe(0);
    expect(aboutScrollProgress(2000, 2000)).toBe(1);
  });

  it("reads the middle proportionally", () => {
    expect(aboutScrollProgress(1000, 2000)).toBeCloseTo(0.5, 9);
  });

  // proseBottom <= 0 means the ref hasn't been measured yet (a first frame
  // before layout) — reading that as 0 rather than dividing by it keeps a
  // reader from being sent straight home before a word has scrolled past.
  it("stays at 0 when proseBottom is not known yet", () => {
    expect(aboutScrollProgress(0, 0)).toBe(0);
    expect(aboutScrollProgress(500, 0)).toBe(0);
    expect(aboutScrollProgress(500, -100)).toBe(0);
  });

  it("clamps past proseBottom rather than reporting more than 1", () => {
    // Scrolled into the trailing spacer, past the prose block's own bottom
    // edge — still fully progressed, not overshot.
    expect(aboutScrollProgress(2600, 2000)).toBe(1);
    // Rubber-banding at the top hands back a negative scrollTop.
    expect(aboutScrollProgress(-80, 2000)).toBe(0);
  });

  it("never leaves the 0..1 range for any input", () => {
    for (const top of [-500, 0, 37, 1999, 5000]) {
      for (const proseBottom of [2000, 801, 800, 1]) {
        const progress = aboutScrollProgress(top, proseBottom);
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

  // Literals, not ABOUT_RETURN_AT: written against the constant this would
  // hold for any threshold at all, including the old 0.995. The whole point
  // of the redefinition (see aboutScrollProgress) is that progress 1 already
  // means the text is fully gone, with real headroom before the column's
  // actual scroll ceiling — so unlike the old scrollHeight-based progress,
  // nothing here needs an early fudge for momentum stopping short, and
  // firing before exactly 1 would take the camera home while a sliver of
  // the last line was still on screen.
  it("does not fire until progress reaches exactly 1", () => {
    expect(shouldReturnHome(0.999, settled)).toBe(false);
    expect(shouldReturnHome(1, settled)).toBe(true);
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
  it("damps the wheel well below the browser's own pace", () => {
    expect(wheelScrollStep(100, 0, 950)).toBe(20);
    expect(wheelScrollStep(240, 0, 950)).toBe(48);
  });

  it("scrolls back up as readily as down", () => {
    expect(wheelScrollStep(-100, 0, 950)).toBe(-20);
  });

  // Firefox reports lines, not pixels: three of them damped as though they
  // were three pixels would leave the column all but frozen.
  it("reads a delta in lines as lines", () => {
    expect(wheelScrollStep(3, 1, 950)).toBe(24);
    expect(wheelScrollStep(-3, 1, 950)).toBe(-24);
  });

  // A page is the reader's own viewport, so this one cannot be a fixed figure.
  it("reads a delta in pages against the column's own height", () => {
    expect(wheelScrollStep(1, 2, 950)).toBe(190);
    expect(wheelScrollStep(1, 2, 600)).toBe(120);
  });

  it("never travels further than the browser would have", () => {
    for (const delta of [-500, -100, -1, 1, 16, 100, 2000]) {
      expect(Math.abs(wheelScrollStep(delta, 0, 950))).toBeLessThan(Math.abs(delta));
    }
  });
});

describe("autoScrollStep", () => {
  /** A believable computed line height for the crawl at a desktop breakpoint. */
  const LINE = 100;

  it("is zero for no elapsed time", () => {
    expect(autoScrollStep(0, LINE)).toBe(0);
  });

  // Literals, not the constant: this is checking the multiplication itself
  // happens, not restating whatever the rate is set to. Half a line a second
  // of a 100px line is 50px/s, so 0.05s is 2.5px.
  it("scales linearly with elapsed time below the clamp", () => {
    expect(autoScrollStep(0.05, LINE)).toBeCloseTo(2.5, 9);
    expect(autoScrollStep(0.1, LINE)).toBeCloseTo(5, 9);
  });

  // The whole point of measuring the pace in lines: the same elapsed time has
  // to carry the reader over the same amount of *text* whatever size it is
  // rendered at. Doubling the type doubles the pixels travelled, so the words
  // still go by at one rate — which is what a pixel rate could not do (it made
  // the crawl four times slower to read the moment the type was enlarged to
  // match reference/image9.jpg).
  it("travels twice as far when the type is twice as large", () => {
    expect(autoScrollStep(0.1, 200)).toBeCloseTo(2 * autoScrollStep(0.1, 100), 9);
  });

  // The case the clamp exists for: a backgrounded tab's next rAF callback can
  // arrive seconds after the last one, and advancing the column by that much
  // in a single step would jump over lines — or past ABOUT_RETURN_AT — rather
  // than simply keep the crawl playing at its usual pace.
  it("clamps a large gap instead of jumping the column forward", () => {
    expect(autoScrollStep(1, LINE)).toBeCloseTo(5, 9);
    expect(autoScrollStep(5, LINE)).toBeCloseTo(5, 9);
  });

  // `getComputedStyle(...).lineHeight` reports the keyword `normal` on an
  // element that never set one, and reads back as NaN. Moving the column by
  // NaN sets scrollTop to 0 and pins the crawl at the top forever, which is a
  // far worse failure than simply not auto-playing.
  it("refuses a line height it cannot use, rather than producing NaN", () => {
    expect(autoScrollStep(0.1, NaN)).toBe(0);
    expect(autoScrollStep(0.1, 0)).toBe(0);
    expect(autoScrollStep(0.1, -20)).toBe(0);
  });
});

describe("scrollCatchUp", () => {
  const FRAME = 1 / 60;

  /** Walk a column from `from` towards `target` for `seconds`, one frame at a time. */
  const settle = (from: number, target: number, seconds: number) => {
    let at = from;
    for (let t = 0; t < seconds; t += FRAME) at += scrollCatchUp(at, target, FRAME);
    return at;
  };

  it("splits one flick across many frames instead of applying it whole", () => {
    // The reason this exists: the camera's framing is a direct function of
    // scrollTop, so a wheel event written straight through put the trackpad's
    // own delta pattern onto the planet.
    const flick = 600;
    const firstFrame = scrollCatchUp(0, flick, FRAME);
    expect(firstFrame).toBeGreaterThan(0);
    expect(firstFrame).toBeLessThan(flick / 4);
  });

  it("gets there, and quickly enough that a flick still reads as a flick", () => {
    expect(settle(0, 600, 0.25)).toBeGreaterThan(600 * 0.9);
    expect(settle(0, 600, 1)).toBeCloseTo(600, 1);
  });

  it("never overshoots, however long the frame was", () => {
    // A tab returning from the background hands the loop a multi-second step.
    // Sailing past the target and coming back would be a bounce nobody asked
    // for — and would take the camera with it.
    for (const delta of [FRAME, 0.5, 5, 120]) {
      expect(scrollCatchUp(0, 600, delta)).toBeLessThanOrEqual(600);
      expect(scrollCatchUp(600, 0, delta)).toBeGreaterThanOrEqual(-600);
    }
  });

  it("backs up the same way it goes forward", () => {
    // Scrolling up to re-read a line is the same journey in reverse, and the
    // camera follows it back out — the trip home is not one-way.
    expect(settle(600, 0, 0.25)).toBeLessThan(60);
    expect(scrollCatchUp(600, 0, FRAME)).toBeCloseTo(-scrollCatchUp(0, 600, FRAME), 10);
  });

  it("stands still when there is nowhere to go, or no time to do it in", () => {
    expect(scrollCatchUp(400, 400, FRAME)).toBe(0);
    expect(scrollCatchUp(0, 600, 0)).toBe(0);
    expect(scrollCatchUp(0, 600, -1)).toBe(0);
  });

  it("yields no movement rather than a NaN scrollTop", () => {
    // The same trap `autoScrollStep` guards: a NaN written to scrollTop lands
    // as 0 and strands the column at the top with nothing to say why.
    expect(scrollCatchUp(0, Number.NaN, FRAME)).toBe(0);
    expect(scrollCatchUp(Number.NaN, 600, FRAME)).toBe(0);
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
  // the camera holds still for the first *third* of the column and not for
  // some other share of it. Written against the constant, every one of these
  // would hold for any starting point at all, including 0 (a camera already
  // leaving while the first paragraph is being read) and 0.99 (a snap at the
  // end). The odd-looking figures below are the quarter points of the span
  // that is left, worked out from 0.35 rather than chosen for looks.
  it("holds still through the first third of the column", () => {
    expect(aboutReturnProgress(0)).toBe(0);
    expect(aboutReturnProgress(0.2)).toBe(0);
    expect(aboutReturnProgress(0.35)).toBe(0);
  });

  // Deliberately asserted at 0.5 too: that used to be the moment the camera
  // was still standing still, so a revert to the old constant fails here
  // rather than silently passing the checks either side of it.
  it("is already on its way by the middle of the column", () => {
    expect(aboutReturnProgress(0.5)).toBeGreaterThan(0.2);
  });

  it("spends the rest of the column getting home", () => {
    expect(aboutReturnProgress(0.5125)).toBeCloseTo(0.25, 9);
    expect(aboutReturnProgress(0.675)).toBeCloseTo(0.5, 9);
    expect(aboutReturnProgress(0.8375)).toBeCloseTo(0.75, 9);
  });

  // The two ends have to agree: ABOUT_RETURN_AT is exactly 1 (see its own
  // comment), so the column handing over and the camera finishing its trip
  // home are the same instant — nothing here is a jump the camera makes with
  // nobody scrolling.
  it("has landed by the bottom of the column", () => {
    expect(aboutReturnProgress(1)).toBe(1);
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
