import type { SectionType } from "@/types";
import { PLANET_SECTION_KEYS, SMOOTH_PLANET_RADIUS, sectionPosition } from "../planet/sections";
import { tangentBasis, type Direction } from "../planet/geometry";
import { MARKER_GLYPH_FILL } from "../markerBolt";

/**
 * Where the world sits and where the camera looks from.
 *
 * Deliberately free of three.js and R3F imports: the building positions and
 * the camera framings derived from them are plain arithmetic, and keeping
 * them here means they can be reasoned about (and tested) without spinning up
 * a renderer. PlanetScene places the buildings from this; Scene aims the camera
 * with it — previously the two held separate copies that a comment asked you
 * to keep in sync by hand.
 *
 * **Stage 4 of docs/planet-migration.md.** Everything about a single fixed
 * `HOME_ANGLE` and a world-+Y-based `framePose` is gone. The camera is now a
 * satellite at a fixed straight-line distance from the planet's own centre
 * (`ORBIT_RADIUS`), free to sit at any azimuth *and* polar angle rather than
 * one azimuth at a pinned height — and a section's close-up (`sectionPose`)
 * is built from the building's own local frame (`tangentBasis`), which is
 * what lets it aim correctly at a building away from the equator instead of
 * diving underground.
 */

/**
 * World positions of each section building, on the planet's surface.
 *
 * These come from `scene/planet/sections.ts`'s latitude/longitude table
 * rather than being authored here directly as flat XZ triples — see
 * `sectionPosition()` there.
 */
export const BUILDING_POSITIONS = Object.fromEntries(
  PLANET_SECTION_KEYS.map((key) => [key, sectionPosition(key)])
) as Record<NonNullable<SectionType>, [number, number, number]>;

/**
 * Straight-line distance from the camera to the planet's centre, in the free
 * orbit — the satellite's fixed altitude for the "far" (俯瞰) stage.
 *
 * Was `Math.hypot(158.6, 45.8) * 0.85` (140.32, itself a scaled-down carry
 * of stage 2's `HOME_RADIUS`/`HOME_HEIGHT` — see docs/planet-migration.md,
 * "手順2の結果"). Reassigned to the exact figure `NEAR_ORBIT_RADIUS` had
 * (100) when a third, closer default was requested and the three stages all
 * moved in a notch: what used to be the sole altitude became "far", what
 * used to be "near" became "far"'s new value, and "near" itself moved to a
 * fresh, closer figure (see `NEAR_ORBIT_RADIUS`'s own comment). The old
 * 140.32 lineage is retired along with it — there was no reason to keep
 * deriving "far" from a formula once its value was simply "whatever near
 * used to be".
 */
export const ORBIT_RADIUS = 100;

/**
 * The camera's vertical field of view, in degrees.
 *
 * Named rather than left inline on the `<Canvas>` because things are sized
 * against it: `focalOffsetX`/`focalOffsetY` and `frameDistance` all take it as
 * an argument, and the sun's own radius is only correct for one angle (see
 * `SUN_ORB_RADIUS`). A literal here would let the frame widen with nothing
 * anywhere noticing.
 */
export const CAMERA_FOV = 45;

/**
 * Which of the free orbit's two fixed altitudes the satellite is currently
 * at — "far" is `ORBIT_RADIUS` itself (the original overview), "near" is
 * `NEAR_ORBIT_RADIUS` (the closer default added afterwards). A third,
 * unrelated closeness — framing a single building — is `sectionPose`, not a
 * member of this type: it has no fixed radius of its own, and switching to
 * it is a completely different kind of camera destination (parked on a
 * building, not a satellite altitude), not a third `OrbitZoom` value.
 */
export type OrbitZoom = "near" | "far";

/**
 * The free orbit's closer altitude — the default view, added after
 * `ORBIT_RADIUS` itself had already shipped as the sole altitude and was
 * kept on as the "far" pullback a pinch/the zoom control can reach.
 *
 * Walked in by eye three times over, each against a different reference
 * photo, never re-derived from `ORBIT_RADIUS`'s own `asin(R/D) = share·halfH`
 * construction (that path was tried once for this constant and broke down at
 * these closer distances/wider angles — see the devlog entry from that
 * attempt): 100 against reference/image4.png, then 70 against
 * reference/image5.png when the three stages each moved a notch closer and
 * 100 became `ORBIT_RADIUS`'s new value. image5.png turned out to be a poor
 * reference for *placement* though — a full render, busy enough that where
 * exactly the planet's edges fell against the frame was hard to read off it
 * with any confidence — so 70 undershot how large and how far
 * down-and-right the planet was actually meant to sit. reference/image7.png
 * (a plain circle over a screenshot of this site's own chrome, drawn
 * specifically to answer "where do the edges go" unambiguously) replaced it
 * and produced 50 instead — noticeably closer again.
 */
export const NEAR_ORBIT_RADIUS = 50;

