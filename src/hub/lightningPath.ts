import { hash01 } from "@/scene/voxel/rng";

/**
 * The shape of the lightning that runs from the card out to its area's marker.
 *
 * Pure, and in a coordinate system of its own: `along` is the distance from the
 * near end towards the far one, `lift` the sideways offset from that axis.
 * `CardLeaderLine` owns the mapping to screen pixels — which keeps everything
 * here testable without a DOM, and keeps the shape from quietly depending on
 * which way the trail happens to point.
 *
 * It replaced a regular zigzag (`^^^^`, a fixed 11px step and 6px amplitude).
 * The waveform is all that was thrown away; three structural properties the old
 * code fought for are still here, because a lightning bolt needs them for the
 * same reasons a zigzag did:
 *
 *  1. Both ends land exactly where the caller says, so the clearances it
 *     measured from the card's dot and the marker's ink still hold.
 *  2. Vertices are positioned counting up from the near end, so the kinks near
 *     the card do not shuffle about as the trail lengthens and shortens.
 *  3. A vertex that comes into existence does so **without a jump**. This is the
 *     one that random jaggedness makes hardest: a new kink arriving with its
 *     full sideways offset would flick the far end of the trail every time the
 *     scene turned by a pixel. See `envelope` below — it is answered by the
 *     shape of the formula rather than by a special case.
 */

/** Nominal distance between kinks, before the per-segment jitter below. */
const SEGMENT = 26;

/** The furthest a kink ever strays from the axis, in CSS pixels. */
const AMPLITUDE = 10;

/**
 * The shallowest a kink may be, as a share of `AMPLITUDE`.
 *
 * Offsets alternate sides, so consecutive kinks are at least `2 · MIN_KINK ·
 * AMPLITUDE` apart across a `SEGMENT` of travel — which is what sets how sharp
 * the bolt looks. Letting it reach 0 would let a stretch of the trail flatten
 * out into a straight line for no visible reason.
 */
const MIN_KINK = 0.35;

/**
 * How often the bolt keeps going the same way instead of cutting back.
 *
 * The first draft wandered instead of alternating — `lift = d·previous +
 * (1-d)·target`, on the theory that correlated offsets would give lightning its
 * "run a while, then turn sharply" character. It gave the opposite: a convex
 * combination pulls towards the middle, so the bolt's typical offset settled
 * around 2.5px against a 13px step and drew a **gently wavy line**. Alternating
 * is what makes a strike; the occasional repeat here is what keeps it from
 * being a saw.
 */
const RUN_CHANCE = 0.25;

/**
 * How far from either end the offsets are still being ramped in, in pixels.
 *
 * Doing the ends this way is what let the old "leftover peak grows with the
 * room it has" branch be deleted outright. A vertex is born exactly when `to`
 * passes it, and at that instant `to - along` is 0, so it is born flat on the
 * axis and grows out of it — the continuity is a property of the formula, not a
 * case someone has to remember to keep.
 */
const RAMP = 18;

/**
 * Ceiling on kinks, so even a trail spanning the screen stays bounded.
 *
 * 140 at ~26px apart covers well past the diagonal of any viewport this runs
 * on. Beyond it the bolt would simply run straight to the end, which is worth
 * avoiding but not worth an unbounded loop.
 */
const MAX_SEGMENTS = 140;

/** Forks are a garnish; past a few they stop reading as one bolt. */
const MAX_FORKS = 3;

/** Share of trunk vertices that spawn a fork. */
const FORK_CHANCE = 0.28;

/**
 * Fewest kinks between one fork and the next.
 *
 * Without it the three slots are simply the first three kinks that roll for
 * one, and since the roll is independent per kink they all land within the
 * first stretch of trunk — measured on screen, three branches inside the first
 * 80px and then 400px of bare line. Spacing them is what makes the bolt look
 * branched rather than frayed at one end.
 */
const FORK_SPACING = 4;

/** Segments in a fork, and how fast each one shrinks. */
const FORK_SEGMENTS = 3;
const FORK_DECAY = 0.55;

/**
 * How far a fork swings clear of the trunk, in pixels — a budget, spent across
 * its segments rather than accumulated out of them.
 *
 * Written as a budget because the alternative (a per-segment magnitude, summed)
 * makes the fork's actual reach an emergent number nobody has decided, and one
 * that moves whenever `FORK_SEGMENTS` or `FORK_DECAY` is touched. Wider than
 * the trunk's own `AMPLITUDE` on purpose: a branch that stayed inside the
 * trunk's envelope reads as a fray in the line, not as a fork off it.
 */
const FORK_REACH = 18;

/** Per-segment variation on that budget, as a share. */
const FORK_JITTER = 0.2;

/** `[along, lift]` — distance down the trail, and offset from its axis. */
export type Point = readonly [number, number];

