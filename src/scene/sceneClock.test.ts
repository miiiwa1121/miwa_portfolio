import { beforeEach, describe, expect, it } from "vitest";
import { createSceneClock, type SceneClock } from "./sceneClock";

describe("sceneClock", () => {
  let clock: SceneClock;

  beforeEach(() => {
    clock = createSceneClock();
  });

  it("runs with the renderer while nothing has been paused", () => {
    expect(clock.time(0)).toBe(0);
    expect(clock.time(12.5)).toBe(12.5);
    expect(clock.delta(1 / 60)).toBe(1 / 60);
    expect(clock.paused()).toBe(false);
  });

  it("freezes at the instant the button was pressed", () => {
    clock.setPaused(true, 10);
    expect(clock.paused()).toBe(true);
    // Real time keeps running; scene time does not.
    expect(clock.time(10.5)).toBe(10);
    expect(clock.time(40)).toBe(10);
  });

  it("reports no step while paused, so delta-driven motion stops too", () => {
    clock.setPaused(true, 10);
    expect(clock.delta(1 / 60)).toBe(0);
    expect(clock.delta(3)).toBe(0);
  });

  it("carries on from where it stopped instead of jumping the pause forward", () => {
    clock.setPaused(true, 10);
    clock.setPaused(false, 310); // paused for five minutes
    expect(clock.time(310)).toBe(10);
    expect(clock.time(311)).toBe(11);
    expect(clock.delta(1 / 60)).toBe(1 / 60);
    expect(clock.paused()).toBe(false);
  });

  it("discounts every pause, not just the last one", () => {
    clock.setPaused(true, 10);
    clock.setPaused(false, 15);
    clock.setPaused(true, 20); // scene time 15
    clock.setPaused(false, 100);
    expect(clock.time(100)).toBe(15);
  });

  it("never runs backwards across a pause", () => {
    let scene = clock.time(8);
    for (const [paused, elapsed] of [
      [true, 8],
      [false, 20],
      [true, 21],
      [false, 60],
    ] as const) {
      clock.setPaused(paused, elapsed);
      const now = clock.time(elapsed);
      expect(now).toBeGreaterThanOrEqual(scene);
      scene = now;
    }
  });

  it("ignores a repeated pause, so the freeze point cannot drift", () => {
    clock.setPaused(true, 10);
    clock.setPaused(true, 30);
    expect(clock.time(30)).toBe(10);
    clock.setPaused(false, 30);
    expect(clock.time(30)).toBe(10);
  });

  it("ignores a repeated resume, so the scene cannot be rewound", () => {
    clock.setPaused(true, 10);
    clock.setPaused(false, 20);
    clock.setPaused(false, 40);
    expect(clock.time(40)).toBe(30);
  });

  // R3F restarts `clock.elapsedTime` from zero every time `frameloop` changes,
  // which this page does twice per visit to a detail page (see `restarts`).
  describe("when the renderer's clock restarts from zero", () => {
    it("does not send the scene back in time", () => {
      clock.time(40); // read the diorama for forty seconds
      // The detail page opens, then closes: elapsedTime is back at zero.
      expect(clock.time(0)).toBe(40);
      expect(clock.time(0.5)).toBe(40.5);
    });

    it("survives it happening more than once", () => {
      clock.time(40);
      clock.time(0);
      clock.time(12); // 52
      expect(clock.time(0)).toBe(52);
      expect(clock.time(3)).toBe(55);
    });

    it("freezes at the scene's own time, not the renderer's restarted one", () => {
      clock.time(40);
      clock.time(0); // the detail page closed; elapsedTime restarted
      expect(clock.time(5)).toBe(45);

      // The button is pressed five seconds after the restart. Reading `elapsed`
      // raw here would freeze the diorama at scene time 5 — forty seconds of it
      // thrown away on a press that should have changed nothing but the motion.
      clock.setPaused(true, 5);
      expect(clock.time(6)).toBe(45);
    });

    it("still discounts a pause that spans one", () => {
      clock.time(40);
      clock.setPaused(true, 40);
      expect(clock.time(0)).toBe(40); // frozen, and the restart passes underneath
      clock.setPaused(false, 5); // resumed five seconds after the restart
      expect(clock.time(5)).toBe(40);
      expect(clock.time(6)).toBe(41);
    });
  });

  it("gives each clock its own state", () => {
    const other = createSceneClock();
    clock.setPaused(true, 10);
    expect(other.paused()).toBe(false);
    expect(other.time(10)).toBe(10);
  });
});