/**
 * Share fed into `focalOffsetY` for the "near" altitude's downward lean — how
 * far the planet sits towards the bottom-right of the frame.
 *
 * **Derived from `reference/image7.png` rather than walked in by eye**, which
 * is what the 0.86 and 0.78 that shipped before it were. Measuring that
 * mockup (a plain circle drawn over a screenshot of this site's own chrome,
 * specifically to answer "where do the edges go") gives a disc centred
 * **65.5% across and 81.8% down**, radius 49% of the frame's height. The
 * planet's centre is what the camera looks at, so it sits at exactly
 * `0.5 + share/2` down the frame — 81.8% therefore *is* 0.636, and the old
 * 0.78 overshot the reference it was supposedly matching by putting the
 * centre at 89%.
 *
 * **This lean costs the card's leader line, knowingly.** `facing` — the area
 * the card describes — is not the point at the middle of the planet's disc:
 * it is the nearest of five anchors, and it wanders across the whole visible
 * disc as the tour advances. Pushing the disc down the frame pushes the
 * described area off the bottom of it, and with it goes the marker and the
 * dotted trail. Measured over a full lap of the tour, 20 samples, three
 * viewports — marker positions off-screen, out of 20 (1440x900):
 *
 * | share | off-screen | worst overshoot below the frame |
 * | ----- | ---------- | ------------------------------- |
 * | 0.78  | 16         | 648px                           |
 * | 0.64  | ~14        | ~470px                          |
 * | 0.40  | 7          | 268px                           |
 * | 0.20  | 3          | 115px                           |
 * | 0.00  | 0          | —                               |
 *
 * The largest lean that keeps all 20 on screen is **0.04**, i.e. no lean at
 * all, and it cannot be bought back with altitude either: the lean displaces
 * the subject by `share·radius·H/(2·depth)` px, which at this share is ~290px
 * of a 900px frame however far away the planet is, so the disc would have to
 * shrink to a marble (radius ≥ 185, About's own distance) to fit both. **The
 * composition and the trail are not tunable against each other**, and the
 * composition was chosen. Do not "fix" this constant without that context —
 * see docs/review.md A-3 for the full measurement.
 */
export const NEAR_VERTICAL_SHARE = 0.636;

/**
 * Where the card rail's top edge sits on a phone, in px from the top of a
 * 390x844 frame — the size this layout was designed and measured against.
 *
 * Measured from the laid-out DOM rather than added up from the pieces: 664,
 * the top of the card in the middle. **Not the two beside it**, which report
 * 671 — they are scaled to 0.9 and so sit 7px lower than the box they are
 * laid out in, and `querySelector` returns one of them first.
 *
 * Not the HOME button above them either. That only exists while a section is
 * focused, which is exactly when the trail is hidden anyway
 * (`CardLeaderLine`'s own `hidden` prop), so it never covers a marker the
 * trail is pointing at.
 */
export const HANDHELD_RAIL_TOP_PX = 664;

/**
 * `NEAR_VERTICAL_SHARE`'s replacement on a phone — the same downward lean,
 * but a much smaller one.
 *
 * **The lean exists to put the horizon in frame, not to place a disc.** At
 * the "near" altitude the planet is not a circle on the screen; it fills it.
 * Measured at 390x844, the sky/ground boundary moves linearly with the share:
 *
 *     horizon_y ≈ 25 + 470·share  (px from the top of the frame)
 *
 * so 0 leaves 25px of sky and the desktop's 0.636 leaves 324. Without some
 * lean a phone sees nothing but ground, which is what the first attempt at
 * this constant produced — it was derived from "centre the planet's disc in
 * the band the chrome leaves", and at this altitude there is no disc to
 * centre.
 *
 * **What caps it is the marker, not the composition.** The area the card
 * describes is not the middle of the view: it is the nearest of five anchors,
 * and it wanders as the tour advances. Leaning pushes it towards the bottom
 * of the frame — where, on a phone, the card rail now is — and with it goes
 * the dotted trail from the rail's arrow. Measured over one full lap of the
 * tour, 20 samples, starting from the tour's own u = 0 (the logo's reset), at
 * 390x844 against a rail top of `HANDHELD_RAIL_TOP_PX`:
 *
 * | share | samples hidden behind the rail | worst marker y | sky   |
 * | ----- | ------------------------------ | -------------- | ----- |
 * | 0.15  | 1 / 20                         | 710            | 95px  |
 * | 0.20  | 3 / 20                         | 744            | 119px |
 * | 0.25  | 11 / 20                        | 793            | 142px |
 * | 0.30  | 19 / 20                        | 817            | 166px |
 *
 * 0.20 is the knee: two extra hidden samples over 0.15 buys 24px more sky,
 * and the step after it costs eight more. Everything past that buys a
 * thicker sky by hiding the trail for most of the lap.
 *
 * (Two earlier versions of this table charged the wrong edge — 648, the
 * footprint of a control that only exists when the trail is already hidden,
 * and then 671, a neighbouring card's scaled box. Both are the same mistake:
 * measuring against something other than where the middle card's own top
 * edge is. See `HANDHELD_RAIL_TOP_PX`.)
 *
 * This is the same trade `NEAR_VERTICAL_SHARE` documents and resolves
 * the other way — the desktop chose the composition and gave up the trail
 * (16 of 20 off-frame at 0.636) — and it is resolved differently here only
 * because a phone's frame is a different shape with a different obstruction
 * in it, not because the desktop's answer was wrong.
 *
 * **This is not a re-tuning of `NEAR_VERTICAL_SHARE` and must not become
 * one.** That constant is derived from `reference/image7.png`, a mockup drawn
 * over a screenshot of this site's own chrome on a desktop — a 16:9 frame
 * with no rail along the bottom. It says nothing about a 0.46-aspect frame
 * that has one. See docs/scene-invariants.md.
 */
export const HANDHELD_VERTICAL_SHARE = 0.2;