export type LightningPath = {
  /** The bolt itself. Starts at `[from, 0]`, ends at `[to, 0]`. */
  trunk: Point[];
  /** Short branches that leave the trunk and peter out. Never reach `to`. */
  forks: Point[][];
};

/**
 * Ramped in at both ends, flat in the middle.
 *
 * Exported for the tests, which have to be able to say "a vertex this close to
 * the end is held near the axis" without restating the arithmetic.
 */
export function envelope(along: number, from: number, to: number): number {
  const fromEnd = Math.min(along - from, to - along);
  return Math.max(0, Math.min(1, fromEnd / RAMP));
}

/** A deterministic value in [-1, 1] for kink `i` of strike `strike`. */
function wobble(i: number, strike: number, salt: number): number {
  return hash01(i * 1.37 + strike * 61.7 + salt) * 2 - 1;
}

/**
 * Where the trunk's kinks fall, as distances from `from`.
 *
 * Segment lengths vary because an even step makes the bolt read as a jittered
 * saw rather than as lightning, however random the offsets are. They stay a
 * function of `i` and `strike` alone — never of `to` — which is what keeps
 * property 2 above: the far end gains and loses kinks, the near end never
 * moves.
 */
function kinkPositions(from: number, to: number, strike: number): number[] {
  const positions: number[] = [];
  let along = from;
  for (let i = 1; i <= MAX_SEGMENTS; i++) {
    along += SEGMENT * (0.55 + 0.9 * hash01(i * 5.11 + strike * 17.3));
    if (along >= to) break;
    positions.push(along);
  }
  return positions;
}

/**
 * The bolt from `from` to `to`, re-jagged whenever `strike` changes.
 *
 * `strike` comes from `strikeIndex()` in `markerBolt.ts`, which counts the
 * marker's own sparks — so the trail redraws itself on the same frame the bolt
 * at the far end flashes, and the two read as one strike rather than as two
 * animations that happen to share a screen.
 */
export function lightningPath(from: number, to: number, strike: number): LightningPath {
  const trunk: Point[] = [[from, 0]];
  const forks: Point[][] = [];

  const positions = kinkPositions(from, to, strike);
  let side = wobble(0, strike, 3.1) >= 0 ? 1 : -1;
  let lastFork = -FORK_SPACING;

  positions.forEach((along, i) => {
    if (hash01(i * 2.13 + strike * 41.9) >= RUN_CHANCE) side = -side;
    const magnitude = MIN_KINK + (1 - MIN_KINK) * hash01(i * 1.37 + strike * 61.7);
    const eased = side * magnitude * AMPLITUDE * envelope(along, from, to);
    trunk.push([along, eased]);

    if (forks.length >= MAX_FORKS || i - lastFork < FORK_SPACING) return;
    if (hash01(i * 3.71 + strike * 29.3) > 1 - FORK_CHANCE) {
      const fork = branch(along, eased, from, to, i, strike);
      // Two points is a stub, not a branch — and one that gets clipped down to
      // its own root would draw a dot on the trunk.
      if (fork.length > 2) {
        forks.push(fork);
        lastFork = i;
      }
    }
  });

  trunk.push([to, 0]);
  return { trunk, forks };
}

/**
 * One branch, leaving the trunk at `(along, lift)` and fading out.
 *
 * Kept strictly short of `to`. A fork that reached past the marker would read
 * as the trail having overshot it — the opposite of the "stop a fixed clearance
 * from the ink" rule the far end is built on.
 *
 * Its own offsets go through the same `envelope`, measured from the *trunk's*
 * lift rather than from the axis. Without it a fork near the far end would
 * spring into existence at full size the moment it had room, which is the very
 * pop the trunk goes to such lengths to avoid.
 */
function branch(
  along: number,
  lift: number,
  from: number,
  to: number,
  i: number,
  strike: number
): Point[] {
  const side = wobble(i, strike, 7.9) >= 0 ? 1 : -1;
  const points: Point[] = [[along, lift]];
  // The taper weights, normalised so the segments share out FORK_REACH between
  // them however many of them there are.
  let total = 0;
  for (let k = 0; k < FORK_SEGMENTS; k++) total += FORK_DECAY ** k;

  let a = along;
  let offset = 0;
  for (let k = 1; k <= FORK_SEGMENTS; k++) {
    const share = FORK_DECAY ** (k - 1) / total;
    a += SEGMENT * 0.55 * FORK_DECAY ** (k - 1);
    if (a >= to) break;
    const jitter = 1 + FORK_JITTER * wobble(i + k, strike, 13.3);
    offset += side * FORK_REACH * share * jitter;
    points.push([a, lift + offset * envelope(a, from, to)]);
  }
  return points;
}
