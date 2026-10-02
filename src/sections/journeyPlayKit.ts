import { gsap, isFinePointer, prefersReducedMotion } from "../lib/motion";
import { panFor, rateLimit } from "../lib/sound";

export const SVG_NS = "http://www.w3.org/2000/svg";

/** A tween length that collapses to an instant change when the visitor prefers reduced motion. */
export function seconds(value: number): number {
  return prefersReducedMotion() ? 0 : value;
}

/** The `selector` match that an event's target sits inside, if it is inside `scope`. */
export function matchWithin(
  target: EventTarget | null,
  selector: string,
  scope: Element,
): Element | null {
  if (!(target instanceof Element)) return null;
  const found = target.closest(selector);
  return found && scope.contains(found) ? found : null;
}

/** Stereo position of an element as it is on screen right now, never from a cached rect. */
export function panForElement(element: Element): number {
  const box = element.getBoundingClientRect();
  return panFor(box.left + box.width / 2);
}

/** Swells `targets` out and springs them back; under reduced motion it ends where it began. */
export function swell(
  targets: gsap.TweenTarget,
  { to = 1.08, out = 0.18, back = 0.7, stagger = 0 } = {},
): gsap.core.Timeline {
  return gsap
    .timeline({ defaults: { overwrite: "auto" } })
    .to(targets, {
      scale: to,
      duration: seconds(out),
      stagger: seconds(stagger),
      ease: "power2.out",
      transformOrigin: "50% 50%",
    })
    .to(targets, {
      scale: 1,
      duration: seconds(back),
      stagger: seconds(stagger),
      ease: "elastic.out(1, 0.4)",
    });
}

export interface Play {
  scope: Element;
  /** Runs `work` so every tween it creates is reverted by `dispose`. */
  tween: (work: () => void) => void;
  listen: <T extends Event>(target: EventTarget, type: string, handler: (event: T) => void) => void;
  /** Calls `enter` once as a fine pointer arrives on a `selector` match, however many children it crosses. */
  onHover: (selector: string, enter: (element: Element, event: PointerEvent) => void) => void;
  /** Registers anything `dispose` must undo besides tweens and listeners. */
  onDispose: (cleanup: () => void) => void;
  dispose: () => void;
}

export function createPlay(scope: Element): Play {
  const context = gsap.context(() => {}, scope);
  const cleanups: Array<() => void> = [];
  const play: Play = {
    scope,
    tween: (work) => {
      context.add(work);
      // A context keeps every animation it ever made; drop the finished ones and their nodes.
      context.data = context.data.filter(
        (item: unknown) =>
          !(item instanceof gsap.core.Animation) || item.isActive() || item.progress() < 1,
      );
    },
    listen: <T extends Event>(target: EventTarget, type: string, handler: (event: T) => void) => {
      const listener = (event: Event) => handler(event as T);
      target.addEventListener(type, listener);
      cleanups.push(() => target.removeEventListener(type, listener));
    },
    onHover: (selector, enter) => {
      const isOpen = rateLimit(70);
      // A toy sliding under a resting pointer (the pinned track scrolling) is not a hover.
      let movedAt = Number.NEGATIVE_INFINITY;
      // On window: the move that carries the pointer into the scope lands just after its pointerover.
      play.listen<PointerEvent>(window, "pointermove", (event) => {
        movedAt = event.timeStamp;
      });
      play.listen<PointerEvent>(scope, "pointerover", (event) => {
        if (event.pointerType === "touch" || !isFinePointer()) return;
        if (event.timeStamp - movedAt > 80) return;
        const element = matchWithin(event.target, selector, scope);
        if (!element) return;
        if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
        if (isOpen()) enter(element, event);
      });
    },
    onDispose: (cleanup) => {
      cleanups.push(cleanup);
    },
    dispose: () => {
      context.revert();
      for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    },
  };
  return play;
}