/** The downward lean for the "near" altitude — gentler on a phone. */
export function nearVerticalShare(handheld: boolean): number {
  return handheld ? HANDHELD_VERTICAL_SHARE : NEAR_VERTICAL_SHARE;
}

/**
 * How far from the planet's centre the satellite has to sit for the planet's
 * disc to stand `share` of the frame's height tall.
 *
 * A sphere of radius `R` seen from `D` has an angular radius of `asin(R/D)`,
 * and something `θ` off the view axis lands `tan(θ)/tan(fov/2)` of a
 * half-frame from the middle — so the disc's *diameter*, as a share of the
 * whole frame height, is `tan(asin(R/D))/tan(fov/2)`. This is that, inverted:
 * a composition is stated as the share, and the camera needs the distance.
 *
 * **Only the handheld altitudes are solved with it.** The desktop's two are
 * distances walked in by eye against reference photos and they stay that way
 * (`ORBIT_RADIUS`, `NEAR_ORBIT_RADIUS`) — a photo pins a distance directly,
 * and re-deriving them would move a composition nobody asked to move. A phone
 * has no such photo: what it has is a stated rule (below), and a rule is
 * exactly what this turns into a distance.
 *
 * Two things this `share` is not. It is of the **whole frame height**, unlike
 * the `share` that `aimOffset`/`aimOffsetY` take (theirs is of a half-frame).
 * And it measures the **smooth sphere**, not the city standing on it —
 * buildings at the limb reach past the disc.
 */
export function orbitRadiusForDiscHeight(share: number): number {
  const halfVertical = (CAMERA_FOV * Math.PI) / 360;
  return SMOOTH_PLANET_RADIUS / Math.sin(Math.atan(share * Math.tan(halfVertical)));
}

/**
 * Where the planet's own edge sits on a phone, measured down from the top of
 * the frame — a third of the way, at **both** handheld altitudes.
 *
 * Asked for as "もう少し俯瞰＋画面の３分の１は背景が見えるように（惑星の位置を
 * 下に下げたい）". On a phone that is a statement about one line: the sky/ground
 * boundary, which is where this puts it. The desktop was left alone — the
 * request was about the phone, and the frames are different shapes with
 * different obstructions in them (see `HANDHELD_VERTICAL_SHARE` for the same
 * split applied to the lean).
 *
 * **One rule, two altitudes, because the lean is what separates them.** The
 * planet's centre is the camera's look-at target, so it sits `0.5 + lean/2`
 * down the frame and its top edge `disc/2` above that. Setting that edge at
 * `1/3` gives `disc = 1/3 + lean` — which is `1/3` at the overview (no lean
 * there) and `1/3 + HANDHELD_VERTICAL_SHARE` at the default view. The two
 * altitudes then differ only because the near one leans, which is the honest
 * description of what the two stages are.
 *
 * At 390x844 (the frame this layout is designed against), before → after.
 * The first column is this rule's own line, the sphere's edge; the second is
 * the horizon as `docs/verification.md` measures it — the first row of pixels
 * more than half covered — which is what a reader actually sees as the
 * sky/ground boundary, and reads a little off the edge in either direction
 * depending on what is standing on the limb:
 *
 * | stage | planet's edge | horizon, measured |
 * | ----- | ------------- | ----------------- |
 * | 標準  | 143 → 281px   | 125 → **267px**   |
 * | 俯瞰  | 248 → 281px   | 250 → **279px**   |
 *
 * 14.8% → 31.6% of the frame at the default view: the third of sky that was
 * asked for. The overview moved much less because it was already close.
 */
export const HANDHELD_PLANET_TOP = 1 / 3;

/** The disc's height on a phone at the default view, leaned; and at the overview, not. */
export const HANDHELD_NEAR_DISC_HEIGHT = HANDHELD_PLANET_TOP + HANDHELD_VERTICAL_SHARE;
export const HANDHELD_FAR_DISC_HEIGHT = HANDHELD_PLANET_TOP;

/**
 * The free orbit's two altitudes on a phone: 77.9 and 122.8, against the
 * desktop's 50 and 100.
 *
 * Both are further out than the desktop's, and that is the whole change — the
 * lean (`HANDHELD_VERTICAL_SHARE`) is untouched. Leaning further would have
 * opened the same band of sky, but on a phone the lean is capped by the card
 * rail rather than by taste: past 0.20 the facing area spends most of a lap
 * behind the rail and the trail hides itself. Pulling back opens the sky
 * *and* shortens the push the lean applies (`lean·radius·H/(2·depth)`): the
 * radius grows 56% here but the depth grows 142% (19.6 → 47.5 at the closest
 * point of a lap), so the push falls from 215px to 138px of an 844px frame
 * and the trail comes out ahead rather than behind.
 */
export const HANDHELD_NEAR_ORBIT_RADIUS = orbitRadiusForDiscHeight(HANDHELD_NEAR_DISC_HEIGHT);
export const HANDHELD_ORBIT_RADIUS = orbitRadiusForDiscHeight(HANDHELD_FAR_DISC_HEIGHT);

/**
 * Which altitude `zoom` names, on the frame `handheld` names.
 *
 * `handheld` is required rather than defaulted for the same reason
 * `nearVerticalShare`'s is: a call site that forgets it would silently frame
 * a phone like a desktop, which is precisely the bug this pair of altitudes
 * exists to fix.
 */
export function orbitRadiusForZoom(zoom: OrbitZoom, handheld: boolean): number {
  if (handheld) return zoom === "far" ? HANDHELD_ORBIT_RADIUS : HANDHELD_NEAR_ORBIT_RADIUS;
  return zoom === "far" ? ORBIT_RADIUS : NEAR_ORBIT_RADIUS;
}

