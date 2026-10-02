import { describe, expect, it } from "vitest";
import {
  arpeggio,
  chime,
  isSoundOn,
  midiToFrequency,
  noteAt,
  noteForFraction,
  panFor,
  pluck,
  pop,
  renderPluck,
  SCALE,
  setSoundOn,
  startHum,
  thud,
  tick,
  whoosh,
} from "./sound";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function rms(samples: Float32Array, from: number, to: number) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (samples[i] ?? 0) ** 2;
  return Math.sqrt(sum / (to - from));
}

describe("scale", () => {
  it("is the northern pentatonic C D F G A from C3 to A5, ascending", () => {
    expect(SCALE).toHaveLength(15);
    expect(SCALE[0]).toBeCloseTo(midiToFrequency(48), 6);
    expect(SCALE).toContain(440);
    expect(SCALE.at(-1)).toBeCloseTo(880, 6);
    for (let i = 1; i < SCALE.length; i++) expect(SCALE[i]).toBeGreaterThan(SCALE[i - 1] ?? 0);
  });

  it("clamps note lookups and maps fractions end to end", () => {
    expect(noteAt(-5)).toBe(SCALE[0]);
    expect(noteAt(99)).toBe(SCALE.at(-1));
    expect(noteForFraction(0)).toBe(SCALE[0]);
    expect(noteForFraction(1)).toBe(SCALE.at(-1));
  });

  it("pans by horizontal position, never fully to one side", () => {
    expect(panFor(0, 1000)).toBe(-0.8);
    expect(panFor(500, 1000)).toBe(0);
    expect(panFor(1000, 1000)).toBe(0.8);
  });
});

describe("renderPluck", () => {
  const sampleRate = 22050;
  const samples = renderPluck(220, sampleRate, 2, seeded(3));

  it("produces the requested length of finite samples", () => {
    expect(samples).toHaveLength(sampleRate * 2);
    expect(samples.every(Number.isFinite)).toBe(true);
  });

  it("rings, then dies away", () => {
    const start = rms(samples, 0, sampleRate / 10);
    const end = rms(samples, samples.length - sampleRate / 10, samples.length);
    expect(start).toBeGreaterThan(0.01);
    expect(end).toBeLessThan(start / 4);
  });

  it("repeats with its period: it sounds the note it was asked for", () => {
    const period = Math.round(sampleRate / 220);
    const offset = Math.floor(sampleRate / 4);
    let difference = 0;
    for (let i = 0; i < 200; i++) {
      difference += Math.abs((samples[offset + i] ?? 0) - (samples[offset + i + period] ?? 0));
    }
    const scale = rms(samples, offset, offset + 200) * 200;
    expect(difference).toBeLessThan(scale * 0.2);
  });
});

describe("without an audio device", () => {
  it("every voice is a silent no-op", () => {
    expect(() => {
      pluck(440, { bend: 0.5 });
      chime(440);
      tick();
      thud();
      pop();
      whoosh();
      arpeggio([440, 550], { voice: "pluck" });
      const hum = startHum(220);
      hum.setPitch(330);
      hum.stop();
    }).not.toThrow();
  });

  it("remembers the on/off switch even when storage is unavailable", () => {
    setSoundOn(false);
    expect(isSoundOn()).toBe(false);
    setSoundOn(true);
    expect(isSoundOn()).toBe(true);
  });
});
