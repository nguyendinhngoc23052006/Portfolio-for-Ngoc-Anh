import { type Instrument, noteName } from "./instrument";
import { FRET_COUNT, fretPosition, STRING_COUNT, stringNumber } from "./physics";

/*
 * The guitar on a canvas, to scale: frets sit where 12-tone equal temperament
 * puts them, so the neck you see is the neck the physics plays. Everything is
 * drawn along the strings ("along", nut to bridge) and across them, then turned
 * upright on tall screens.
 */

/** Where the nut and the bridge sit, as fractions of the instrument's length. */
export const NUT = 0.065;
export const BRIDGE = 0.935;
/** The fretboard ends at the last fret; past it is the body, where you strum. */
export const FRETBOARD_END = fretPosition(FRET_COUNT);
const INLAYS = [3, 5, 7, 9, 15, 17, 19];
/** Thickest (low E) to thinnest (high E), in CSS pixels. */
const GAUGES = [2.6, 2.2, 1.8, 1.5, 1.1, 0.9];

export interface Layout {
  /** CSS pixels of the canvas. */
  width: number;
  height: number;
  dpr: number;
  /** Strings run top to bottom instead of left to right. */
  isVertical: boolean;
  length: number;
  across: number;
  nut: number;
  bridge: number;
  gap: number;
}

export function createLayout(width: number, height: number, dpr: number): Layout {
  const isVertical = height > width;
  const length = isVertical ? height : width;
  const across = isVertical ? width : height;
  return {
    width,
    height,
    dpr,
    isVertical,
    length,
    across,
    nut: length * NUT,
    bridge: length * BRIDGE,
    gap: across / 7.4,
  };
}

/** Distance along the strings of a point `fraction` of the scale from the nut. */
export function alongOf(layout: Layout, fraction: number): number {
  return layout.nut + fraction * (layout.bridge - layout.nut);
}

export function scaleAt(layout: Layout, along: number): number {
  return (along - layout.nut) / (layout.bridge - layout.nut);
}

/** String 1, the high E, runs along the top, as in guitar tablature. */
export function acrossOf(layout: Layout, string: number): number {
  const fromTop = STRING_COUNT - 1 - string;
  return layout.across / 2 + (fromTop - (STRING_COUNT - 1) / 2) * layout.gap;
}

export function toInstrument(
  layout: Layout,
  x: number,
  y: number,
): { along: number; across: number } {
  return layout.isVertical ? { along: y, across: layout.width - x } : { along: x, across: y };
}

export type Zone = "head" | "neck" | "body";

export function zoneAt(layout: Layout, along: number): Zone {
  const fraction = scaleAt(layout, along);
  if (fraction < 0) return "head";
  return fraction <= FRETBOARD_END ? "neck" : "body";
}

/** The fret whose space holds a point on the neck: 1 just past the nut. */
export function fretAt(fraction: number): number {
  for (let fret = 1; fret <= FRET_COUNT; fret++) if (fraction <= fretPosition(fret)) return fret;
  return FRET_COUNT;
}

export function nearestString(
  layout: Layout,
  across: number,
): { string: number; distance: number } {
  let best = { string: 0, distance: Number.POSITIVE_INFINITY };
  for (let string = 0; string < STRING_COUNT; string++) {
    const distance = Math.abs(acrossOf(layout, string) - across);
    if (distance < best.distance) best = { string, distance };
  }
  return best;
}

/** Pick position for the pluck: 0 at the bridge, 1 at the fret the string is stopped at. */
export function pickPositionAt(layout: Layout, along: number, fret: number): number {
  const stop = fretPosition(fret);
  return Math.max(0.03, Math.min(0.5, (1 - scaleAt(layout, along)) / (1 - stop)));
}

export interface Palette {
  ink: string;
  silk: string;
  indigo: string;
  gold: string;
  vermilion: string;
}

