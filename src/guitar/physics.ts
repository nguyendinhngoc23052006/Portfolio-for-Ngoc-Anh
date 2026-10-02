import { midiToFrequency } from "../lib/pitch";

/*
 * The physics of a six-string guitar, shared by the audio worklet (which runs
 * it 44,100+ times a second) and by the tests. Nothing here touches the DOM.
 */

/** Standard tuning, low E to high E, as MIDI notes. */
export const OPEN_STRINGS = [40, 45, 50, 55, 59, 64] as const;
export const STRING_COUNT = OPEN_STRINGS.length;
export const STRING_LABELS = ["E", "A", "D", "G", "B", "E"] as const;

/** Frets on the neck; the 19th sits where a classical neck meets the body. */
export const FRET_COUNT = 19;

/**
 * Distance of fret `n` from the nut, as a fraction of the scale length.
 * Each fret shortens the vibrating length by a factor of 2^(1/12), so the 12th
 * fret lands exactly halfway: an octave.
 */
export function fretPosition(fret: number): number {
  return 1 - 2 ** (-fret / 12);
}

export function stringFrequency(stringIndex: number, fret: number): number {
  return midiToFrequency((OPEN_STRINGS[stringIndex] ?? 40) + fret);
}

/**
 * Seconds for a plucked note to fall by 60 dB. Low strings ring longest; high
 * frets die fastest, as on a real nylon-and-steel guitar.
 */
export function decayFor(frequency: number): number {
  return Math.max(1.4, Math.min(7, 7 * (82.4 / frequency) ** 0.6));
}

/** A fingering, low E to high E: a fret number, 0 for open, null for a string not played. */
export type Fingering = readonly (number | null)[];

export interface Chord {
  name: string;
  frets: Fingering;
  /** Pitch classes the chord must contain (C = 0); the tests hold every fingering to these. */
  tones: readonly number[];
}

export const CHORDS: readonly Chord[] = [
  { name: "C", frets: [null, 3, 2, 0, 1, 0], tones: [0, 4, 7] },
  { name: "G", frets: [3, 2, 0, 0, 0, 3], tones: [7, 11, 2] },
  { name: "Am", frets: [null, 0, 2, 2, 1, 0], tones: [9, 0, 4] },
  { name: "Em", frets: [0, 2, 2, 0, 0, 0], tones: [4, 7, 11] },
  { name: "F", frets: [1, 3, 3, 2, 1, 1], tones: [5, 9, 0] },
  { name: "Dm", frets: [null, null, 0, 2, 3, 1], tones: [2, 5, 9] },
  { name: "D", frets: [null, null, 0, 2, 3, 2], tones: [2, 6, 9] },
  { name: "A", frets: [null, 0, 2, 2, 2, 0], tones: [9, 1, 4] },
  { name: "E", frets: [0, 2, 2, 1, 0, 0], tones: [4, 8, 11] },
  { name: "G7", frets: [3, 2, 0, 0, 0, 1], tones: [7, 11, 2, 5] },
  { name: "E7", frets: [0, 2, 0, 1, 0, 0], tones: [4, 8, 11, 2] },
  { name: "Bm", frets: [null, 2, 4, 4, 3, 2], tones: [11, 2, 6] },
];

/**
 * Physical keys (KeyboardEvent.code, not .key) so a Vietnamese input method
 * such as Unikey or EVKey can never turn a chord key into a letter with a mark.
 */
export const CHORD_KEYS = [
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyT",
  "KeyY",
  "KeyU",
  "KeyI",
  "KeyO",
  "KeyP",
  "BracketLeft",
  "BracketRight",
] as const;

/**
 * Guitarists number strings from the thinnest: string 1 is the high E, string
 * 6 the low E. Keys 1–6 pluck by that number.
 */
export function stringNumber(stringIndex: number): number {
  return STRING_COUNT - stringIndex;
}

export function stringIndexForNumber(number: number): number {
  return STRING_COUNT - number;
}

/** What a key is printed as, for the on-screen hints. */
export function keyLabel(code: string): string {
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  return code.replace("Key", "");
}

/**
 * The shape of a string pulled aside at `pickPosition` (0 at the bridge, 1 at
 * the nut) and held still: a triangle with its peak at the pick point. This is
 * the initial condition of the wave equation for a pluck.
 */
