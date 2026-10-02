import { silkBurst } from "../lib/eggs";
import { gsap, isFinePointer, prefersReducedMotion } from "../lib/motion";
import { arpeggio, buzz, chime, noteAt, panFor, pluck, rateLimit, tick } from "../lib/sound";

/** Scale degrees by tile order: Microsoft's three, then Adobe's two, all climbing. */
const TOOL_DEGREES = [5, 7, 9, 10, 12];
const FLOURISH_DEGREE = 14;
const COMBO_WINDOW_MS = 4000;
const ARPEGGIO_STEP = 0.075;

/** True on the press that completes `size` distinct keys pressed within `windowMs`. */
export function createComboTracker<Key>(
  size: number,
  windowMs: number,
  now: () => number = () => performance.now(),
): (key: Key) => boolean {
  const pressedAt = new Map<Key, number>();
  return (key) => {
    const at = now();
    pressedAt.set(key, at);
    for (const [other, when] of pressedAt) {
      if (at - when > windowMs) pressedAt.delete(other);
    }
    if (pressedAt.size < size) return false;
    pressedAt.clear();
    return true;
  };
}

function noteFor(index: number): number {
  return noteAt(TOOL_DEGREES[index] ?? FLOURISH_DEGREE);
}

function centreOf(element: Element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Press, hover tick, and the five-tile combo. Works under reduced motion; only visuals are skipped. */
export function bindToolTiles(root: HTMLElement): () => void {
  const tiles = Array.from(root.querySelectorAll<HTMLElement>(".tool"));
  const completesCombo = createComboTracker<HTMLElement>(tiles.length, COMBO_WINDOW_MS);
  const live = new Set<gsap.core.Timeline>();

  const run = (build: (timeline: gsap.core.Timeline) => void) => {
    const timeline: gsap.core.Timeline = gsap.timeline({ onComplete: () => live.delete(timeline) });
    live.add(timeline);
    build(timeline);
  };

  const pressIn = (tile: HTMLElement) => {
    run((timeline) =>
      timeline
        .to(tile, { scale: 0.94, duration: 0.07, ease: "power2.out", overwrite: "auto" })
        .to(tile, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.3)" }),
    );
  };

  /** One hop per tile, each landing as its note sounds. */
  const ripple = () => {
    run((timeline) => {
      tiles.forEach((tile, index) => {
        const at = index * ARPEGGIO_STEP;
        timeline
          .to(
            tile,
            { y: -18, scale: 1.05, duration: 0.2, ease: "power2.out", overwrite: "auto" },
            at,
          )
          .to(tile, { y: 0, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.35)" }, at + 0.2);
      });
    });
  };

  const press = (tile: HTMLElement, index: number) => {
    if (Number(gsap.getProperty(tile, "opacity")) < 0.5) return;
    const centre = centreOf(tile);
    const pan = panFor(centre.x);
    const isMotionAllowed = !prefersReducedMotion();
    if (isMotionAllowed) pressIn(tile);
    if (!completesCombo(tile)) {
      pluck(noteFor(index), { bend: 0.3, gain: 0.85, pan });
      buzz(6);
      return;
    }
    arpeggio(
      tiles.map((_, position) => noteFor(position)),
      { voice: "pluck", step: ARPEGGIO_STEP, gain: 0.9, pan },
    );
    chime(noteAt(FLOURISH_DEGREE), { gain: 0.5, pan, delay: tiles.length * ARPEGGIO_STEP });
    buzz([10, 40, 10, 40, 16]);
    if (!isMotionAllowed) return;
    ripple();
    silkBurst(centre.x, centre.y, 1);
  };

  const cleanups = tiles.map((tile, index) => {
    const canTick = rateLimit(200);
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !isFinePointer() || !canTick()) return;
      tick({ gain: 0.35, pitch: 2000 + index * 260, pan: panFor(event.clientX) });
    };
    const onClick = () => press(tile, index);
    tile.addEventListener("pointerenter", onEnter);
    tile.addEventListener("click", onClick);
    return () => {
      tile.removeEventListener("pointerenter", onEnter);
      tile.removeEventListener("click", onClick);
    };
  });

  return () => {
    for (const cleanup of cleanups) cleanup();
    for (const timeline of live) timeline.kill();
    live.clear();
  };
}

/** Tiles lean toward the pointer and catch a warm glare under it. Motion only: call it in a scene. */
export function bindTilt(root: HTMLElement): () => void {
  const tiles = gsap.utils.toArray<HTMLElement>(".tool", root);
  const cleanups = tiles.map((tile) => {
    const onEnter = () => tile.classList.add("is-lit");
    const onMove = (event: PointerEvent) => {
      const box = tile.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      tile.style.setProperty("--glare-x", `${x * 100}%`);
      tile.style.setProperty("--glare-y", `${y * 100}%`);
      gsap.to(tile, {
        rotateY: (x - 0.5) * 18,
        rotateX: -(y - 0.5) * 18,
        duration: 0.4,
        overwrite: "auto",
      });
    };
    const onLeave = () => {
      tile.classList.remove("is-lit");
      gsap.to(tile, { rotateX: 0, rotateY: 0, duration: 0.6, overwrite: "auto" });
    };
    tile.addEventListener("pointerenter", onEnter);
    tile.addEventListener("pointermove", onMove);
    tile.addEventListener("pointerleave", onLeave);
    return () => {
      tile.removeEventListener("pointerenter", onEnter);
      tile.removeEventListener("pointermove", onMove);
      tile.removeEventListener("pointerleave", onLeave);
      tile.classList.remove("is-lit");
      tile.style.removeProperty("--glare-x");
      tile.style.removeProperty("--glare-y");
    };
  });
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
