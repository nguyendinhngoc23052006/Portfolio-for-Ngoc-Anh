import { noteAt } from "../lib/sound";

export interface RopePoint {
  x: number;
  y: number;
  px: number;
  py: number;
}

export interface Cocoon {
  x: number;
  y: number;
  /** 0 as the press begins, 1 once the silk is fully wound. */
  wind: number;
  /** Radians the cocoon has turned. */
  angle: number;
  heldMs: number;
}

const FULL_WIND_MS = 2500;
const TILT = -0.35;
const SQUASH = 0.78;
const PULL = 0.3;

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function smooth(amount: number): number {
  return amount * amount * (3 - 2 * amount);
}

export function measureWind(heldMs: number): number {
  return Math.max(0, Math.min(1, heldMs / FULL_WIND_MS));
}

/** Radians per second: the cocoon spins faster as it tightens. */
export function spinRateFor(wind: number): number {
  return lerp(2.6, 9.5, wind);
}

/** The hum glides from the scale's fourth note to its thirteenth as the silk winds. */
export function pitchForWind(wind: number): number {
  const from = noteAt(3);
  const to = noteAt(12);
  return from * (to / from) ** smooth(wind);
}

export function burstPowerFor(heldMs: number): number {
  return Math.max(0.5, Math.min(1.8, 0.5 + (heldMs / 1000) * 0.5));
}

/** Where rope knot `index` sits on the spiral: a loose swirl at first, a tight egg at full wind. */
export function pointOnCocoon(
  index: number,
  count: number,
  cocoon: Cocoon,
): { x: number; y: number } {
  const along = index / Math.max(1, count - 1);
  const tight = smooth(cocoon.wind);
  const reach = lerp(74, 20, tight);
  const turns = lerp(1.1, 4.4, tight);
  const radius = lerp(2, reach, Math.sqrt(along));
  const theta = cocoon.angle + along * turns * Math.PI * 2;
  const across = Math.cos(theta) * radius * SQUASH;
  const down = Math.sin(theta) * radius;
  return {
    x: cocoon.x + across * Math.cos(TILT) - down * Math.sin(TILT),
    y: cocoon.y + across * Math.sin(TILT) + down * Math.cos(TILT),
  };
}

/** Eases every knot toward the spiral, keeping its last position so the rope can whip free on release. */
export function windInto(points: RopePoint[], cocoon: Cocoon): void {
  for (const [index, point] of points.entries()) {
    const target = pointOnCocoon(index, points.length, cocoon);
    point.px = point.x;
    point.py = point.y;
    point.x += (target.x - point.x) * PULL;
    point.y += (target.y - point.y) * PULL;
  }
}

/** A faint gold halo that swells as the silk is wound. */
export function drawCocoonGlow(context: CanvasRenderingContext2D, cocoon: Cocoon): void {
  const grow = smooth(cocoon.wind);
  const radius = lerp(12, 46, grow) * (1 + 0.06 * Math.sin(cocoon.heldMs / 140));
  const alpha = lerp(0.07, 0.24, grow);
  context.save();
  context.translate(cocoon.x, cocoon.y);
  context.rotate(TILT);
  context.scale(SQUASH, 1);
  const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(246, 226, 190, ${alpha})`);
  glow.addColorStop(0.45, `rgba(232, 176, 79, ${alpha * 0.55})`);
  glow.addColorStop(1, "rgba(232, 176, 79, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = `rgba(246, 226, 190, ${alpha * 0.9})`;
  context.beginPath();
  context.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
