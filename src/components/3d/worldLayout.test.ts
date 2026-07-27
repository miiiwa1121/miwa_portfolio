import { describe, expect, it } from "vitest";
import {
  BUILDING_POSITIONS,
  HOME_HEIGHT,
  HOME_RADIUS,
  HOME_TARGET_Y,
  SECTIONS,
  azimuthToXZ,
  aimOffset,
  facingSection,
  frameDistance,
  framePose,
  homePose,
  sectionAzimuth,
  sectionTargets,
  wrapAngle,
} from "./worldLayout";
import type { SectionType } from "../AppStateContext";


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
