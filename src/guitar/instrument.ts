import {
  type Chord,
  decayFor,
  fretPosition,
  type GuitarMessage,
  OPEN_STRINGS,
  STRING_COUNT,
  stringFrequency,
} from "./physics";
import { VisualString } from "./visual";

export const MAX_CAPO = 7;

/** How fast the open low E appears to swing. Higher strings scale with √pitch, so the eye can follow them. */
const VISUAL_HZ = 2.4;
const VISUAL_RESOLUTION = 96;
/** A string the chord leaves out is touched, not fretted: it thunks instead of ringing. */
const MUTED = 0.92;
/** Gap between strings in a strum, in seconds. */
const STRUM_SPACING = 0.016;

/** The loop behind a thousand pop songs; strumming it in any rotation is one of the page's secrets. */
export const FOUR_CHORDS = ["C", "G", "Am", "F"] as const;

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function noteName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Where a chord (with a capo) stops a string; null for a string the chord leaves out. */
export function chordFret(chord: Chord | null, capo: number, stringIndex: number): number | null {
  const fret = chord ? chord.frets[stringIndex] : 0;
  return fret === null || fret === undefined ? null : capo + fret;
}

/**
 * The guitar's left hand and the strings you see: which chord is held, where
 * the capo sits, which fingers press where. Every change becomes messages for
 * the strings on the audio thread; nothing here touches the DOM.
 */
export class Instrument {
  readonly visuals: VisualString[];
  private readonly send: (messages: GuitarMessage[]) => void;
  private chord: Chord | null = null;
  private capoFret = 0;
  private isPalmDown = false;
  private isSilencing = false;
  private silenceTimer: ReturnType<typeof setTimeout> | undefined;
  /** Fingers on the neck, by pointer: several can press one string, and the highest fret sounds. */
  private readonly fingers = new Map<number, { string: number; fret: number }>();
  /**
   * A note whose finger has lifted keeps sounding at its fret until that string
   * is played again, so a tap on the neck plays the note you tapped.
   */
  private readonly sustained = new Map<number, number>();
  private readonly frets: number[] = OPEN_STRINGS.map(() => 0);
  private readonly damping: number[] = OPEN_STRINGS.map(() => 0);
  private readonly stepsPerSecond: number[];
  /** The last few chords strummed, each counted once in a row. */
  private strummed: string[] = [];

  constructor(send: (messages: GuitarMessage[]) => void) {
    this.send = send;
    this.visuals = OPEN_STRINGS.map(() => new VisualString(VISUAL_RESOLUTION));
    this.stepsPerSecond = OPEN_STRINGS.map(
      (_, i) =>
        2 *
        VISUAL_RESOLUTION *
        VISUAL_HZ *
        Math.sqrt(stringFrequency(i, 0) / stringFrequency(0, 0)),
    );
    this.update(true);
  }

  get capo(): number {
    return this.capoFret;
  }

  get chordName(): string | null {
    return this.chord?.name ?? null;
  }

  setChord(chord: Chord | null): void {
    this.chord = chord;
    this.update();
  }

  setCapo(fret: number): void {
    this.capoFret = Math.max(0, Math.min(MAX_CAPO, Math.round(fret)));
    this.update();
  }

  /** A finger (one per pointer) pressing `string` at `fret`; pressing again moves it: a slide. */
  press(finger: number, string: number, fret: number): void {
    this.fingers.set(finger, { string, fret });
    this.sustained.delete(string);
    this.update();
  }

  lift(finger: number): void {
    const pressed = this.fingers.get(finger);
    if (!pressed) return;
    this.fingers.delete(finger);
    // With another finger still on the string, lifting is a pull-off to that finger's fret.
    if (!this.isFingered(pressed.string)) this.sustained.set(pressed.string, pressed.fret);
    this.update();
  }

  /** The side of the hand resting across all six strings. */
  setPalm(isDown: boolean): void {
    this.isPalmDown = isDown;
    this.update();
  }

  /** Stops everything ringing, then lets go; a palm a finger is holding down stays down. */
  silence(): void {
    clearTimeout(this.silenceTimer);
    this.isSilencing = true;
    this.update();
    this.silenceTimer = setTimeout(() => {
      this.isSilencing = false;
      this.update();
    }, 150);
  }

  dispose(): void {
    clearTimeout(this.silenceTimer);
  }

