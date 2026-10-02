import { describe, expect, it } from "vitest";
import { arcPoint } from "./skillsGauge";
import { createComboTracker } from "./skillsTiles";

function clock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

describe("createComboTracker", () => {
  it("fires on the press that completes every key within the window", () => {
    const time = clock();
    const press = createComboTracker<number>(3, 4000, time.now);
    expect([press(0), press(1)]).toEqual([false, false]);
    time.advance(1500);
    expect(press(2)).toBe(true);
  });

  it("does not count the same key twice", () => {
    const press = createComboTracker<number>(3, 4000, clock().now);
    expect([press(0), press(0), press(1), press(1)]).toEqual([false, false, false, false]);
  });

  it("forgets a press once the window has passed", () => {
    const time = clock();
    const press = createComboTracker<number>(3, 4000, time.now);
    press(0);
    press(1);
    time.advance(4500);
    expect(press(2)).toBe(false);
    expect([press(0), press(1)]).toEqual([false, true]);
  });

  it("starts over after firing", () => {
    const press = createComboTracker<number>(2, 4000, clock().now);
    press(0);
    expect(press(1)).toBe(true);
    expect(press(1)).toBe(false);
  });
});

describe("arcPoint", () => {
  it("runs the arc from its left end through the top to its right end", () => {
    expect(arcPoint(0).x).toBeCloseTo(30);
    expect(arcPoint(0).y).toBeCloseTo(150);
    expect(arcPoint(0.5).x).toBeCloseTo(150);
    expect(arcPoint(0.5).y).toBeCloseTo(30);
    expect(arcPoint(1).x).toBeCloseTo(270);
    expect(arcPoint(1).y).toBeCloseTo(150);
  });
});
