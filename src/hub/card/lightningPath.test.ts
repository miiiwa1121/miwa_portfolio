import { describe, expect, it } from "vitest";
import { envelope, lightningPath } from "./lightningPath";

const FROM = 30;
const TO = 400;

/** The shortest trail `CardLeaderLine` will draw at all (its `MIN_TRAIL`). */
const MIN_ROOM = 48;

describe("lightningPath trunk", () => {
  // The clearances at both ends were measured by the caller — from the card's
  // dot and from the marker's ink. A bolt that started or stopped anywhere else
  // would silently spend them.
  it("starts and stops exactly where it was asked to, on the axis", () => {
    for (const to of [120, 260, 400, 900]) {
      const { trunk } = lightningPath(FROM, to, 3);
      expect(trunk[0]).toEqual([FROM, 0]);
      expect(trunk.at(-1)).toEqual([to, 0]);
    }
  });

  it("only ever moves forwards", () => {
    // A kink that doubled back would draw a spur pointing at the card, which
    // reads as the trail having snagged on something.
    const { trunk } = lightningPath(FROM, TO, 5);
    for (let i = 1; i < trunk.length; i++) {
      expect(trunk[i][0]).toBeGreaterThan(trunk[i - 1][0]);
    }
  });

  it("strays no more than 10px from the axis", () => {
    // Literal, not AMPLITUDE: a test that read the constant back would pass
    // however wide the bolt got.
    for (const strike of [0, 1, 7, 42, 199]) {
      for (const [along, lift] of lightningPath(FROM, 1200, strike).trunk) {
        expect(Math.abs(lift)).toBeLessThanOrEqual(10);
        expect(along).toBeGreaterThanOrEqual(FROM);
      }
    }
  });

  // The failure this guards against is not a crash but a *look*: the first
  // draft used a mean-reverting wander, whose convex combination pulled the
  // offsets towards the middle and drew a gently wavy line instead of a strike.
  // Nothing was out of bounds; it simply was not lightning. So: consecutive
  // kinks must actually cut across the axis, most of the time.
  it("cuts back and forth rather than drifting", () => {
    let crossings = 0;
    let pairs = 0;
    for (const strike of [0, 1, 7, 42, 199]) {
      const kinks = lightningPath(FROM, 1200, strike).trunk.slice(1, -1);
      for (let i = 1; i < kinks.length; i++) {
        pairs++;
        if (Math.sign(kinks[i][1]) !== Math.sign(kinks[i - 1][1])) crossings++;
      }
    }
    expect(crossings / pairs).toBeGreaterThan(0.6);
  });

  it("is the same bolt for the same arguments", () => {
    expect(lightningPath(FROM, TO, 11)).toEqual(lightningPath(FROM, TO, 11));
  });

  it("is a different bolt on the next strike", () => {
    const before = lightningPath(FROM, TO, 11).trunk;
    const after = lightningPath(FROM, TO, 12).trunk;
    const moved = before.some((p, i) => after[i] && Math.abs(p[1] - after[i][1]) > 1);
    expect(moved).toBe(true);
  });

  it("is just the two ends when there is no room to kink", () => {
    expect(lightningPath(FROM, FROM + 5, 3).trunk).toEqual([
      [FROM, 0],
      [FROM + 5, 0],
    ]);
  });

  it("stays bounded on a trail longer than any screen", () => {
    expect(lightningPath(0, 100000, 3).trunk.length).toBeLessThanOrEqual(142);
  });
});

describe("lightningPath as the trail lengthens", () => {
  /**
   * The property the whole envelope exists for, stated as what the reader would
   * see without it: the camera turns, the far end creeps outwards by a fraction
   * of a pixel a frame, and a brand-new kink springs into being at its full
   * sideways offset — the tip of the trail flicking about every few frames.
   *
   * The zigzag this replaced needed a special case for it (a leftover peak
   * whose height grew with the room it had). Here it falls out of the formula,
   * so this is checking that nothing has quietly reintroduced a hard edge.
   */
  it("never pops: kinks are born on the axis and move smoothly", () => {
    for (let to = 200; to < 260; to += 0.5) {
      const before = lightningPath(FROM, to, 4).trunk;
      const after = lightningPath(FROM, to + 0.5, 4).trunk;

      // Every kink that both bolts have — the last trunk point is the endpoint
      // itself, which moves with `to` by design and is checked above.
      const shared = Math.min(before.length, after.length) - 1;
      for (let i = 0; i < shared; i++) {
        expect(Math.abs(before[i][0] - after[i][0])).toBeLessThan(1);
        expect(Math.abs(before[i][1] - after[i][1])).toBeLessThan(1);
      }
      // ...and any kink that has just appeared starts flat.
      for (let i = shared; i < after.length - 1; i++) {
        expect(Math.abs(after[i][1])).toBeLessThan(0.5);
      }
    }
  });

  it("holds the kinks nearest the card still while the far end moves", () => {
    // Positions count up from the near end, so lengthening the trail must not
    // shuffle the part of it that is already drawn.
    const near = lightningPath(FROM, 220, 4).trunk.slice(0, 6);
    const far = lightningPath(FROM, 700, 4).trunk.slice(0, 6);
    for (let i = 0; i < near.length; i++) {
      expect(near[i][0]).toBeCloseTo(far[i][0], 9);
    }
  });
});

