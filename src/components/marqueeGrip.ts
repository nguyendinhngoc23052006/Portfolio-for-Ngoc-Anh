import { gsap } from "../lib/motion";
import { panFor, rateLimit, tick, whoosh } from "../lib/sound";

const TICK_EVERY = 140;
const COAST_SECONDS = 1.5;
const HARD_FLING = 1800;
const MAX_SPEED = 6000;
const COAST_TICK_FLOOR = 250;
const SAMPLE_WINDOW_MS = 90;
const MIN_SPAN_MS = 16;
const LEAN_DIVISOR = 150;
/** The loop sits this many cycles in, so a fling backwards never runs out of tween. */
const CYCLE_HEADROOM = 200;

interface Sample {
  time: number;
  x: number;
}

export interface MarqueeGrip {
  /** True while a hand holds the band or it is still coasting on a fling. */
  isBusy: () => boolean;
  dispose: () => void;
}

/**
 * Lets a pointer take hold of the looping band: while held it follows the hand
 * (pixels map to loop progress, so the wrap stays seamless), and on release it
 * keeps the hand's momentum, which decays back into the normal forward loop.
 */
export function attachGrip(
  root: HTMLElement,
  track: HTMLElement,
  loop: gsap.core.Tween,
  leanTo: (skew: number) => void,
): MarqueeGrip {
  const canTick = rateLimit(45);
  const clamp = gsap.utils.clamp;
  let half = 1;
  let pointerId: number | null = null;
  let position = 0;
  let lastX = 0;
  let pan = 0;
  let travel = 0;
  let samples: Sample[] = [];
  let coast: gsap.core.Tween | null = null;
  let coastProgress = 0;

  const seek = (progress: number) => {
    loop.totalTime(loop.duration() * (CYCLE_HEADROOM + gsap.utils.wrap(0, 1, progress)));
  };

  const stopCoast = () => {
    coast?.kill();
    coast = null;
  };

  /** One soft tick per 140px of travel, higher the faster the band moves. */
  const stepTravel = (pixels: number, speed: number) => {
    const before = Math.floor(travel / TICK_EVERY);
    travel += pixels;
    if (Math.floor(travel / TICK_EVERY) === before || !canTick()) return;
    const ratio = clamp(0, 1, speed / 4000);
    tick({ gain: 0.28 + ratio * 0.14, pan, pitch: 1700 + ratio * 2500 });
  };

  /** Pixels per second over the last moments of the drag; a hand that has rested has none. */
  const measureVelocity = (now: number): number => {
    const last = samples[samples.length - 1];
    if (!last || now - last.time > SAMPLE_WINDOW_MS) return 0;
    const recent = samples.filter((sample) => last.time - sample.time <= SAMPLE_WINDOW_MS);
    // A single coalesced move still says how fast the hand went since the sample before it.
    const first = recent.length > 1 ? recent[0] : samples[samples.length - 2];
    if (!first) return 0;
    const span = Math.max(last.time - first.time, MIN_SPAN_MS);
    return clamp(-MAX_SPEED, MAX_SPEED, ((last.x - first.x) / span) * 1000);
  };

  const coastStep = () => {
    const progress = loop.progress();
    const moved = Math.abs(gsap.utils.wrap(-0.5, 0.5, progress - coastProgress));
    coastProgress = progress;
    const velocity = (loop.timeScale() * half) / loop.duration();
    leanTo(velocity / LEAN_DIVISOR);
    const speed = Math.abs(velocity);
    if (speed >= COAST_TICK_FLOOR) stepTravel(moved * half, speed);
  };

  const startCoast = (velocity: number) => {
    // Dragging right moves the track right, which is the loop running backwards.
    loop.timeScale((-velocity * loop.duration()) / half);
    const speed = Math.abs(velocity);
    if (speed >= HARD_FLING) {
      const ratio = clamp(0, 1, speed / MAX_SPEED);
      whoosh({ gain: 0.3 + ratio * 0.25, duration: 0.6 + ratio * 0.6, pan });
    }
    coastProgress = loop.progress();
    coast = gsap.to(loop, {
      timeScale: 1,
      duration: COAST_SECONDS,
      ease: "power2.out",
      onUpdate: coastStep,
      onComplete: () => {
        coast = null;
      },
    });
  };

  const onDown = (event: PointerEvent) => {
    if (pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerId = event.pointerId;
    stopCoast();
    gsap.killTweensOf(loop);
    loop.timeScale(0);
    half = Math.max(track.offsetWidth / 2, 1);
    position = loop.progress();
    seek(position);
    lastX = event.clientX;
    pan = panFor(event.clientX);
    travel = 0;
    samples = [{ time: event.timeStamp, x: event.clientX }];
    root.setPointerCapture(event.pointerId);
    root.classList.add("is-held");
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    pan = panFor(event.clientX);
    samples.push({ time: event.timeStamp, x: event.clientX });
    while (samples.length > 2 && event.timeStamp - (samples[0]?.time ?? 0) > SAMPLE_WINDOW_MS * 2) {
      samples.shift();
    }
    if (dx === 0) return;
    position -= dx / half;
    seek(position);
    const velocity = measureVelocity(event.timeStamp);
    leanTo(-velocity / LEAN_DIVISOR);
    stepTravel(Math.abs(dx), Math.abs(velocity));
  };

  const release = (event: PointerEvent, isCancelled: boolean) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    root.classList.remove("is-held");
    pan = panFor(event.clientX);
    startCoast(isCancelled ? 0 : measureVelocity(event.timeStamp));
  };

  const onUp = (event: PointerEvent) => release(event, false);
  const onCancel = (event: PointerEvent) => release(event, true);

  root.classList.add("is-playful");
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onCancel);
  root.addEventListener("lostpointercapture", onUp);

  return {
    isBusy: () => pointerId !== null || coast !== null,
    dispose: () => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onCancel);
      root.removeEventListener("lostpointercapture", onUp);
      root.classList.remove("is-playful", "is-held");
      stopCoast();
    },
  };
}