export function pluckShape(along: number, pickPosition: number): number {
  const peak = Math.min(0.98, Math.max(0.02, pickPosition));
  return along < peak ? along / peak : (1 - along) / (1 - peak);
}

/** Extra energy a fully resting finger takes out of the loop on every pass. */
const DAMPED_LOSS = 0.35;

/**
 * One string as a digital waveguide (the Karplus–Strong family, Jaffe & Smith
 * 1983): the two waves travelling up and down the string, folded into a single
 * delay loop one period long. Each pass through the loop
 *   - averages neighbouring samples, so high partials lose energy faster than
 *     the fundamental, exactly as in a real string;
 *   - scales by `loss`, set so the note falls 60 dB in its decay time;
 *   - passes a first-order all-pass filter that adds the fraction of a sample
 *     the period needs, so every fret is in tune, not just rounded to it.
 * Plucks add to whatever is already ringing, and changing the length while it
 * rings bends the pitch, so hammer-ons, pull-offs and slides just happen.
 */
export class WaveguideString {
  private readonly buffer: Float32Array;
  private write = 0;
  private delay = 2;
  private allpass = 0;
  private loss = 0.99;
  private baseLoss = 0.99;
  private previous = 0;
  private allpassInput = 0;
  private allpassOutput = 0;
  private damping = 0;
  private readonly sampleRate: number;

  constructor(sampleRate: number, lowestFrequency = 60) {
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(Math.ceil(sampleRate / lowestFrequency) + 4);
  }

  tune(frequency: number, decaySeconds = decayFor(frequency)): void {
    const period = this.sampleRate / frequency;
    // The averaging filter delays by half a sample; keep the all-pass fraction
    // inside [0.1, 1.1), where its delay is flat across the audible range.
    const whole = Math.max(1, Math.min(this.buffer.length - 2, Math.floor(period - 0.6)));
    const fraction = period - 0.5 - whole;
    this.delay = whole;
    this.allpass = (1 - fraction) / (1 + fraction);
    this.baseLoss = 10 ** (-3 / (frequency * decaySeconds));
    this.loss = this.baseLoss * (1 - DAMPED_LOSS * this.damping);
  }

  /**
   * Pluck at `pickPosition` (0 bridge … 1 nut). `velocity` 0–1 sets both how
   * far the string is pulled and how sharp the pluck is: a hard pick keeps the
   * triangle's corner (bright), a soft fingertip rounds it (warm).
   */
  pluck(pickPosition: number, velocity: number, random: () => number = Math.random): void {
    const amplitude = 0.12 + 0.38 * velocity;
    const softness = 0.75 - 0.6 * velocity;
    const length = this.delay;
    const size = this.buffer.length;
    let smoothed = 0;
    for (let k = 0; k < length; k++) {
      // The loop holds one round trip: the shape travelling out, then back inverted.
      const along = (k + 0.5) / length;
      const shape =
        along < 0.5
          ? pluckShape(along * 2, pickPosition)
          : -pluckShape(2 - along * 2, pickPosition);
      const noisy = shape + (random() - 0.5) * 0.04 * velocity;
      smoothed += (1 - softness) * (noisy - smoothed);
      const index = (this.write - length + k + size) % size;
      this.buffer[index] = (this.buffer[index] ?? 0) + amplitude * smoothed;
    }
  }

  /** 0 lets the string ring; 1 stops it within a few periods, like a resting palm. */
  damp(amount: number): void {
    this.damping = Math.max(0, Math.min(1, amount));
    this.loss = this.baseLoss * (1 - DAMPED_LOSS * this.damping);
  }

  /** Advance one sample. `input` is energy arriving from the bridge (sympathetic coupling). */
  process(input = 0): number {
    const size = this.buffer.length;
    const outgoing = this.buffer[(this.write - this.delay + size) % size] ?? 0;
    const averaged = this.loss * 0.5 * (outgoing + this.previous);
    this.previous = outgoing;
    const tuned = this.allpass * averaged + this.allpassInput - this.allpass * this.allpassOutput;
    this.allpassInput = averaged;
    this.allpassOutput = tuned;
    this.buffer[this.write] = tuned + input;
    this.write = (this.write + 1) % size;
    return outgoing;
  }