/**
 * How far from the poles the camera is allowed to go, in either the free
 * orbit or a drag — radians of polar angle, measured from `+Y` the way
 * `camera-controls`' own `phi` is.
 *
 * `camera.up` is pinned to `+Y`; near a pole the view direction runs nearly
 * parallel to it and `lookAt`'s degenerate case decides the roll arbitrarily.
 * `setLookAt` rebuilds `_spherical` from the camera's position every frame
 * and never consults `CameraControls`' own `minPolarAngle`/`maxPolarAngle` —
 * those only gate `rotateTo` — so the clamp has to live here instead of being
 * handed to the library.
 */
export const ORBIT_MIN_POLAR = 0.15;
export const ORBIT_MAX_POLAR = Math.PI - 0.15;

/**
 * How fast the camera drifts along the tour path when nothing is driving it —
 * radians of great-circle arc per second.
 *
 * Lives here rather than in Scene.tsx, where it started, because
 * `ORBIT_RETURN_SPEED` below is derived from it: the relationship between the
 * two is what decides whether the camera ever finds its way back to the path
 * at all, and a constant that another constant depends on is not a local one.
 */
export const AUTO_ORBIT_SPEED = 0.032;

/**
 * How hard the rendered azimuth/polar chase their targets — the `λ` of
 * `MathUtils.damp`, i.e. the gap left over shrinks by `1 - exp(-λΔt)` every
 * frame. Roughly half a second to cover a gap of any size, which is inertia
 * for a drag in progress and a snap for anything larger.
 */
export const ORBIT_DAMP_LAMBDA = 5;

/**
 * How fast the camera drifts back onto the tour path once a drag lets go —
 * the same radians-of-arc-per-second `AUTO_ORBIT_SPEED` is in, and
 * deliberately a multiple of it.
 *
 * Asked for as "come back at about the speed it turns by itself". The damp
 * alone (`ORBIT_DAMP_LAMBDA`) takes about the same half-second whether the
 * drag pushed the camera 2° off the path or 30°, so the further you pulled the
 * planet the faster it was yanked out of your hand — measured at ~0.5s for a
 * 0.35 rad gap, i.e. some eleven times the idle drift's own pace over that
 * arc.
 *
 * **Not 1× `AUTO_ORBIT_SPEED`, because the destination is not standing still.**
 * The tour keeps advancing the whole time the camera is finding its way back
 * (see Scene.tsx's frame loop), so the point being chased is itself moving at
 * `AUTO_ORBIT_SPEED` along the path. Travelling at exactly that speed would
 * leave a camera trailing directly behind it closing at zero — following one
 * gap behind for ever. At twice the drift, that worst case closes at exactly
 * `AUTO_ORBIT_SPEED`, and a camera drifting sideways onto the path at twice it:
 * the same order as the idle rotation either way, which is what was asked,
 * rather than a snap.
 *
 * **Only the post-drag return is capped this way.** The wheel and the card's
 * swipe both move the camera along the path by an amount the reader just asked
 * for — a flick worth 0.4 rad would take six seconds at this speed, which
 * reads as the input having been ignored. See `returningRef` in Scene.tsx for
 * where the cap is switched on and off.
 */
export const ORBIT_RETURN_SPEED = AUTO_ORBIT_SPEED * 2;

/**
 * Fraction of the frame's width the free orbit gives up to the card on the
 * left. Carried over unchanged from stage 2's `HOME_CARD_SHARE` — a
 * dimensionless fraction, unaffected by which of `ORBIT_RADIUS`'s azimuth or
 * polar the camera currently sits at.
 */
export const ORBIT_CARD_SHARE = 0.22;

/**
 * How high above a building's own local horizon the camera sits when framing
 * it, in radians — `sectionPose` puts the camera along the building's local
 * north, lifted by this much towards its surface normal.
 *
 * **Measured from the horizon, not from the normal**, despite what this said
 * before: `sectionPose` multiplies `cos(tilt)` into `forward` (the tangent)
 * and `sin(tilt)` into `up` (the normal), so 0.34 rad is 19.5° above the
 * ground, not 19.5° off vertical. The old wording invited exactly the wrong
 * fix — swapping the two would swing the camera to 70.5° and make every
 * section a near-overhead shot, which is not what `reference/image6.png`
 * (a horizon low in the frame, the roof seen at a shallow angle) asks for.
 * The value was right all along; what was broken was `camera.up` (see
 * `sectionUp`).
 */
export const SECTION_TILT = 0.34;

/**
 * How tightly `sectionPose` crops a framed building, as a factor on its
 * bounding sphere's radius fed into `frameDistance`. Was `1.35` — slack that
 * kept the building clear of the frame's edges — until a closer building-zoom
 * was requested (reference/image6.png: the roof runs off both sides of the
 * frame and the ground fills the bottom, not a building floating clear of
 * every edge with room around it). Below 1 rather than above: `frameDistance`
 * still computes the distance for a sphere of `radius * FRAME_MARGIN` to
 * exactly fit the tighter axis, so shrinking the *input* radius pulls the
 * camera in close enough that the building's true (unshrunk) size overflows
 * the frame instead of fitting inside it — walked in by eye against that
 * photo, the same way `NEAR_ORBIT_RADIUS` was.
 */
export const FRAME_MARGIN = 0.75;

