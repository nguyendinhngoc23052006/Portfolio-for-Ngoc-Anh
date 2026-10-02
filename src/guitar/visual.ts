import { pluckShape } from "./physics";

/**
 * What the eye sees: the same ideal string, solved on a coarse grid and slowed
 * down to a speed you can watch. With the Courant number at exactly 1 this
 * finite-difference scheme is the exact solution of the wave equation
 * (d'Alembert): a pluck splits into two kinks that race to each end and back,
 * the Helmholtz motion a strobe light shows on a real string.
 */
export class VisualString {
  /** Displacement at each grid point, nut (0) to bridge (resolution). */
  displacement: Float32Array;
  private previous: Float32Array;
  private next: Float32Array;
  private stop = 0;
  private owed = 0;
  readonly resolution: number;

  constructor(resolution = 96) {
    this.resolution = resolution;
    this.displacement = new Float32Array(resolution + 1);
    this.previous = new Float32Array(resolution + 1);
    this.next = new Float32Array(resolution + 1);
  }

  /** Grid index the string is stopped at: 0 at the nut, or a fret. */
  get stopIndex(): number {
    return this.stop;
  }

  /** Press the string at `fraction` of the scale from the nut (see `fretPosition`). */
  press(fraction: number): void {
    this.stop = Math.max(0, Math.min(this.resolution - 2, Math.round(fraction * this.resolution)));
    this.displacement.fill(0, 0, this.stop + 1);
    this.previous.fill(0, 0, this.stop + 1);
    this.next.fill(0, 0, this.stop + 1);
  }

  /**
   * Pull the ringing part aside at `position` (0 at the bridge … 1 at the stop)
   * by `amplitude` and let go. Adds to whatever is already moving.
   */
  pluck(position: number, amplitude: number): void {
    const span = this.resolution - this.stop;
    for (let i = this.stop + 1; i < this.resolution; i++) {
      const value = amplitude * pluckShape((this.resolution - i) / span, position);
      this.displacement[i] = (this.displacement[i] ?? 0) + value;
      // Same shape one step ago: released from rest.
      this.previous[i] = (this.previous[i] ?? 0) + value;
    }
  }

  /** Advance `steps` grid steps, each keeping `loss` of the amplitude. */
  step(steps: number, loss = 1): void {
    const last = this.resolution;
    // Scaling the whole update by k shrinks every mode by √k per step.
    const k = loss * loss;
    for (let n = 0; n < steps; n++) {
      const current = this.displacement;
      const previous = this.previous;
      const next = this.next;
      for (let i = this.stop + 1; i < last; i++) {
        next[i] = k * ((current[i + 1] ?? 0) + (current[i - 1] ?? 0) - (previous[i] ?? 0));
      }
      next[this.stop] = 0;
      next[last] = 0;
      this.previous = current;
      this.displacement = next;
      this.next = previous;
    }
  }

  /** Advance by real time at `stepsPerSecond`, carrying fractions of a step between frames. */
  advance(seconds: number, stepsPerSecond: number, loss: number): void {
    this.owed += seconds * stepsPerSecond;
    const steps = Math.min(400, Math.floor(this.owed));
    this.owed -= Math.floor(this.owed);
    if (steps > 0) this.step(steps, loss);
  }

  /** Largest displacement anywhere: 0 when the string is still. */
  peak(): number {
    let peak = 0;
    for (const value of this.displacement) peak = Math.max(peak, Math.abs(value));
    return peak;
  }
}
