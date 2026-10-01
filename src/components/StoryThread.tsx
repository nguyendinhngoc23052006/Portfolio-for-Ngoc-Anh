import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "../lib/motion";
import { getThreadTrack, onThreadTrackChange } from "../lib/thread";

/** The thread's tip rides this line: 60% down the screen, or 55% across inside Journey's track. */
const READ_Y = 0.6;
const READ_X = 0.55;
const SAMPLES = 28;

interface Anchor {
  element: HTMLElement;
  trigger: ScrollTrigger;
  isOnTrack: boolean;
  isGap: boolean;
}

type Point = { x: number; y: number };

/**
 * Page scroll at which the reader reaches an anchor. A trigger steered by a
 * containerAnimation reports `start` in that animation's time, so map it onto
 * the track's own scroll range.
 */
function activationOf(anchor: Anchor): number {
  const track = getThreadTrack();
  const range = track?.scrollTrigger;
  if (!anchor.isOnTrack || !track || !range) return anchor.trigger.start;
  return gsap.utils.mapRange(0, track.duration(), range.start, range.end, anchor.trigger.start);
}

function isOnScreen({ x, y }: Point, width: number, height: number): boolean {
  return x >= -40 && x <= width + 40 && y >= -40 && y <= height + 40;
}

function centerOf(element: HTMLElement): Point {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Catmull-Rom segment p1→p2 as a cubic Bézier, sampled at `t`. */
function pointOnSegment(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
  const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
  const u = 1 - t;
  return {
    x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
    y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y,
  };
}

/**
 * One silk thread through the whole story. Sections only place invisible
 * anchors (ThreadAnchor); the path is derived from where those sit on screen
 * right now, so layout changes, pins and sideways travel need no coordinates.
 * The thread is drawn through every anchor the reader has passed, and its tip
 * stops where the next stretch crosses the reading line.
 */
export function StoryThread() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || prefersReducedMotion()) return;
    let anchors: Anchor[] = [];
    let frame = 0;

    const build = () => {
      for (const anchor of anchors) anchor.trigger.kill();
      const track = getThreadTrack();
      anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-thread]"))
        .filter((element) => element.getClientRects().length > 0)
        .flatMap((element) => {
          const isOnTrack = element.dataset.thread === "track";
          if (isOnTrack && !track) return [];
          const trigger = ScrollTrigger.create({
            trigger: element,
            start: isOnTrack ? `left ${READ_X * 100}%` : `center ${READ_Y * 100}%`,
            containerAnimation: isOnTrack ? (track ?? undefined) : undefined,
          });
          return [{ element, trigger, isOnTrack, isGap: element.hasAttribute("data-thread-gap") }];
        });
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      if (anchors.length === 0) return;

      const ordered = anchors
        .map((anchor) => ({ ...anchor, activation: activationOf(anchor) }))
        .sort((a, b) => a.activation - b.activation);
      const points = ordered.map((anchor) => centerOf(anchor.element));
      const scroll = window.scrollY;
      let passed = -1;
      ordered.forEach((anchor, i) => {
        if (anchor.activation <= scroll) passed = i;
      });
      const at = (i: number) =>
        points[Math.max(0, Math.min(points.length - 1, i))] ?? { x: 0, y: 0 };
      const color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

      context.strokeStyle = color;
      context.lineWidth = 1.6;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.globalAlpha = 0.9;
      context.beginPath();
      let tip = at(0);
      let isPenDown = false;
      const lastSegment = Math.min(passed, points.length - 2);
      for (let i = 0; i <= lastSegment; i++) {
        const p1 = at(i);
        const p2 = at(i + 1);
        const isPartial = i === passed;
        const target = ordered[i + 1];
        // A passed stretch lies above or beside the screen once both ends have left
        // it; drawing it anyway would sweep a line across a pinned scene.
        const isOffScreen = !isOnScreen(p1, width, height) && !isOnScreen(p2, width, height);
        if (target?.isGap || (isOffScreen && !isPartial)) {
          isPenDown = false;
          tip = p2;
          continue;
        }
        if (!isPenDown) {
          context.moveTo(p1.x, p1.y);
          isPenDown = true;
        }
        tip = p1;
        for (let s = 1; s <= SAMPLES; s++) {
          const point = pointOnSegment(at(i - 1), p1, p2, at(i + 2), s / SAMPLES);
          if (isPartial) {
            const isBeyond = target?.isOnTrack
              ? point.x > width * READ_X
              : point.y > height * READ_Y;
            if (isBeyond) break;
          }
          context.lineTo(point.x, point.y);
          tip = point;
        }
      }
      context.stroke();

      context.globalAlpha = 1;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 14;
      context.beginPath();
      context.arc(tip.x, tip.y, 3.6, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    };

    build();
    resize();
    const stopListening = onThreadTrackChange(build);
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      stopListening();
      window.removeEventListener("resize", resize);
      for (const anchor of anchors) anchor.trigger.kill();
    };
  }, []);

  return (
    <div className="story-thread" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
