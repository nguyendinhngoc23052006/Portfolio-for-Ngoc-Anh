import { afterEach, describe, expect, it, vi } from "vitest";
import type { GuitarMessage } from "./physics";

/*
 * A pretend audio context: enough of Web Audio for the bridge to load its
 * worklet, so the test can watch exactly what reaches the strings.
 */
const posted: GuitarMessage[][] = [];
const context = {
  state: "suspended" as AudioContextState,
  listeners: [] as (() => void)[],
  addEventListener(_: string, listener: () => void) {
    this.listeners.push(listener);
  },
  setState(state: AudioContextState) {
    this.state = state;
    for (const listener of this.listeners) listener();
  },
  audioWorklet: { addModule: async () => {} },
  createBiquadFilter: () => fakeNode(),
  createGain: () => fakeNode(),
};
let output: { context: typeof context; output: object } | null = { context, output: {} };

function fakeNode() {
  return {
    type: "",
    frequency: { value: 0 },
    Q: { value: 0 },
    gain: { value: 0 },
    connect: (target: unknown) => target,
  };
}

vi.mock("../lib/sound", () => ({
  getAudioOutput: () => output,
  pluck: vi.fn(),
}));

class FakeWorkletNode {
  port = { postMessage: (messages: GuitarMessage[]) => posted.push(messages) };
  connect = (target: unknown) => target;
}
vi.stubGlobal("AudioWorkletNode", FakeWorkletNode);

const pluck = (string: number): GuitarMessage => ({
  type: "pluck",
  string,
  position: 0.2,
  velocity: 0.7,
});
const plucksPosted = () => posted.flat().filter((message) => message.type === "pluck");
let clock = 0;
vi.spyOn(performance, "now").mockImplementation(() => clock);

afterEach(() => {
  posted.length = 0;
});

describe("the bridge to the strings", () => {
  it("plays what was plucked as audio starts, drops what waited too long, and never bursts", async () => {
    const { sendToGuitar } = await import("./audio");

    // The click that unlocks audio also plucks: it waits for the worklet and for audio to run.
    sendToGuitar([{ type: "fret", string: 1, fret: 3 }, pluck(1)]);
    await vi.waitFor(() => expect(posted.length).toBeGreaterThan(0));
    expect(posted[0]).toEqual([{ type: "fret", string: 1, fret: 3 }]);
    expect(plucksPosted()).toHaveLength(0);
    clock = 80;
    context.setState("running");
    expect(plucksPosted()).toEqual([pluck(1)]);

    // Played while audio was paused: nothing piles up for later.
    posted.length = 0;
    context.setState("suspended");
    clock = 1000;
    for (let i = 0; i < 20; i++) sendToGuitar([pluck(i % 6)]);
    clock = 5000;
    context.setState("running");
    expect(plucksPosted()).toHaveLength(0);

    // Running: straight through.
    sendToGuitar([pluck(4)]);
    expect(plucksPosted()).toEqual([pluck(4)]);

    // Switched off: silent, though the left hand is remembered.
    posted.length = 0;
    output = null;
    sendToGuitar([{ type: "fret", string: 2, fret: 5 }, pluck(2)]);
    expect(posted).toHaveLength(0);
  });
});
