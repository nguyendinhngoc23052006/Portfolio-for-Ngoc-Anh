import { discover } from "../lib/eggs";
import { gsap } from "../lib/motion";
import { buzz, chime, noteAt, panFor, pluck, rateLimit, tick } from "../lib/sound";

/**
 * A repeating tween stops dead at time 0 when run backwards. Starting the globe's tweens this many
 * seconds in (a whole number of both their yoyo cycles) leaves room to spin the other way.
 */
export const SPIN_HEADROOM = 3000;

const PX_PER_SPIN = 120;
const MAX_SPIN = 14;
const HORN_SPIN = 6;
const COAST_SECONDS = 2;

export interface GlobeRig {
  meridians: gsap.core.Tween[];
  ship: gsap.core.Tween;
}

/**
 * Drag the globe sideways to turn it: pointer speed becomes the meridians' and the ship's
 * timeScale, and letting go coasts back to the usual pace. Returns a cleanup.
 */
export function attachGlobeSpin(globe: SVGSVGElement, { meridians, ship }: GlobeRig): () => void {
  const wake = globe.querySelector(".eg-wake");
  const front = meridians[0];
  const canTick = rateLimit(40);
  const coasting = { value: 1 };
  let coast: gsap.core.Tween | null = null;
  let wakeRipple: gsap.core.Tween | null = null;
  let pointerId: number | null = null;
  let isStepping = false;
  let hasHonked = false;
  let spin = 1;
  let pointerSpeed = 0;
  let lastX = 0;
  let lastMoveAt = 0;
  let beat = 0;
  let pan = 0;

  const honk = () => {
    hasHonked = true;
    discover("spin");
    chime(noteAt(12), { pan });
    pluck(noteAt(0), { gain: 0.9, pan, bend: 0.5 });
    buzz([14, 40, 28]);
    if (!wake) return;
    wakeRipple?.kill();
    wakeRipple = gsap.fromTo(
      wake,
      { opacity: 0.7, attr: { r: 96 } },
      { opacity: 0, attr: { r: 134 }, duration: 1.2, ease: "power2.out" },
    );
  };

  const setSpin = (value: number) => {
    spin = value;
    for (const tween of meridians) tween.timeScale(value);
    ship.timeScale(value);
    if (!hasHonked && Math.abs(value) > HORN_SPIN) honk();
  };

  // One tick each time a meridian crosses the front: the meridians are a second apart.
  const step = (_time: number, deltaMs: number) => {
    if (pointerId !== null) {
      if (performance.now() - lastMoveAt > 40) pointerSpeed *= Math.exp(-deltaMs / 90);
      setSpin(gsap.utils.clamp(-MAX_SPIN, MAX_SPIN, pointerSpeed / PX_PER_SPIN));
    }
    const crossed = front ? Math.floor(front.totalTime()) : beat;
    if (crossed === beat) return;
    beat = crossed;
    if (canTick()) tick({ gain: 0.4, pan, pitch: 1700 + Math.min(Math.abs(spin), 10) * 320 });
  };

  const startStepping = () => {
    if (isStepping) return;
    isStepping = true;
    beat = front ? Math.floor(front.totalTime()) : 0;
    gsap.ticker.add(step);
  };

  const stopStepping = () => {
    isStepping = false;
    gsap.ticker.remove(step);
  };

  const settle = () => {
    coast = null;
    setSpin(1);
    stopStepping();
  };

  const onDown = (event: PointerEvent) => {
    if (pointerId !== null || event.button !== 0 || !event.isPrimary) return;
    pointerId = event.pointerId;
    globe.setPointerCapture(event.pointerId);
    globe.classList.add("is-grabbed");
    coast?.kill();
    coast = null;
    const box = globe.getBoundingClientRect();
    pan = panFor(box.left + box.width / 2);
    hasHonked = false;
    pointerSpeed = 0;
    lastX = event.clientX;
    lastMoveAt = event.timeStamp;
    startStepping();
    setSpin(0);
  };

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    globe.classList.remove("is-grabbed");
    if (globe.hasPointerCapture(event.pointerId)) globe.releasePointerCapture(event.pointerId);
    coasting.value = spin;
    coast = gsap.to(coasting, {
      value: 1,
      duration: COAST_SECONDS,
      ease: "power2.out",
      onUpdate: () => setSpin(coasting.value),
      onComplete: settle,
    });
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      release(event);
      return;
    }
    const elapsed = Math.max(event.timeStamp - lastMoveAt, 8);
    const instant = ((event.clientX - lastX) / elapsed) * 1000;
    pointerSpeed += (instant - pointerSpeed) * 0.45;
    lastX = event.clientX;
    lastMoveAt = event.timeStamp;
    setSpin(gsap.utils.clamp(-MAX_SPIN, MAX_SPIN, pointerSpeed / PX_PER_SPIN));
  };

  globe.classList.add("is-spinnable");
  globe.addEventListener("pointerdown", onDown);
  globe.addEventListener("pointermove", onMove);
  globe.addEventListener("pointerup", release);
  globe.addEventListener("pointercancel", release);
  globe.addEventListener("lostpointercapture", release);

  return () => {
    globe.removeEventListener("pointerdown", onDown);
    globe.removeEventListener("pointermove", onMove);
    globe.removeEventListener("pointerup", release);
    globe.removeEventListener("pointercancel", release);
    globe.removeEventListener("lostpointercapture", release);
    if (pointerId !== null && globe.hasPointerCapture(pointerId)) {
      globe.releasePointerCapture(pointerId);
    }
    pointerId = null;
    coast?.kill();
    wakeRipple?.kill();
    stopStepping();
    globe.classList.remove("is-spinnable", "is-grabbed");
    if (wake) gsap.set(wake, { opacity: 0 });
  };
}