/**
 * How far back a camera needs to sit for a sphere of `radius` to fit.
 *
 * Takes whichever half-angle is tighter, so a tall narrow viewport is fitted
 * on width and a wide one on height — the reason this is computed rather than
 * fixed is that a single hardcoded distance frames the tallest tower and the
 * smallest building equally badly.
 *
 * (`fitToBox` from camera-controls looks like the built-in answer to this, but
 * it rounds the camera's angles to the nearest 90° first, snapping to a
 * face-on elevation and throwing away the diorama's three-quarter view.)
 */
export function frameDistance(radius: number, fovDegrees: number, aspect: number): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  return radius / Math.sin(Math.min(halfVertical, halfHorizontal));
}

/**
 * Fraction of the frame's width the card occupies on the left. The camera aims
 * this far to the side of its subject, which slides the subject clear of the
 * card instead of sitting behind it.
 */
export const CARD_SHARE = 0.3;

/**
 * A larger share than a normal section gets, since About's text column beside
 * it is a whole page rather than a small card.
 */
export const ABOUT_CARD_SHARE = 0.42;

/**
 * The share of the frame's width to give up to the card, for the free orbit
 * and for a focused section — zero on a phone.
 *
 * Same single mechanism as ever (`focalOffsetX`, one rule for every regime);
 * only the number changes. On a phone the card is a strip across the bottom
 * rather than a panel on the left, so there is nothing beside the subject to
 * aim past: pushing it sideways anyway would shove it towards an edge for no
 * reason. The clearance it does need is vertical, and
 * `HANDHELD_VERTICAL_SHARE` is where that lives.
 *
 * The desktop numbers assume the card takes a slice of the width. Measured at
 * 390x844 the card was 334px of 390 — 86% — so the assumption does not
 * survive a phone at any share; 0.3 of the width simply moved the subject
 * from behind one part of the card to behind another.
 */
export function orbitCardShare(handheld: boolean): number {
  return handheld ? 0 : ORBIT_CARD_SHARE;
}

/** The same, for a section's close-up. */
export function sectionCardShare(handheld: boolean): number {
  return handheld ? 0 : CARD_SHARE;
}

/**
 * How steeply About looks down — measured the same way `SECTION_TILT` is, but
 * About has no single building to crop in on (its column has no card to
 * clear), so it keeps turning round the planet's own axis at a wider, more
 * distant framing instead of a normal section's tight one.
 */
const ABOUT_TILT = 0.62;

/**
 * About's own orbit — polar angle and straight-line radius from the planet's
 * centre, in the same units `orbitPose` takes.
 *
 * Converted rather than re-measured from stage 2's `ABOUT_RADIUS` (185, a
 * *horizontal* distance from the vertical axis) and `ABOUT_TILT`: `orbitPose`
 * wants a polar angle and a straight-line radius, which is exactly what a
 * horizontal-radius-and-tilt pair resolves to (`radius / cos(tilt)` is the
 * hypotenuse, `π/2 - tilt` is the down-tilt restated as an angle from `+Y`).
 * The visual framing this produces is therefore identical to stage 2's,
 * carried into the new coordinate system rather than retuned.
 */
export const ABOUT_POLAR = Math.PI / 2 - ABOUT_TILT;
export const ABOUT_ORBIT_RADIUS = 185 / Math.cos(ABOUT_TILT);

/**
 * How far to aim to the side of the subject so it clears the card.
 *
 * Half the frame's width at the subject's distance, times the share to give
 * up. Derived rather than fixed because the frame is wider the further back
 * the camera goes, and wider again on a landscape viewport.
 */
export function aimOffset(
  distance: number,
  fovDegrees: number,
  aspect: number,
  share: number = CARD_SHARE
): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  return distance * Math.tan(halfHorizontal) * share;
}

/**
 * The sideways push that clears the card, as a `CameraControls` focal offset
 * in world units — negative, since the offset moves the *camera* along its
 * own right axis, which swings whatever it is looking at the other way across
 * the frame, and the card sits on the left so the subject has to go right.
 *
 * One function for the free orbit, a section, and About, unified — where
 * stage 2 had two different mechanisms (a focal offset for the free view, a
 * shifted look-at target — `framePose`'s own `sideways` — for a section). A
 * focal offset is applied by `camera-controls` *after* it decomposes the
 * orbit, so `_spherical` and `_target` are untouched regardless of which
 * regime is asking for one; a shifted target is not — it is also what the
 * orbit pivots on, which is only safe for a section because a section's
 * camera is parked rather than turning. Now that every regime can be mid-turn
 * (the free orbit always is; About always is; a section briefly is, while its
 * flight lands), only the focal offset is safe everywhere, so everything
 * uses it.
 */
export function focalOffsetX(distance: number, fovDegrees: number, aspect: number, share: number): number {
  return -aimOffset(distance, fovDegrees, aspect, share);
}

/**
 * How far below the subject's centre the "near" free orbit aims, leaning the
 * planet towards the bottom-right of the frame instead of sitting centred —
 * requested to match reference/image5.png. Only the vertical half of that
 * lean: the existing rightward push (`focalOffsetX`, already active for card
 * clearance at every altitude) supplies the rest, so "near" does not need a
 * wider `share` of its own on the X axis too.
 *
 * Mirrors `aimOffset`, but against the vertical half-FOV rather than the
 * horizontal — aspect plays no part, since the vertical FOV doesn't widen
 * with it the way the horizontal one does.
 */
