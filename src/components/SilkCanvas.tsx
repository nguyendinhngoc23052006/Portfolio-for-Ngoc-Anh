import { useEffect, useRef } from "react";
import { discover } from "../lib/eggs";
import { observeVisibility, prefersReducedMotion, ScrollTrigger } from "../lib/motion";

const GOLD = [232, 176, 79];
const VERMILION = [224, 83, 58];
const IVORY = [246, 226, 190];

function isOnControl(event: PointerEvent): boolean {
  return Boolean((event.target as Element | null)?.closest("a, button"));
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
 * out on scroll. Easter egg: click or drag to pluck them like strings.
 */
export function SilkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    const section = canvas?.closest("section");
    if (!canvas || !context || !section) return;

    const isStill = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let strands = 0;
    let step = 0;
    let frame = 0;
    let isVisible = true;
    let scrollProgress = 0;
    const start = performance.now();
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, pull: 0, targetPull: 0 };
    let plucks: { x: number; y: number; time: number }[] = [];
    let lastPluck = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const isNarrow = width < 700;
      strands = isNarrow ? 38 : 66;
      step = isNarrow ? 22 : 16;
      if (isStill) draw(0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      context.lineWidth = 1;
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
      pointer.pull += (pointer.targetPull - pointer.pull) * 0.05;
      plucks = plucks.filter((pluck) => time - pluck.time < 2.8);
      const spread = 1 + scrollProgress * 1.4;
      const fade = 1 - scrollProgress * 0.75;

      for (let s = 0; s < strands; s++) {
        const t = s / (strands - 1);
        const body = Math.sin(t * Math.PI);
        const baseY = height * (0.5 + (t - 0.5) * 0.42 * spread);
        const ampA = height * 0.085 * (0.55 + 0.45 * body) * (1 + scrollProgress);
        const ampB = height * 0.04;
        context.strokeStyle = strandColor(t, (0.05 + 0.26 * body) * fade);
        context.beginPath();
        for (let x = -40; x <= width + 40; x += step) {
          const nx = x / width;
          let y =
            baseY +
            Math.sin(nx * Math.PI * 2.4 + time * 0.32 + t * 1.8) * ampA +
            Math.sin(nx * Math.PI * 5.2 - time * 0.46 + t * 3.4) * ampB;
          if (pointer.pull > 0.001) {
            const dx = x - pointer.x;
            const influence = Math.exp(-(dx * dx) / (2 * 170 * 170)) * pointer.pull;
            y += (pointer.y - y) * influence * 0.28;
          }
          for (const pluck of plucks) {
            const age = time - pluck.time;
            const dx = x - pluck.x;
            const reach = Math.exp(-(dx * dx) / (2 * 260 * 260));
            const nearness = Math.exp((-Math.abs(baseY - pluck.y) / height) * 3);
            y +=
              height *
              0.1 *
              reach *
              nearness *
              Math.exp(-age * 1.8) *
              Math.sin(age * 16 - Math.abs(dx) * 0.03 + t * 2);
          }
          if (x === -40) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
      context.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (isVisible) draw((performance.now() - start) / 1000);
    };

    const onPointerMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - box.left;
      pointer.targetY = event.clientY - box.top;
      pointer.targetPull = 1;
    };
    const onPointerLeave = () => {
      pointer.targetPull = 0;
    };
    const pluck = (event: PointerEvent) => {
      if (isOnControl(event)) return;
      const now = (performance.now() - start) / 1000;
      if (now - lastPluck < 0.09) return;
      lastPluck = now;
      const box = canvas.getBoundingClientRect();
      plucks = [
        ...plucks.slice(-7),
        { x: event.clientX - box.left, y: event.clientY - box.top, time: now },
      ];
      discover("pluck");
    };
    const onPointerDrag = (event: PointerEvent) => {
      if (event.buttons === 1) pluck(event);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    if (isStill) {
      const notice = (event: PointerEvent) => {
        if (!isOnControl(event)) discover("pluck");
      };
      section.addEventListener("pointerdown", notice);
      return () => {
        resizeObserver.disconnect();
        section.removeEventListener("pointerdown", notice);
      };
    }

    const stopObserving = observeVisibility(canvas, (visible) => {
      isVisible = visible;
    });
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        scrollProgress = self.progress;
      },
    });
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerleave", onPointerLeave);
    section.addEventListener("pointerdown", pluck);
    section.addEventListener("pointermove", onPointerDrag);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      stopObserving();
      trigger.kill();
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
      section.removeEventListener("pointerdown", pluck);
      section.removeEventListener("pointermove", onPointerDrag);
    };
  }, []);

  return (
    <div className="silk-canvas" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
