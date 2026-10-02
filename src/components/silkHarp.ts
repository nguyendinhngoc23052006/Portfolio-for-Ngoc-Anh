import { noteAt, SCALE } from "../lib/sound";

/** The hero's silk is a đàn tranh: its strands are grouped into one string per scale note. */
export const STRING_COUNT = SCALE.length;

const RING_SECONDS = 1.6;
const RING_SHAKE_DECAY = 2.8;
const RING_GLOW_DECAY = 1.8;
const MAX_SWEPT_STRINGS = 6;
/** Seconds between the strings of one sweep. */
export const SWEEP_STAGGER = 0.03;

export interface SilkLayout {
  width: number;
  height: number;
  strands: number;
  scroll: number;
}

export function strandBaseline(t: number, height: number, scroll: number): number {
  return height * (0.5 + (t - 0.5) * 0.42 * (1 + scroll * 1.4));
}

export function strandSwing(t: number, height: number, scroll: number): number {
  return height * 0.085 * (0.55 + 0.45 * Math.sin(t * Math.PI)) * (1 + scroll);
}

export function strandChop(height: number): number {
  return height * 0.04;
}

/** A strand's resting y at horizontal fraction `nx`, before pointer pull and ripples. */
export function strandWave(
  t: number,
  nx: number,
  time: number,
  baseline: number,
  swing: number,
  chop: number,
): number {
  return (
    baseline +
    Math.sin(nx * Math.PI * 2.4 + time * 0.32 + t * 1.8) * swing +
    Math.sin(nx * Math.PI * 5.2 - time * 0.46 + t * 3.4) * chop
  );
}

/** Index of the strand whose line passes closest to (x, y) in canvas pixels. */
export function nearestStrand(layout: SilkLayout, x: number, y: number, time: number): number {
  const { width, height, strands, scroll } = layout;
  if (strands < 2 || width <= 0) return 0;
  const nx = x / width;
  const chop = strandChop(height);
  let nearest = 0;
  let nearestGap = Number.POSITIVE_INFINITY;
  for (let s = 0; s < strands; s++) {
    const t = s / (strands - 1);
    const wave = strandWave(
      t,
      nx,
      time,
      strandBaseline(t, height, scroll),
      strandSwing(t, height, scroll),
      chop,
    );
    const gap = Math.abs(wave - y);
    if (gap < nearestGap) {
      nearestGap = gap;
      nearest = s;
    }
  }
  return nearest;
}

/** 0 is the top string, the highest note. */
export function stringOfStrand(strand: number, strands: number): number {
  return Math.min(STRING_COUNT - 1, Math.floor((strand * STRING_COUNT) / strands));
}

export function noteOfString(string: number): number {
  return noteAt(STRING_COUNT - 1 - string);
}

/** Rad/s: higher strings shiver faster, like higher notes. */
export function ringOmega(string: number): number {
  return 52 + (1 - string / (STRING_COUNT - 1)) * 43;
}

/** Transverse vibration envelope, 1 at the pluck to 0. */
export function ringShake(age: number): number {
  return Math.exp(-age * RING_SHAKE_DECAY);
}

/** Brightness envelope: lingers a little longer than the shiver. */
export function ringGlow(age: number): number {
  return Math.exp(-age * RING_GLOW_DECAY);
}

/** When each string was last plucked, so draw() can make it shiver and glow. */
export function createRings() {
  const struckAt = new Float64Array(STRING_COUNT).fill(Number.NEGATIVE_INFINITY);
  const strength = new Float64Array(STRING_COUNT);
  return {
    strike(string: number, time: number, power = 1) {
      struckAt[string] = time;
      strength[string] = power;
    },
    /** Seconds since the string was struck, or -1 when it is quiet. */
    ageOf(string: number, time: number): number {
      const age = time - (struckAt[string] ?? Number.NEGATIVE_INFINITY);
      return age >= 0 && age < RING_SECONDS ? age : -1;
    },
    powerOf(string: number): number {
      return strength[string] ?? 0;
    },
  };
}

/** Tracks pointer speed so a fast vertical swipe can bend the note. Speeds are px/ms. */
export function createSwipeTracker() {
  let x = 0;
  let y = 0;
  let at = Number.NEGATIVE_INFINITY;
  let vx = 0;
  let vy = 0;
  return {
    move(nextX: number, nextY: number, time: number) {
      const elapsed = time - at;
      if (elapsed > 0 && elapsed < 100) {
        vx = vx * 0.4 + ((nextX - x) / elapsed) * 0.6;
        vy = vy * 0.4 + ((nextY - y) / elapsed) * 0.6;
      } else {
        vx = 0;
        vy = 0;
      }
      x = nextX;
      y = nextY;
      at = time;
    },
    isSweepingVertically(time: number): boolean {
      return time - at < 80 && Math.abs(vy) > 0.8 && Math.abs(vy) > Math.abs(vx);
    },
  };
}

/**
 * One held drag across the strings. `cross` reports every string the pointer
 * passed since the last one that sounded, so a fast sweep still strums the
 * strings in between (at most a few, staggered by `order`).
 */
export function createStrum() {
  const heard = new Uint8Array(STRING_COUNT);
  let distinct = 0;
  let last = -1;
  const isNewString = (string: number) => last >= 0 && string !== last;
  return {
    get isActive(): boolean {
      return last >= 0;
    },
    get distinctStrings(): number {
      return distinct;
    },
    isNewString,
    begin(string: number) {
      heard.fill(0);
      heard[string] = 1;
      distinct = 1;
      last = string;
    },
    cross(string: number, onString: (crossed: number, order: number) => void) {
      if (!isNewString(string)) return;
      const direction = Math.sign(string - last);
      const span = Math.min(Math.abs(string - last), MAX_SWEPT_STRINGS);
      for (let order = 0; order < span; order++) {
        const crossed = string - direction * (span - 1 - order);
        onString(crossed, order);
        if (!heard[crossed]) {
          heard[crossed] = 1;
          distinct++;
        }
      }
      last = string;
    },
    reset() {
      last = -1;
      distinct = 0;
    },
  };
}
