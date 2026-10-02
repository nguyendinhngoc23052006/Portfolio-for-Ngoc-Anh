import { useSyncExternalStore } from "react";
import { midiToFrequency } from "./pitch";

export { midiToFrequency };

/*
 * Every sound on the site is synthesised here with the Web Audio API: no audio
 * files, nothing to download. Voices are silent no-ops until the visitor's
 * first click or key press unlocks audio (browsers forbid sound before that),
 * and whenever sound is switched off.
 */

const STORAGE_KEY = "ngoc-anh:sound";
const MAX_VOICES = 28;

/**
 * The đàn tranh's northern pentatonic (điệu Bắc: C D F G A) over three
 * octaves, C3 to A5. Silk strands, rows and letters all play from it, so any
 * combination of sounds stays in tune with every other.
 */
export const SCALE: readonly number[] = [3, 4, 5].flatMap((octave) =>
  [0, 2, 5, 7, 9].map((step) => midiToFrequency(12 * (octave + 1) + step)),
);

export function noteAt(index: number): number {
  const clamped = Math.max(0, Math.min(SCALE.length - 1, Math.round(index)));
  return SCALE[clamped] ?? 440;
}

/** 0 → lowest note, 1 → highest. */
export function noteForFraction(fraction: number): number {
  return noteAt(fraction * (SCALE.length - 1));
}

/** Stereo position for a point on screen: left of centre plays left. */
export function panFor(
  clientX: number,
  width = typeof window === "undefined" ? 1 : window.innerWidth,
): number {
  return Math.max(-0.8, Math.min(0.8, (clientX / Math.max(width, 1)) * 2 - 1));
}

// ---------------------------------------------------------------- on / off

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

let isOn = typeof window === "undefined" ? true : readStoredPreference();
const listeners = new Set<() => void>();

export function isSoundOn(): boolean {
  return isOn;
}

export function setSoundOn(next: boolean): void {
  isOn = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Private windows can refuse storage; the switch still works for this visit.
  }
  if (next) unlockAudio();
  else void context?.suspend();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isOn,
    () => true,
  );
}

/** "off": switched off · "locked": waiting for a first click or key · "running": audible. */
export type AudioState = "off" | "locked" | "running";

function audioState(): AudioState {
  if (!isOn) return "off";
  return context?.state === "running" ? "running" : "locked";
}

export function useAudioState(): AudioState {
  return useSyncExternalStore(subscribe, audioState, () => "locked");
}

// ---------------------------------------------------------------- engine

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let activeVoices = 0;
const pluckCache = new Map<number, AudioBuffer>();

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;

/**
 * Creates or resumes the audio context. Call it only from inside a user
 * gesture: `installAudioUnlock` does so on the first click or key press.
 */
export function unlockAudio(): void {
  if (!isOn || typeof window === "undefined") return;
  const Constructor =
    (window as unknown as { AudioContext?: AudioContextConstructor }).AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Constructor) return;
  if (!context) {
    context = new Constructor({ latencyHint: "interactive" });
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.ratio.value = 6;
    master = context.createGain();
    master.gain.value = 0.6;
    master.connect(limiter).connect(context.destination);
    // Every voice also rings in one shared room, so the whole page sounds like a single place.
    const room = context.createConvolver();
    room.buffer = roomImpulse(context);
    const wet = context.createGain();
    wet.gain.value = 0.22;
    master.connect(room).connect(wet).connect(limiter);
    context.addEventListener("statechange", emit);
    emit();
  }
  if (context.state === "suspended") void context.resume();
}

/**
 * A small hall, synthesised: two uncorrelated channels of noise dying away
 * over 1.8 s and darkening as they go, the way high frequencies fade first in
 * a real room.
 */
function roomImpulse(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 1.8;
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smoothed = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      smoothed += (1 - 0.85 * t) * (Math.random() * 2 - 1 - smoothed);
      data[i] = smoothed * Math.exp(-6.9 * t) * Math.min(1, i / (ctx.sampleRate * 0.012));
    }
  }
  return impulse;
}

/**
 * The shared context and the bus every voice plays into, for instruments
 * that build their own audio graph. Null until audio is unlocked, and while
 * sound is off.
 */
export function getAudioOutput(): { context: AudioContext; output: AudioNode } | null {
  if (!isOn || !context || !master) return null;
  return { context, output: master };
}

/** Unlocks audio on the first click, tap or key press, before any handler that wants to play. */
export function installAudioUnlock(): () => void {
  const unlock = () => unlockAudio();
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
  return () => {
    window.removeEventListener("pointerdown", unlock, { capture: true });
    window.removeEventListener("keydown", unlock, { capture: true });
  };
}

