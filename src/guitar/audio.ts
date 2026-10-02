import { getAudioOutput, pluck } from "../lib/sound";
import { type GuitarMessage, PROCESSOR_NAME, stringFrequency } from "./physics";
import processorUrl from "./processor.ts?worker&url";

/*
 * The bridge from the page to the strings on the audio thread. The guitar
 * plays into the site's shared bus, so the header's sound switch and the
 * room reverb apply to it like every other sound.
 */

let node: AudioWorkletNode | null = null;
let isConnecting = false;
let isFallback = false;
let queue: GuitarMessage[] = [];
/** The latest fret and damping per string, replayed into a freshly loaded worklet. */
const settings = new Map<string, GuitarMessage>();

export function sendToGuitar(messages: GuitarMessage[]): void {
  for (const message of messages) {
    if (message.type !== "pluck") settings.set(`${message.type}:${message.string}`, message);
  }
  if (node) {
    node.port.postMessage(messages);
    return;
  }
  if (isFallback) {
    playFallback(messages);
    return;
  }
  // Locked or switched off: silent, like every other sound on the site.
  const audio = getAudioOutput();
  if (!audio) return;
  queue.push(...messages.filter((message) => message.type === "pluck"));
  if (isConnecting) return;
  isConnecting = true;
  void connect(audio.context, audio.output);
}

async function connect(context: AudioContext, output: AudioNode): Promise<void> {
  try {
    await context.audioWorklet.addModule(processorUrl);
    const worklet = new AudioWorkletNode(context, PROCESSOR_NAME, {
      numberOfInputs: 0,
      outputChannelCount: [2],
    });
    // A guitar's hollow body: the air resonance near 100 Hz, the top plate an
    // octave up, and the soft roll-off of wood above 5 kHz.
    const body = [
      { type: "peaking", frequency: 100, Q: 1.2, gain: 5 },
      { type: "peaking", frequency: 205, Q: 1.4, gain: 2.5 },
      { type: "highshelf", frequency: 5000, Q: 0.7, gain: -5 },
    ].map(({ type, frequency, Q, gain }) => {
      const filter = context.createBiquadFilter();
      filter.type = type as BiquadFilterType;
      filter.frequency.value = frequency;
      filter.Q.value = Q;
      filter.gain.value = gain;
      return filter;
    });
    const level = context.createGain();
    level.gain.value = 0.42;
    body
      .reduce<AudioNode>((from, to) => from.connect(to), worklet)
      .connect(level)
      .connect(output);
    worklet.port.postMessage([...settings.values(), ...queue]);
    node = worklet;
  } catch (error) {
    // Old browsers without AudioWorklet still get a guitar, one plucked sample per note.
    console.warn("Guitar: the string simulation could not start; using simple plucks.", error);
    isFallback = true;
    playFallback(queue);
  }
  queue = [];
}

function playFallback(messages: GuitarMessage[]): void {
  for (const message of messages) {
    if (message.type !== "pluck") continue;
    const fret = settings.get(`fret:${message.string}`);
    const damp = settings.get(`damp:${message.string}`);
    if (damp?.type === "damp" && damp.amount > 0.5) continue;
    pluck(stringFrequency(message.string, fret?.type === "fret" ? fret.fret : 0), {
      gain: 0.3 + 0.5 * message.velocity,
      delay: message.delay ?? 0,
    });
  }
}
