import { describe, expect, it } from "vitest";
import {
  CHORDS,
  decayFor,
  fretPosition,
  GuitarBody,
  OPEN_STRINGS,
  pluckShape,
  stringFrequency,
  WaveguideString,
} from "./physics";

const SAMPLE_RATE = 48000;
const still = () => 0.5;

function run(string: WaveguideString, samples: number): Float32Array {
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) out[i] = string.process();
  return out;
}

/** Fundamental by autocorrelation, refined between samples with a parabola. */
function measurePitch(signal: Float32Array, expected: number): number {
  const lagGuess = SAMPLE_RATE / expected;
  const from = Math.floor(lagGuess * 0.8);
  const to = Math.ceil(lagGuess * 1.25);
  const window = signal.length - to;
  const correlate = (lag: number) => {
    let sum = 0;
    for (let i = 0; i < window; i++) sum += (signal[i] ?? 0) * (signal[i + lag] ?? 0);
    return sum;
  };
  let bestLag = from;
  let best = Number.NEGATIVE_INFINITY;
  for (let lag = from; lag <= to; lag++) {
    const value = correlate(lag);
    if (value > best) {
      best = value;
      bestLag = lag;
    }
  }
  const left = correlate(bestLag - 1);
  const right = correlate(bestLag + 1);
  const shift = (0.5 * (left - right)) / (left - 2 * best + right);
  return SAMPLE_RATE / (bestLag + shift);
}

/** Magnitude of one frequency in a signal (Goertzel). */
function magnitudeAt(signal: Float32Array, frequency: number): number {
  const w = (2 * Math.PI * frequency) / SAMPLE_RATE;
  let real = 0;
  let imaginary = 0;
  signal.forEach((value, n) => {
    real += value * Math.cos(w * n);
    imaginary -= value * Math.sin(w * n);
  });
  return Math.hypot(real, imaginary);
}

function cents(measured: number, target: number): number {
  return 1200 * Math.log2(measured / target);
}

describe("the neck", () => {
  it("puts the 12th fret exactly halfway: an octave", () => {
    expect(fretPosition(0)).toBe(0);
    expect(fretPosition(12)).toBeCloseTo(0.5, 12);
    expect(fretPosition(24)).toBeCloseTo(0.75, 12);
  });

  it("spaces frets closer together going up the neck", () => {
    for (let fret = 1; fret < 19; fret++) {
      const gap = fretPosition(fret) - fretPosition(fret - 1);
      const next = fretPosition(fret + 1) - fretPosition(fret);
      expect(next).toBeLessThan(gap);
      expect(next / gap).toBeCloseTo(2 ** (-1 / 12), 10);
    }
  });

  it("is in standard tuning, E A D G B E", () => {
    expect(OPEN_STRINGS.map((_, i) => stringFrequency(i, 0).toFixed(2))).toEqual([
      "82.41",
      "110.00",
      "146.83",
      "196.00",
      "246.94",
      "329.63",
    ]);
    expect(stringFrequency(1, 12)).toBeCloseTo(220, 9);
  });
});

describe("chord fingerings", () => {
  it.each(CHORDS.map((chord) => [chord.name, chord] as const))(
    "%s plays exactly its own notes",
    (_, chord) => {
      const played = chord.frets.flatMap((fret, string) =>
        fret === null ? [] : [((OPEN_STRINGS[string] ?? 0) + fret) % 12],
      );
      expect(played.length).toBeGreaterThanOrEqual(4);
      for (const pitch of played) expect(chord.tones).toContain(pitch);
      for (const tone of chord.tones) expect(played).toContain(tone);
    },
  );
});

describe("the pluck shape", () => {
  it("is a triangle that peaks at the pick point and is pinned at both ends", () => {
    expect(pluckShape(0, 0.3)).toBe(0);
    expect(pluckShape(0.3, 0.3)).toBeCloseTo(1, 12);
    expect(pluckShape(1, 0.3)).toBe(0);
    expect(pluckShape(0.15, 0.3)).toBeCloseTo(0.5, 12);
  });
});

