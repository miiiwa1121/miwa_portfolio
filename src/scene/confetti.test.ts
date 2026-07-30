import { describe, expect, it } from "vitest";
import {
  CONFETTI_FALL_TOP,
  CONFETTI_SPREAD,
  spawnConfetti,
  stepConfetti,
} from "./confetti";

describe("spawnConfetti", () => {
  it("produces the requested number of flakes", () => {
    expect(spawnConfetti(0)).toHaveLength(0);
    expect(spawnConfetti(90)).toHaveLength(90);
  });

  it("is deterministic — the whole point of not using Math.random()", () => {
    expect(spawnConfetti(30)).toEqual(spawnConfetti(30));
  });

  it("spreads flakes out instead of stacking them at one point", () => {
    const parts = spawnConfetti(90);
    expect(new Set(parts.map((p) => p.x)).size).toBeGreaterThan(50);
    expect(new Set(parts.map((p) => p.y)).size).toBeGreaterThan(50);
  });

  it("keeps every flake inside the intended volume", () => {
    for (const p of spawnConfetti(200)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(CONFETTI_SPREAD);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(CONFETTI_SPREAD);
      expect(p.y).toBeGreaterThanOrEqual(1);
      expect(p.y).toBeLessThanOrEqual(CONFETTI_FALL_TOP + 1);
    }
  });

  it("gives every flake a downward speed, so none can hang in mid-air", () => {
    for (const p of spawnConfetti(200)) expect(p.speed).toBeGreaterThan(0);
  });
});

describe("stepConfetti", () => {
  it("moves flakes down by speed × delta", () => {
    const parts = [{ x: 0, y: 10, z: 0, speed: 2, sway: 0, spin: 0 }];
    stepConfetti(parts, 0.5);
    expect(parts[0].y).toBeCloseTo(9);
  });

  it("recycles a flake to the top once it passes the ground", () => {
    const parts = [{ x: 0, y: 0.1, z: 0, speed: 1, sway: 0, spin: 0 }];
    stepConfetti(parts, 1);
    expect(parts[0].y).toBe(CONFETTI_FALL_TOP);
  });

  it("leaves horizontal position and phase alone", () => {
    const parts = [{ x: 3, y: 10, z: -4, speed: 1, sway: 1.2, spin: 0.7 }];
    stepConfetti(parts, 0.5);
    expect(parts[0]).toMatchObject({ x: 3, z: -4, sway: 1.2, spin: 0.7 });
  });

  it("never lets a flake escape the band over a long run", () => {
    const parts = spawnConfetti(50);
    for (let i = 0; i < 2000; i++) stepConfetti(parts, 1 / 60);
    for (const p of parts) {
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(CONFETTI_FALL_TOP);
    }
  });

  it("does nothing on an empty field", () => {
    expect(() => stepConfetti([], 0.016)).not.toThrow();
  });
});
