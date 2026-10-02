import { useEffect, useRef } from "react";
import { isFinePointer, prefersReducedMotion } from "../lib/motion";
import { drawCocoonGlow, type RopePoint, windInto } from "./cocoon";
import { startSpinSilk } from "./spinSilk";

const SEGMENTS = 26;
const SEGMENT_LENGTH = 8;
const GRAVITY = 0.32;
const DAMPING = 0.9;
const GOLD = [232, 176, 79];
const HEAD_COLOR = "rgb(232 176 79)";
const VERMILION = [224, 83, 58];

function mix(from: number[], to: number[], amount: number): string {
  const channel = (i: number) =>
    Math.round((from[i] ?? 0) + ((to[i] ?? 0) - (from[i] ?? 0)) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

/** A silk strand hanging from the pointer (verlet rope). Fine pointers only. */
export function ThreadCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || prefersReducedMotion() || !isFinePointer()) return;

    const points: RopePoint[] = Array.from({ length: SEGMENTS }, () => ({
      x: 0,
      y: 0,
      px: 0,
      py: 0,
    }));
    const spin = startSpinSilk();
    const colors = points.map((_, i) => mix(GOLD, VERMILION, i / SEGMENTS));
    const pointer = { x: 0, y: 0 };
    let hasPointer = false;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (hasPointer) return;
      hasPointer = true;
      for (const p of points) {
        p.x = p.px = pointer.x;
        p.y = p.py = pointer.y;
      }
    };

    const swing = () => {
      points.forEach((p, i) => {
        if (i === 0) {
          p.px = p.x;
          p.py = p.y;
          p.x += (pointer.x - p.x) * 0.5;
          p.y += (pointer.y - p.y) * 0.5;
          return;
        }
        const vx = (p.x - p.px) * DAMPING;
        const vy = (p.y - p.py) * DAMPING + GRAVITY;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy;
      });

      for (let pass = 0; pass < 6; pass++) {
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const b = points[i];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 1;
          const offset = (distance - SEGMENT_LENGTH) / distance;
          // The head is pinned to the pointer; every other knot shares the correction.
          const share = i === 1 ? 1 : 0.5;
          b.x -= dx * offset * share;
          b.y -= dy * offset * share;
          if (i > 1) {
            a.x += dx * offset * 0.5;
            a.y += dy * offset * 0.5;
          }
        }
      }
    };

    const drawRope = () => {
      context.lineCap = "round";
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (!a || !b) continue;
        context.strokeStyle = colors[i] ?? "";
        context.lineWidth = 2.2 * (1 - i / SEGMENTS) + 0.5;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
      const head = points[0];
      if (head) {
        context.fillStyle = HEAD_COLOR;
        context.beginPath();
        context.arc(head.x, head.y, 3.2, 0, Math.PI * 2);
        context.fill();
      }
    };

    const step = () => {
      frame = requestAnimationFrame(step);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const cocoon = spin.advance();
      if (!hasPointer) return;
      if (cocoon) {
        drawCocoonGlow(context, cocoon);
        windInto(points, cocoon);
      } else {
        swing();
      }
      drawRope();
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      spin.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
    };
  }, []);

  return (
    <div className="thread-cursor" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
