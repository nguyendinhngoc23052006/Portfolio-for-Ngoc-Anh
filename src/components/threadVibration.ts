/*
 * The story thread's drawn polyline, held in reusable typed buffers, and the
 * ripples a pluck sends along it. Everything here works on flat arrays so a
 * frame costs O(points) and allocates nothing once the buffers have grown.
 */

const REACH = 180;
const WAVE_NUMBER = 0.06;
const WAVE_SPEED = 28;
const DECAY = 3;
const LIFETIME = 1.6;
const MAX_VIBRATIONS = 4;
const CUTOFF = REACH * 3.5;
const TWO_REACH_SQUARED = 2 * REACH * REACH;

/** Added to the running arc length wherever the thread is not drawn, so a ripple never jumps a gap. */
export const BREAK_ARC = 800;

export interface Trace {
  count: number;
  x: Float64Array;
  y: Float64Array;
  /** Distance along the whole thread from its first anchor, stable while the page scrolls. */
  arc: Float64Array;
  isStart: Uint8Array;
  drawX: Float64Array;
  drawY: Float64Array;
}

export interface Crossing {
  x: number;
  y: number;
  arc: number;
}

export interface Vibration {
  arc: number;
  amplitude: number;
  startedAt: number;
  isLive: boolean;
  strength: number;
  phase: number;
}

export function createTrace(capacity = 1024): Trace {
  return {
    count: 0,
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    arc: new Float64Array(capacity),
    isStart: new Uint8Array(capacity),
    drawX: new Float64Array(capacity),
    drawY: new Float64Array(capacity),
  };
}

export function createVibrations(): Vibration[] {
  return Array.from({ length: MAX_VIBRATIONS }, () => ({
    arc: 0,
    amplitude: 0,
    startedAt: 0,
    isLive: false,
    strength: 0,
    phase: 0,
  }));
}

function widen(source: Float64Array, size: number): Float64Array {
  const next = new Float64Array(size);
  next.set(source);
  return next;
}

function growTrace(trace: Trace): void {
  const size = trace.x.length * 2;
  const starts = new Uint8Array(size);
  starts.set(trace.isStart);
  trace.x = widen(trace.x, size);
  trace.y = widen(trace.y, size);
  trace.arc = widen(trace.arc, size);
  trace.drawX = widen(trace.drawX, size);
  trace.drawY = widen(trace.drawY, size);
  trace.isStart = starts;
}

/** `isStart` marks the first point after the pen was lifted. */
export function addPoint(trace: Trace, x: number, y: number, arc: number, isStart: boolean): void {
  if (trace.count === trace.x.length) growTrace(trace);
  const i = trace.count;
  trace.x[i] = x;
  trace.y[i] = y;
  trace.arc[i] = arc;
  trace.isStart[i] = isStart ? 1 : 0;
  trace.count = i + 1;
}

/**
 * Where the pointer's move from (ax, ay) to (bx, by) first crosses the thread,
 * written into `out`. Tests the resting polyline, never the rippling one.
 */
export function findCrossing(
  trace: Trace,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  out: Crossing,
): boolean {
  const { count, x, y, arc, isStart } = trace;
  const rx = bx - ax;
  const ry = by - ay;
  let nearest = 2;
  for (let i = 1; i < count; i++) {
    if (isStart[i] === 1) continue;
    const startX = x[i - 1] ?? 0;
    const startY = y[i - 1] ?? 0;
    const sx = (x[i] ?? 0) - startX;
    const sy = (y[i] ?? 0) - startY;
    const denominator = rx * sy - ry * sx;
    if (Math.abs(denominator) < 1e-9) continue;
    const qx = startX - ax;
    const qy = startY - ay;
    const along = (qx * sy - qy * sx) / denominator;
    const across = (qx * ry - qy * rx) / denominator;
    if (along < 0 || along > 1 || across < 0 || across > 1 || along >= nearest) continue;
    nearest = along;
    out.x = startX + across * sx;
    out.y = startY + across * sy;
    const from = arc[i - 1] ?? 0;
    out.arc = from + across * ((arc[i] ?? 0) - from);
  }
  return nearest <= 1;
}

/** Starts a ripple, replacing the oldest one when all slots are busy. */
export function startVibration(
  vibrations: Vibration[],
  arc: number,
  amplitude: number,
  now: number,
): void {
  let slot = vibrations[0];
  for (const vibration of vibrations) {
    if (!vibration.isLive) {
      slot = vibration;
      break;
    }
    if (slot && vibration.startedAt < slot.startedAt) slot = vibration;
  }
  if (!slot) return;
  slot.arc = arc;
  slot.amplitude = amplitude;
  slot.startedAt = now;
  slot.isLive = true;
  slot.strength = amplitude;
  slot.phase = 0;
}

function offsetAt(vibrations: Vibration[], arc: number): number {
  let offset = 0;
  for (const vibration of vibrations) {
    if (!vibration.isLive) continue;
    const distance = Math.abs(arc - vibration.arc);
    if (distance > CUTOFF) continue;
    offset +=
      vibration.strength *
      Math.exp(-(distance * distance) / TWO_REACH_SQUARED) *
      Math.sin(distance * WAVE_NUMBER - vibration.phase);
  }
  return offset;
}

/**
 * Fills the trace's draw buffers: every point pushed sideways, perpendicular to
 * the local thread direction, by the live ripples. Returns how much of the
 * strongest ripple is left, 0 to 1.
 */
export function displaceTrace(trace: Trace, vibrations: Vibration[], now: number): number {
  let energy = 0;
  for (const vibration of vibrations) {
    if (!vibration.isLive) continue;
    const age = (now - vibration.startedAt) / 1000;
    if (age > LIFETIME) {
      vibration.isLive = false;
      continue;
    }
    const fade = Math.exp(-DECAY * age);
    vibration.strength = vibration.amplitude * fade;
    vibration.phase = WAVE_SPEED * age;
    energy = Math.max(energy, fade);
  }
  const { count, x, y, arc, isStart, drawX, drawY } = trace;
  for (let i = 0; i < count; i++) {
    const px = x[i] ?? 0;
    const py = y[i] ?? 0;
    drawX[i] = px;
    drawY[i] = py;
    if (energy === 0) continue;
    const offset = offsetAt(vibrations, arc[i] ?? 0);
    if (offset === 0) continue;
    const before = isStart[i] === 1 ? i : i - 1;
    const after = i + 1 < count && isStart[i + 1] === 0 ? i + 1 : i;
    const tangentX = (x[after] ?? px) - (x[before] ?? px);
    const tangentY = (y[after] ?? py) - (y[before] ?? py);
    const length = Math.hypot(tangentX, tangentY);
    if (length === 0) continue;
    drawX[i] = px - (tangentY / length) * offset;
    drawY[i] = py + (tangentX / length) * offset;
  }
  return energy;
}

/** Strokes the draw buffers as smooth curves through the midpoints of neighbouring points. */
export function strokeTrace(context: CanvasRenderingContext2D, trace: Trace): void {
  const { count, drawX, drawY, isStart } = trace;
  context.beginPath();
  for (let i = 0; i < count; i++) {
    const x = drawX[i] ?? 0;
    const y = drawY[i] ?? 0;
    if (isStart[i] === 1) {
      context.moveTo(x, y);
    } else if (i + 1 >= count || isStart[i + 1] === 1) {
      context.lineTo(x, y);
    } else {
      context.quadraticCurveTo(x, y, (x + (drawX[i + 1] ?? x)) / 2, (y + (drawY[i + 1] ?? y)) / 2);
    }
  }
  context.stroke();
}
