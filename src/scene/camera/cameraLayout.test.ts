import { describe, expect, it } from "vitest";
import {
  ABOUT_CARD_SHARE,
  ABOUT_ORBIT_RADIUS,
  ABOUT_POLAR,
  AUTO_ORBIT_SPEED,
  BUILDING_POSITIONS,
  CARD_SHARE,
  FRAME_MARGIN,
  NEAR_ORBIT_RADIUS,
  NEAR_VERTICAL_SHARE,
  HANDHELD_VERTICAL_SHARE,
  HANDHELD_NEAR_ORBIT_RADIUS,
  HANDHELD_ORBIT_RADIUS,
  HANDHELD_PLANET_TOP,
  CAMERA_FOV,
  nearVerticalShare,
  orbitCardShare,
  sectionCardShare,
  ORBIT_CARD_SHARE,
  ORBIT_DAMP_LAMBDA,
  ORBIT_MAX_POLAR,
  ORBIT_MIN_POLAR,
  ORBIT_RADIUS,
  ORBIT_RETURN_SPEED,
  ORBIT_UP,
  SECTION_TILT,
  aimOffset,
  aimOffsetY,
  azimuthToXZ,
  easeInOutCubic,
  focalOffsetX,
  focalOffsetY,
  frameDistance,
  frameSizeChanged,
  glidePose,
  markerScaleForScreenRadius,
  orbitAnglesOf,
  orbitArcBetween,
  orbitPose,
  orbitRadiusForDiscHeight,
  orbitRadiusForZoom,
  orbitStepFraction,
  pixelsPerWorldUnit,
  sectionPose,
  sectionUp,
  wrapAngle,
  type Pose,
} from "./cameraLayout";
import { PLANET_SECTION_KEYS, SMOOTH_PLANET_RADIUS, sectionPosition } from "../planet/sections";
import { angleBetween, dot, normalize, tangentBasis, type Direction } from "../planet/geometry";
import { MARKER_GLYPH_FILL } from "../markerBolt";
import type { SectionType } from "@/types";

describe("azimuthToXZ", () => {
  // The whole point of this helper is that CameraControls measures azimuth as
  // atan2(x, z), not the textbook atan2(z, x). Pin that down: at azimuth 0 the
  // camera sits on +Z, and a quarter turn puts it on +X.
  it("places azimuth 0 on +Z", () => {
    const [x, z] = azimuthToXZ(0, 10);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(10);
  });

  it("places a quarter turn on +X", () => {
    const [x, z] = azimuthToXZ(Math.PI / 2, 10);
    expect(x).toBeCloseTo(10);
    expect(z).toBeCloseTo(0);
  });

  it("round-trips through atan2(x, z), the convention CameraControls reads back", () => {
    for (const a of [-2.5, -1, 0, 0.7, 1.4, 3]) {
      const [x, z] = azimuthToXZ(a, ORBIT_RADIUS);
      expect(Math.atan2(x, z)).toBeCloseTo(a);
    }
  });

  it("keeps the requested radius", () => {
    const [x, z] = azimuthToXZ(1.234, ORBIT_RADIUS);
    expect(Math.hypot(x, z)).toBeCloseTo(ORBIT_RADIUS);
  });
});

