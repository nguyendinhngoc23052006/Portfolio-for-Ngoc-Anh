import { describe, expect, it } from "vitest";
import { noteAt } from "../lib/sound";
import {
  burstPowerFor,
  type Cocoon,
  measureWind,
  pitchForWind,
  pointOnCocoon,
  type RopePoint,
  spinRateFor,
  windInto,
} from "./cocoon";

const centre = { x: 400, y: 300 };

function cocoonAt(wind: number, angle = 0): Cocoon {
  return { ...centre, wind, angle, heldMs: wind * 2500 };
}

function distanceFromCentre(point: { x: number; y: number }): number {
  return Math.hypot(point.x - centre.x, point.y - centre.y);
}

describe("measureWind", () => {
  it("climbs from 0 to 1 over two and a half seconds and stays there", () => {
    expect(measureWind(0)).toBe(0);
    expect(measureWind(1250)).toBeCloseTo(0.5);
    expect(measureWind(2500)).toBe(1);
    expect(measureWind(9000)).toBe(1);
  });
});

describe("pointOnCocoon", () => {
  it("keeps the head at the centre and tightens the tail as the silk winds", () => {
    const loose = distanceFromCentre(pointOnCocoon(25, 26, cocoonAt(0)));
    const tight = distanceFromCentre(pointOnCocoon(25, 26, cocoonAt(1)));
    expect(distanceFromCentre(pointOnCocoon(0, 26, cocoonAt(0.5)))).toBeLessThan(4);
    expect(loose).toBeGreaterThan(tight * 2);
    expect(tight).toBeLessThan(24);
  });

  it("turns with the angle without changing the shape", () => {
    const before = pointOnCocoon(12, 26, cocoonAt(0.6, 0));
    const after = pointOnCocoon(12, 26, cocoonAt(0.6, 1));
    expect(after).not.toEqual(before);
  });
});

describe("windInto", () => {
  it("pulls every knot toward its place on the spiral and remembers where it was", () => {
    const points: RopePoint[] = Array.from({ length: 26 }, (_, i) => ({
      x: centre.x,
      y: centre.y + i * 8,
      px: 0,
      py: 0,
    }));
    const cocoon = cocoonAt(1);
    const before = points.map((p) => ({ ...p }));
    windInto(points, cocoon);
    for (const [index, point] of points.entries()) {
      const start = before[index];
      const target = pointOnCocoon(index, points.length, cocoon);
      expect(point.px).toBe(start?.x);
      expect(point.py).toBe(start?.y);
      const gap = (a: { x: number; y: number }) => Math.hypot(a.x - target.x, a.y - target.y);
      expect(gap(point)).toBeLessThanOrEqual(gap(start ?? point));
    }
  });
});

describe("pitchForWind", () => {
  it("rises smoothly from the fourth note of the scale to the thirteenth", () => {
    expect(pitchForWind(0)).toBeCloseTo(noteAt(3));
    expect(pitchForWind(1)).toBeCloseTo(noteAt(12));
    const steps = [0, 0.25, 0.5, 0.75, 1].map(pitchForWind);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });
});

describe("release values", () => {
  it("scales the burst with the hold and clamps it", () => {
    expect(burstPowerFor(600)).toBeCloseTo(0.8);
    expect(burstPowerFor(0)).toBe(0.5);
    expect(burstPowerFor(10000)).toBe(1.8);
  });

  it("spins faster as it winds", () => {
    expect(spinRateFor(1)).toBeGreaterThan(spinRateFor(0));
  });
});
