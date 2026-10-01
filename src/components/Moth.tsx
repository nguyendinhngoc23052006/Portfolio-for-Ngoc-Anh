import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "../lib/motion";

interface Props {
  from: { x: number; y: number };
  onLanded: () => void;
}

/** A silk moth that flutters out of the cocoon and off the edge of the screen. */
export function Moth({ from, onLanded }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const moth = ref.current;
    if (!moth) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ctx = gsap.context(() => {
      gsap.to(".moth-wing--left", {
        scaleX: 0.2,
        svgOrigin: "40 30",
        duration: 0.08,
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".moth-wing--right", {
        scaleX: 0.2,
        svgOrigin: "40 30",
        duration: 0.08,
        yoyo: true,
        repeat: -1,
      });
      gsap
        .timeline({ onComplete: onLanded })
        .fromTo(
          moth,
          { x: from.x, y: from.y, scale: 0.2, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4 },
        )
        .to(moth, {
          motionPath: {
            path: [
              { x: from.x + 90, y: from.y - 140 },
              { x: width * 0.55, y: height * 0.25 },
              { x: width * 0.7, y: height * 0.65 },
              { x: width + 120, y: height * 0.12 },
            ],
            curviness: 1.5,
          },
          rotate: 18,
          duration: 4.8,
          ease: "power1.inOut",
        });
    }, moth);
    return () => ctx.revert();
  }, [from, onLanded]);

  return createPortal(
    <svg ref={ref} className="moth" viewBox="0 0 80 60" aria-hidden="true">
      <g className="moth-wing moth-wing--left">
        <path d="M38 28 C 20 4, 2 8, 4 22 C 6 32, 24 34, 38 30 Z" />
        <path d="M38 32 C 24 34, 12 46, 20 52 C 28 56, 36 44, 38 34 Z" />
        <path className="moth-vein" d="M36 29 C 26 22, 16 18, 8 18 M36 31 C 28 30, 18 30, 10 28" />
      </g>
      <g className="moth-wing moth-wing--right">
        <path d="M42 28 C 60 4, 78 8, 76 22 C 74 32, 56 34, 42 30 Z" />
        <path d="M42 32 C 56 34, 68 46, 60 52 C 52 56, 44 44, 42 34 Z" />
        <path className="moth-vein" d="M44 29 C 54 22, 64 18, 72 18 M44 31 C 52 30, 62 30, 70 28" />
      </g>
      <ellipse className="moth-body" cx="40" cy="32" rx="4" ry="12" />
      <path
        className="moth-antenna"
        d="M39 21 C 36 14, 32 11, 28 10 M41 21 C 44 14, 48 11, 52 10"
      />
    </svg>,
    document.body,
  );
}