/** The site's own raw colours, read from the stylesheet so the guitar never drifts from them. */
export function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--ink", "#0b0d1a"),
    silk: read("--silk", "#f4eee3"),
    indigo: read("--indigo", "#121741"),
    gold: read("--gold", "#e8b04f"),
    vermilion: read("--vermilion", "#e0533a"),
  };
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  // Safari before 16 has no roundRect: square corners rather than a broken guitar.
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawGuitar(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  instrument: Instrument,
  palette: Palette,
): void {
  const { dpr, gap, nut, bridge, length, across } = layout;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, layout.width * dpr, layout.height * dpr);
  // Draw along x and across y; tall screens turn it a quarter clockwise, nut at the top.
  if (layout.isVertical) ctx.setTransform(0, dpr, -dpr, 0, layout.width * dpr, 0);
  else ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const top = acrossOf(layout, STRING_COUNT - 1) - gap * 0.7;
  const bottom = acrossOf(layout, 0) + gap * 0.7;
  const neckEnd = alongOf(layout, FRETBOARD_END);
  const scale = bridge - nut;

  // Body: lacquered indigo, edged in gold thread.
  const bodyStart = neckEnd - gap * 0.6;
  const body = ctx.createLinearGradient(bodyStart, 0, length, 0);
  body.addColorStop(0, palette.indigo);
  body.addColorStop(1, palette.ink);
  rounded(ctx, bodyStart, 2, length - bodyStart - 2, across - 4, across * 0.34);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = palette.gold;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Sound hole and rosette, centred between the last fret and the bridge.
  const holeX = alongOf(layout, (FRETBOARD_END + 1) / 2) - scale * 0.02;
  const holeR = Math.min(across * 0.3, scale * 0.1);
  ctx.beginPath();
  ctx.arc(holeX, across / 2, holeR, 0, Math.PI * 2);
  ctx.fillStyle = palette.ink;
  ctx.fill();
  for (const [ring, alpha, dash] of [
    [holeR + 5, 0.55, []],
    [holeR + 10, 0.3, [2, 5]],
    [holeR + 15, 0.18, []],
  ] as const) {
    ctx.beginPath();
    ctx.arc(holeX, across / 2, ring, 0, Math.PI * 2);
    ctx.setLineDash(dash);
    ctx.strokeStyle = palette.gold;
    ctx.globalAlpha = alpha;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Headstock and fretboard.
  rounded(ctx, 2, top - gap * 0.15, nut, bottom - top + gap * 0.3, gap * 0.5);
  ctx.fillStyle = palette.indigo;
  ctx.fill();
  // Opaque, so the story thread passes behind the guitar rather than across its strings.
  ctx.fillStyle = palette.ink;
  ctx.fillRect(nut, top, neckEnd - nut, bottom - top);
  ctx.fillStyle = "rgb(255 255 255 / 0.045)";
  ctx.fillRect(nut, top, neckEnd - nut, bottom - top);

  // Inlays at the frets players count by; two at the octave.
  ctx.fillStyle = palette.silk;
  ctx.globalAlpha = 0.2;
  const inlay = (fret: number, offset: number) => {
    const x = alongOf(layout, (fretPosition(fret - 1) + fretPosition(fret)) / 2);
    ctx.beginPath();
    ctx.arc(x, across / 2 + offset, gap * 0.15, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const fret of INLAYS) inlay(fret, 0);
  inlay(12, -gap * 1.5);
  inlay(12, gap * 1.5);
  ctx.globalAlpha = 1;

  // Frets, the nut, the saddle.
  ctx.strokeStyle = palette.silk;
  for (let fret = 1; fret <= FRET_COUNT; fret++) {
    const x = alongOf(layout, fretPosition(fret));
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(nut, top);
  ctx.lineTo(nut, bottom);
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = 1;
  rounded(ctx, bridge - 6, top - gap * 0.1, 22, bottom - top + gap * 0.2, 5);
  ctx.fill();
  ctx.strokeStyle = palette.gold;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = palette.silk;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bridge, top);
  ctx.lineTo(bridge, bottom);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The capo, just behind its fret.
  if (instrument.capo > 0) {
    const x = alongOf(
      layout,
      (fretPosition(instrument.capo - 1) + 2 * fretPosition(instrument.capo)) / 3,
    );
    rounded(ctx, x - gap * 0.2, top - 6, gap * 0.4, bottom - top + 12, gap * 0.2);
    ctx.fillStyle = palette.vermilion;
    ctx.fill();
  }

  // Fingers: vermilion for the chord, gold for a finger you are holding down.
  for (let string = 0; string < STRING_COUNT; string++) {
    const fret = instrument.fret(string);
    if (fret <= instrument.capo && !instrument.isFingered(string)) continue;
    if (fret === 0) continue;
    const x = alongOf(layout, fretPosition(fret - 1) * 0.35 + fretPosition(fret) * 0.65);
    ctx.beginPath();
    ctx.arc(x, acrossOf(layout, string), gap * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = instrument.isFingered(string) ? palette.gold : palette.vermilion;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // The strings themselves, still behind the fret and moving past it.
  for (let string = 0; string < STRING_COUNT; string++) {
    const visual = instrument.visuals[string];
    if (!visual) continue;
    const y = acrossOf(layout, string);
    const level = Math.min(1, instrument.level(string));
    const amplitude = gap * 0.36;
    ctx.beginPath();
    ctx.moveTo(nut, y);
    ctx.lineTo(alongOf(layout, visual.stopIndex / visual.resolution), y);
    for (let i = visual.stopIndex + 1; i <= visual.resolution; i++) {
      ctx.lineTo(
        alongOf(layout, i / visual.resolution),
        y + (visual.displacement[i] ?? 0) * amplitude,
      );
    }
    ctx.lineWidth = GAUGES[string] ?? 1;
    ctx.strokeStyle = instrument.isMuted(string) ? palette.silk : palette.gold;
    ctx.globalAlpha = instrument.isMuted(string) ? 0.35 : 0.75 + 0.25 * level;
    if (level > 0.02) {
      ctx.shadowColor = palette.gold;
      ctx.shadowBlur = 16 * level;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Labels stay upright whichever way the guitar is turned.
  const fontSize = Math.max(10, Math.min(13, gap * 0.3));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = (
    text: string,
    along: number,
    acrossAt: number,
    color: string,
    weight = 500,
    size = fontSize,
    family = '"Be Vietnam Pro", system-ui, sans-serif',
  ) => {
    const x = layout.isVertical ? layout.width - acrossAt : along;
    const y = layout.isVertical ? along : acrossAt;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  };
  for (let string = 0; string < STRING_COUNT; string++) {
    const y = acrossOf(layout, string);
    label(noteName(instrument.midi(string)), nut * 0.5, y, palette.silk);
    if (instrument.isMuted(string))
      label("×", nut + gap * 0.3, y - gap * 0.3, palette.vermilion, 700, fontSize * 1.5);
    label(String(stringNumber(string)), length - gap * 0.45, y, palette.silk, 400);
  }
  // The chord you hold, written in the sound hole for the room to read.
  const chordName = instrument.chordName;
  if (chordName) {
    const size = holeR * (chordName.length > 2 ? 0.62 : 0.8);
    label(
      chordName,
      holeX,
      across / 2,
      palette.gold,
      800,
      size,
      '"Bricolage Grotesque", system-ui',
    );
  }
  for (const fret of [...INLAYS.slice(0, 4), 12]) {
    const x = alongOf(layout, (fretPosition(fret - 1) + fretPosition(fret)) / 2);
    label(
      String(fret),
      x,
      Math.min(bottom + gap * 0.42, across - fontSize),
      "rgb(244 238 227 / 0.55)",
      400,
    );
  }
}