function ready(): AudioContext | null {
  if (!isOn || !context || !master || context.state !== "running") return null;
  if (activeVoices >= MAX_VOICES) return null;
  return context;
}

interface VoiceOptions {
  /** 0–1, multiplied into the voice's own level. */
  gain?: number;
  /** −1 (left) to 1 (right). */
  pan?: number;
  /** Seconds from now. */
  delay?: number;
}

/** gain → pan → master; returns the gain node a voice plays into. */
function voiceOutput(ctx: AudioContext, gain: number, pan: number): GainNode {
  const level = ctx.createGain();
  level.gain.value = gain;
  if (typeof ctx.createStereoPanner === "function" && master) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    level.connect(panner).connect(master);
  } else if (master) {
    level.connect(master);
  }
  return level;
}

function track(node: AudioScheduledSourceNode): void {
  activeVoices += 1;
  node.addEventListener("ended", () => {
    activeVoices -= 1;
  });
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/**
 * Karplus–Strong plucked string: a short burst of softened noise circulating in
 * a delay line one period long, averaged on every pass so it rings, mellows and
 * dies away like a real string. Pure, so it can be tested without audio.
 */
export function renderPluck(
  frequency: number,
  sampleRate: number,
  seconds = 2.4,
  random: () => number = Math.random,
): Float32Array {
  const output = new Float32Array(Math.floor(sampleRate * seconds));
  const period = Math.max(2, Math.round(sampleRate / frequency));
  const ring = new Float32Array(period);
  let smoothed = 0;
  for (let i = 0; i < period; i++) {
    // A fingertip, not a pick: low-pass the excitation.
    smoothed += 0.55 * (random() * 2 - 1 - smoothed);
    ring[i] = smoothed;
  }
  let index = 0;
  for (let i = 0; i < output.length; i++) {
    const next = (index + 1) % period;
    const value = 0.4985 * ((ring[index] ?? 0) + (ring[next] ?? 0));
    ring[index] = value;
    output[i] = value;
    index = next;
  }
  const fade = Math.min(output.length, Math.floor(sampleRate * 0.05));
  for (let i = 0; i < fade; i++) {
    const at = output.length - 1 - i;
    output[at] = (output[at] ?? 0) * (i / fade);
  }
  return output;
}

interface PluckOptions extends VoiceOptions {
  /**
   * Fraction of a semitone the note bends up and back, like the đàn tranh's
   * pressed-string ornament (nhấn). 0 for a plain pluck.
   */
  bend?: number;
}

/** A silk string plucked: the site's signature voice. */
export function pluck(
  frequency: number,
  { gain = 1, pan = 0, delay = 0, bend = 0 }: PluckOptions = {},
): void {
  const ctx = ready();
  if (!ctx) return;
  const key = Math.round(frequency * 10);
  let buffer = pluckCache.get(key);
  if (!buffer) {
    const samples = renderPluck(frequency, ctx.sampleRate);
    buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    pluckCache.set(key, buffer);
  }
  const at = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  if (bend > 0) {
    const ratio = 2 ** (bend / 12);
    source.playbackRate.setValueAtTime(1, at);
    source.playbackRate.linearRampToValueAtTime(ratio, at + 0.16);
    source.playbackRate.linearRampToValueAtTime(1, at + 0.48);
  }
  // A slow, shallow vibrato after the attack: the "rung" of a ringing string.
  const vibrato = ctx.createOscillator();
  const depth = ctx.createGain();
  vibrato.frequency.value = 5.2;
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(0.0035, at + 0.6);
  vibrato.connect(depth).connect(source.playbackRate);
  source.connect(voiceOutput(ctx, 0.9 * gain, pan));
  track(source);
  source.start(at);
  vibrato.start(at);
  vibrato.stop(at + buffer.duration);
}

/** A small bell: discoveries, deliveries, completions. */
export function chime(
  frequency: number,
  { gain = 1, pan = 0, delay = 0 }: VoiceOptions = {},
): void {
  const ctx = ready();
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const out = voiceOutput(ctx, 0.28 * gain, pan);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
  envelope.connect(out);
  // Fundamental plus the slightly sharp partials that make metal sound like a bell.
  [
    [1, 1],
    [2.76, 0.32],
    [5.4, 0.12],
  ].forEach(([ratio = 1, level = 1], i) => {
    const oscillator = ctx.createOscillator();
    const partial = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency * ratio;
    partial.gain.value = level;
    oscillator.connect(partial).connect(envelope);
    if (i === 0) track(oscillator);
    oscillator.start(at);
    oscillator.stop(at + 1.9);
  });
}

/** A dry wooden tick: snaps, steps, hovers. */
export function tick({
  gain = 1,
  pan = 0,
  delay = 0,
  pitch = 2600,
}: VoiceOptions & { pitch?: number } = {}): void {
  const ctx = ready();
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = pitch;
  band.Q.value = 6;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(1, at);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  source
    .connect(band)
    .connect(envelope)
    .connect(voiceOutput(ctx, 0.7 * gain, pan));
  track(source);
  source.start(at, Math.random() * 0.5, 0.06);
}

/** A soft low tap, like a finger on a cocoon. */
export function thud({ gain = 1, pan = 0, delay = 0 }: VoiceOptions = {}): void {
  const ctx = ready();
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(150, at);
  oscillator.frequency.exponentialRampToValueAtTime(58, at + 0.16);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  oscillator.connect(envelope).connect(voiceOutput(ctx, 0.8 * gain, pan));
  track(oscillator);
  oscillator.start(at);
  oscillator.stop(at + 0.3);
}

/** A rising bubble: copies, pops, little releases. */
export function pop({ gain = 1, pan = 0, delay = 0 }: VoiceOptions = {}): void {
  const ctx = ready();
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  oscillator.frequency.setValueAtTime(380, at);
  oscillator.frequency.exponentialRampToValueAtTime(1050, at + 0.07);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
  oscillator.connect(envelope).connect(voiceOutput(ctx, 0.45 * gain, pan));
  track(oscillator);
  oscillator.start(at);
  oscillator.stop(at + 0.15);
}

/** Air moving: things flying, travelling, being thrown. */
export function whoosh({
  gain = 1,
  pan = 0,
  delay = 0,
  duration = 0.6,
}: VoiceOptions & { duration?: number } = {}): void {
  const ctx = ready();
  if (!ctx) return;
  const at = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(380, at);
  band.frequency.exponentialRampToValueAtTime(2200, at + duration * 0.45);
  band.frequency.exponentialRampToValueAtTime(520, at + duration);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + duration * 0.4);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source
    .connect(band)
    .connect(envelope)
    .connect(voiceOutput(ctx, 0.5 * gain, pan));
  track(source);
  source.start(at);
  source.stop(at + duration + 0.02);
}

