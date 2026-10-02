/** Equal-tempered pitch: MIDI note 69 is A4, 440 Hz. Dependency-free so the audio worklet can import it. */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
