import { describe, expect, it } from "vitest";
import { BOLT_PATH, boltFlicker, markerClearance, strikeIndex } from "./markerBolt";

/**
 * Is a point inside the bolt's outline? Even-odd ray casting, written out here
 * rather than imported, so the clearance tests below have an oracle that shares
 * no arithmetic with the thing they are checking.
 *
 * `markerClearance` answers "where does the outline end along this ray" by
 * intersecting segments; this answers "is there ink here" by counting
 * crossings. Agreeing is evidence; restating the same formula would not be.
 */
function insideBolt(px: number, py: number): boolean {
  let inside = false;
  for (let i = 0; i < BOLT_PATH.length; i++) {
    const [ax, ay] = BOLT_PATH[i];
    const [bx, by] = BOLT_PATH[(i + 1) % BOLT_PATH.length];
    if (ay > py === by > py) continue;
    const crossX = ax + ((py - ay) / (by - ay)) * (bx - ax);
    if (px < crossX) inside = !inside;
  }
  return inside;
}

/** 72 directions, nudged off the compass points so no ray hits a vertex. */
const DIRECTIONS = Array.from({ length: 72 }, (_, i) => {
  const angle = ((i + 0.37) * Math.PI * 2) / 72;
  return [Math.cos(angle), Math.sin(angle)] as const;
});

describe("BOLT_PATH", () => {
  // The one property the sprite's sizing depends on. `markerScaleForScreenRadius`
  // hands back a scale on the assumption that the painted glyph reaches the
  // full half-height; a path that stopped at 0.9 would make every marker 10%
  // smaller than asked for, silently.
  it("spans the full height it is sized against", () => {
    const ys = BOLT_PATH.map(([, y]) => y);
    expect(Math.min(...ys)).toBeCloseTo(-1);
    expect(Math.max(...ys)).toBeCloseTo(1);
  });

  it("is narrower than it is tall — otherwise it is not a bolt", () => {
    const widest = Math.max(...BOLT_PATH.map(([x]) => Math.abs(x)));
    expect(widest).toBeLessThan(0.7);
    expect(widest).toBeGreaterThan(0.3);
  });

  // Everything else here shoots rays from the centre, and the trail's tip is
  // placed relative to it. If the centre fell outside the ink, a ray could
  // leave without ever crossing and the trail would be told the marker has no
  // extent at all.
  it("contains its own centre", () => {
    expect(insideBolt(0, 0)).toBe(true);
  });

  // Star-shaped about that centre: the ink along any ray is one unbroken run,
  // so "how far does it reach this way" has a single answer. Without this the
  // shape could hide part of itself behind a notch, and `markerClearance`
  // returning one number would be a choice rather than a fact. Sampled by
  // walking outwards and counting how many times the ink starts and stops.
  it("shows its whole self from the centre, so the reach is never ambiguous", () => {
    for (const [dx, dy] of DIRECTIONS) {
      let runs = 0;
      let wasInside = false;
      for (let r = 0; r <= 1.2; r += 0.002) {
        const now = insideBolt(r * dx, r * dy);
        if (now && !wasInside) runs++;
        wasInside = now;
      }
      expect(runs).toBe(1);
    }
  });

  it("does not cross itself", () => {
    // The two long edges run parallel, which is what keeps the upper wedge and
    // the lower one apart. Checked as segment-vs-segment over every
    // non-adjacent pair, so an edit that folds the shape shows up here rather
    // than as a stray triangle in the texture.
    const n = BOLT_PATH.length;
    const side = (p: readonly number[], q: readonly number[], r: readonly number[]) =>
      Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (j === i + 1 || (i === 0 && j === n - 1)) continue; // shares a vertex
        const [a, b] = [BOLT_PATH[i], BOLT_PATH[(i + 1) % n]];
        const [c, d] = [BOLT_PATH[j], BOLT_PATH[(j + 1) % n]];
        const crossing =
          side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
        expect(crossing).toBe(false);
      }
    }
  });
});

