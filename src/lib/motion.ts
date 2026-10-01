import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { type RefObject, useEffect, useRef } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);
}

export { gsap, ScrollTrigger };

/** How long the opening curtain covers the page; the hero reveal starts as it lifts. */
export const INTRO_SECONDS = 1.6;

const MEDIA = {
  motion: "(prefers-reduced-motion: no-preference)",
  wide: "(min-width: 900px)",
  tall: "(min-height: 640px)",
} as const;

export interface SceneConditions {
  /** Viewport is wide AND tall enough to pin a section without clipping its text. */
  roomy: boolean;
  wide: boolean;
}

/**
 * Runs `setup` inside a gsap.matchMedia scoped to the returned ref. Never runs
 * when the reader prefers reduced motion, so the CSS resting state - fully
 * visible content - is what they get. Hidden start states belong in `setup`,
 * never in CSS, so a failed script can never hide text.
 */
export function useScene<T extends HTMLElement>(
  setup: (root: T, when: SceneConditions) => undefined | (() => void),
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const mm = gsap.matchMedia(root);
    mm.add(MEDIA, (context) => {
      const { motion, wide, tall } = context.conditions as Record<keyof typeof MEDIA, boolean>;
      if (!motion) return;
      return setupRef.current(root, { roomy: wide && tall, wide });
    });
    return () => mm.revert();
  }, []);

  return ref;
}

export function prefersReducedMotion(): boolean {
  return !window.matchMedia(MEDIA.motion).matches;
}

export function isFinePointer(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}

/** Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis share one clock. */
export function startSmoothScroll(): () => void {
  if (prefersReducedMotion()) return () => {};
  const lenis = new Lenis({ duration: 1.15, anchors: { offset: 0, duration: 1.6 } });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (seconds: number) => lenis.raf(seconds * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

/** Pause a canvas loop while its element is off screen. */
export function observeVisibility(element: Element, onChange: (isVisible: boolean) => void) {
  const observer = new IntersectionObserver(([entry]) => onChange(entry?.isIntersecting ?? false));
  observer.observe(element);
  return () => observer.disconnect();
}

/** Element drifts toward the pointer while hovered. Returns a cleanup. */
export function magnetize(element: HTMLElement, strength = 0.3): () => void {
  if (prefersReducedMotion() || !isFinePointer()) return () => {};
  const toX = gsap.quickTo(element, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
  const toY = gsap.quickTo(element, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
  const onMove = (event: PointerEvent) => {
    const box = element.getBoundingClientRect();
    toX((event.clientX - (box.left + box.width / 2)) * strength);
    toY((event.clientY - (box.top + box.height / 2)) * strength);
  };
  const onLeave = () => {
    toX(0);
    toY(0);
  };
  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerleave", onLeave);
  return () => {
    element.removeEventListener("pointermove", onMove);
    element.removeEventListener("pointerleave", onLeave);
  };
}

/** Deterministic pseudo-random numbers, so decorative layouts are identical on every render. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
