import { gsap } from "../lib/motion";
import type { Point } from "./principleGlyphs";

/** A press that travels farther than this many pixels is a drag, and never a click. */
export const DRAG_SLOP = 4;
const CLICK_GRACE_MS = 400;

export interface PlayContext {
  glyph: HTMLElement;
  svg: SVGSVGElement;
  entrance: gsap.core.Timeline;
}

export interface GlyphPlay {
  /** Puts back whatever the visitor moved, so the entrance can replay from the original picture. */
  reset: () => void;
  dispose: () => void;
}

export interface DragSession {
  part: Element;
  index: number;
  pointerId: number;
  /** Where the pointer was, in glyph units, when the press began. */
  origin: Point;
  press: Point;
  last: Point;
  /** Pixels travelled along the whole path so far. */
  travel: number;
  /** Greatest pixel distance reached from the press. */
  farthest: number;
  isLifted: boolean;
}

interface DragHandlers {
  /** A part was pressed; nothing has moved yet. */
  grab?: (session: DragSession, event: PointerEvent) => void;
  /** The press has travelled past the click slop: from here on it is a drag. */
  lift?: (session: DragSession, event: PointerEvent) => void;
  move: (session: DragSession, point: Point, event: PointerEvent) => void;
  /** Always called once; `session.isLifted` tells a drag from a plain click. */
  drop: (session: DragSession, point: Point, event: PointerEvent) => void;
}

export function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** A drag in progress must not fight the entrance: finish it first, instantly. */
export function settle(entrance: gsap.core.Timeline): void {
  if (entrance.progress() < 1) entrance.progress(1);
}

/** One running tween per part: a new one replaces the last, so nothing piles up or fights. */
export function createSlots() {
  const running = new Map<Element, gsap.core.Tween>();
  return {
    run(part: Element, vars: gsap.TweenVars): gsap.core.Tween {
      running.get(part)?.kill();
      const tween = gsap.to(part, vars);
      running.set(part, tween);
      return tween;
    },
    cancel(part: Element) {
      running.get(part)?.kill();
      running.delete(part);
    },
    stop() {
      for (const tween of running.values()) tween.kill();
      running.clear();
    },
  };
}

/**
 * Pointer dragging for the glyph's parts, with one delegated listener set on the svg.
 * A drag swallows the click that would otherwise replay the entrance. Returns a cleanup.
 */
export function attachDrag(
  { glyph, svg }: PlayContext,
  parts: readonly Element[],
  handlers: DragHandlers,
): () => void {
  let session: DragSession | null = null;
  let isClickBlocked = false;
  let unblockTimer = 0;

  const blockClick = (event: Event) => {
    if (!isClickBlocked) return;
    isClickBlocked = false;
    window.clearTimeout(unblockTimer);
    event.preventDefault();
    event.stopPropagation();
  };

  const finish = (event: PointerEvent, isRelease: boolean) => {
    const ending = session;
    if (!ending || event.pointerId !== ending.pointerId) return;
    if (event.type === "lostpointercapture" && ending.part.hasPointerCapture(ending.pointerId)) {
      return;
    }
    session = null;
    glyph.classList.remove("is-dragging");
    if (isRelease && ending.farthest > DRAG_SLOP) {
      isClickBlocked = true;
      window.clearTimeout(unblockTimer);
      unblockTimer = window.setTimeout(() => {
        isClickBlocked = false;
      }, CLICK_GRACE_MS);
    }
    if (ending.part.hasPointerCapture(ending.pointerId)) {
      ending.part.releasePointerCapture(ending.pointerId);
    }
    handlers.drop(ending, toSvgPoint(svg, event.clientX, event.clientY) ?? ending.origin, event);
  };

  const onDown = (event: PointerEvent) => {
    // Touch keeps the page scrolling; on touch screens a tap replays the drawing instead.
    if (session || event.button !== 0 || !event.isPrimary || event.pointerType === "touch") return;
    const index = event.target instanceof Element ? parts.indexOf(event.target) : -1;
    const part = parts[index];
    const origin = toSvgPoint(svg, event.clientX, event.clientY);
    if (!part || !origin) return;
    window.clearTimeout(unblockTimer);
    isClickBlocked = false;
    part.setPointerCapture(event.pointerId);
    const press = { x: event.clientX, y: event.clientY };
    session = {
      part,
      index,
      pointerId: event.pointerId,
      origin,
      press,
      last: press,
      travel: 0,
      farthest: 0,
      isLifted: false,
    };
    glyph.classList.add("is-dragging");
    handlers.grab?.(session, event);
  };

  const onMove = (event: PointerEvent) => {
    const active = session;
    if (!active || event.pointerId !== active.pointerId) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      finish(event, true);
      return;
    }
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    if (!point) return;
    active.travel += Math.hypot(event.clientX - active.last.x, event.clientY - active.last.y);
    active.last = { x: event.clientX, y: event.clientY };
    active.farthest = Math.max(
      active.farthest,
      Math.hypot(event.clientX - active.press.x, event.clientY - active.press.y),
    );
    if (!active.isLifted && active.farthest > DRAG_SLOP) {
      active.isLifted = true;
      handlers.lift?.(active, event);
    }
    if (active.isLifted) handlers.move(active, point, event);
  };

  const onUp = (event: PointerEvent) => finish(event, true);
  const onCancel = (event: PointerEvent) => finish(event, false);

  glyph.addEventListener("click", blockClick, { capture: true });
  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
  svg.addEventListener("pointercancel", onCancel);
  svg.addEventListener("lostpointercapture", onCancel);

  return () => {
    window.clearTimeout(unblockTimer);
    glyph.removeEventListener("click", blockClick, { capture: true });
    svg.removeEventListener("pointerdown", onDown);
    svg.removeEventListener("pointermove", onMove);
    svg.removeEventListener("pointerup", onUp);
    svg.removeEventListener("pointercancel", onCancel);
    svg.removeEventListener("lostpointercapture", onCancel);
    glyph.classList.remove("is-dragging");
    if (session?.part.hasPointerCapture(session.pointerId)) {
      session.part.releasePointerCapture(session.pointerId);
    }
    session = null;
  };
}