describe("wrapAngle", () => {
  it("leaves angles already inside (-π, π] alone", () => {
    for (const a of [-3, -1, 0, 1, 3]) expect(wrapAngle(a)).toBeCloseTo(a);
  });

  it("folds multiples of a full turn back to the same physical angle", () => {
    for (const turns of [1, 2, 5, -1, -3]) {
      expect(wrapAngle(0.4 + turns * Math.PI * 2)).toBeCloseTo(0.4);
    }
  });

  it("always returns a value within one half-turn", () => {
    // This is the property that keeps damp() taking the short way round
    // instead of unwinding many turns — the old rotation runaway.
    for (const a of [-100, -12.5, -7, 7, 12.5, 100, 1000]) {
      expect(Math.abs(wrapAngle(a))).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});

describe("section coverage", () => {
  it("has a building for every focusable section", () => {
    const focusable: NonNullable<SectionType>[] = [...PLANET_SECTION_KEYS];
    expect(Object.keys(BUILDING_POSITIONS).sort()).toEqual([...focusable].sort());
  });
});

describe("frameDistance", () => {
  it("backs off further for a bigger subject", () => {
    const small = frameDistance(2, 45, 1.6);
    const big = frameDistance(8, 45, 1.6);
    expect(big).toBeGreaterThan(small);
    expect(big / small).toBeCloseTo(4); // linear in radius
  });

  it("actually fits the subject in the frame", () => {
    // The half-angle subtended by the sphere must not exceed the frame's.
    for (const [fov, aspect] of [[45, 1.6], [45, 0.5], [60, 1.0]] as const) {
      for (const radius of [1, 4, 12]) {
        const d = frameDistance(radius, fov, aspect);
        const halfV = (fov * Math.PI) / 360;
        const halfH = Math.atan(Math.tan(halfV) * aspect);
        expect(Math.asin(radius / d)).toBeLessThanOrEqual(Math.min(halfV, halfH) + 1e-9);
      }
    }
  });

  it("pulls back further on a narrow viewport than a wide one", () => {
    // Portrait is width-limited, so the same subject needs more room.
    expect(frameDistance(5, 45, 0.5)).toBeGreaterThan(frameDistance(5, 45, 1.6));
  });

  it("needs less distance with a wider lens", () => {
    expect(frameDistance(5, 70, 1.6)).toBeLessThan(frameDistance(5, 45, 1.6));
  });
});

describe("aimOffset", () => {
  it("reserves more room on a wider frame", () => {
    expect(aimOffset(20, 45, 1.6, 0.3)).toBeGreaterThan(aimOffset(20, 45, 0.6, 0.3));
  });

  it("scales with distance, so the card covers the same share at any zoom", () => {
    expect(aimOffset(40, 45, 1.6, 0.3) / aimOffset(20, 45, 1.6, 0.3)).toBeCloseTo(2);
  });

  it("gives nothing away at share 0", () => {
    expect(aimOffset(20, 45, 1.6, 0)).toBe(0);
  });
});

describe("focalOffsetX", () => {
  // A focal offset moves the camera along its own right axis, so pushing the
  // subject rightwards on screen means moving the camera leftwards: negative.
  it("is negative, so the subject lands right of centre and clear of the card", () => {
    expect(focalOffsetX(ORBIT_RADIUS, 45, 1.6, ORBIT_CARD_SHARE)).toBeLessThan(0);
  });

  it("is exactly -aimOffset — one function underlies the free orbit, a section, and About alike", () => {
    for (const [distance, share] of [
      [ORBIT_RADIUS, ORBIT_CARD_SHARE],
      [40, CARD_SHARE],
      [ABOUT_ORBIT_RADIUS, ABOUT_CARD_SHARE],
    ] as const) {
      expect(focalOffsetX(distance, 45, 1.6, share)).toBeCloseTo(-aimOffset(distance, 45, 1.6, share));
    }
  });

  it("pushes further on a wider frame, where a share of the width is more world", () => {
    expect(focalOffsetX(ORBIT_RADIUS, 45, 1.9, ORBIT_CARD_SHARE)).toBeLessThan(
      focalOffsetX(ORBIT_RADIUS, 45, 0.6, ORBIT_CARD_SHARE)
    );
  });

  it("gives nothing away at share 0", () => {
    expect(focalOffsetX(ORBIT_RADIUS, 45, 1.6, 0)).toBeCloseTo(0);
  });
});

describe("aimOffsetY", () => {
  it("scales with distance, the same way aimOffset does", () => {
    expect(aimOffsetY(40, 45, 0.86) / aimOffsetY(20, 45, 0.86)).toBeCloseTo(2);
  });

  it("grows with a wider vertical fov, at fixed distance and share", () => {
    expect(aimOffsetY(20, 70, 0.86)).toBeGreaterThan(aimOffsetY(20, 45, 0.86));
  });

  it("gives nothing away at share 0", () => {
    expect(aimOffsetY(20, 45, 0)).toBe(0);
  });
});

describe("focalOffsetY", () => {
  // Still exercised at a nonzero share even though the site now ships 0 (see
  // NEAR_VERTICAL_SHARE): the function is correct and kept, and a test that
  // only ever fed it the shipped constant would say nothing about it at all
  // once that constant went to zero.
  //
  // A focal offset moves the camera along its own local axis, so pushing the
  // subject downwards on screen means moving the camera upwards: negative —
  // the mirror image of focalOffsetX's own reasoning.
  it("is negative, so the subject lands below centre", () => {
    expect(focalOffsetY(NEAR_ORBIT_RADIUS, 45, 0.78)).toBeLessThan(0);
  });

  it("is exactly -aimOffsetY", () => {
    expect(focalOffsetY(NEAR_ORBIT_RADIUS, 45, 0.78)).toBeCloseTo(
      -aimOffsetY(NEAR_ORBIT_RADIUS, 45, 0.78)
    );
  });

  it("is ~-16.2 at distance 50, share 0.78 — the lean the site used to ship", () => {
    expect(focalOffsetY(50, 45, 0.78)).toBeCloseTo(-16.15, 1);
  });

  it("gives nothing away at share 0", () => {
    expect(focalOffsetY(NEAR_ORBIT_RADIUS, 45, 0)).toBeCloseTo(0);
  });
});

describe("orbitPose", () => {
  it("looks at the target (the planet's centre by default)", () => {
    expect(orbitPose(0.9, 1.2).slice(3)).toEqual([0, 0, 0]);
  });

  it("looks at an explicit target when one is given", () => {
    const target: [number, number, number] = [5, -3, 1];
    expect(orbitPose(0.9, 1.2, 40, target).slice(3)).toEqual(target);
  });

  it("sits the requested radius from the target", () => {
    for (const [azimuth, polar, radius] of [
      [0, 1, 10],
      [1.4, 0.6, 40],
      [-2, 2.4, 165],
    ] as const) {
      const [x, y, z, tx, ty, tz] = orbitPose(azimuth, polar, radius, [1, 2, 3]);
      expect(Math.hypot(x - tx, y - ty, z - tz)).toBeCloseTo(radius);
    }
  });

  it("agrees with the azimuth CameraControls would read back", () => {
    for (const a of [0.3, 2, -1.1]) {
      const [x, , z] = orbitPose(a, 1.0);
      expect(Math.atan2(x, z)).toBeCloseTo(a);
    }
  });

  it("puts the camera at +Y when polar is 0, and -Y when polar is π", () => {
    const [, topY] = orbitPose(0.7, 0, 10);
    expect(topY).toBeCloseTo(10);
    const [, bottomY] = orbitPose(0.7, Math.PI, 10);
    expect(bottomY).toBeCloseTo(-10);
  });

  it("sits on the equator (y = 0) at polar = π/2", () => {
    const [, y] = orbitPose(1.3, Math.PI / 2, 40);
    expect(y).toBeCloseTo(0);
  });

  it("defaults to ORBIT_RADIUS", () => {
    const [x, y, z] = orbitPose(0.5, 1.1);
    expect(Math.hypot(x, y, z)).toBeCloseTo(ORBIT_RADIUS);
  });
});

describe("ORBIT_RADIUS", () => {
  // Pins the value itself, not just "some positive number" — this constant
  // was reassigned outright (to what NEAR_ORBIT_RADIUS used to be, see its
  // own comment) rather than re-derived, so there is no formula left to
  // pin the shape of; the literal is the whole story.
  it("is 100 — reassigned to the previous NEAR_ORBIT_RADIUS value when the three stages moved a notch closer", () => {
    expect(ORBIT_RADIUS).toBe(100);
  });
});

describe("NEAR_ORBIT_RADIUS", () => {
  // Pins the value itself, not just "closer than ORBIT_RADIUS" — that
  // looser inequality would still pass at, say, 99, which would be a
  // barely-noticeable step in from the far orbit rather than the framing
  // walked in against reference/image7.png.
  it("is 50 — walked in against reference/image7.png, see cameraLayout.ts's own comment", () => {
    expect(NEAR_ORBIT_RADIUS).toBe(50);
  });

  it("is strictly closer than the far orbit", () => {
    expect(NEAR_ORBIT_RADIUS).toBeLessThan(ORBIT_RADIUS);
  });
});

describe("NEAR_VERTICAL_SHARE", () => {
  /**
   * One lap of the tour, sampled in a real browser at 1440x900 — the facing
   * marker's screen y with no lean at all, and how close it ever came to the
   * camera. Fixtures rather than a formula on purpose: the whole point is that
   * `facing` wanders across the planet's disc in a way no closed form here
   * predicts, and guessing at it is what let the lean ship.
   */
  const MEASURED = { lowestY: 861, closestDepth: 19.6, frameHeight: 900 };

  it("puts the planet's centre 81.8% down the frame, where reference/image7.png does", () => {
    // The planet's centre is the camera's look-at target, so the focal offset
    // lands it exactly `0.5 + share/2` down the frame. Written against the
    // measured 0.818 rather than against the constant, so the constant cannot
    // drift away from the reference without this failing — which is how 0.78
    // (centre at 89%) survived as "the image7 value" for a release.
    expect(0.5 + NEAR_VERTICAL_SHARE / 2).toBeCloseTo(0.818, 3);
  });

  it("is knowingly past the point where the facing marker stays in frame", () => {
    // **Not a defect — a decision, pinned so it cannot be undone by accident.**
    // A focal offset of `share·radius·tan(halfFov)` along the camera's own +Y
    // moves the subject down the screen by `share·radius·H/(2·depth)` px (the
    // fov cancels). Charged at the closest depth measured over a full lap.
    //
    // At this lean the described area spends most of a lap below the frame, so
    // the card's dotted trail hides itself (`markerOnScreen`). The composition
    // from reference/image7.png was chosen over the trail after measuring that
    // the two cannot coexist at any altitude — see NEAR_VERTICAL_SHARE's own
    // comment and docs/review.md A-3. If this ever starts passing, someone has
    // flattened the lean; that is a product change, not a cleanup.
    const push =
      (NEAR_VERTICAL_SHARE * NEAR_ORBIT_RADIUS * MEASURED.frameHeight) /
      (2 * MEASURED.closestDepth);
    expect(MEASURED.lowestY + push).toBeGreaterThan(MEASURED.frameHeight);
  });
});

describe("the handheld framing", () => {
  /**
   * One lap of the tour, sampled in a real browser at 390x844 with the card
   * rail in place — the facing marker's screen y at four candidate leans,
   * and how many of the 20 samples the rail covered. Fixtures for the same
   * reason `NEAR_VERTICAL_SHARE`'s are: `facing` wanders, and no closed form
   * here predicts where.
   *
   * Sampled from the tour's own u = 0 each time (the logo's reset), so the
   * four runs are the same lap rather than four different arcs — an earlier
   * set taken from wherever the idle drift happened to be reported 0.20 as
   * both better and worse than 0.15 depending on the run.
   *
   * `hidden` is counted against `HANDHELD_RAIL_TOP_PX`, the middle card's
   * own top edge — not the HOME button above it (which only exists while a
   * section is focused, when the trail is hidden anyway) and not the two
   * scaled neighbours, whose boxes sit 7px lower.
   */
  const LAP_AT_390x844 = [
    { share: 0.15, hidden: 1, worstY: 710 },
    { share: 0.2, hidden: 3, worstY: 744 },
    { share: 0.25, hidden: 11, worstY: 793 },
    { share: 0.3, hidden: 19, worstY: 817 },
  ];

  it("still leans the planet down, so a phone sees a horizon and not just ground", () => {
    // The first version of this constant was *negative* — derived from
    // "centre the planet's disc in the band the chrome leaves", which is a
    // description of the "far" altitude, not this one. At "near" the planet
    // fills the frame, and lifting it put the horizon off the top: measured
    // 94% of the frame covered in ground, with 25px of sky at a share of 0.
    expect(nearVerticalShare(true)).toBeGreaterThan(0);
  });

  it("leans less than a desktop, which is what keeps the trail alive", () => {
    expect(nearVerticalShare(true)).toBeLessThan(NEAR_VERTICAL_SHARE);
  });

  it("keeps the facing marker clear of the card rail for most of a lap", () => {
    // The measured knee. Written against the fixture rather than against the
    // constant so that raising the lean fails here instead of silently
    // hiding the trail — the failure mode `markerOnScreen` is famous for,
    // since a hidden trail looks exactly like a site that never had one.
    const chosen = LAP_AT_390x844.find((row) => row.share === HANDHELD_VERTICAL_SHARE);
    expect(chosen).toBeDefined();
    expect(chosen!.hidden).toBeLessThanOrEqual(3);
  });

  it("is the largest lean that does so — the next step up hides it five times as often", () => {
    const steeper = LAP_AT_390x844.filter((row) => row.share > HANDHELD_VERTICAL_SHARE);
    expect(steeper.length).toBeGreaterThan(0);
    for (const row of steeper) expect(row.hidden).toBeGreaterThan(10);
  });

  it("leaves the desktop composition exactly as it was", () => {
    // reference/image7.png is a desktop mockup and the phone is a different
    // frame; none of the above is allowed to leak back across.
    expect(nearVerticalShare(false)).toBe(NEAR_VERTICAL_SHARE);
    expect(orbitCardShare(false)).toBe(ORBIT_CARD_SHARE);
    expect(sectionCardShare(false)).toBe(CARD_SHARE);
  });

  it("gives up the sideways card clearance on a phone", () => {
    // Measured: the card was 334px of a 390px frame, 86%. Aiming 22% or 30%
    // of the width to one side moved the subject from behind one part of it
    // to behind another, so the clearance a phone needs is the vertical one
    // above and this is zero rather than a smaller share.
    expect(orbitCardShare(true)).toBe(0);
    expect(sectionCardShare(true)).toBe(0);
    // toBeCloseTo, not toBe: `focalOffsetX` negates its input, and negating
    // zero gives -0, which Object.is separates from 0.
    expect(focalOffsetX(NEAR_ORBIT_RADIUS, 45, 0.46, orbitCardShare(true))).toBeCloseTo(0);
  });
});

describe("orbitRadiusForZoom", () => {
  it("maps far to ORBIT_RADIUS and near to NEAR_ORBIT_RADIUS", () => {
    expect(orbitRadiusForZoom("far", false)).toBe(ORBIT_RADIUS);
    expect(orbitRadiusForZoom("near", false)).toBe(NEAR_ORBIT_RADIUS);
  });

  it("answers a phone with the handheld pair instead", () => {
    expect(orbitRadiusForZoom("far", true)).toBe(HANDHELD_ORBIT_RADIUS);
    expect(orbitRadiusForZoom("near", true)).toBe(HANDHELD_NEAR_ORBIT_RADIUS);
  });
});

/** The planet's disc, as a share of the frame's height, seen from `radius`. */
const discHeight = (radius: number) =>
  Math.tan(Math.asin(SMOOTH_PLANET_RADIUS / radius)) / Math.tan((CAMERA_FOV * Math.PI) / 360);

describe("orbitRadiusForDiscHeight", () => {
  // The solver and the projection it inverts, checked against each other —
  // the one thing a sign slip or a stray factor of two here would not show up
  // as anything but "the framing moved a bit".
  it("answers the distance that draws exactly the share it was asked for", () => {
    for (const share of [0.2, 1 / 3, 0.5, 3 / 4, 1]) {
      expect(discHeight(orbitRadiusForDiscHeight(share))).toBeCloseTo(share, 10);
    }
  });

  it("puts the camera further out for a smaller disc", () => {
    expect(orbitRadiusForDiscHeight(1 / 3)).toBeGreaterThan(orbitRadiusForDiscHeight(3 / 4));
  });

  it("never puts it inside the planet", () => {
    for (const share of [0.2, 1 / 3, 3 / 4, 1]) {
      expect(orbitRadiusForDiscHeight(share)).toBeGreaterThan(SMOOTH_PLANET_RADIUS);
    }
  });
});

describe("the handheld altitudes", () => {
  /**
   * The planet's centre is the camera's look-at target, so it lands
   * `0.5 + lean/2` down the frame and its top edge `disc/2` above that.
   * `lean` is the handheld lean at the near altitude and zero at the far one,
   * which is the whole reason one rule gives two different distances.
   */
  const planetTop = (radius: number, lean: number) => 0.5 + lean / 2 - discHeight(radius) / 2;

  it("puts the planet's edge a third of the way down the frame at both stages", () => {
    expect(planetTop(HANDHELD_NEAR_ORBIT_RADIUS, HANDHELD_VERTICAL_SHARE)).toBeCloseTo(HANDHELD_PLANET_TOP, 10);
    expect(planetTop(HANDHELD_ORBIT_RADIUS, 0)).toBeCloseTo(HANDHELD_PLANET_TOP, 10);
  });

  it("leaves the desktop's own altitudes exactly where the reference photos put them", () => {
    // The request that produced the handheld pair was about a phone. This is
    // the same fence `nearVerticalShare(false)` stands behind: nothing
    // measured on a 0.46-aspect frame with a card rail along the bottom is
    // allowed to leak back onto a 16:9 one without it.
    expect(ORBIT_RADIUS).toBe(100);
    expect(NEAR_ORBIT_RADIUS).toBe(50);
    expect(HANDHELD_NEAR_ORBIT_RADIUS).toBeGreaterThan(NEAR_ORBIT_RADIUS);
    expect(HANDHELD_ORBIT_RADIUS).toBeGreaterThan(ORBIT_RADIUS);
  });

  it("keeps the overview further out than the default view", () => {
    expect(HANDHELD_ORBIT_RADIUS).toBeGreaterThan(HANDHELD_NEAR_ORBIT_RADIUS);
  });

  it("opens the sky by pulling back rather than by leaning further", () => {
    // Both would move the planet's edge down the frame; only one of them
    // takes the card's dotted trail with it. The lean pushes the facing area
    // down by `lean·radius·H/(2·depth)` px — pulling back grows the radius
    // but grows the depth faster, so the push shrinks. Charged at the closest
    // depth measured over a lap at 390x844 (the marker came within 19.6 of
    // the camera at radius 50, i.e. it sits 30.4 out from the planet's
    // centre).
    const markerRadius = 50 - 19.6;
    const push = (radius: number) =>
      (HANDHELD_VERTICAL_SHARE * radius * 844) / (2 * (radius - markerRadius));
    expect(push(HANDHELD_NEAR_ORBIT_RADIUS)).toBeLessThan(push(NEAR_ORBIT_RADIUS));
    expect(nearVerticalShare(true)).toBe(HANDHELD_VERTICAL_SHARE);
  });
});

describe("orbitAnglesOf", () => {
  it("inverts orbitPose exactly", () => {
    for (const [azimuth, polar] of [
      [0, 1],
      [1.4, 0.6],
      [-2, 2.4],
      [3.0, 0.9],
    ]) {
      const [x, y, z] = orbitPose(azimuth, polar, 50);
      const angles = orbitAnglesOf([x, y, z]);
      expect(angles.azimuth).toBeCloseTo(azimuth);
      expect(angles.polar).toBeCloseTo(polar);
    }
  });

  it("is unaffected by the direction's own length", () => {
    const short = orbitAnglesOf([1, 2, 3]);
    const long = orbitAnglesOf([10, 20, 30]);
    expect(short.azimuth).toBeCloseTo(long.azimuth);
    expect(short.polar).toBeCloseTo(long.polar);
  });

  it("does not go NaN at the poles", () => {
    const top = orbitAnglesOf([0, 1, 0]);
    expect(top.polar).toBeCloseTo(0);
    expect(Number.isNaN(top.azimuth)).toBe(false);
    const bottom = orbitAnglesOf([0, -1, 0]);
    expect(bottom.polar).toBeCloseTo(Math.PI);
  });

  // acos is only defined on [-1, 1], so y/radius is clamped before it reaches
  // one — a defensive guard against exactly the NaN this session's mutation
  // testing has caught elsewhere (geometry.ts's own angleBetween has the
  // same clamp, for the same reason). Not exercised here: two million random
  // (x, y, z) with y within 2e-7 of radius, searching for Math.hypot rounding
  // y/hypot(x,y,z) above 1, found none — Math.hypot is accurate enough that
  // this overshoot is not something realistic floating-point arithmetic seems
  // to produce, at least not by this search. Kept anyway, at zero runtime
  // cost, as the same kind of insurance the clamp in angleBetween is.
});

describe("the free orbit's polar clamp", () => {
  it("keeps the camera off both poles", () => {
    expect(ORBIT_MIN_POLAR).toBeGreaterThan(0);
    expect(ORBIT_MAX_POLAR).toBeLessThan(Math.PI);
  });

  it("is symmetrical about the equator", () => {
    expect(ORBIT_MIN_POLAR).toBeCloseTo(Math.PI - ORBIT_MAX_POLAR);
  });
});

describe("orbitArcBetween", () => {
  const dirOf = (a: { azimuth: number; polar: number }): Direction => {
    const [x, y, z] = orbitPose(a.azimuth, a.polar, 1);
    return [x, y, z];
  };

  it("measures a tilt as the tilt itself", () => {
    // Polar runs along a meridian, so a change in it is already an arc.
    expect(orbitArcBetween({ azimuth: 1.2, polar: 1.0 }, { azimuth: 1.2, polar: 1.4 })).toBeCloseTo(0.4);
  });

  it("measures a turn round the equator as the turn itself", () => {
    const half = Math.PI / 2;
    expect(orbitArcBetween({ azimuth: 0.2, polar: half }, { azimuth: 0.9, polar: half })).toBeCloseTo(0.7);
  });

  it("counts the same turn of azimuth for far less the nearer a pole it happens", () => {
    // Why a speed for the camera has to be asked for in arc rather than in
    // azimuth: high over the planet a whole turn crosses almost no ground, and
    // a cap written in azimuth alone would let the camera race round up there.
    const equator = orbitArcBetween({ azimuth: 0, polar: Math.PI / 2 }, { azimuth: 0.5, polar: Math.PI / 2 });
    const overhead = orbitArcBetween({ azimuth: 0, polar: 0.3 }, { azimuth: 0.5, polar: 0.3 });
    expect(equator).toBeCloseTo(0.5);
    expect(overhead).toBeLessThan(0.5 * equator);
  });

  it("agrees with the angle between the two directions those angles name", () => {
    // An oracle that shares no arithmetic with the closed form: build both
    // points through orbitPose and measure them the way geometry does.
    const pairs: [{ azimuth: number; polar: number }, { azimuth: number; polar: number }][] = [
      [{ azimuth: 0, polar: 1 }, { azimuth: 0.4, polar: 1.3 }],
      [{ azimuth: -2.9, polar: 0.5 }, { azimuth: 2.9, polar: 2.1 }], // either side of ±π
      [{ azimuth: 1, polar: 0.2 }, { azimuth: 4, polar: 2.8 }],
      [{ azimuth: 0.75, polar: 1.57 }, { azimuth: 0.76, polar: 1.58 }],
    ];
    for (const [a, b] of pairs) {
      expect(orbitArcBetween(a, b)).toBeCloseTo(angleBetween(normalize(dirOf(a)), normalize(dirOf(b))));
    }
  });

  it("is zero, and not NaN, where the two points coincide", () => {
    const arc = orbitArcBetween({ azimuth: 2.2, polar: 0.8 }, { azimuth: 2.2, polar: 0.8 });
    expect(Number.isNaN(arc)).toBe(false);
    expect(arc).toBeCloseTo(0);
  });
});

describe("orbitStepFraction — how much of the gap one frame closes", () => {
  const frame = 1 / 60;
  const equator = Math.PI / 2;
  const gapOf = (gap: number) => ({
    from: { azimuth: 0, polar: equator },
    to: { azimuth: gap, polar: equator },
  });
  /** The arc a single frame actually covers, for a gap of `gap` radians. */
  const travelled = (gap: number, cap?: number) => {
    const { from, to } = gapOf(gap);
    const fraction = orbitStepFraction(from, to, frame, cap);
    return orbitArcBetween(from, {
      azimuth: from.azimuth + (to.azimuth - from.azimuth) * fraction,
      polar: from.polar + (to.polar - from.polar) * fraction,
    });
  };

  it("uncapped, takes the same share of the gap however big the gap is", () => {
    // The damp's own shape, and the complaint about it: a share of what is
    // left means a drag that went far is hauled back proportionally faster.
    expect(orbitStepFraction(gapOf(0.02).from, gapOf(0.02).to, frame)).toBeCloseTo(
      orbitStepFraction(gapOf(1.5).from, gapOf(1.5).to, frame)
    );
    expect(travelled(1.5)).toBeGreaterThan(travelled(0.02) * 50);
  });

  it("capped, covers the same arc however big the gap is", () => {
    // The fix, stated as the property that was wanted: one speed, not one
    // duration. 0.2 and 0.8 radians away both leave at the same pace.
    expect(travelled(0.2, ORBIT_RETURN_SPEED)).toBeCloseTo(travelled(0.8, ORBIT_RETURN_SPEED));
    expect(travelled(0.2, ORBIT_RETURN_SPEED)).toBeCloseTo(ORBIT_RETURN_SPEED * frame);
  });

  it("never crosses more arc in a frame than the cap allows", () => {
    for (const gap of [0.05, 0.2, 0.6, 1.5, 3.0]) {
      expect(travelled(gap, ORBIT_RETURN_SPEED)).toBeLessThanOrEqual(ORBIT_RETURN_SPEED * frame + 1e-12);
    }
  });

  it("holds to the cap on a long frame as well as a short one", () => {
    // The cap is a speed, so a frame worth four of them may cover four times
    // as much — and no more. A fixed per-frame step would fall behind on a
    // slow device instead.
    const { from, to } = gapOf(1.2);
    const long = 4 / 60;
    const fraction = orbitStepFraction(from, to, long, ORBIT_RETURN_SPEED);
    expect(fraction * 1.2).toBeCloseTo(ORBIT_RETURN_SPEED * long);
  });

  it("hands back to the damp for the last fraction of a degree", () => {
    // What ends a return: within about speed/λ radians the damp is already the
    // slower of the two, and the cap stops having anything to say.
    const close = gapOf(ORBIT_RETURN_SPEED / ORBIT_DAMP_LAMBDA / 4);
    expect(orbitStepFraction(close.from, close.to, frame, ORBIT_RETURN_SPEED)).toBe(
      orbitStepFraction(close.from, close.to, frame)
    );
  });

  it("never asks for more than the whole gap", () => {
    for (const gap of [1e-9, 1e-4, 0.01, 1, 3]) {
      for (const cap of [undefined, ORBIT_RETURN_SPEED]) {
        const { from, to } = gapOf(gap);
        const fraction = orbitStepFraction(from, to, frame, cap);
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it("stays a number when there is no gap at all", () => {
    const still = { azimuth: 0.4, polar: 1.1 };
    expect(orbitStepFraction(still, still, frame, ORBIT_RETURN_SPEED)).toBeGreaterThan(0);
  });
});

describe("drifting back onto the tour path after a drag", () => {
  const frame = 1 / 60;

  /**
   * Seconds for a camera released `gap` radians off the path to get back to
   * within `arrived`, with the path's own point drifting away from it at
   * `targetSpeed` all the while.
   */
  const secondsHome = (gap: number, cap: number | undefined, targetSpeed = 0, arrived = 0.02) => {
    const equator = Math.PI / 2;
    let camera = 0;
    let target = gap;
    for (let step = 0; step < 60 * 120; step++) {
      target += targetSpeed * frame;
      const from = { azimuth: camera, polar: equator };
      const to = { azimuth: target, polar: equator };
      if (to.azimuth - from.azimuth <= arrived) return step * frame;
      camera += (to.azimuth - from.azimuth) * orbitStepFraction(from, to, frame, cap);
    }
    return Infinity;
  };

  it("takes seconds where the damp alone took a fraction of one", () => {
    // The report this answers: released 0.35 rad (20°) off the path, the
    // planet was snatched back before the hand had left it.
    expect(secondsHome(0.35, undefined)).toBeLessThan(1);
    expect(secondsHome(0.35, ORBIT_RETURN_SPEED)).toBeGreaterThan(4);
    expect(secondsHome(0.35, ORBIT_RETURN_SPEED)).toBeLessThan(8);
  });

  it("still catches the path when the path is drifting away from it", () => {
    // The reason the cap cannot simply be AUTO_ORBIT_SPEED: the tour keeps
    // advancing while the camera returns, so a camera trailing directly behind
    // is chasing a point that is running from it at exactly that speed.
    expect(secondsHome(0.35, AUTO_ORBIT_SPEED, AUTO_ORBIT_SPEED)).toBe(Infinity);
    expect(secondsHome(0.35, ORBIT_RETURN_SPEED, AUTO_ORBIT_SPEED)).toBeLessThan(15);
  });

  it("closes on that receding point at about the speed the planet turns by itself", () => {
    // Which is what "come back at the idle rotation's speed" was asked for:
    // the arc between camera and target shrinks at ORBIT_RETURN_SPEED minus
    // the drift, and that difference is the idle drift itself.
    const gap = 0.35;
    const chasing = secondsHome(gap, ORBIT_RETURN_SPEED, AUTO_ORBIT_SPEED);
    expect(chasing).toBeGreaterThan(0.8 * (gap / AUTO_ORBIT_SPEED));
    expect(chasing).toBeLessThan(1.2 * (gap / AUTO_ORBIT_SPEED));
  });
});

describe("sectionPose", () => {
  const target: [number, number, number] = [10, 3, 4]; // an arbitrary point off the equator

  it("looks at the target it was given", () => {
    expect(sectionPose(target, 20).slice(3)).toEqual(target);
  });

  it("sits the requested distance away", () => {
    for (const distance of [8, 20, 40]) {
      const [px, py, pz] = sectionPose(target, distance);
      expect(Math.hypot(px - target[0], py - target[1], pz - target[2])).toBeCloseTo(distance);
    }
  });

  it("stands the camera SECTION_TILT above the building's own horizon, at any distance", () => {
    // Stated the way `SECTION_TILT`'s own docstring states it — the *elevation
    // above the local ground*, measured with a literal 19.5°, rather than by
    // restating `sectionPose`'s own `forward*cos + up*sin` back at itself.
    //
    // The previous version of this test asserted `π/2 - SECTION_TILT` from the
    // normal, which is the same number said backwards: it could only ever
    // agree with whatever the implementation did, and so it agreed with a
    // broken one for as long as that one shipped. If the two factors are ever
    // swapped, 19.5° becomes 70.5° and this fails on the literal.
    const elevationAt = (d: number) => {
      const [px, py, pz] = sectionPose(target, d);
      const offset: [number, number, number] = [px - target[0], py - target[1], pz - target[2]];
      const normal = target.map((v) => v / Math.hypot(...target)) as [number, number, number];
      const alongNormal = offset[0] * normal[0] + offset[1] * normal[1] + offset[2] * normal[2];
      return (Math.asin(alongNormal / Math.hypot(...offset)) * 180) / Math.PI;
    };
    expect(elevationAt(10)).toBeCloseTo(19.5, 1);
    expect(elevationAt(30)).toBeCloseTo(19.5, 1);
  });

  it("stands on the side the building's signage faces", () => {
    // Every building carries its `VoxelText` on its local +Z, which is
    // `tangentBasis(...).forward` (see `PLANET_SECTIONS`' note on yaw). A
    // camera on the other side of the building reads that lettering through
    // its own back, i.e. mirrored — which is exactly what shipped, though for
    // a different reason (see the `sectionUp` suite below). Pinning the side
    // here means the two halves of "the sign faces the camera" each have a
    // test of their own.
    for (const key of PLANET_SECTION_KEYS) {
      const centre = sectionPosition(key);
      const pose = sectionPose(centre, 20);
      const offset: Direction = [pose[0] - centre[0], pose[1] - centre[1], pose[2] - centre[2]];
      const { forward } = tangentBasis(centre as Direction);
      expect(dot(normalize(offset), forward)).toBeGreaterThan(0.5);
    }
  });

  // Deliberately *not* replaced by a "looks down rather than up" check on
  // world Y, which is what used to sit here. For an equatorial building the
  // local north tangent *is* world +Y, so `pose[1] > pose[4]` came out true
  // by putting the camera straight overhead in world terms — the degenerate
  // arrangement that produced the mirrored signage. It passed because the
  // shot was broken, not in spite of it. What "the right way up" actually
  // means is now stated against the building's own frame, above and below.

  // The reason sectionPose exists rather than reusing framePose: a building
  // away from the equator has to be approached along *its own* local up, not
  // world +Y. Built entirely from the target's own tangentBasis, so it cannot
  // point the wrong way regardless of latitude — checked here at a point deep
  // in the southern hemisphere, where a world-Y-based approach would have the
  // camera swing towards the *world's* north instead of the building's own.
  it("approaches from the building's own local north, at any latitude", () => {
    const southern: [number, number, number] = [5, -30, 5]; // steeply south
    const pose = sectionPose(southern, 20);
    const direction = southern.map((v) => v / Math.hypot(...southern));
    // The camera must be further from the origin along `direction` than the
    // target itself is — i.e. it backs away outward along the building's own
    // normal, not merely "upward" in world Y.
    const targetDistance = Math.hypot(...southern);
    const cameraDistance =
      pose[0] * direction[0] + pose[1] * direction[1] + pose[2] * direction[2];
    expect(cameraDistance).toBeGreaterThan(targetDistance);
  });

  it("defaults to SECTION_TILT", () => {
    const withDefault = sectionPose(target, 20);
    const withExplicit = sectionPose(target, 20, SECTION_TILT);
    expect(withDefault).toEqual(withExplicit);
  });

  it("a steeper tilt backs the camera further along the normal, for the same distance", () => {
    const shallow = sectionPose(target, 20, 0.2);
    const steep = sectionPose(target, 20, 1.2);
    const normal = target.map((v) => v / Math.hypot(...target));
    const heightAlong = (pose: Pose) =>
      (pose[0] - target[0]) * normal[0] + (pose[1] - target[1]) * normal[1] + (pose[2] - target[2]) * normal[2];
    expect(heightAlong(steep)).toBeGreaterThan(heightAlong(shallow));
  });
});

/**
 * The half of a section close-up that `sectionPose` does not carry: the roll.
 *
 * These are written against what goes wrong when it is missing, not against
 * how `sectionUp` computes it — the whole reason the previous suite could stay
 * green through a shipped, visibly broken shot is that it restated the
 * implementation instead of the requirement.
 */
describe("sectionUp — the roll a section close-up is rendered with", () => {
  /** Unit vector from the camera towards what it is looking at. */
  const viewDirection = (pose: Pose): Direction =>
    normalize([pose[3] - pose[0], pose[4] - pose[1], pose[5] - pose[2]]);

  /**
   * How close a camera's view direction may come to its own up vector before
   * `lookAt` has no defined roll left to compute. The free orbit keeps 8.6°
   * (`ORBIT_MIN_POLAR`); a section has no such clamp, so it has to be safe by
   * construction instead.
   */
  const SAFE_DEGREES = 30;

  const degreesBetween = (a: Direction, b: Direction) => (angleBetween(a, b) * 180) / Math.PI;

  it("keeps the view direction clear of the camera's own up, at every section", () => {
    for (const key of PLANET_SECTION_KEYS) {
      const centre = sectionPosition(key);
      const view = viewDirection(sectionPose(centre, 20));
      const away = degreesBetween(view, sectionUp(centre));
      expect(Math.min(away, 180 - away)).toBeGreaterThan(SAFE_DEGREES);
    }
  });

  it("would NOT be clear if the world's +Y were used instead — three sections are degenerate", () => {
    // The bug itself, pinned so it cannot come back by someone "simplifying"
    // sectionUp to ORBIT_UP. `products`, `skills` and `experience` all sit at
    // longitudes where the building's local north runs nearly along world +Y,
    // which put the view direction 10-19° off `camera.up` and handed the roll
    // to lookAt's degenerate case — the mirrored voxel signage.
    const degenerate = PLANET_SECTION_KEYS.filter((key) => {
      const view = viewDirection(sectionPose(sectionPosition(key), 20));
      const away = degreesBetween(view, ORBIT_UP);
      return Math.min(away, 180 - away) <= SAFE_DEGREES;
    });
    expect(degenerate).toEqual(["products", "skills", "experience"]);
  });

  it("is the building's own outward normal, and a unit vector", () => {
    for (const key of PLANET_SECTION_KEYS) {
      const centre = sectionPosition(key);
      const up = sectionUp(centre);
      expect(Math.hypot(...up)).toBeCloseTo(1);
      // Outward, not inward: pointing the same way as the building's own
      // position from the planet's centre.
      expect(dot(up, normalize(centre as Direction))).toBeCloseTo(1);
    }
  });

  it("differs from the world's up at every section — none of them stand at a pole", () => {
    for (const key of PLANET_SECTION_KEYS) {
      expect(degreesBetween(sectionUp(sectionPosition(key)), ORBIT_UP)).toBeGreaterThan(30);
    }
  });

  it("puts the building's own vertical on the screen's vertical", () => {
    // `camera.up` decides which world direction paints straight up the frame.
    // Handing it the building's normal is what makes a building stand upright
    // however far from the equator it is — with world +Y, `products` (whose
    // normal is nearly world +Z) rendered 84° over, i.e. lying on its side.
    for (const key of PLANET_SECTION_KEYS) {
      const centre = sectionPosition(key);
      const pose = sectionPose(centre, 20);
      const view = viewDirection(pose);
      const buildingUp = normalize(centre as Direction);

      /** The part of `v` that survives projection onto the image plane. */
      const onScreen = (v: Direction): Direction => {
        const along = dot(v, view);
        return normalize([v[0] - along * view[0], v[1] - along * view[1], v[2] - along * view[2]]);
      };

      expect(degreesBetween(onScreen(buildingUp), onScreen(sectionUp(centre)))).toBeLessThan(1);
    }
  });
});

describe("About's orbit", () => {
  it("looks down more steeply and pushes further to the side than a normal section", () => {
    // ABOUT_POLAR is measured from +Y (like every polar angle here), so a
    // steeper down-tilt is a *smaller* polar angle — this is the equivalent
    // of the old "ABOUT_TILT > SECTION_TILT".
    expect(Math.PI / 2 - ABOUT_POLAR).toBeGreaterThan(SECTION_TILT);
    expect(ABOUT_CARD_SHARE).toBeGreaterThan(CARD_SHARE);
  });

  it("sits further from the centre than the free orbit does", () => {
    expect(ABOUT_ORBIT_RADIUS).toBeGreaterThan(ORBIT_RADIUS);
  });

  // Pins the derivation itself (radius / cos(tilt), the hypotenuse), not just
  // the inequality above — a formula that swapped cos for sin, or dropped the
  // tilt correction outright, still clears "further than the free orbit" by
  // enough margin to hide either mistake.
  it("is stage 2's horizontal radius (185) over cos of its own tilt (0.62)", () => {
    expect(ABOUT_ORBIT_RADIUS).toBeCloseTo(227.31, 2);
  });

  it("orbits the same axis and target the free orbit does — the planet's own centre", () => {
    // orbitPose always looks at the origin by default; About uses the same
    // function with its own polar and radius, so this holds by construction,
    // pinned here as the property that actually matters (About must not drift
    // onto a different pivot than the rest of the site).
    const [, , , tx, ty, tz] = orbitPose(1.1, ABOUT_POLAR, ABOUT_ORBIT_RADIUS);
    expect([tx, ty, tz]).toEqual([0, 0, 0]);
  });

  it("stays inside the safe polar band", () => {
    expect(ABOUT_POLAR).toBeGreaterThan(ORBIT_MIN_POLAR);
    expect(ABOUT_POLAR).toBeLessThan(ORBIT_MAX_POLAR);
  });
});

describe("easeInOutCubic", () => {
  it("starts and ends exactly where the flight does", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("is half way through its travel at half time", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
  });

  // The property the whole curve exists for. The detail sheet takes roughly
  // 0.3s to clear the screen, so on the 1.2s flight home that is the first
  // quarter of the flight: an ease-out (which is what camera-controls' own
  // damping gives) would have spent well over half its travel by then, leaving
  // a snap for the part anyone can actually see.
  it("holds most of the travel back past the sheet's exit", () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.1);
  });

  it("never goes backwards", () => {
    let previous = -1;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const value = easeInOutCubic(Math.min(1, t));
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("is symmetrical about the midpoint", () => {
    for (const t of [0.1, 0.23, 0.4]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 12);
    }
  });
});

describe("glidePose", () => {
  const from = sectionPose(BUILDING_POSITIONS.products, 9);
  const to = orbitPose(orbitAnglesOf(BUILDING_POSITIONS.products).azimuth, Math.PI / 2 - 0.3);

  const radiusOf = (pose: readonly number[]) =>
    Math.hypot(pose[0] - pose[3], pose[1] - pose[4], pose[2] - pose[5]);

  it("lands on each end exactly", () => {
    glidePose(from, to, 0).forEach((v, i) => expect(v).toBeCloseTo(from[i], 9));
    glidePose(from, to, 1).forEach((v, i) => expect(v).toBeCloseTo(to[i], 9));
  });

  // The reason this interpolates an orbit rather than the two positions: a
  // straight line between two points on a sphere is a chord, and the chord's
  // midpoint sits *inside* the arc. Lerping the positions would dip the camera
  // closer to the planet before backing away from it.
  it("backs away the whole time instead of dipping in first", () => {
    const reset = orbitPose(0.4, Math.PI / 2 - 0.3);
    let previous = radiusOf(from);
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const radius = radiusOf(glidePose(from, reset, Math.min(1, t)));
      expect(radius).toBeGreaterThan(previous);
      previous = radius;
    }
    expect(previous).toBeCloseTo(radiusOf(reset), 6);
  });

  it("still retreats monotonically when it is not turning at all", () => {
    let previous = radiusOf(from);
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const radius = radiusOf(glidePose(from, to, Math.min(1, t)));
      expect(radius).toBeGreaterThan(previous);
      previous = radius;
    }
    expect(previous).toBeCloseTo(radiusOf(to), 6);
  });

  it("carries the look-at point straight across", () => {
    const mid = glidePose(from, to, 0.5);
    expect(mid[3]).toBeCloseTo((from[3] + to[3]) / 2, 9);
    expect(mid[4]).toBeCloseTo((from[4] + to[4]) / 2, 9);
    expect(mid[5]).toBeCloseTo((from[5] + to[5]) / 2, 9);
  });

  // Two framings a fraction of a turn apart either side of ±π. Sweeping the
  // raw difference between two atan2 results — which is what
  // CameraControls.lerp does — would take the 300°-odd way round instead.
  it("turns the short way round across the ±π seam", () => {
    const near = orbitPose(Math.PI - 0.2, Math.PI / 2);
    const far = orbitPose(-Math.PI + 0.2, Math.PI / 2);
    const mid = glidePose(near, far, 0.5);
    // Half way between them the short way is the far side of the seam, i.e.
    // azimuth ±π exactly: straight along -Z, with x back at zero.
    expect(Math.atan2(mid[0], mid[2])).toBeCloseTo(Math.PI, 6);
    expect(radiusOf(mid)).toBeCloseTo(radiusOf(near), 6);
  });

  it("keeps a still camera still", () => {
    glidePose(to, to, 0.37).forEach((v, i) => expect(v).toBeCloseTo(to[i], 9));
  });
});

describe("frameSizeChanged", () => {
  // The case this exists for, and the bug it is a regression test against: two
  // *different objects* holding the same dimensions are not a resize. `useThree`
  // hands back a fresh `size` on re-renders that are not resizes, and the
  // resize path snaps the focal offset straight to its destination — so reading
  // those re-renders as resizes teleported the offset to the destination just
  // before a flight read it as its starting value, and the sideways push
  // arrived as a jump instead of easing in. An identity comparison passes every
  // other test here and fails only this one.
  it("is not a resize when a fresh object carries the same dimensions", () => {
    expect(frameSizeChanged({ width: 1280, height: 800 }, { width: 1280, height: 800 })).toBe(
      false
    );
  });

  it("is a resize when either dimension moves", () => {
    expect(frameSizeChanged({ width: 1280, height: 800 }, { width: 1281, height: 800 })).toBe(true);
    expect(frameSizeChanged({ width: 1280, height: 800 }, { width: 1280, height: 799 })).toBe(true);
  });

  // Width is what the offset is a share of, but height changes the aspect and
  // so the frame's width in world units too — both have to count.
  it("counts a height-only change, which still moves the aspect", () => {
    const before = focalOffsetX(ORBIT_RADIUS, 45, 1280 / 800, ORBIT_CARD_SHARE);
    const after = focalOffsetX(ORBIT_RADIUS, 45, 1280 / 600, ORBIT_CARD_SHARE);
    expect(after).not.toBeCloseTo(before);
    expect(frameSizeChanged({ width: 1280, height: 800 }, { width: 1280, height: 600 })).toBe(true);
  });
});

describe("pixelsPerWorldUnit", () => {
  // The definition, stated as the thing it has to satisfy: however many world
  // units the frame is tall at that depth, they have to add up to the viewport.
  it("makes the visible frame height come out as the viewport height", () => {
    for (const depth of [4, 12, 26]) {
      for (const fov of [35, 45, 60]) {
        const frameHeight = 2 * Math.tan((fov * Math.PI) / 360) * depth;
        expect(pixelsPerWorldUnit(depth, fov, 900) * frameHeight).toBeCloseTo(900, 6);
      }
    }
  });

  it("halves as the subject moves twice as far away", () => {
    expect(pixelsPerWorldUnit(20, 45, 900)).toBeCloseTo(pixelsPerWorldUnit(10, 45, 900) / 2, 6);
  });

  it("doubles on a viewport twice as tall", () => {
    expect(pixelsPerWorldUnit(10, 45, 1800)).toBeCloseTo(pixelsPerWorldUnit(10, 45, 900) * 2, 6);
  });

  it("shrinks as the fov widens, since more world fits in the same pixels", () => {
    expect(pixelsPerWorldUnit(10, 60, 900)).toBeLessThan(pixelsPerWorldUnit(10, 45, 900));
  });
});

describe("markerScaleForScreenRadius", () => {
  /** What the sprite shader draws, given the scale this hands back. */
  const drawnHalfHeight = (scale: number, depth: number, fov: number, height: number) =>
    scale * MARKER_GLYPH_FILL * pixelsPerWorldUnit(depth, fov, height);

  // The property the trail leans on: ask for a radius, get a scale that draws
  // exactly that radius. If this holds, the gap between the trail's tip and the
  // dot's edge is a constant by construction.
  it("round-trips to the radius that was asked for", () => {
    for (const depth of [4, 9.5, 18, 26, 40]) {
      for (const radius of [6, 9, 14, 18]) {
        const scale = markerScaleForScreenRadius(radius, depth, 45, 900);
        expect(drawnHalfHeight(scale, depth, 45, 900)).toBeCloseTo(radius, 9);
      }
    }
  });

  it("holds the radius steady across viewports and fields of view", () => {
    for (const [fov, height] of [
      [45, 900],
      [45, 1600],
      [60, 720],
    ]) {
      const scale = markerScaleForScreenRadius(14, 22, fov, height);
      expect(drawnHalfHeight(scale, 22, fov, height)).toBeCloseTo(14, 9);
    }
  });

  it("grows the world scale in step with the distance", () => {
    const near = markerScaleForScreenRadius(14, 10, 45, 900);
    expect(markerScaleForScreenRadius(14, 30, 45, 900)).toBeCloseTo(near * 3, 6);
  });

  it("asks for a quad taller than the glyph, since the texture has margin", () => {
    // The drawn bolt covers 0.34 of the sprite, so a 14px half-height needs a
    // quad ~41px tall. Sizing the sprite as though the glyph filled it would
    // leave the trail stopping short of a marker a third smaller than it
    // expected — which is half of what the world-space estimate used to get
    // wrong. The margin is where the glow goes.
    const scale = markerScaleForScreenRadius(14, 20, 45, 900);
    expect(scale * pixelsPerWorldUnit(20, 45, 900)).toBeCloseTo(14 / MARKER_GLYPH_FILL, 6);
  });
});

describe("FRAME_MARGIN", () => {
  // Pinned, not just "positive" or "less than one" — those would still pass
  // for a value nowhere near the framing walked in against
  // reference/image6.png (see the constant's own comment).
  it("is 0.75 — tight enough that a framed building overflows the frame, not slack around it", () => {
    expect(FRAME_MARGIN).toBe(0.75);
  });
});
