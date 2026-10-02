import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chordFret, Instrument, MAX_CAPO, noteName } from "./instrument";
import { CHORDS, type GuitarMessage } from "./physics";

const chord = (name: string) => CHORDS.find((candidate) => candidate.name === name) ?? null;

function setup() {
  const sent: GuitarMessage[] = [];
  const instrument = new Instrument((messages) => sent.push(...messages));
  const frets = () => [0, 1, 2, 3, 4, 5].map((string) => instrument.fret(string));
  const lastDamp = (string: number) =>
    sent.findLast((message) => message.type === "damp" && message.string === string);
  return { sent, instrument, frets, lastDamp };
}

describe("the left hand", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts in tune with every string open and ringing", () => {
    const { sent, frets } = setup();
    expect(frets()).toEqual([0, 0, 0, 0, 0, 0]);
    expect(sent.filter((message) => message.type === "fret")).toHaveLength(6);
    expect(sent.filter((message) => message.type === "damp" && message.amount === 0)).toHaveLength(
      6,
    );
  });

  it("holds a chord shape, touching the strings it leaves out", () => {
    const { instrument, frets, lastDamp } = setup();
    instrument.setChord(chord("C"));
    expect(frets()).toEqual([0, 3, 2, 0, 1, 0]);
    expect(instrument.isMuted(0)).toBe(true);
    expect(lastDamp(0)).toMatchObject({ amount: 0.92 });
    expect(instrument.midi(1)).toBe(48);
  });

  it("moves the whole shape up with the capo, and keeps the capo on the neck", () => {
    const { instrument, frets } = setup();
    instrument.setChord(chord("G"));
    instrument.setCapo(2);
    expect(frets()).toEqual([5, 4, 2, 2, 2, 5]);
    instrument.setCapo(40);
    expect(instrument.capo).toBe(MAX_CAPO);
    instrument.setCapo(-3);
    expect(instrument.capo).toBe(0);
  });

  it("sends only what changed", () => {
    const { sent, instrument } = setup();
    sent.length = 0;
    instrument.setChord(chord("Em"));
    expect(sent).toEqual([
      { type: "fret", string: 1, fret: 2 },
      { type: "fret", string: 2, fret: 2 },
    ]);
  });

  it("lets the highest pressed fret sound, so lifting the top finger is a pull-off", () => {
    const { instrument } = setup();
    instrument.setChord(chord("Am"));
    instrument.press(1, 4, 0);
    expect(instrument.fret(4)).toBe(1);
    instrument.press(1, 4, 3);
    instrument.press(2, 4, 5);
    expect(instrument.fret(4)).toBe(5);
    instrument.lift(2);
    expect(instrument.fret(4)).toBe(3);
    instrument.lift(1);
    expect(instrument.fret(4)).toBe(3);
    instrument.pluck(4, 0.2, 0.5);
    expect(instrument.fret(4)).toBe(1);
  });

  it("brings a left-out string back to life while a finger frets it", () => {
    const { instrument, lastDamp } = setup();
    instrument.setChord(chord("D"));
    instrument.press(7, 0, 2);
    expect(instrument.isMuted(0)).toBe(false);
    expect(lastDamp(0)).toMatchObject({ amount: 0 });
    instrument.lift(7);
    expect(instrument.isMuted(0)).toBe(false);
    instrument.strum(1);
    expect(instrument.isMuted(0)).toBe(true);
  });

  it("keeps a tapped note sounding after the finger lifts, until the string is played again", () => {
    const { sent, instrument } = setup();
    instrument.press(1, 5, 3);
    instrument.lift(1);
    expect(instrument.fret(5)).toBe(3);
    sent.length = 0;
    instrument.pluck(5, 0.2, 0.5);
    // Retuned to open before the pluck lands, in that order.
    expect(sent.map((message) => message.type)).toEqual(["fret", "pluck"]);
    expect(instrument.fret(5)).toBe(0);
  });

  it("keeps a palm that is still held down after a quick mute ends", () => {
    const { instrument, lastDamp } = setup();
    instrument.setPalm(true);
    instrument.silence();
    vi.advanceTimersByTime(200);
    expect(lastDamp(2)).toMatchObject({ amount: 1 });
    instrument.setPalm(false);
    expect(lastDamp(2)).toMatchObject({ amount: 0 });
  });

  it("stops everything under the palm, then lets go", () => {
    const { instrument, lastDamp } = setup();
    instrument.setChord(chord("C"));
    instrument.silence();
    for (let string = 0; string < 6; string++)
      expect(lastDamp(string)).toMatchObject({ amount: 1 });
    vi.advanceTimersByTime(200);
    expect(lastDamp(0)).toMatchObject({ amount: 0.92 });
    expect(lastDamp(1)).toMatchObject({ amount: 0 });
  });
});

describe("the right hand", () => {
  it("strums down from the low E and up from the high E, evenly spaced", () => {
    const { sent, instrument } = setup();
    sent.length = 0;
    instrument.strum(1);
    const down = sent.flatMap((message) => (message.type === "pluck" ? [message] : []));
    expect(down.map((message) => message.string)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(down.map((message) => Math.round((message.delay ?? 0) * 1000))).toEqual([
      0, 16, 32, 48, 64, 80,
    ]);
    sent.length = 0;
    instrument.strum(-1);
    expect(sent.map((message) => message.string)).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it("sets the string you see swinging, and lets it settle", () => {
    const { instrument } = setup();
    instrument.pluck(2, 0.2, 0.8);
    expect(instrument.level(2)).toBeGreaterThan(0.5);
    for (let frame = 0; frame < 60 * 6; frame++) instrument.tick(1 / 60);
    expect(instrument.level(2)).toBeLessThan(0.05);
  });
});

describe("the four-chord loop", () => {
  const strumThrough = (instrument: Instrument, names: string[]) =>
    names.map((name) => {
      instrument.setChord(chord(name));
      return instrument.recordStrum();
    });

  it("is found when C, G, Am and F are strummed in turn, starting anywhere in the loop", () => {
    expect(strumThrough(setup().instrument, ["C", "G", "Am", "F"])).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(strumThrough(setup().instrument, ["Am", "F", "C", "G"]).at(-1)).toBe(true);
    expect(strumThrough(setup().instrument, ["Em", "Am", "F", "C", "G"]).at(-1)).toBe(true);
  });

  it("is not found out of order, and repeated strums of one chord count once", () => {
    expect(strumThrough(setup().instrument, ["C", "Am", "G", "F"]).at(-1)).toBe(false);
    expect(strumThrough(setup().instrument, ["C", "C", "G", "G", "Am", "F"]).at(-1)).toBe(true);
  });

  it("ignores strums with no chord held", () => {
    const { instrument } = setup();
    expect(instrument.recordStrum()).toBe(false);
  });
});

describe("names and shapes", () => {
  it("names notes in scientific pitch", () => {
    expect(noteName(40)).toBe("E2");
    expect(noteName(64)).toBe("E4");
    expect(noteName(61)).toBe("C♯4");
    expect(noteName(60)).toBe("C4");
  });

  it("reads a chord shape with a capo", () => {
    expect(chordFret(chord("C"), 0, 0)).toBeNull();
    expect(chordFret(chord("C"), 3, 1)).toBe(6);
    expect(chordFret(null, 2, 4)).toBe(2);
  });
});