describe("a waveguide string", () => {
  it.each([
    [0, 0],
    [0, 5],
    [1, 0],
    [2, 7],
    [3, 0],
    [4, 12],
    [5, 0],
    [5, 12],
    [5, 19],
  ])("string %i at fret %i is in tune to within 3 cents", (stringIndex, fret) => {
    const frequency = stringFrequency(stringIndex, fret);
    const string = new WaveguideString(SAMPLE_RATE);
    string.tune(frequency);
    string.pluck(0.2, 0.7, still);
    const signal = run(string, SAMPLE_RATE * 0.4).subarray(SAMPLE_RATE * 0.05);
    expect(Math.abs(cents(measurePitch(signal, frequency), frequency))).toBeLessThan(3);
  });

  it("plucked at the middle, sounds no even harmonics; near the bridge, it does", () => {
    const frequency = 110;
    const harmonicRatio = (pickPosition: number) => {
      const string = new WaveguideString(SAMPLE_RATE);
      string.tune(frequency);
      string.pluck(pickPosition, 1, still);
      const signal = run(string, SAMPLE_RATE * 0.2);
      return magnitudeAt(signal, 2 * frequency) / magnitudeAt(signal, frequency);
    };
    // Theory: harmonic k of a string plucked at β has amplitude ∝ sin(kπβ)/k².
    expect(harmonicRatio(0.5)).toBeLessThan(0.05);
    expect(harmonicRatio(0.15)).toBeGreaterThan(0.25);
  });

  it("dies away by 60 dB within its decay time", () => {
    const frequency = stringFrequency(0, 0);
    const string = new WaveguideString(SAMPLE_RATE);
    string.tune(frequency);
    string.pluck(0.2, 0.8, still);
    run(string, SAMPLE_RATE * 0.05);
    const early = string.energy();
    run(string, Math.floor(SAMPLE_RATE * decayFor(frequency)));
    expect(string.energy()).toBeLessThan(early * 1e-5);
  });

  it("stops quickly under a resting finger", () => {
    const ringing = new WaveguideString(SAMPLE_RATE);
    const damped = new WaveguideString(SAMPLE_RATE);
    for (const string of [ringing, damped]) {
      string.tune(196);
      string.pluck(0.2, 0.8, still);
    }
    damped.damp(1);
    run(ringing, SAMPLE_RATE * 0.3);
    run(damped, SAMPLE_RATE * 0.3);
    expect(damped.energy()).toBeLessThan(ringing.energy() * 0.01);
  });

  it("adds a new pluck to the vibration already there", () => {
    const once = new WaveguideString(SAMPLE_RATE);
    const twice = new WaveguideString(SAMPLE_RATE);
    for (const string of [once, twice]) {
      string.tune(146.83);
      string.pluck(0.2, 0.5, still);
    }
    twice.pluck(0.2, 0.5, still);
    expect(twice.energy()).toBeGreaterThan(once.energy() * 3);
  });

  it("changes pitch while ringing when the fret changes (a hammer-on)", () => {
    const string = new WaveguideString(SAMPLE_RATE);
    string.tune(110);
    string.pluck(0.2, 0.9, still);
    run(string, SAMPLE_RATE * 0.1);
    string.tune(stringFrequency(1, 5));
    run(string, SAMPLE_RATE * 0.05);
    const after = run(string, SAMPLE_RATE * 0.25);
    expect(
      Math.abs(cents(measurePitch(after, stringFrequency(1, 5)), stringFrequency(1, 5))),
    ).toBeLessThan(5);
  });
});

describe("six strings on one bridge", () => {
  const BLOCK = 128;
  const left = new Float32Array(BLOCK);
  const right = new Float32Array(BLOCK);
  const play = (body: GuitarBody, seconds: number, onBlock?: () => void) => {
    for (let i = 0; i < Math.round((SAMPLE_RATE * seconds) / BLOCK); i++) {
      body.render(left, right);
      onBlock?.();
    }
  };
  const total = (body: GuitarBody) =>
    body.strings.reduce((sum, string) => sum + string.energy(), 0);

  it("lets a plucked string set others ringing, without ever gaining energy", () => {
    const body = new GuitarBody(SAMPLE_RATE);
    body.handle({ type: "pluck", string: 1, position: 0.2, velocity: 1 });
    play(body, 0.02);
    const start = total(body);
    let previous = start;
    for (let second = 0; second < 6; second++) {
      play(body, 1);
      expect(total(body)).toBeLessThan(previous);
      previous = total(body);
    }
    const unplucked = body.strings.filter((_, i) => i !== 1).map((string) => string.energy());
    expect(Math.max(...unplucked)).toBeGreaterThan(0);
  });

  it("plays a pluck message, low strings to the left and high strings to the right", () => {
    const loudness = (string: number) => {
      const body = new GuitarBody(SAMPLE_RATE);
      body.handle({ type: "pluck", string, position: 0.2, velocity: 0.8 });
      let l = 0;
      let r = 0;
      play(body, 0.2, () => {
        for (let i = 0; i < BLOCK; i++) {
          l += (left[i] ?? 0) ** 2;
          r += (right[i] ?? 0) ** 2;
        }
      });
      return { l, r };
    };
    const low = loudness(0);
    const high = loudness(5);
    expect(low.l).toBeGreaterThan(low.r * 1.5);
    expect(high.r).toBeGreaterThan(high.l * 1.5);
  });

  it("holds a delayed pluck back until its moment: one message carries a whole strum", () => {
    const body = new GuitarBody(SAMPLE_RATE);
    body.handle({ type: "pluck", string: 2, position: 0.2, velocity: 0.8, delay: 0.05 });
    let firstSound = -1;
    let block = 0;
    play(body, 0.1, () => {
      if (firstSound < 0 && left.some((value) => value !== 0)) firstSound = block * BLOCK;
      block++;
    });
    expect(firstSound / SAMPLE_RATE).toBeGreaterThan(0.05 - BLOCK / SAMPLE_RATE);
    expect(firstSound / SAMPLE_RATE).toBeLessThan(0.05 + BLOCK / SAMPLE_RATE);
  });

  it("falls exactly silent once a note has died, and wakes on the next pluck", () => {
    const body = new GuitarBody(SAMPLE_RATE);
    expect(body.isAsleep).toBe(true);
    body.handle({ type: "pluck", string: 5, position: 0.2, velocity: 1 });
    // A palm across all six: the sympathetic ringing stops too.
    for (let string = 0; string < 6; string++) body.handle({ type: "damp", string, amount: 1 });
    expect(body.isAsleep).toBe(false);
    play(body, 1.5);
    expect(body.isAsleep).toBe(true);
    expect(total(body)).toBe(0);
    for (let string = 0; string < 6; string++) body.handle({ type: "damp", string, amount: 0 });
    body.handle({ type: "pluck", string: 5, position: 0.2, velocity: 1 });
    play(body, 0.05);
    expect(left.some((value) => value !== 0)).toBe(true);
  });

  it("ignores strings that do not exist", () => {
    const body = new GuitarBody(SAMPLE_RATE);
    body.handle({ type: "pluck", string: 9, position: 0.2, velocity: 1 });
    play(body, 0.05);
    expect(left.every((value) => value === 0)).toBe(true);
  });
});
