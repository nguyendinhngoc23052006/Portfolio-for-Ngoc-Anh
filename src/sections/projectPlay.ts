import { gsap, isFinePointer, prefersReducedMotion } from "../lib/motion";
import { arpeggio, buzz, noteAt, panFor, pluck, SCALE } from "../lib/sound";

const FIRST_DEGREE = 6;
const DEGREES_PER_ROW = 2;
const TOP_DEGREE = SCALE.length - 1;
const NOTES_PER_OCTAVE = 5;

/** Each row climbs the scale; a chord note past the top folds an octave down so it stays distinct. */
function rowDegree(index: number, offset: number): number {
  const degree = FIRST_DEGREE + index * DEGREES_PER_ROW + offset;
  return degree > TOP_DEGREE ? degree - NOTES_PER_OCTAVE : degree;
}

export function playRowNote(index: number, clientX: number): void {
  pluck(noteAt(rowDegree(index, 0)), { gain: 0.45, pan: panFor(clientX) });
}

export function playRowChord(index: number, clientX: number): void {
  const degrees = [0, 2, 4].map((offset) => rowDegree(index, offset)).sort((a, b) => a - b);
  arpeggio(
    degrees.map((degree) => noteAt(degree)),
    { voice: "pluck", step: 0.06, gain: 0.8, pan: panFor(clientX) },
  );
  buzz(8);
}

/**
 * The lean-and-settle of a struck string. Web Animations composite on top of the CSS hover
 * shift instead of overwriting it, and the title's own transform transition never sees it.
 */
const PULSE_FRAMES: Keyframe[] = [
  { transform: "skewX(0deg) scale(1)", offset: 0, easing: "ease-out" },
  { transform: "skewX(-9deg) scale(1.025)", offset: 0.16, easing: "ease-in-out" },
  { transform: "skewX(4.5deg) scale(0.99)", offset: 0.42, easing: "ease-in-out" },
  { transform: "skewX(-2.2deg) scale(1.006)", offset: 0.66, easing: "ease-in-out" },
  { transform: "skewX(0deg) scale(1)", offset: 1 },
];

const pulses = new WeakMap<Element, Animation>();

export function stopPulse(title: Element): void {
  pulses.get(title)?.cancel();
  pulses.delete(title);
}

export function pulseTitle(title: HTMLElement | null): void {
  if (!title || prefersReducedMotion() || typeof title.animate !== "function") return;
  stopPulse(title);
  const pulse = title.animate(PULSE_FRAMES, { duration: 720, composite: "add" });
  pulses.set(title, pulse);
  pulse.addEventListener("finish", () => pulses.delete(title), { once: true });
}

export function spinEmblem(emblem: Element | null): void {
  if (!emblem || prefersReducedMotion()) return;
  gsap.fromTo(
    emblem,
    { rotation: 0 },
    { rotation: 360, duration: 0.6, ease: "power3.out", overwrite: "auto" },
  );
}

/** A click squeezes the lens under the pointer, then lets it spring back. */
export function bumpLens(lens: Element | null): void {
  if (!lens || prefersReducedMotion() || !isFinePointer()) return;
  if (Number(gsap.getProperty(lens, "scale")) < 0.5) return;
  gsap.fromTo(
    lens,
    { scale: 0.82 },
    { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.4)", overwrite: "auto" },
  );
}
