import { describe, expect, it } from "vitest";
import { markerOnScreen } from "./markerScreen";

/**
 * The rule that decides whether the card's dotted trail is drawn at all.
 *
 * Worth its own file despite being four comparisons: it is the one place in
 * the scene where saying "no" produces *nothing on screen*, which is
 * indistinguishable from a feature that was never built. It answered no on
 * every frame of the default view for a whole release (see
 * `NEAR_VERTICAL_SHARE`), and there was no test to notice.
 */
describe("markerOnScreen", () => {
  const W = 1440;
  const H = 900;

  it("accepts a marker in front of the camera and inside the frame", () => {
    expect(markerOnScreen(720, 450, 0.5, W, H)).toBe(true);
  });

  it("accepts the exact edges — a marker touching the frame is still pointable", () => {
    expect(markerOnScreen(0, 0, 0.5, W, H)).toBe(true);
    expect(markerOnScreen(W, H, 0.5, W, H)).toBe(true);
  });

  it("rejects a marker past the bottom of the frame — the failure that shipped", () => {
    // 1548 is a real sample: the facing area's marker at the old
    // NEAR_VERTICAL_SHARE of 0.78, 648px below a 900px frame.
    expect(markerOnScreen(720, 1548, 0.5, W, H)).toBe(false);
  });

  it("rejects a marker off any other edge", () => {
    expect(markerOnScreen(-1, 450, 0.5, W, H)).toBe(false);
    expect(markerOnScreen(W + 1, 450, 0.5, W, H)).toBe(false);
    expect(markerOnScreen(720, -1, 0.5, W, H)).toBe(false);
  });

  it("rejects a marker behind the camera even though it projects inside the frame", () => {
    // Past the far plane the projection flips sign, so a point behind the
    // camera lands at a perfectly plausible-looking screen position — pointing
    // the trail in exactly the wrong direction.
    expect(markerOnScreen(720, 450, 1, W, H)).toBe(false);
    expect(markerOnScreen(720, 450, 1.4, W, H)).toBe(false);
  });
});
