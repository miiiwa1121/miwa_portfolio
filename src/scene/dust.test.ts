import { describe, expect, it } from "vitest";
import { DUST_MAX_RADIUS, DUST_MIN_RADIUS, spawnDust, stepDust } from "./dust";

const length = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe("spawnDust", () => {
  it("produces the requested number of specks", () => {
    expect(spawnDust(0)).toHaveLength(0);
    expect(spawnDust(80)).toHaveLength(80);
  });

  it("is deterministic — same field on every mount", () => {
    expect(spawnDust(30)).toEqual(spawnDust(30));
  });

  it("gives every speck a unit direction", () => {
    for (const p of spawnDust(100)) expect(length(p)).toBeCloseTo(1);
  });

  it("gives every speck a unit orbit axis", () => {
    for (const p of spawnDust(100)) {
      expect(Math.hypot(p.axisX, p.axisY, p.axisZ)).toBeCloseTo(1);
    }
  });

  it("keeps every speck's radius inside the intended shell", () => {
    for (const p of spawnDust(100)) {
      expect(p.radius).toBeGreaterThanOrEqual(DUST_MIN_RADIUS);
      expect(p.radius).toBeLessThanOrEqual(DUST_MAX_RADIUS);
    }
  });

  it("gives every speck a positive orbital speed, so none can hang motionless", () => {
    for (const p of spawnDust(100)) expect(p.speed).toBeGreaterThan(0);
  });

  it("spreads specks out instead of stacking them at one point", () => {
    const parts = spawnDust(80);
    expect(new Set(parts.map((p) => p.x)).size).toBeGreaterThan(50);
    expect(new Set(parts.map((p) => p.radius)).size).toBeGreaterThan(50);
  });
});

describe("stepDust", () => {
  it("keeps a speck's direction at unit length", () => {
    const parts = spawnDust(20);
    for (let i = 0; i < 50; i++) stepDust(parts, 1 / 60);
    for (const p of parts) expect(length(p)).toBeCloseTo(1);
  });

  it("actually moves a speck — it does not just sit still", () => {
    const parts = spawnDust(5);
    const before = parts.map((p) => ({ x: p.x, y: p.y, z: p.z }));
    stepDust(parts, 5);
    parts.forEach((p, i) => {
      const moved = Math.hypot(p.x - before[i].x, p.y - before[i].y, p.z - before[i].z);
      expect(moved).toBeGreaterThan(0.01);
    });
  });

  it("leaves radius, axis, speed and twinkle alone", () => {
    const parts = spawnDust(5);
    const before = parts.map((p) => ({ ...p }));
    stepDust(parts, 2);
    parts.forEach((p, i) => {
      expect(p.radius).toBeCloseTo(before[i].radius);
      expect(p.axisX).toBeCloseTo(before[i].axisX);
      expect(p.axisY).toBeCloseTo(before[i].axisY);
      expect(p.axisZ).toBeCloseTo(before[i].axisZ);
      expect(p.speed).toBeCloseTo(before[i].speed);
      expect(p.twinkle).toBeCloseTo(before[i].twinkle);
    });
  });

  it("never lets a speck drift off its own shell over a long run", () => {
    const parts = spawnDust(30);
    const radii = parts.map((p) => p.radius);
    for (let i = 0; i < 3000; i++) stepDust(parts, 1 / 60);
    parts.forEach((p, i) => {
      expect(length(p)).toBeCloseTo(1);
      expect(p.radius).toBeCloseTo(radii[i]);
    });
  });

  it("does nothing on an empty field", () => {
    expect(() => stepDust([], 0.016)).not.toThrow();
  });
});