export function aimOffsetY(distance: number, fovDegrees: number, share: number): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  return distance * Math.tan(halfVertical) * share;
}

/**
 * How far below the planet's own centre the "near" altitude's own resting
 * frame sits — the vertical half of `NEAR_ORBIT_RADIUS`'s bottom-right lean
 * (see `aimOffsetY`). Negative for the same reason `focalOffsetX` is: the
 * offset moves the camera along its own local axis, swinging whatever it
 * looks at the other way across the frame — a positive offset here would
 * push the subject *up*, and bottom-right needs it pushed down.
 *
 * `share` is walked in by eye against reference/image5.png the same way
 * `NEAR_ORBIT_RADIUS` itself was — tried at -15 (too little lean), -40 (the
 * planet fell almost entirely below the frame), before landing on -25 at
 * `NEAR_ORBIT_RADIUS`'s distance of 70, which is what `NEAR_VERTICAL_SHARE`
 * (0.86) reproduces.
 */
export function focalOffsetY(distance: number, fovDegrees: number, share: number): number {
  return -aimOffsetY(distance, fovDegrees, share);
}

/**
 * Camera placement for the free orbit — a satellite at `radius` from
 * `target` (the planet's own centre, by default), at a given azimuth and
 * polar angle. `azimuth`/`polar` follow the same convention `orbitAnglesOf`
 * inverts and `camera-controls`' own `azimuthAngle`/`polarAngle` use: polar
 * measured down from `+Y`, azimuth as `atan2(x, z)`.
 *
 * `target` is a parameter, not always the origin, for the same reason
 * `surfacePoint` in geometry.ts takes a centre: a second planet is
 * plausible later, and every orbit in the scene would have to be found and
 * rewritten to add it if this baked the origin in now.
 */
export function orbitPose(
  azimuth: number,
  polar: number,
  radius: number = ORBIT_RADIUS,
  target: readonly [number, number, number] = [0, 0, 0]
): Pose {
  const [tx, ty, tz] = target;
  const [x, z] = azimuthToXZ(azimuth, radius * Math.sin(polar));
  const y = radius * Math.cos(polar);
  return [tx + x, ty + y, tz + z, tx, ty, tz];
}

/**
 * The azimuth and polar angle of a direction from the origin — `orbitPose`'s
 * inverse. Used to turn a point on the tour path, or a building's own
 * direction, into the angles the free-orbit state (`viewRef` in Scene.tsx) is
 * kept in.
 */
export function orbitAnglesOf(direction: readonly [number, number, number]): {
  azimuth: number;
  polar: number;
} {
  const [x, y, z] = direction;
  const radius = Math.hypot(x, y, z) || 1;
  return {
    azimuth: Math.atan2(x, z),
    polar: Math.acos(Math.min(1, Math.max(-1, y / radius))),
  };
}

/** Where on the orbit the camera is, in the angles Scene.tsx keeps as its truth. */
export type OrbitAngles = { azimuth: number; polar: number };

/**
 * The great-circle angle between two points on the orbit — how far the camera
 * actually has to travel to get from one to the other.
 *
 * Not the difference in either angle, and not the two differences added up: a
 * turn of azimuth covers `sin(polar)` times as much arc as the same turn of
 * polar does, and none at all at a pole. Anything that wants to move the
 * camera at a speed measured in arc (`AUTO_ORBIT_SPEED`, `ORBIT_RETURN_SPEED`)
 * has to ask in these terms or the same nominal speed would mean something
 * different at every latitude.
 *
 * Written out as the spherical law of cosines rather than built through
 * `orbitPose` and dotted, because this runs inside the frame loop.
 */
export function orbitArcBetween(a: OrbitAngles, b: OrbitAngles): number {
  const cosine =
    Math.sin(a.polar) * Math.sin(b.polar) * Math.cos(a.azimuth - b.azimuth) +
    Math.cos(a.polar) * Math.cos(b.polar);
  return Math.acos(Math.min(1, Math.max(-1, cosine)));
}

/**
 * How much of the gap between `from` and `to` the camera closes this frame, as
 * a fraction of it — applied to azimuth and polar alike.
 *
 * One fraction for both is not a simplification: `MathUtils.damp` *is* a lerp
 * by `1 - exp(-λΔt)`, so this reproduces exactly what a pair of `damp()` calls
 * did. Having the fraction in hand rather than hidden inside them is what lets
 * it be capped — `maxArcPerSecond` bounds how much of the sphere the camera may
 * cross in a second however far away the target is, which is the difference
 * between drifting home and being snapped home (see `ORBIT_RETURN_SPEED`).
 *
 * The cap stops binding by itself once the gap is down to about
 * `maxArcPerSecond / ORBIT_DAMP_LAMBDA` radians, where the damp is the slower
 * of the two again — so a capped return ends by handing back to the damp for
 * the last fraction of a degree, with no threshold of its own to tune.
 */
export function orbitStepFraction(
  from: OrbitAngles,
  to: OrbitAngles,
  delta: number,
  maxArcPerSecond: number = Infinity
): number {
  if (delta <= 0) return 0;
  const damped = 1 - Math.exp(-ORBIT_DAMP_LAMBDA * delta);
  const arc = orbitArcBetween(from, to);
  // Nowhere to go: the cap has no gap to be a fraction of, and dividing by it
  // would hand back NaN — which `setLookAt` would take without complaint and
  // paint as nothing at all.
  if (arc <= 0 || !Number.isFinite(maxArcPerSecond)) return damped;
  return Math.min(damped, (maxArcPerSecond * delta) / arc);
}

