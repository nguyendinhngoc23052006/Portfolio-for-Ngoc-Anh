import { GuitarBody, type GuitarMessage, PROCESSOR_NAME } from "./physics";

/*
 * The six strings, on the audio thread. Deliberately thin: everything it does
 * is GuitarBody, which the tests run directly. Bundled as its own file
 * (`?worker&url`) and loaded with `audioWorklet.addModule`.
 */

// The AudioWorkletGlobalScope, which TypeScript's DOM library does not describe.
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

class GuitarProcessor extends AudioWorkletProcessor {
  private readonly body = new GuitarBody(sampleRate);

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<GuitarMessage[]>) => {
      for (const message of event.data) this.body.handle(message);
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const [left, right] = outputs[0] ?? [];
    if (left) this.body.render(left, right ?? new Float32Array(left.length));
    return true;
  }
}

registerProcessor(PROCESSOR_NAME, GuitarProcessor);
