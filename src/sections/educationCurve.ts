import { noteAt, SCALE } from "../lib/sound";

/** Where the plot's curve sits inside its 240 x 240 viewBox. */
export const PLOT = { left: 24, width: 192, base: 150, rise: 90, axis: 210 } as const;

/** The curve's height at x in 0..1: a steady climb carrying a fading wave. */
export function curveHeight(x: number): number {
  return Math.sin(x * Math.PI * 3) * (1 - x) * 0.8 + x * 0.6;
}

export function curvePoint(x: number): { x: number; y: number } {
  return { x: PLOT.left + x * PLOT.width, y: PLOT.base - curveHeight(x) * PLOT.rise };
}

const LOWEST_HEIGHT = Math.min(...Array.from({ length: 601 }, (_, i) => curveHeight(i / 600)));
const HIGHEST_HEIGHT = Math.max(...Array.from({ length: 601 }, (_, i) => curveHeight(i / 600)));

/** 0 at the curve's lowest point, 1 at its highest. */
export function heightFraction(x: number): number {
  const fraction = (curveHeight(x) - LOWEST_HEIGHT) / (HIGHEST_HEIGHT - LOWEST_HEIGHT);
  return Math.min(1, Math.max(0, fraction));
}

/** Pitch glides continuously, never stepping, from the scale's lowest note to its highest. */
export function frequencyAt(x: number): number {
  const low = noteAt(0);
  const high = noteAt(SCALE.length - 1);
  return low * (high / low) ** heightFraction(x);
}
