import { describe, expect, it } from "vitest";
import {
  ABOUT_CARD_SHARE,
  ABOUT_DISTANCE,
  ABOUT_RADIUS,
  ABOUT_TARGET_Y,
  ABOUT_TILT,
  BUILDING_POSITIONS,
  CARD_SHARE,
  HOME_ANGLE,
  HOME_CARD_SHARE,
  HOME_DISTANCE,
  HOME_HEIGHT,
  HOME_RADIUS,
  HOME_TARGET_Y,
  MARKER_DOT_FILL,
  SECTION_TILT,
  SECTIONS,
  SECTIONS_BY_AZIMUTH,
  adjacentSection,
  azimuthToXZ,
  aimOffset,
  easeInOutCubic,
  facingSection,
  frameDistance,
  framePose,
  glidePose,
  homeFocalOffsetX,
  homePose,
  markerScaleForScreenRadius,
  pixelsPerWorldUnit,
  sectionAzimuth,
  sectionTargets,
  wrapAngle,
} from "./worldLayout";
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
      const [x, z] = azimuthToXZ(a, HOME_RADIUS);
      expect(Math.atan2(x, z)).toBeCloseTo(a);
    }
  });

  it("keeps the requested radius", () => {
    const [x, z] = azimuthToXZ(1.234, HOME_RADIUS);
    expect(Math.hypot(x, z)).toBeCloseTo(HOME_RADIUS);
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

describe("sectionTargets", () => {
  it("covers every section the UI can focus", () => {
    for (const s of SECTIONS) expect(sectionTargets[s], s).toBeDefined();
  });

  it("sits directly above its building in XZ", () => {
    for (const s of SECTIONS) {
      const [tx, , tz] = sectionTargets[s];
      const [bx, , bz] = BUILDING_POSITIONS[s];
      expect(tx, `${s} x`).toBe(bx);
      expect(tz, `${s} z`).toBe(bz);
    }
  });

  it("aims above ground level", () => {
    for (const s of SECTIONS) expect(sectionTargets[s][1], s).toBeGreaterThan(0);
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

describe("framePose", () => {
  const target = [3, 2, -4] as const;

  it("looks at the target it was given", () => {
    expect(framePose(target, 0.5, 20).slice(3)).toEqual([...target]);
  });

  it("sits the requested distance away", () => {
    for (const distance of [8, 20, 40]) {
      const [px, py, pz] = framePose(target, 1.1, distance);
      expect(Math.hypot(px - target[0], py - target[1], pz - target[2])).toBeCloseTo(distance);
    }
  });

  it("approaches from the given azimuth", () => {
    for (const azimuth of [0, 1, -2.2]) {
      const [px, , pz] = framePose(target, azimuth, 15);
      expect(Math.atan2(px - target[0], pz - target[2])).toBeCloseTo(azimuth);
    }
  });

  it("looks down at the subject rather than up at it", () => {
    const pose = framePose(target, 0.7, 15);
    expect(pose[1]).toBeGreaterThan(pose[4]);
  });

  it("keeps the same tilt whatever the distance", () => {
    const angleAt = (d: number) => {
      const [px, py, pz] = framePose(target, 0.7, d);
      return Math.atan2(py - target[1], Math.hypot(px - target[0], pz - target[2]));
    };
    expect(angleAt(10)).toBeCloseTo(angleAt(30));
  });
});

describe("sectionAzimuth", () => {
  it("puts the area between the camera and the island centre", () => {
    // Closing the detail page by scrolling backs out to the overview turned so
    // the area just read about faces the camera. That only holds if the camera
    // ends up on the same side of the centre as the building.
    for (const s of SECTIONS) {
      const [px, , pz] = homePose(sectionAzimuth(s));
      const [tx, , tz] = sectionTargets[s];
      const alignment = (px * tx + pz * tz) / (Math.hypot(px, pz) * Math.hypot(tx, tz));
      expect(alignment, s).toBeCloseTo(1); // same direction from the origin
    }
  });

  it("agrees with the convention CameraControls reads back", () => {
    for (const s of SECTIONS) {
      const [px, , pz] = homePose(sectionAzimuth(s));
      expect(Math.atan2(px, pz), s).toBeCloseTo(sectionAzimuth(s));
    }
  });

  it("gives each area its own angle, so they are distinguishable", () => {
    const angles = SECTIONS.map(sectionAzimuth);
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        expect(Math.abs(wrapAngle(angles[i] - angles[j]))).toBeGreaterThan(0.2);
      }
    }
  });

  it("is pure", () => {
    expect(sectionAzimuth("contact")).toBe(sectionAzimuth("contact"));
  });
});

describe("facingSection", () => {
  it("returns an area for any angle, including far outside one turn", () => {
    for (const a of [-100, -7, -1, 0, 1, 7, 100]) {
      expect(SECTIONS, String(a)).toContain(facingSection(a));
    }
  });

  it("picks each area when the camera is turned exactly at it", () => {
    for (const s of SECTIONS) expect(facingSection(sectionAzimuth(s)), s).toBe(s);
  });

  it("is unaffected by winding — the orbit angle accumulates past a full turn", () => {
    for (const s of SECTIONS) {
      for (const turns of [-2, -1, 1, 3]) {
        expect(facingSection(sectionAzimuth(s) + turns * Math.PI * 2), s).toBe(s);
      }
    }
  });

  it("reaches every area over a full sweep, so none is unselectable", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 360; i++) seen.add(facingSection((i * Math.PI) / 180));
    expect([...seen].sort()).toEqual([...SECTIONS].sort());
  });

  it("changes exactly as many times as there are areas, going round once", () => {
    // One contiguous arc per area. More switches would mean the card flickers
    // back and forth somewhere on the way round.
    let switches = 0;
    let previous = facingSection(0);
    for (let i = 1; i <= 3600; i++) {
      const next = facingSection((i * Math.PI * 2) / 3600);
      if (next !== previous) switches++;
      previous = next;
    }
    expect(switches).toBe(SECTIONS.length);
  });
});

describe("homePose", () => {
  it("looks at the centre of the island", () => {
    expect(homePose(0.9).slice(3)).toEqual([0, HOME_TARGET_Y, 0]);
  });

  it("orbits at the configured radius and height", () => {
    for (const a of [0, 1, -2.2, Math.PI]) {
      const [x, y, z] = homePose(a);
      expect(Math.hypot(x, z)).toBeCloseTo(HOME_RADIUS);
      expect(y).toBe(HOME_HEIGHT);
    }
  });

  it("agrees with the azimuth CameraControls would read back", () => {
    // The return-home flight and the scroll lerp both aim at homePose(frozen
    // azimuth); if this drifted, the camera would land somewhere else.
    for (const a of [0.3, 2, -1.1]) {
      const [x, , z] = homePose(a);
      expect(Math.atan2(x, z)).toBeCloseTo(a);
    }
  });
});

describe("the home view's tilt", () => {
  it("still looks down 16.1°, the angle the framing was measured at", () => {
    // The radius grew to make room for the sideways push, and the height was
    // moved with it so the view got further away rather than flatter. Nothing
    // else states that the pair belong together, so it is pinned here: raising
    // the radius alone would flatten the diorama's three-quarter view.
    const tilt = (Math.atan2(HOME_HEIGHT - HOME_TARGET_Y, HOME_RADIUS) * 180) / Math.PI;
    expect(tilt).toBeCloseTo(16.1, 1);
  });
});

describe("HOME_DISTANCE", () => {
  it("is the distance homePose actually puts between the camera and its target", () => {
    // homeFocalOffsetX measures the frame's width at this distance, so a
    // hand-typed value drifting from the pose would silently mis-size the push.
    for (const a of [0, 0.8, -2.1]) {
      const [x, y, z, tx, ty, tz] = homePose(a);
      expect(Math.hypot(x - tx, y - ty, z - tz)).toBeCloseTo(HOME_DISTANCE);
    }
  });
});

describe("homeFocalOffsetX", () => {
  // A focal offset moves the camera along its own right axis, so pushing the
  // island rightwards on screen means moving the camera leftwards: negative.
  it("is negative, so the island lands right of centre and clear of the card", () => {
    expect(homeFocalOffsetX(45, 1.6)).toBeLessThan(0);
  });

  it("pushes further on a wider frame, where a share of the width is more world", () => {
    expect(homeFocalOffsetX(45, 1.9)).toBeLessThan(homeFocalOffsetX(45, 0.6));
  });

  it("moves the island's centre by half the share, as a fraction of frame width", () => {
    // The share is measured against the *half* width (aimOffset's halfHorizontal
    // leg), so the shift on screen is half of it. This is the number the value
    // of HOME_CARD_SHARE was chosen against, so it is the one worth pinning.
    const aspect = 1.6;
    const halfWidth = HOME_DISTANCE * Math.tan(Math.atan(Math.tan((45 * Math.PI) / 360) * aspect));
    expect(-homeFocalOffsetX(45, aspect) / (2 * halfWidth)).toBeCloseTo(HOME_CARD_SHARE / 2);
  });

  it("leaves the island centred when nothing is given away", () => {
    expect(aimOffset(HOME_DISTANCE, 45, 1.6, 0)).toBe(0);
  });

  it("pushes less than a section does, since the whole island has to stay in frame", () => {
    expect(HOME_CARD_SHARE).toBeLessThan(CARD_SHARE);
  });
});

describe("section coverage", () => {
  it("has a building for every focusable section", () => {
    const focusable: NonNullable<SectionType>[] = [...SECTIONS];
    expect(Object.keys(BUILDING_POSITIONS).sort()).toEqual([...focusable].sort());
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

describe("framePose with a sideways aim", () => {
  const target = [3, 2, -4] as const;

  it("keeps the camera where it was and only moves what it looks at", () => {
    const straight = framePose(target, 0.7, 20);
    const shifted = framePose(target, 0.7, 20, undefined, 5);
    expect(shifted.slice(0, 3)).toEqual(straight.slice(0, 3));
    expect(shifted.slice(3)).not.toEqual(straight.slice(3));
  });

  it("aims to the camera's left, which puts the subject on the right", () => {
    const azimuth = 0; // camera on +Z looking towards -Z; its right is +X
    const shifted = framePose([0, 0, 0], azimuth, 20, undefined, 5);
    expect(shifted[3]).toBeCloseTo(-5); // target moved to -X, i.e. camera-left
  });

  it("shifts perpendicular to the view, never along it", () => {
    for (const azimuth of [0.3, 1.9, -2.4]) {
      const [px, , pz, tx, , tz] = framePose(target, azimuth, 20, undefined, 4);
      const view = [target[0] - px, target[2] - pz];
      const shift = [tx - target[0], tz - target[2]];
      expect(view[0] * shift[0] + view[1] * shift[1]).toBeCloseTo(0);
    }
  });
});

describe("about's framing", () => {
  it("looks down more steeply and pushes further to the side than a normal section", () => {
    expect(ABOUT_TILT).toBeGreaterThan(SECTION_TILT);
    expect(ABOUT_CARD_SHARE).toBeGreaterThan(CARD_SHARE);
  });

  it("orbits the very same axis the free/home view does — the island's centre line, not the about building", () => {
    // The defining property, and the reason this shape exists: About pivots on
    // the vertical line through the island's centre, exactly what the idle
    // home orbit turns around, rather than on the small "about" building. The
    // radius and the aim height are free to differ (they are what frame the
    // shot); being centred on the same line is what is not.
    const aboutTarget: readonly [number, number, number] = [0, ABOUT_TARGET_Y, 0];

    // Aimed at a point *on* that axis: the axis is the vertical line through
    // the origin, so the target's XZ has to be the origin itself.
    expect(aboutTarget[0]).toBe(0);
    expect(aboutTarget[2]).toBe(0);

    const radii: number[] = [];
    const heights: number[] = [];
    for (const azimuth of [0, 1.2, -2.4, 3.0, sectionAzimuth("about")]) {
      const [px, py, pz] = framePose(aboutTarget, azimuth, ABOUT_DISTANCE, ABOUT_TILT);
      const [hx, , hz] = homePose(azimuth);
      // Concentric with home's circle: both are centred on the origin, so the
      // camera's bearing from the axis matches home's at every azimuth even
      // though the two radii differ.
      expect(Math.atan2(px, pz)).toBeCloseTo(Math.atan2(hx, hz));
      radii.push(Math.hypot(px, pz));
      heights.push(py);
    }
    // A circle about that axis, not an arc drifting off it: the distance from
    // the axis and the height are the same at every azimuth.
    for (const r of radii) expect(r).toBeCloseTo(ABOUT_RADIUS);
    for (const y of heights) expect(y).toBeCloseTo(heights[0]);
  });

  it("sits further out and higher than the home view, for the distant looking-down framing", () => {
    expect(ABOUT_RADIUS).toBeGreaterThan(HOME_RADIUS);
    expect(ABOUT_DISTANCE).toBeGreaterThan(ABOUT_RADIUS); // hypotenuse of the tilt
    const [, py] = framePose([0, ABOUT_TARGET_Y, 0], 0.7, ABOUT_DISTANCE, ABOUT_TILT);
    expect(py).toBeGreaterThan(HOME_HEIGHT);
  });

  it("aims lower than the home view, which is what lifts the island up the frame", () => {
    // Measured against reference/image2.png: aiming at HOME_TARGET_Y ran the
    // island off the bottom edge (99.9% of frame height vs the reference's
    // 90.4%). The camera centres on what it aims at, so dropping the aim point
    // raises everything above it.
    expect(ABOUT_TARGET_Y).toBeLessThan(HOME_TARGET_Y);
  });

  it("still pushes the look-at target aside to clear the text, without moving the camera itself", () => {
    const azimuth = sectionAzimuth("about");
    const sideways = aimOffset(ABOUT_DISTANCE, 45, 1.6, ABOUT_CARD_SHARE);
    const target: readonly [number, number, number] = [0, ABOUT_TARGET_Y, 0];
    const pushed = framePose(target, azimuth, ABOUT_DISTANCE, ABOUT_TILT, sideways);
    const plain = framePose(target, azimuth, ABOUT_DISTANCE, ABOUT_TILT);
    expect(pushed.slice(0, 3)).toEqual(plain.slice(0, 3));
    expect(pushed.slice(3)).not.toEqual(plain.slice(3));
  });
});

describe("adjacentSection", () => {
  it("orders the areas the way the camera meets them, not by declaration", () => {
    const angles = SECTIONS_BY_AZIMUTH.map(sectionAzimuth);
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
  });

  it("steps forward and back to the same place", () => {
    for (const s of SECTIONS) expect(adjacentSection(adjacentSection(s, 1), -1)).toBe(s);
  });

  it("wraps past the ends rather than sticking", () => {
    const first = SECTIONS_BY_AZIMUTH[0];
    const last = SECTIONS_BY_AZIMUTH[SECTIONS_BY_AZIMUTH.length - 1];
    expect(adjacentSection(first, -1)).toBe(last);
    expect(adjacentSection(last, 1)).toBe(first);
  });

  it("visits every area exactly once before returning", () => {
    let at = SECTIONS_BY_AZIMUTH[0];
    const seen = [at];
    for (let i = 1; i < SECTIONS.length; i++) {
      at = adjacentSection(at, 1);
      seen.push(at);
    }
    expect(new Set(seen).size).toBe(SECTIONS.length);
    expect(adjacentSection(at, 1)).toBe(SECTIONS_BY_AZIMUTH[0]);
  });

  it("never moves when the step is zero", () => {
    for (const s of SECTIONS) expect(adjacentSection(s, 0)).toBe(s);
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
  const drawnRadius = (scale: number, depth: number, fov: number, height: number) =>
    scale * MARKER_DOT_FILL * pixelsPerWorldUnit(depth, fov, height);

  // The property the trail leans on: ask for a radius, get a scale that draws
  // exactly that radius. If this holds, the gap between the trail's tip and the
  // dot's edge is a constant by construction.
  it("round-trips to the radius that was asked for", () => {
    for (const depth of [4, 9.5, 18, 26, 40]) {
      for (const radius of [6, 9, 14, 18]) {
        const scale = markerScaleForScreenRadius(radius, depth, 45, 900);
        expect(drawnRadius(scale, depth, 45, 900)).toBeCloseTo(radius, 9);
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
      expect(drawnRadius(scale, 22, fov, height)).toBeCloseTo(14, 9);
    }
  });

  it("grows the world scale in step with the distance", () => {
    const near = markerScaleForScreenRadius(14, 10, 45, 900);
    expect(markerScaleForScreenRadius(14, 30, 45, 900)).toBeCloseTo(near * 3, 6);
  });

  it("asks for a quad wider than the disc, since the texture has margin", () => {
    // The drawn disc covers 0.37 of the sprite, so a 14px radius needs a quad
    // ~38px across. Sizing the sprite as though the disc filled it would leave
    // the trail stopping short of a dot a third smaller than it expected —
    // which is half of what the world-space estimate used to get wrong.
    const scale = markerScaleForScreenRadius(14, 20, 45, 900);
    expect(scale * pixelsPerWorldUnit(20, 45, 900)).toBeCloseTo(14 / MARKER_DOT_FILL, 6);
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
  const from = framePose(sectionTargets.products, sectionAzimuth("products"), 9);
  const to = homePose(sectionAzimuth("products"));

  const radiusOf = (pose: readonly number[]) =>
    Math.hypot(pose[0] - pose[3], pose[1] - pose[4], pose[2] - pose[5]);

  it("lands on each end exactly", () => {
    glidePose(from, to, 0).forEach((v, i) => expect(v).toBeCloseTo(from[i], 9));
    glidePose(from, to, 1).forEach((v, i) => expect(v).toBeCloseTo(to[i], 9));
  });

  // The reason this interpolates an orbit rather than the two positions: a
  // straight line between two points on an arc is a chord, and the chord's
  // midpoint sits *inside* the arc. Lerping the positions would dip the camera
  // closer to the town before backing away from it.
  //
  // Measured against the HOME button's flight, not the scroll-off one. Both
  // ends of a scroll-off share an azimuth — it backs out along the line it
  // came in on — so its chord barely deviates from its arc and the bug hides.
  // HOME turns as well as retreats, and there the chord cuts the corner: at a
  // fifth of the way through the position lerp the camera sits 8.2 units out
  // against the 9 it started at, i.e. moving in.
  it("backs away the whole time instead of dipping in first", () => {
    const reset = homePose(HOME_ANGLE);
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
    const near = homePose(Math.PI - 0.2);
    const far = homePose(-Math.PI + 0.2);
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
