import { useEffect, useRef } from "react";
import { gsap, isFinePointer, prefersReducedMotion, ScrollTrigger } from "../lib/motion";
import { noteForFraction, panFor, pluck, rateLimit } from "../lib/sound";
import { getThreadTrack, onThreadTrackChange } from "../lib/thread";
import {
  addPoint,
  BREAK_ARC,
  type Crossing,
  createTrace,
  createVibrations,
  displaceTrace,
  findCrossing,
  startVibration,
  strokeTrace,
  type Trace,
} from "./threadVibration";

/** The thread's tip rides this line: 60% down the screen, or 55% across inside Journey's track. */
const READ_Y = 0.6;
const READ_X = 0.55;
const SAMPLES = 28;
const LENGTH_STEPS = 8;
const PLUCK_GAP_MS = 170;
const FLASH_MS = 180;
const FLASH_CORE = "rgb(255 244 214)";

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

/** Length of a stretch that is not drawn this frame, so arc positions stay stable as it comes and goes. */
function lengthOfSegment(p0: Point, p1: Point, p2: Point, p3: Point): number {
  let length = 0;
  let last = p1;
  for (let s = 1; s <= LENGTH_STEPS; s++) {
    const point = pointOnSegment(p0, p1, p2, p3, s / LENGTH_STEPS);
    length += Math.hypot(point.x - last.x, point.y - last.y);
    last = point;
  }
  return length;
}

type Stretch = Anchor & { activation: number };

interface Tip {
  x: number;
  y: number;
  /** Index of the tip in the trace, or -1 when the tip sits on a stretch that is not drawn. */
  index: number;
}

/**
 * Walks every passed stretch and records the points that get drawn into `trace`,
 * with the thread's running arc length. The last stretch is clipped at the
 * reading line. Returns where the tip bead sits.
 */
function collectTrace(
  trace: Trace,
  ordered: Stretch[],
  points: Point[],
  passed: number,
  width: number,
  height: number,
): Tip {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))] ?? { x: 0, y: 0 };
  trace.count = 0;
  let arc = 0;
  let tip = at(0);
  let tipIndex = -1;
  let isPenDown = false;
  const lastSegment = Math.min(passed, points.length - 2);
  for (let i = 0; i <= lastSegment; i++) {
    const p1 = at(i);
    const p2 = at(i + 1);
    const isPartial = i === passed;
    const target = ordered[i + 1];
    const isGap = target?.isGap === true;
    // A passed stretch lies above or beside the screen once both ends have left
    // it; drawing it anyway would sweep a line across a pinned scene.
    const isOffScreen = !isOnScreen(p1, width, height) && !isOnScreen(p2, width, height);
    if (isGap || (isOffScreen && !isPartial)) {
      arc += lengthOfSegment(at(i - 1), p1, p2, at(i + 2)) + (isGap ? BREAK_ARC : 0);
      isPenDown = false;
      tip = p2;
      tipIndex = -1;
      continue;
    }
    if (!isPenDown) {
      addPoint(trace, p1.x, p1.y, arc, true);
      isPenDown = true;
    }
    tip = p1;
    tipIndex = trace.count - 1;
    let last = p1;
    for (let s = 1; s <= SAMPLES; s++) {
      const point = pointOnSegment(at(i - 1), p1, p2, at(i + 2), s / SAMPLES);
      if (isPartial) {
        const isBeyond = target?.isOnTrack ? point.x > width * READ_X : point.y > height * READ_Y;
        if (isBeyond) break;
      }
      arc += Math.hypot(point.x - last.x, point.y - last.y);
      addPoint(trace, point.x, point.y, arc, false);
      last = point;
      tip = point;
      tipIndex = trace.count - 1;
    }
  }
  return { x: tip.x, y: tip.y, index: tipIndex };
}

/**
 * One silk thread through the whole story. Sections only place invisible
 * anchors (ThreadAnchor); the path is derived from where those sit on screen
 * right now, so layout changes, pins and sideways travel need no coordinates.
 * The thread is drawn through every anchor the reader has passed, and its tip
 * stops where the next stretch crosses the reading line. A pointer that crosses
 * the drawn thread plucks it: a note, and a ripple along the silk.
 */
export function StoryThread() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || prefersReducedMotion()) return;
    let anchors: Anchor[] = [];
    let frame = 0;
    let lastFrameAt = 0;
    let flashedAt = Number.NEGATIVE_INFINITY;
    const trace = createTrace();
    const vibrations = createVibrations();
    const crossing: Crossing = { x: 0, y: 0, arc: 0 };
    const canPluck = rateLimit(PLUCK_GAP_MS);
    const pointer = { x: 0, y: 0, fromX: 0, fromY: 0, isTracking: false };

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

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (pointer.isTracking) return;
      pointer.isTracking = true;
      pointer.fromX = pointer.x;
      pointer.fromY = pointer.y;
    };
    const stopTracking = () => {
      pointer.isTracking = false;
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) stopTracking();
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const seconds = Math.max((now - lastFrameAt) / 1000, 1 / 240);
      lastFrameAt = now;
      const { fromX, fromY } = pointer;
      pointer.fromX = pointer.x;
      pointer.fromY = pointer.y;
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
      const color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

      const tip = collectTrace(trace, ordered, points, passed, width, height);
      if (
        pointer.isTracking &&
        findCrossing(trace, fromX, fromY, pointer.x, pointer.y, crossing) &&
        canPluck()
      ) {
        const speed = Math.hypot(pointer.x - fromX, pointer.y - fromY) / seconds;
        startVibration(vibrations, crossing.arc, gsap.utils.clamp(6, 22, (speed / 1000) * 14), now);
        pluck(noteForFraction(1 - crossing.y / height), {
          pan: panFor(crossing.x),
          gain: 0.45,
          bend: 0.25,
        });
        flashedAt = now;
      }
      const energy = displaceTrace(trace, vibrations, now);

      context.strokeStyle = color;
      context.lineWidth = 1.6 + 0.9 * energy;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.globalAlpha = 0.9 + 0.1 * energy;
      if (energy > 0.02) {
        context.shadowColor = color;
        context.shadowBlur = 9 * energy;
      }
      strokeTrace(context, trace);
      context.shadowBlur = 0;

      const flash = Math.exp(-(now - flashedAt) / FLASH_MS);
      const beadX = tip.index >= 0 ? (trace.drawX[tip.index] ?? tip.x) : tip.x;
      const beadY = tip.index >= 0 ? (trace.drawY[tip.index] ?? tip.y) : tip.y;
      const radius = 3.6 + 2.4 * flash;
      context.globalAlpha = 1;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 14 + 22 * flash;
      context.beginPath();
      context.arc(beadX, beadY, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      if (flash > 0.02) {
        context.globalAlpha = Math.min(1, flash);
        context.fillStyle = FLASH_CORE;
        context.beginPath();
        context.arc(beadX, beadY, radius * 0.6, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 0.7 * flash;
        context.strokeStyle = color;
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(beadX, beadY, radius + 16 * (1 - flash), 0, Math.PI * 2);
        context.stroke();
      }
    };

    build();
    resize();
    const stopListening = onThreadTrackChange(build);
    window.addEventListener("resize", resize);
    const isPlucking = isFinePointer();
    if (isPlucking) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut);
      window.addEventListener("blur", stopTracking);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      stopListening();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", stopTracking);
      for (const anchor of anchors) anchor.trigger.kill();
    };
  }, []);

  return (
    <div className="story-thread" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