/** Several notes in a row on one voice. */
export function arpeggio(
  frequencies: readonly number[],
  {
    step = 0.085,
    voice = "chime",
    gain = 1,
    pan = 0,
  }: { step?: number; voice?: "chime" | "pluck"; gain?: number; pan?: number } = {},
): void {
  frequencies.forEach((frequency, i) => {
    const options = { gain, pan, delay: i * step };
    if (voice === "pluck") pluck(frequency, options);
    else chime(frequency, options);
  });
}

export interface Hum {
  setPitch: (frequency: number) => void;
  stop: () => void;
}

/** A sustained, rising-and-falling tone you steer while it plays. */
export function startHum(frequency: number, { gain = 1, pan = 0 }: VoiceOptions = {}): Hum {
  const ctx = ready();
  if (!ctx) return { setPitch: () => {}, stop: () => {} };
  const at = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 1800;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + 0.12);
  oscillator
    .connect(soften)
    .connect(envelope)
    .connect(voiceOutput(ctx, 0.16 * gain, pan));
  track(oscillator);
  oscillator.start(at);
  let isStopped = false;
  return {
    setPitch: (next) => {
      if (!isStopped) oscillator.frequency.setTargetAtTime(next, ctx.currentTime, 0.05);
    },
    stop: () => {
      if (isStopped) return;
      isStopped = true;
      const end = ctx.currentTime;
      envelope.gain.cancelScheduledValues(end);
      envelope.gain.setValueAtTime(Math.max(envelope.gain.value, 0.0001), end);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end + 0.18);
      oscillator.stop(end + 0.2);
    },
  };
}

/** A short vibration on phones, tied to the same on/off switch as sound. */
export function buzz(pattern: number | number[] = 8): void {
  if (!isOn || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  navigator.vibrate(pattern);
}

/**
 * Returns a gate that opens at most once per `milliseconds`: wrap hover and
 * drag sounds in one so fast movement makes music, not noise.
 */
export function rateLimit(milliseconds: number): () => boolean {
  let last = Number.NEGATIVE_INFINITY;
  return () => {
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (now - last < milliseconds) return false;
    last = now;
    return true;
  };
}
