import { useEffect, useRef } from "react";
import { discover, silkBurst } from "../lib/eggs";
import { observeVisibility, prefersReducedMotion, ScrollTrigger } from "../lib/motion";
import { buzz, panFor, pluck, rateLimit } from "../lib/sound";
import {
  createRings,
  createStrum,
  createSwipeTracker,
  nearestStrand,
  noteOfString,
  ringGlow,
  ringOmega,
  ringShake,
  type SilkLayout,
  SWEEP_STAGGER,
  strandBaseline,
  strandChop,
  strandSwing,
  strandWave,
  stringOfStrand,
} from "./silkHarp";

const GOLD = [232, 176, 79];
const VERMILION = [224, 83, 58];
const IVORY = [246, 226, 190];
const STRUM_EGG_STRINGS = 8;

function isOnControl(event: PointerEvent): boolean {
  return Boolean((event.target as Element | null)?.closest("a, button"));
}

/** Paragraphs stay selectable: a drag that starts on them selects text instead of strumming. */
function isOnText(event: PointerEvent): boolean {
  return Boolean((event.target as Element | null)?.closest("p"));
}

function strandColor(t: number, alpha: number): string {
  // gold → ivory sheen in the middle → vermilion
  const [from, to, local] = t < 0.5 ? [GOLD, IVORY, t * 2] : [IVORY, VERMILION, (t - 0.5) * 2];
  const channel = (i: number) =>
    Math.round((from[i] ?? 0) + ((to[i] ?? 0) - (from[i] ?? 0)) * local);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)} / ${alpha.toFixed(3)})`;
}

/**
 * Flowing silk: dozens of strands that drift, bend toward the pointer and fan
 * out on scroll. Easter egg: the strands are a đàn tranh. Click to pluck the
 * string under the pointer; drag across them to strum.
 */
export function SilkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    const section = canvas?.closest("section");
    if (!canvas || !context || !section) return;

    const isStill = prefersReducedMotion();
    const layout: SilkLayout = { width: 0, height: 0, strands: 0, scroll: 0 };
    let step = 0;
    let frame = 0;
    let isVisible = true;
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, pull: 0, targetPull: 0 };
    let ripples: { x: number; y: number; time: number }[] = [];
    let lastRipple = 0;
    const rings = createRings();
    const strum = createStrum();
    const swipe = createSwipeTracker();
    const canStrum = rateLimit(35);
    let hasBurst = false;
    let isSelectingText = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      layout.width = canvas.clientWidth;
      layout.height = canvas.clientHeight;
      canvas.width = layout.width * ratio;
      canvas.height = layout.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const isNarrow = layout.width < 700;
      layout.strands = isNarrow ? 38 : 66;
      step = isNarrow ? 22 : 16;
      if (isStill) draw(0);
    };

    const draw = (time: number) => {
      const { width, height, strands, scroll } = layout;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
      pointer.pull += (pointer.targetPull - pointer.pull) * 0.05;
      ripples = ripples.filter((ripple) => time - ripple.time < 2.8);
      const fade = 1 - scroll * 0.75;
      const chop = strandChop(height);

      for (let s = 0; s < strands; s++) {
        const t = s / (strands - 1);
        const body = Math.sin(t * Math.PI);
        const baseline = strandBaseline(t, height, scroll);
        const swing = strandSwing(t, height, scroll);
        const string = stringOfStrand(s, strands);
        const age = rings.ageOf(string, time);
        const isRinging = age >= 0;
        const power = isRinging ? rings.powerOf(string) : 0;
        const glow = isRinging ? ringGlow(age) * power : 0;
        const shiver = isRinging ? height * 0.02 * ringShake(age) * power : 0;
        const omega = ringOmega(string);
        const hue = t + (0.5 - t) * glow * 0.5;
        context.lineWidth = 1 + glow * 1.4;
        context.strokeStyle = strandColor(
          hue,
          Math.min(1, (0.05 + 0.26 * body) * fade + glow * 0.6),
        );
        context.beginPath();
        for (let x = -40; x <= width + 40; x += step) {
          const nx = x / width;
          let y = strandWave(t, nx, time, baseline, swing, chop);
          if (pointer.pull > 0.001) {
            const dx = x - pointer.x;
            const influence = Math.exp(-(dx * dx) / (2 * 170 * 170)) * pointer.pull;
            y += (pointer.y - y) * influence * 0.28;
          }
          for (const ripple of ripples) {
            const rippleAge = time - ripple.time;
            const dx = x - ripple.x;
            const reach = Math.exp(-(dx * dx) / (2 * 260 * 260));
            const nearness = Math.exp((-Math.abs(baseline - ripple.y) / height) * 3);
            y +=
              height *
              0.1 *
              reach *
              nearness *
              Math.exp(-rippleAge * 1.8) *
              Math.sin(rippleAge * 16 - Math.abs(dx) * 0.03 + t * 2);
          }
          if (shiver > 0.2) y += shiver * Math.sin(nx * Math.PI) * Math.sin(age * omega + s * 0.35);
          if (x === -40) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
        if (glow > 0.02) {
          context.lineWidth = 4 + glow * 6;
          context.strokeStyle = strandColor(hue, 0.12 * glow);
          context.stroke();
        }
      }
      context.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (isVisible) draw(now());
    };

    const stringAt = (event: PointerEvent): number => {
      const box = canvas.getBoundingClientRect();
      const strand = nearestStrand(
        layout,
        event.clientX - box.left,
        event.clientY - box.top,
        isStill ? 0 : now(),
      );
      return stringOfStrand(strand, layout.strands);
    };

    const sound = (string: number, event: PointerEvent, gain: number, order = 0) => {
      const delay = order * SWEEP_STAGGER;
      pluck(noteOfString(string), {
        gain,
        pan: panFor(event.clientX),
        bend: swipe.isSweepingVertically(event.timeStamp) ? 0.35 : 0,
        delay,
      });
      if (!isStill) rings.strike(string, now() + delay);
    };

    const strike = (event: PointerEvent, startsStrum = true) => {
      const string = stringAt(event);
      if (startsStrum) {
        strum.begin(string);
        hasBurst = false;
      }
      sound(string, event, 0.85);
      buzz(6);
      discover("pluck");
    };

    const startRipple = (event: PointerEvent) => {
      const at = now();
      if (at - lastRipple < 0.09) return;
      lastRipple = at;
      const box = canvas.getBoundingClientRect();
      ripples = [
        ...ripples.slice(-7),
        { x: event.clientX - box.left, y: event.clientY - box.top, time: at },
      ];
    };

    const onPointerMove = (event: PointerEvent) => {
      swipe.move(event.clientX, event.clientY, event.timeStamp);
      if (isStill) return;
      const box = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - box.left;
      pointer.targetY = event.clientY - box.top;
      pointer.targetPull = 1;
    };
    const onPointerLeave = () => {
      pointer.targetPull = 0;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (isOnControl(event)) return;
      if (!isStill) startRipple(event);
      if (event.button !== 0) return;
      isSelectingText = isOnText(event);
      strike(event, !isSelectingText);
    };
    const onSelectStart = (event: Event) => {
      if (strum.isActive) event.preventDefault();
    };
    const endStrum = () => {
      strum.reset();
      isSelectingText = false;
    };
    const onPointerDrag = (event: PointerEvent) => {
      if (event.buttons !== 1) {
        endStrum();
        return;
      }
      if (isOnControl(event)) return;
      if (!isStill) startRipple(event);
      if (isSelectingText) return;
      if (!strum.isActive) {
        strike(event);
        return;
      }
      const string = stringAt(event);
      if (!strum.isNewString(string) || !canStrum()) return;
      strum.cross(string, (crossed, order) => sound(crossed, event, 0.6, order));
      buzz(4);
      if (strum.distinctStrings >= STRUM_EGG_STRINGS && !hasBurst) {
        hasBurst = true;
        discover("strum");
        silkBurst(event.clientX, event.clientY, 0.8);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let stopObserving = () => {};
    let trigger: ScrollTrigger | undefined;
    if (!isStill) {
      stopObserving = observeVisibility(canvas, (visible) => {
        isVisible = visible;
      });
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          layout.scroll = self.progress;
        },
      });
      section.addEventListener("pointerleave", onPointerLeave);
      frame = requestAnimationFrame(loop);
    }
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerDrag);
    section.addEventListener("selectstart", onSelectStart);
    window.addEventListener("pointerup", endStrum);
    window.addEventListener("pointercancel", endStrum);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      stopObserving();
      trigger?.kill();
      section.removeEventListener("pointerleave", onPointerLeave);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointermove", onPointerDrag);
      section.removeEventListener("selectstart", onSelectStart);
      window.removeEventListener("pointerup", endStrum);
      window.removeEventListener("pointercancel", endStrum);
    };
  }, []);

  return (
    <div className="silk-canvas" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
