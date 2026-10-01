import { useEffect, useRef } from "react";
import { setBurstHandler } from "../lib/eggs";
import { prefersReducedMotion } from "../lib/motion";

const COLORS = ["#e8b04f", "#f6e2be", "#e0533a", "#ffd38a"];
const TRAIL = 7;

interface Streamer {
  points: { x: number; y: number }[];
  vx: number;
  vy: number;
  life: number;
  color: string;
  width: number;
}

/** Full-screen overlay that throws curling silk streamers on request. */
export function SilkBurst() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || prefersReducedMotion()) return;
    const streamers: Streamer[] = [];
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const step = () => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = streamers.length - 1; i >= 0; i--) {
        const s = streamers[i];
        if (!s) continue;
        const head = s.points[0];
        if (!head) continue;
        s.vx *= 0.97;
        s.vy = s.vy * 0.97 + 0.16;
        s.points.unshift({ x: head.x + s.vx, y: head.y + s.vy });
        s.points.length = Math.min(s.points.length, TRAIL);
        s.life -= 0.012;
        if (s.life <= 0) {
          streamers.splice(i, 1);
          continue;
        }
        context.globalAlpha = Math.min(1, s.life * 1.5);
        context.strokeStyle = s.color;
        context.lineWidth = s.width;
        context.lineCap = "round";
        context.beginPath();
        for (const [index, p] of s.points.entries()) {
          if (index === 0) context.moveTo(p.x, p.y);
          else context.lineTo(p.x, p.y);
        }
        context.stroke();
      }
      context.globalAlpha = 1;
      frame = streamers.length ? requestAnimationFrame(step) : 0;
    };

    setBurstHandler((x, y, power) => {
      const count = Math.round(46 * power);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = (4 + Math.random() * 7) * power;
        streamers.push({
          points: [{ x, y }],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          life: 1 + Math.random() * 0.5,
          color: COLORS[i % COLORS.length] ?? "#e8b04f",
          width: 1 + Math.random() * 2,
        });
      }
      if (!frame) frame = requestAnimationFrame(step);
    });

    resize();
    window.addEventListener("resize", resize);
    return () => {
      setBurstHandler(null);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="silk-burst" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