/**
 * Camera placement for a close-up of a section's building.
 *
 * The sphere-native successor to `framePose()`, built from the building's own
 * local frame (`tangentBasis`) rather than world azimuth and `+Y` — the
 * reason `framePose` could send the camera underground for a building away
 * from the equator, and `sectionPose` cannot: every axis it uses is the
 * building's own, so there is no latitude for it to disagree with.
 *
 * Mirrors `framePose`'s own construction with local axes in place of global
 * ones — `forward` (the building's local north) stands in for the azimuth
 * direction, `up` (the building's own outward normal) stands in for world
 * `+Y` — so `distance` still means exactly what it meant there: the
 * straight-line camera-to-target distance `frameDistance()` computes,
 * regardless of the building's latitude. The sideways push that used to be
 * `framePose`'s own `sideways` parameter is gone — see `focalOffsetX`.
 */
export function sectionPose(target: readonly [number, number, number], distance: number, tilt: number = SECTION_TILT): Pose {
  // tangentBasis normalizes its own input, so target's magnitude never needs
  // recovering here — only its direction from the origin matters.
  const { up, forward } = tangentBasis(target as Direction);
  const [tx, ty, tz] = target;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return [
    tx + forward[0] * distance * cos + up[0] * distance * sin,
    ty + forward[1] * distance * cos + up[1] * distance * sin,
    tz + forward[2] * distance * cos + up[2] * distance * sin,
    tx,
    ty,
    tz,
  ];
}

/**
 * Which way is "up" for the camera while it orbits the planet as a satellite:
 * the world's own +Y. Every framing that pivots on the planet's centre — the
 * free orbit at either altitude, and About — uses this.
 */
export const ORBIT_UP: Direction = [0, 1, 0];

/**
 * Which way is "up" for the camera while it is parked on a single building:
 * that building's own surface normal.
 *
 * **This is what `sectionPose` was missing, and the reason section close-ups
 * came out wrong.** `sectionPose` builds the whole shot in the building's own
 * tangent frame, which is what makes it latitude-independent — but a pose is
 * only half of a camera. `camera.up` decides the roll, and while it stayed
 * pinned to the world's +Y, the other half of the shot was still being
 * answered in world coordinates. Two things went wrong at once, both of them
 * quietly:
 *
 * - **Buildings rendered on their side.** A building's own up is its normal,
 *   which for anything near the equator points nearly *horizontally* in world
 *   terms — `products` (lat 6°, lon 0°) stands up along world +Z. Rolling the
 *   frame to world +Y instead put that building's vertical 84° from the
 *   screen's, i.e. lying down.
 * - **Roll went wherever `lookAt`'s degenerate case sent it.** The camera sits
 *   along the building's local *north*, and near the equator local north is
 *   nearly world +Y — so the view direction ran within 10-18° of `camera.up`
 *   for `products`, `skills` and `experience`. `lookAt` has no defined roll
 *   there, and what came out was a mirrored frame: the voxel signage on those
 *   three buildings rendered back-to-front, which is how this was spotted at
 *   all. `about` (37.5°) and `contact` (63.5°) sit far enough off the axis to
 *   look fine, so the symptom came and went with latitude and never looked
 *   like one bug.
 *
 * Handing the camera the building's own up answers both: the building's
 * vertical *is* the screen's vertical, and the view direction is always
 * exactly `π/2 + SECTION_TILT` away from it, so there is no degenerate case
 * left to fall into at any latitude.
 *
 * (The free orbit's own guard against the same degeneracy — `ORBIT_MIN_POLAR`
 * / `ORBIT_MAX_POLAR` — never applied here, because a section is not on the
 * orbit. That is why nothing caught it.)
 */
export function sectionUp(target: readonly [number, number, number]): Direction {
  return tangentBasis(target as Direction).up;
}

/**
 * Eased progress for a camera flight: still at both ends, quickest in the
 * middle.
 *
 * Symmetrical rather than an ease-*out*, which is what camera-controls' own
 * `smoothTime` damping gives you. A damped flight spends most of its travel in
 * its first moments, and the flight that matters most here — backing out of a
 * section once the detail page is dismissed — begins with the sheet still
 * sliding off the screen. Nearly all of the movement therefore happened behind
 * an opaque panel, and what was left when the canvas came back into view was
 * the last tenth of it: a snap, not a camera pulling back. Holding the start
 * still buys that half-second back.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * A camera placement `t` of the way from one framing to another.
 *
 * Interpolated as an *orbit* — radius, tilt and azimuth about the look-at
 * point, with the look-at point itself travelling in a straight line — rather
 * than by lerping the two camera positions. A straight line between two points
 * on a sphere is a chord: pulling back from a building to the planet overview
 * that way would dip the camera closer to the world half way through before
 * finally retreating, since the midpoint of the chord sits inside the arc.
 *
 * (`CameraControls.lerp()` does interpolate spherically and would otherwise be
 * the built-in answer, but it recovers both azimuths through `atan2` and then
 * subtracts them raw. Two framings either side of ±π are a fraction of a turn
 * apart and it sweeps the long way round between them — most visibly when
 * About, which never stops orbiting, is left from wherever it had drifted to.
 * `wrapAngle` below is the whole difference.)
 */