describe("lightningPath forks", () => {
  it("never grows more than three", () => {
    for (const strike of [0, 1, 2, 3, 4, 5, 17, 88]) {
      expect(lightningPath(FROM, 1500, strike).forks.length).toBeLessThanOrEqual(3);
    }
  });

  it("leaves from a point on the trunk", () => {
    for (const strike of [1, 6, 23]) {
      const { trunk, forks } = lightningPath(FROM, 800, strike);
      for (const fork of forks) {
        expect(trunk).toContainEqual(fork[0]);
      }
    }
  });

  // A branch reaching past the marker reads as the trail having overshot it,
  // which is the opposite of the fixed clearance the far end is built on.
  //
  // Swept finely rather than sampled at a few lengths, and that matters: the
  // three fork slots fill up within the first handful of kinks, so on a long
  // trail no fork is ever spawned near the far end and the case never arises.
  // It is only reachable on a *short* trail, where a fork's own 13px of reach
  // is a large share of what is left. A first draft of this test checked
  // to = 140 / 300 / 800 and stayed green with the guard deleted.
  it("stops short of the marker, however long the trail", () => {
    for (let strike = 0; strike < 24; strike++) {
      for (let to = FROM + MIN_ROOM; to < FROM + 340; to += 1) {
        for (const fork of lightningPath(FROM, to, strike).forks) {
          for (const [along] of fork) expect(along).toBeLessThan(to);
        }
      }
    }
  });

  // Independent per-kink rolls put all three forks in the first stretch of
  // trunk and left the rest bare — 80px of branching then 400px of plain line,
  // measured on screen. Spread along the bolt, they read as branches.
  it("spreads along the trunk rather than bunching at the card", () => {
    for (const strike of [0, 3, 9, 40, 77]) {
      const { trunk, forks } = lightningPath(FROM, 900, strike);
      // By value: `branch` builds its own copy of the root point, so identity
      // would find nothing and quietly compare -1 against -1.
      const roots = forks.map((f) => trunk.findIndex(([a]) => a === f[0][0]));
      expect(roots).not.toContain(-1);
      for (let i = 1; i < roots.length; i++) {
        expect(roots[i] - roots[i - 1]).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("is a branch, not a stub", () => {
    for (const strike of [0, 3, 9, 40]) {
      for (const fork of lightningPath(FROM, 800, strike).forks) {
        expect(fork.length).toBeGreaterThan(2);
      }
    }
  });

  // The budget, spent — not a per-segment magnitude whose total nobody chose.
  // 21.6 is FORK_REACH plus the jitter it allows; measured from the fork's own
  // root, so the trunk's own offset underneath does not enter into it.
  it("swings clear of the trunk, by a bounded amount", () => {
    let widest = 0;
    for (const strike of [0, 3, 9, 40, 77]) {
      for (const fork of lightningPath(FROM, 900, strike).forks) {
        for (const [, lift] of fork) {
          widest = Math.max(widest, Math.abs(lift - fork[0][1]));
        }
      }
    }
    // Wide enough to read as a branch off the trunk rather than a fray in it —
    // which means clearing the trunk's own 10px amplitude — and never wider
    // than the budget allows.
    expect(widest).toBeGreaterThan(10);
    expect(widest).toBeLessThanOrEqual(21.6);
  });
});

describe("envelope", () => {
  it("is zero at both ends and full in the middle", () => {
    expect(envelope(0, 0, 200)).toBe(0);
    expect(envelope(200, 0, 200)).toBe(0);
    expect(envelope(100, 0, 200)).toBe(1);
  });

  it("ramps over 18px, so a kink grows in rather than appearing", () => {
    expect(envelope(9, 0, 200)).toBeCloseTo(0.5, 9);
    expect(envelope(18, 0, 200)).toBe(1);
    expect(envelope(191, 0, 200)).toBeCloseTo(0.5, 9);
  });

  it("never exceeds one, even on a trail shorter than two ramps", () => {
    for (let along = 0; along <= 20; along += 0.5) {
      const e = envelope(along, 0, 20);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });
});
