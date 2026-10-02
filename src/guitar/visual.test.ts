import { describe, expect, it } from "vitest";
import { fretPosition } from "./physics";
import { VisualString } from "./visual";

function maxDifference(a: Float32Array, b: Float32Array): number {
  return a.reduce((max, value, i) => Math.max(max, Math.abs(value - (b[i] ?? 0))), 0);
}

describe("the string you see", () => {
  it("returns to the shape it was plucked into once every period, as d'Alembert says", () => {
    const string = new VisualString(96);
    string.pluck(0.2, 1);
    const start = Float32Array.from(string.displacement);
    string.step(96);
    expect(maxDifference(string.displacement, start)).toBeGreaterThan(0.1);
    string.step(96);
    expect(maxDifference(string.displacement, start)).toBeLessThan(1e-5);
  });

  it("vibrates twice as fast when pressed at the 12th fret", () => {
    const string = new VisualString(96);
    string.press(fretPosition(12));
    string.pluck(0.3, 1);
    const start = Float32Array.from(string.displacement);
    string.step(96);
    expect(maxDifference(string.displacement, start)).toBeLessThan(1e-5);
  });

  it("keeps the part behind the fret still", () => {
    const string = new VisualString(96);
    string.press(fretPosition(5));
    string.pluck(0.5, 1);
    string.step(37);
    const behind = string.displacement.subarray(0, string.stopIndex + 1);
    expect(behind.every((value) => value === 0)).toBe(true);
    expect(string.peak()).toBeGreaterThan(0);
  });

  it("settles when it loses energy, and stays pinned at both ends", () => {
    const string = new VisualString(64);
    string.pluck(0.25, 1);
    string.step(2000, 0.995);
    expect(string.peak()).toBeLessThan(1e-3);
    expect(string.displacement[0]).toBe(0);
    expect(string.displacement[64]).toBe(0);
  });

  it("carries fractions of a step from one frame to the next", () => {
    const steady = new VisualString(64);
    const framed = new VisualString(64);
    steady.pluck(0.3, 1);
    framed.pluck(0.3, 1);
    steady.step(30);
    for (let frame = 0; frame < 12; frame++) framed.advance(1 / 60, 150, 1);
    expect(maxDifference(steady.displacement, framed.displacement)).toBeLessThan(1e-6);
  });
});
