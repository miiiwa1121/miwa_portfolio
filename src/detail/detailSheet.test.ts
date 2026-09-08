import { describe, expect, it } from "vitest";
import { SHEET_VARIANTS, exitDirectionFor } from "./detailSheet";

describe("exitDirectionFor", () => {
  it("continues upward when the reader scrolled down off the bottom", () => {
    expect(exitDirectionFor(0, 1)).toBe("up");
    expect(exitDirectionFor(0, 0.99)).toBe("up");
  });

  it("continues downward when the reader scrolled up off the top", () => {
    expect(exitDirectionFor(1, 0)).toBe("down");
    expect(exitDirectionFor(0.99, 0)).toBe("down");
  });

  it("is never 'down' for a bottom exit — that is the sweep this fixes", () => {
    // Sending the sheet down from the bottom spacer drags its lower edge, and
    // the shadow beneath it, across the entire viewport on the way out.
    for (const downward of [0.98, 0.99, 1]) {
      expect(exitDirectionFor(0, downward)).not.toBe("down");
    }
  });
});

describe("SHEET_VARIANTS", () => {
  it("enters from below and settles at rest", () => {
    expect(SHEET_VARIANTS.hidden).toEqual({ y: "100%" });
    expect(SHEET_VARIANTS.visible).toEqual({ y: 0 });
  });

  it("moves the sheet the way the direction says", () => {
    expect(SHEET_VARIANTS.exit("up")).toEqual({ y: "-100%" });
    expect(SHEET_VARIANTS.exit("down")).toEqual({ y: "100%" });
  });

  it("always clears a full viewport, so no edge is left mid-screen", () => {
    for (const direction of ["up", "down"] as const) {
      expect(SHEET_VARIANTS.exit(direction).y).toMatch(/^-?100%$/);
    }
  });

  it("leaves the way it came in for a button dismissal", () => {
    // No scroll gesture to follow, so the sheet retreats along its entrance.
    expect(SHEET_VARIANTS.exit("down")).toEqual(SHEET_VARIANTS.hidden);
  });
});
