/**
 * The lightning bolt an area marker is drawn as: its outline, how far its ink
 * reaches in any given direction, and how it sparks.
 *
 * Pure — no three.js, no canvas, no DOM — because all three of its consumers
 * live in different worlds and none of them is testable. `AreaMarkers` paints
 * the outline into a canvas texture and sizes it in WebGL; `CardLeaderLine`
 * (DOM/SVG) has to stop its trail short of the same ink; `AreaCard` only wants
 * the colour. Keeping the shape here is what stops the trail's idea of the
 * marker's edge from drifting away from the marker's own.
 */

/**
 * The bolt's outline, in a unit space where x runs right, **y runs down**, and
 * the shape spans the full `y ∈ [-1, 1]`.
 *
 * y-down deliberately: canvas 2D and screen pixels both count y downwards, so
 * the same numbers paint the texture and answer the trail's questions without a
 * sign flip in between — and a sign flip nobody can see is exactly the kind of
 * bug that would put the trail's gap on the wrong end of the bolt.
 *
 * Reaching ±1 vertically is not decoration. `markerScaleForScreenRadius()` is
 * asked for a scale that draws the glyph `halfHeight` px from its centre, and
 * it can only deliver that if the painted shape actually reaches the extent the
 * sizing maths assumes. Editing these points without keeping the top and bottom
 * tips at ∓1 silently shrinks every marker.
 *
 * A simple (non-self-intersecting) hexagon: the two long edges are parallel, so
 * the upper wedge and the lower one never cross.
 */
export const BOLT_PATH: readonly (readonly [number, number])[] = [
  [0.3, -1.0], // top tip
  [-0.52, 0.06], // out to the left shoulder
  [-0.06, 0.06], // back in along the waist
  [-0.3, 1.0], // bottom tip
  [0.52, -0.1], // out to the right shoulder
  [0.06, -0.1], // back in along the waist
];

/**
 * How far the bolt's ink reaches from its centre, in CSS pixels, along the unit
 * direction `(towardX, towardY)`.
 *
 * `toward` points **from the marker outwards towards whatever is asking** — the
 * trail passes the direction back towards the card, i.e. the negation of its
 * own travel direction.
 *
 * A single radius was enough while the marker was a disc, whose edge is the
 * same distance away whichever way you look. The bolt's is not: straight up the
 * ink stops at 0.61 of the half-height (the tips lean off-axis), straight
 * across at 0.45. Subtracting the half-height outright — the shape of the old
 * code — would leave the trail stopping up to eight pixels short, and by a
 * different amount at every angle, which is precisely the gap-that-breathes
 * that devlog 202607 spent a release closing.
 *
 * So: the exact outline. Shoot a ray from the centre and take where it crosses
 * an edge. There is always exactly one such crossing — the outline is
 * star-shaped about its own centre, which `BOLT_PATH`'s tests pin, and which is
 * what makes "how far does the ink reach this way" a single number rather than
 * a choice between several. Written as a max anyway: it costs nothing, and it
 * stays right if the shape ever grows a notch deep enough to hide part of
 * itself from the centre.
 *
 * Two cheaper approximations were tried and dropped. An inscribed ellipse
 * (semi-axes 0.52 × 1) is not even safe — the top tip at (0.30, -1.00) sits
 * *outside* it, (0.30/0.52)² + 1 = 1.33, so it would have drawn the trail over
 * the bolt near the tips. The convex hull's support function is safe but loose:
 * 1.67× the real reach straight down, i.e. the same breathing gap in a new
 * disguise.
 */
export function markerClearance(
  halfHeight: number,
  towardX: number,
  towardY: number
): number {
  let reach = 0;
  for (let i = 0; i < BOLT_PATH.length; i++) {
    const [ax, ay] = BOLT_PATH[i];
    const [bx, by] = BOLT_PATH[(i + 1) % BOLT_PATH.length];
    const ex = bx - ax;
    const ey = by - ay;

    // Solve `t·toward = a + s·edge` for both unknowns at once. `s` is where
    // along the edge the crossing falls and `t` how far along the ray, so the
    // 0..1 test on `s` is what keeps the edge a segment rather than an infinite
    // line — and, incidentally, what bounds `t` when the two are near parallel.
    const denom = towardX * ey - towardY * ex;
    if (denom === 0) continue; // edge parallel to the ray: no crossing
    const s = (ax * towardY - towardX * ay) / denom;
    if (s < 0 || s > 1) continue;
    const t = (ax * ey - ex * ay) / denom;
    if (t > reach) reach = t; // t < 0 is the crossing behind us
  }
  return halfHeight * reach;
}

/** Seconds between one spark and the next. */
const FLICKER_PERIOD = 3.4;

/** How long a single spark lasts, in seconds. */
const FLICKER_LENGTH = 0.22;

/** Brightness multiplier at the top of a spark. */
const FLICKER_PEAK = 2.2;

/**
 * The facing marker's brightness multiplier at scene time `time` — 1 for most
 * of the cycle, spiking briefly to `FLICKER_PEAK`.
 *
 * Two flashes rather than one: a single ramp up and down reads as another pulse
 * on top of the size pulse the markers already have, and a bolt that breathes
 * is not a bolt that sparks.
 *
 * Applied to `material.color`, not to the size. Multiplying the *radius* would
 * be the more obvious "flash", but the radius is the number the trail stops a
 * fixed distance short of, so every spark would twitch the far end of the
 * trail. Brightness has no such customer: with `toneMapped={false}` the
 * channels simply clip at 1, which takes the pale blue to white for a moment —
 * which is what a spark looks like anyway.
 */
export function boltFlicker(time: number): number {
  const phase = time % FLICKER_PERIOD;
  if (phase >= FLICKER_LENGTH) return 1;
  const p = phase / FLICKER_LENGTH;
  return 1 + (FLICKER_PEAK - 1) * Math.abs(Math.sin(p * Math.PI * 2));
}

/**
 * Which spark the scene is on. The trail re-jags whenever this changes.
 *
 * Derived from `FLICKER_PERIOD` rather than from a period of its own, and that
 * is the whole point: "the trail redraws itself on the frame the marker
 * flashes" written as two constants is a thing that can drift apart the first
 * time somebody retimes one of them. Written this way it cannot — the strike
 * turns over at exactly the instant `boltFlicker` leaves 1.
 *
 * Handed to the DOM through `markerScreen`'s channel, because `CardLeaderLine`
 * lives outside the canvas and has no frame loop of its own to read the scene
 * clock from. Pausing the diorama freezes `time`, so it freezes the trail's
 * shape along with everything else that moves by itself.
 */
export function strikeIndex(time: number): number {
  return Math.floor(time / FLICKER_PERIOD);
}

/** A marker with nothing to say: pale sky blue, in the voxel palette's family. */
export const MARKER_IDLE_INK = "#a6dbf7";

/** The area the camera is facing: brighter, cyan-leaning, and it sparks. */
export const MARKER_FACING_INK = "#7fe8ff";

/**
 * The lightning that runs out to the marker, and the anchor dot on the card.
 *
 * Darker than either marker colour on purpose — the trail's near end and the
 * dot sit on the *white* card, where `#a6dbf7` all but disappears, while the
 * markers themselves only ever sit against the planet or open space.
 */
export const MARKER_TRAIL_INK = "rgba(58, 160, 208, 0.75)";

/**
 * The halo under the trail, matching the glow baked into the marker's texture.
 *
 * Pale and faint: it is laid down as a much wider stroke along the same path,
 * so anything stronger would read as a second line rather than as light.
 */
export const MARKER_TRAIL_GLOW = "rgba(126, 212, 245, 0.3)";
