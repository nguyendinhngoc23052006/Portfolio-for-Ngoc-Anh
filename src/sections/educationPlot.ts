import { gsap, prefersReducedMotion } from "../lib/motion";
import { chime, type Hum, noteAt, panFor, rateLimit, startHum } from "../lib/sound";
import { curvePoint, frequencyAt, PLOT } from "./educationCurve";

const HUM_GAIN = 0.45;
const CHIME_GAIN = 0.4;
const SWEEP_REACH = 18;
const WOBBLE_DEGREES = 16;

interface MathSymbol {
  element: SVGGraphicsElement;
  x: number;
  isNear: boolean;
}

/** Left to right, so a sweep across the plot plays the symbols' notes in rising order. */
function measureSymbols(plot: SVGSVGElement): MathSymbol[] {
  return Array.from(plot.querySelectorAll<SVGGraphicsElement>(".eg-symbol"), (element) => {
    const box = element.getBBox();
    return { element, x: box.x + box.width / 2, isNear: false };
  }).sort((a, b) => a.x - b.x);
}

/** The pointer's place along the curve, 0..1, whatever the svg's size on screen. */
function curveFraction(plot: SVGSVGElement, clientX: number, clientY: number): number | null {
  const matrix = plot.getScreenCTM();
  if (!matrix) return null;
  const inverse = matrix.inverse();
  const x = inverse.a * clientX + inverse.c * clientY + inverse.e;
  return gsap.utils.clamp(0, 1, (x - PLOT.left) / PLOT.width);
}

/**
 * A glowing dot rides the curve under the pointer while a hum follows its height, so the
 * function can be heard. The symbols float far from the curve, so the dot counts as near one when
 * it sweeps past its column. Works for every pointer and under reduced motion; only the wobble
 * is motion. Returns a cleanup.
 */
export function attachPlotSong(plot: SVGSVGElement): () => void {
  const tracer = plot.querySelector(".eg-tracer");
  const halo = plot.querySelector(".eg-tracer-halo");
  const guide = plot.querySelector(".eg-guide");
  const canChime = rateLimit(180);
  const wobbles = new Map<Element, gsap.core.Tween>();
  let symbols: MathSymbol[] = [];
  let hum: Hum | null = null;
  let isTracing = false;

  const wobble = (symbol: MathSymbol, index: number, tracerX: number, clientX: number) => {
    if (canChime()) chime(noteAt(10 + index * 2), { gain: CHIME_GAIN, pan: panFor(clientX) });
    if (prefersReducedMotion()) return;
    wobbles.get(symbol.element)?.kill();
    const kick = tracerX < symbol.x ? WOBBLE_DEGREES : -WOBBLE_DEGREES;
    wobbles.set(
      symbol.element,
      gsap.fromTo(
        symbol.element,
        { rotation: kick, transformOrigin: "50% 50%" },
        { rotation: 0, duration: 1.2, ease: "elastic.out(1, 0.3)" },
      ),
    );
  };

  const follow = (event: PointerEvent) => {
    const fraction = curveFraction(plot, event.clientX, event.clientY);
    if (fraction === null) return;
    const point = curvePoint(fraction);
    if (!isTracing) {
      isTracing = true;
      symbols = measureSymbols(plot);
      plot.classList.add("is-tracing");
      hum = startHum(frequencyAt(fraction), { gain: HUM_GAIN, pan: panFor(event.clientX) });
    }
    for (const dot of [tracer, halo]) {
      dot?.setAttribute("cx", point.x.toFixed(1));
      dot?.setAttribute("cy", point.y.toFixed(1));
    }
    guide?.setAttribute("x1", point.x.toFixed(1));
    guide?.setAttribute("x2", point.x.toFixed(1));
    guide?.setAttribute("y1", point.y.toFixed(1));
    hum?.setPitch(frequencyAt(fraction));
    symbols.forEach((symbol, index) => {
      const isNear = Math.abs(point.x - symbol.x) < SWEEP_REACH;
      if (isNear && !symbol.isNear) wobble(symbol, index, point.x, event.clientX);
      symbol.isNear = isNear;
    });
  };

  const stop = () => {
    hum?.stop();
    hum = null;
    isTracing = false;
    plot.classList.remove("is-tracing");
    for (const symbol of symbols) symbol.isNear = false;
  };

  // The press that first unlocks audio arrives after the hum began silently: start it again.
  const restartHum = (event: PointerEvent) => {
    if (!isTracing) {
      follow(event);
      return;
    }
    const fraction = curveFraction(plot, event.clientX, event.clientY);
    if (fraction === null) return;
    hum?.stop();
    hum = startHum(frequencyAt(fraction), { gain: HUM_GAIN, pan: panFor(event.clientX) });
  };

  const stopTouch = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") stop();
  };

  plot.addEventListener("pointerenter", follow);
  plot.addEventListener("pointermove", follow);
  plot.addEventListener("pointerdown", restartHum);
  plot.addEventListener("pointerup", stopTouch);
  plot.addEventListener("pointerleave", stop);
  plot.addEventListener("pointercancel", stop);
  plot.addEventListener("lostpointercapture", stopTouch);
  // Leaving the tab or the window with the pointer resting on the plot raises no pointerleave.
  const stopWhenHidden = () => {
    if (document.hidden) stop();
  };
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", stopWhenHidden);

  return () => {
    window.removeEventListener("blur", stop);
    document.removeEventListener("visibilitychange", stopWhenHidden);
    plot.removeEventListener("pointerenter", follow);
    plot.removeEventListener("pointermove", follow);
    plot.removeEventListener("pointerdown", restartHum);
    plot.removeEventListener("pointerup", stopTouch);
    plot.removeEventListener("pointerleave", stop);
    plot.removeEventListener("pointercancel", stop);
    plot.removeEventListener("lostpointercapture", stopTouch);
    stop();
    for (const [element, tween] of wobbles) {
      tween.kill();
      gsap.set(element, { rotation: 0 });
    }
    wobbles.clear();
  };
}