export function glidePose(from: Pose, to: Pose, t: number): Pose {
  const a = orbitOf(from);
  const b = orbitOf(to);

  const radius = a.radius + (b.radius - a.radius) * t;
  const polar = a.polar + (b.polar - a.polar) * t;
  const azimuth = a.azimuth + wrapAngle(b.azimuth - a.azimuth) * t;

  const tx = from[3] + (to[3] - from[3]) * t;
  const ty = from[4] + (to[4] - from[4]) * t;
  const tz = from[5] + (to[5] - from[5]) * t;

  const [x, z] = azimuthToXZ(azimuth, radius * Math.sin(polar));
  return [tx + x, ty + radius * Math.cos(polar), tz + z, tx, ty, tz];
}

/** A pose read as an orbit about its own look-at point. */
function orbitOf(pose: Pose): { radius: number; polar: number; azimuth: number } {
  const x = pose[0] - pose[3];
  const y = pose[1] - pose[4];
  const z = pose[2] - pose[5];
  const radius = Math.hypot(x, y, z);
  // A camera sitting exactly on what it looks at has no direction to preserve;
  // any angle will do, and the radius is what the interpolation moves anyway.
  if (radius === 0) return { radius: 0, polar: 0, azimuth: 0 };
  // Polar measured down from +Y and azimuth as atan2(x, z), matching
  // three.js's Spherical — the same convention azimuthToXZ inverts.
  return {
    radius,
    polar: Math.acos(Math.min(1, Math.max(-1, y / radius))),
    azimuth: Math.atan2(x, z),
  };
}

/**
 * CameraControls follows three.js's `Spherical` convention, where the
 * azimuth is measured as `atan2(x, z)` (not the more familiar `atan2(z, x)`)
 * — i.e. `x = radius * sin(azimuth)`, `z = radius * cos(azimuth)`. Any XZ
 * position built from an `azimuthAngle` value has to use this convention or
 * it silently points somewhere else entirely.
 */
export function azimuthToXZ(azimuth: number, radius: number): [number, number] {
  return [Math.sin(azimuth) * radius, Math.cos(azimuth) * radius];
}

/** Wraps an angle (in radians) into (-π, π]. */
export function wrapAngle(angle: number): number {
  const turn = Math.PI * 2;
  return ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI;
}

/**
 * A full camera placement: `[posX, posY, posZ, targetX, targetY, targetZ]`,
 * i.e. exactly the six leading arguments of CameraControls' `setLookAt`, and
 * one half of `lerpLookAt`. Both call sites spread the same tuple, so a
 * framing can only ever be defined in one place.
 */
export type Pose = [number, number, number, number, number, number];

/**
 * How many CSS pixels one world unit spans, `viewDepth` in front of the camera.
 *
 * `viewDepth` is the distance along the camera's forward axis — the `-z` of the
 * point in view space, which is exactly what the projection divides by. The
 * straight-line distance from the camera is a different number, and using it
 * would misjudge anything away from the centre of the frame.
 */
export function pixelsPerWorldUnit(
  viewDepth: number,
  fovDegrees: number,
  viewportHeight: number
): number {
  const halfVertical = (fovDegrees * Math.PI) / 360;
  return viewportHeight / (2 * Math.tan(halfVertical) * viewDepth);
}

/**
 * The world scale a marker sprite needs for its drawn glyph to reach `radiusPx`
 * from its centre on screen.
 *
 * `radiusPx` is the bolt's *half-height*, the one direction in which the glyph
 * reaches `MARKER_GLYPH_FILL` exactly. Across, it is narrower; how much
 * narrower is `markerClearance()`'s business, not this function's.
 *
 * A sprite is a billboard: three.js offsets its corners in *view* space
 * (`mvPosition.xy += rotatedPosition` in the sprite shader), so its size on
 * screen is its scale times the pixels-per-unit at its own depth. Nothing else
 * enters into it — not the camera's tilt, not where in the frame it sits.
 *
 * Recovering that size afterwards by projecting a world-space offset, which is
 * what this replaced, gets both of those wrong: a world-vertical offset is
 * foreshortened by the tilt and stretched by perspective towards the edges of
 * the frame. Deciding the pixel size and solving for the world scale instead
 * leaves nothing to estimate, which is what lets the trail hold a fixed
 * clearance from the dot's edge however the camera moves.
 */
export function markerScaleForScreenRadius(
  radiusPx: number,
  viewDepth: number,
  fovDegrees: number,
  viewportHeight: number
): number {
  return radiusPx / (MARKER_GLYPH_FILL * pixelsPerWorldUnit(viewDepth, fovDegrees, viewportHeight));
}

/**
 * Whether the frame's dimensions actually changed — i.e. whether a focal
 * offset, which is a share of the frame's width, has to be recomputed.
 *
 * By value, and not by the identity of the object holding them, which is the
 * whole reason this is a named function with a test. `useThree`'s `size` is
 * handed back as a *fresh object* on re-renders that have nothing to do with a
 * resize, so `prev === next` reads every re-render as a resize. That is not a
 * harmless extra recomputation: the resize path *snaps* the offset to its
 * destination, so a re-render that focused an area (or left one) teleported the
 * offset there a moment before the flight read it as its starting value. From
 * and to came out equal, the offset never travelled, and the frame jumped
 * sideways by the whole push instead — measured at 141px focusing an area and
 * 164px leaving one, on a 1280px-wide frame.
 */
export function frameSizeChanged(
  prev: { width: number; height: number },
  next: { width: number; height: number }
): boolean {
  return prev.width !== next.width || prev.height !== next.height;
}