  /** The fret a string sounds at: open, the capo, the chord or a finger, whichever is highest. */
  fret(string: number): number {
    return this.frets[string] ?? 0;
  }

  midi(string: number): number {
    return (OPEN_STRINGS[string] ?? 40) + this.fret(string);
  }

  isMuted(string: number): boolean {
    return (
      chordFret(this.chord, this.capoFret, string) === null &&
      !this.isFingered(string) &&
      !this.sustained.has(string)
    );
  }

  isFingered(string: number): boolean {
    for (const pressed of this.fingers.values()) if (pressed.string === string) return true;
    return false;
  }

  /** Strength of the visible vibration, 0 when still. */
  level(string: number): number {
    return this.visuals[string]?.peak() ?? 0;
  }

  /**
   * `position` runs from the bridge (0) to the fret (1); `direction` is the
   * way the pick moved, so the string you see swings that way.
   */
  pluck(string: number, position: number, velocity: number, direction = 1, delay = 0): void {
    this.release([string]);
    this.send([{ type: "pluck", string, position, velocity, delay }]);
    this.visuals[string]?.pluck(position, direction * velocity * (this.isMuted(string) ? 0.3 : 1));
  }

  /** Down (low E first) is 1, up (high E first) is -1. */
  strum(direction: 1 | -1, velocity = 0.75): void {
    const order = OPEN_STRINGS.map((_, i) => (direction > 0 ? i : STRING_COUNT - 1 - i));
    const messages: GuitarMessage[] = order.map((string, i) => ({
      type: "pluck",
      string,
      position: 0.24,
      // A downstroke digs into the bass strings; an upstroke catches the treble.
      velocity: velocity * (1 - 0.04 * i),
      delay: i * STRUM_SPACING,
    }));
    this.release(order);
    this.send(messages);
    for (const message of messages) {
      if (message.type !== "pluck") continue;
      const amplitude = direction * message.velocity * (this.isMuted(message.string) ? 0.3 : 1);
      this.visuals[message.string]?.pluck(message.position, amplitude);
    }
  }

  /**
   * Notes that the current chord was strummed. True when the last four strummed
   * chords are the four-chord loop, starting anywhere in it.
   */
  recordStrum(): boolean {
    const name = this.chord?.name;
    if (!name || this.strummed.at(-1) === name) return false;
    this.strummed = [...this.strummed, name].slice(-FOUR_CHORDS.length);
    const start = FOUR_CHORDS.indexOf(this.strummed[0] as (typeof FOUR_CHORDS)[number]);
    return (
      start >= 0 &&
      this.strummed.length === FOUR_CHORDS.length &&
      this.strummed.every((chord, i) => chord === FOUR_CHORDS[(start + i) % FOUR_CHORDS.length])
    );
  }

  /** Moves the strings you see on by `seconds`, each decaying like the note it plays. */
  tick(seconds: number): void {
    this.visuals.forEach((visual, string) => {
      const rate = this.stepsPerSecond[string] ?? 0;
      const ring =
        (this.damping[string] ?? 0) > 0.4
          ? 0.15
          : 0.5 * decayFor(stringFrequency(string, this.fret(string)));
      visual.advance(seconds, rate, 10 ** (-3 / (ring * rate)));
    });
  }

  /** Playing a string again lets go of a note left sounding on it. */
  private release(strings: number[]): void {
    if (!strings.some((string) => this.sustained.delete(string))) return;
    this.update();
  }

  private update(isFirst = false): void {
    const messages: GuitarMessage[] = [];
    for (let string = 0; string < STRING_COUNT; string++) {
      let fret = chordFret(this.chord, this.capoFret, string) ?? this.capoFret;
      for (const pressed of this.fingers.values()) {
        if (pressed.string === string) fret = Math.max(fret, pressed.fret);
      }
      fret = this.sustained.get(string) ?? fret;
      const damping = this.isPalmDown || this.isSilencing ? 1 : this.isMuted(string) ? MUTED : 0;
      if (isFirst || fret !== this.frets[string]) {
        this.frets[string] = fret;
        this.visuals[string]?.press(fretPosition(fret));
        messages.push({ type: "fret", string, fret });
      }
      if (isFirst || damping !== this.damping[string]) {
        this.damping[string] = damping;
        messages.push({ type: "damp", string, amount: damping });
      }
    }
    if (messages.length > 0) this.send(messages);
  }
}