describe("markerClearance", () => {
  // The spec, stated as what the reader would see if it were wrong: the trail
  // stops MARKER_GAP out from the ink, so the point it stops at must be past
  // the ink — and only just past it, or the gap gapes.
  //
  // Both halves matter. Without the first, drawing the trail across the bolt
  // passes; without the second, returning a huge number passes, and the trail
  // would simply float off unattached.
  it("lands just outside the ink, in every direction", () => {
    for (const [dx, dy] of DIRECTIONS) {
      const reach = markerClearance(1, dx, dy);
      expect(insideBolt(reach * 1.02 * dx, reach * 1.02 * dy)).toBe(false);
      expect(insideBolt(reach * 0.98 * dx, reach * 0.98 * dy)).toBe(true);
    }
  });

  it("scales with the marker's half-height", () => {
    for (const [dx, dy] of DIRECTIONS.slice(0, 8)) {
      expect(markerClearance(14, dx, dy)).toBeCloseTo(markerClearance(1, dx, dy) * 14, 9);
    }
  });

  // Literals, not `MARKER_GLYPH_FILL`-derived expressions: these are the two
  // numbers the trail actually meets most often, and pinning them is what says
  // "the bolt leans, so even straight up its ink stops well short of the
  // half-height". Subtracting the half-height outright — what the disc used to
  // allow — would have put these at 1.0.
  it("stops at 0.61 of the half-height straight up, where the tip leans off-axis", () => {
    expect(markerClearance(10, 0, -1)).toBeCloseTo(6.12, 2);
  });

  it("stops at 0.45 of the half-height straight across, where the bolt is narrow", () => {
    expect(markerClearance(10, 1, 0)).toBeCloseTo(4.45, 2);
  });

  it("never claims more reach than the glyph's own half-height", () => {
    for (const [dx, dy] of DIRECTIONS) {
      expect(markerClearance(10, dx, dy)).toBeLessThanOrEqual(10);
      expect(markerClearance(10, dx, dy)).toBeGreaterThan(0);
    }
  });
});

describe("boltFlicker", () => {
  // A spark is a spark because it is rare. If this ever returned something
  // other than 1 for most of a cycle, the marker would be strobing.
  it("leaves the marker alone for most of the cycle", () => {
    for (const t of [0.5, 1.0, 2.0, 3.3, 7.1]) expect(boltFlicker(t)).toBe(1);
  });

  it("reaches 2.2 a quarter of the way into a spark", () => {
    expect(boltFlicker(0.055)).toBeCloseTo(2.2, 6);
  });

  it("flashes twice, dipping back to 1 in between", () => {
    // Half-way through the spark both flashes have room to be seen as separate.
    // A single ramp would read as another size pulse rather than as lightning.
    expect(boltFlicker(0.11)).toBeCloseTo(1, 6);
    expect(boltFlicker(0.165)).toBeCloseTo(2.2, 6);
  });

  it("starts and ends at rest, so the spark neither pops in nor out", () => {
    expect(boltFlicker(0)).toBeCloseTo(1, 6);
    expect(boltFlicker(0.22)).toBe(1);
  });

  it("repeats every 3.4 seconds", () => {
    for (const t of [0.03, 0.11, 0.2, 1.7]) {
      expect(boltFlicker(t + 3.4)).toBeCloseTo(boltFlicker(t), 9);
      expect(boltFlicker(t + 6.8)).toBeCloseTo(boltFlicker(t), 9);
    }
  });

  it("stays between rest and the peak, however long the scene has run", () => {
    for (let t = 0; t < 12; t += 0.001) {
      const flicker = boltFlicker(t);
      expect(flicker).toBeGreaterThanOrEqual(1);
      expect(flicker).toBeLessThanOrEqual(2.2);
    }
  });
});

describe("strikeIndex", () => {
  it("counts up one per 3.4 seconds", () => {
    expect(strikeIndex(0)).toBe(0);
    expect(strikeIndex(3.39)).toBe(0);
    expect(strikeIndex(3.4)).toBe(1);
    expect(strikeIndex(6.8)).toBe(2);
    expect(strikeIndex(34)).toBe(10);
  });

  it("holds still between strikes, so the trail is not redrawn every frame", () => {
    for (let t = 3.4; t < 6.8; t += 0.05) expect(strikeIndex(t)).toBe(1);
  });

  /**
   * The reason `strikeIndex` reads `FLICKER_PERIOD` instead of owning a period
   * of its own, checked from outside: the trail must re-jag on the frame the
   * marker flashes, not a moment either side of it.
   *
   * Two constants would let that drift silently — the flash and the redraw
   * would still both happen, just not together, and nothing would go red.
   */
  it("turns over on exactly the frame the marker sparks", () => {
    for (const strike of [1, 2, 5]) {
      const at = strike * 3.4;
      expect(boltFlicker(at - 0.01)).toBe(1);
      expect(strikeIndex(at - 0.01)).toBe(strike - 1);
      expect(boltFlicker(at + 0.055)).toBeGreaterThan(1);
      expect(strikeIndex(at + 0.055)).toBe(strike);
    }
  });
});