  /** Stops the string dead and clears its filters. */
  silence(): void {
    this.buffer.fill(0);
    this.previous = 0;
    this.allpassInput = 0;
    this.allpassOutput = 0;
  }

  /** Total stored displacement energy: what the tests watch decay. */
  energy(): number {
    let sum = 0;
    for (const value of this.buffer) sum += value * value;
    return sum;
  }
}

/** How strongly each string's motion leaks into the others through the bridge. */
export const BRIDGE_COUPLING = 0.0006;

/** The name the audio worklet registers under and the page asks for. */
export const PROCESSOR_NAME = "guitar-strings";

/** What the page tells the strings. `string` is 0 for the low E … 5 for the high E. */
export type GuitarMessage =
  | {
      type: "pluck";
      string: number;
      /** 0 at the bridge … 1 at the fret, along the part of the string that rings. */
      position: number;
      /** 0–1. */
      velocity: number;
      /** Seconds from now: lets one message carry a whole strum, evenly spaced. */
      delay?: number;
    }
  | { type: "fret"; string: number; fret: number }
  | { type: "damp"; string: number; amount: number };

/** Below this, a block is silence; half a second of it and the strings stop computing. */
const SILENT = 1e-5;

/** Equal-power stereo: the low E sits left of centre, the high E right, as the player hears it. */
function panGains(stringIndex: number): [number, number] {
  const pan = ((stringIndex / (STRING_COUNT - 1)) * 2 - 1) * 0.5;
  const angle = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}

/**
 * All six strings on one bridge. Every sample, a small share of the bridge's
 * motion feeds back into each string: strings that share a harmonic with the
 * one you played start ringing quietly on their own (sympathetic resonance).
 */
export class GuitarBody {
  readonly strings: WaveguideString[];
  private readonly gains: [number, number][];
  private readonly sampleRate: number;
  private bridge = 0;
  private quietSamples = 0;
  private pending: { samples: number; message: GuitarMessage }[] = [];

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.strings = OPEN_STRINGS.map((_, i) => {
      const string = new WaveguideString(sampleRate);
      string.tune(stringFrequency(i, 0));
      return string;
    });
    this.gains = this.strings.map((_, i) => panGains(i));
    this.quietSamples = sampleRate;
  }

  get isAsleep(): boolean {
    return this.quietSamples >= this.sampleRate / 2;
  }

  handle(message: GuitarMessage): void {
    if (message.type === "pluck" && message.delay) {
      this.pending.push({
        samples: Math.round(message.delay * this.sampleRate),
        message: { ...message, delay: 0 },
      });
      return;
    }
    const string = this.strings[message.string];
    if (!string) return;
    if (message.type === "pluck") {
      string.pluck(clamp01(message.position), clamp01(message.velocity));
      this.quietSamples = 0;
    } else if (message.type === "fret") {
      string.tune(stringFrequency(message.string, message.fret));
    } else {
      string.damp(message.amount);
    }
  }

  /** Fills one block of stereo output. Delayed plucks land on the block they fall in. */
  render(left: Float32Array, right: Float32Array): void {
    const length = left.length;
    if (this.pending.length > 0) {
      const due: GuitarMessage[] = [];
      this.pending = this.pending.filter((entry) => {
        if (entry.samples < length) {
          due.push(entry.message);
          return false;
        }
        entry.samples -= length;
        return true;
      });
      for (const message of due) this.handle(message);
    }
    if (this.isAsleep) {
      left.fill(0);
      right.fill(0);
      return;
    }
    let peak = 0;
    for (let i = 0; i < length; i++) {
      const feedback = this.bridge * BRIDGE_COUPLING;
      let sum = 0;
      let l = 0;
      let r = 0;
      for (let s = 0; s < this.strings.length; s++) {
        const out = (this.strings[s] as WaveguideString).process(feedback);
        const [gainLeft, gainRight] = this.gains[s] as [number, number];
        sum += out;
        l += out * gainLeft;
        r += out * gainRight;
      }
      this.bridge = sum;
      left[i] = l;
      right[i] = r;
      peak = Math.max(peak, Math.abs(sum));
    }
    this.quietSamples = peak < SILENT ? this.quietSamples + length : 0;
    if (this.isAsleep) {
      // Rest exactly at zero rather than decaying through denormal numbers forever.
      for (const string of this.strings) string.silence();
      this.bridge = 0;
    }
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
