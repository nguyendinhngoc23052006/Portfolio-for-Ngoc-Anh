import { silkBurst } from "../lib/eggs";
import { arpeggio, type Hum, noteAt, panFor, pop, startHum } from "../lib/sound";
import { burstPowerFor, type Cocoon, measureWind, pitchForWind, spinRateFor } from "./cocoon";

const HAS_OWN_INTERACTION = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "label",
  '[role="button"]',
  ".cocoon-button",
  ".principle-glyph",
  ".dn-hub",
  ".project-row",
  ".marquee",
  ".edu-art",
  ".station-motif",
  ".contact-knot",
  ".tool",
  ".ielts",
  ".dn-result",
  ".guitar",
  "#hero",
].join(", ");

const HOLD_MS = 220;
const DRIFT_PX = 10;
const BURST_MS = 600;
const RELEASE_EVENTS = ["pointerup", "pointercancel", "lostpointercapture"] as const;

interface Press {
  pointerId: number;
  x: number;
  y: number;
  startedAt: number;
  lastFrameAt: number;
  angle: number;
  pitchedWind: number;
  timer: number;
  isSpinning: boolean;
  hum: Hum | null;
}

export interface SpinSilk {
  /** Winds the silk one frame further; the cocoon to draw, or null when nobody is spinning. */
  advance: () => Cocoon | null;
  dispose: () => void;
}

/** Hold the primary button on bare page to wind the rope into a cocoon; let go to release it. */
export function startSpinSilk(): SpinSilk {
  const root = document.documentElement;
  let press: Press | null = null;
  let savedSelect: [string, string] | null = null;

  const keepSelectionOff = (event: Event) => event.preventDefault();

  const restoreStyle = (name: string, value: string) => {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  };

  const lockSelection = () => {
    if (savedSelect) return;
    savedSelect = [
      root.style.getPropertyValue("user-select"),
      root.style.getPropertyValue("-webkit-user-select"),
    ];
    root.style.setProperty("user-select", "none");
    root.style.setProperty("-webkit-user-select", "none");
    document.addEventListener("selectstart", keepSelectionOff);
    window.getSelection()?.removeAllRanges();
  };

  const unlockSelection = () => {
    if (!savedSelect) return;
    const [standard, prefixed] = savedSelect;
    savedSelect = null;
    restoreStyle("user-select", standard);
    restoreStyle("-webkit-user-select", prefixed);
    document.removeEventListener("selectstart", keepSelectionOff);
  };

  const beginSpin = () => {
    if (!press) return;
    press.isSpinning = true;
    press.lastFrameAt = performance.now();
    press.hum = startHum(noteAt(3), { gain: 0.7, pan: panFor(press.x) });
    lockSelection();
  };

  const releaseCocoon = ({ x, y }: Press, heldMs: number) => {
    const pan = panFor(x);
    silkBurst(x, y, burstPowerFor(heldMs));
    pop({ pan });
    const base = 7 + Math.round(measureWind(heldMs) * 3);
    arpeggio([noteAt(base), noteAt(base + 2), noteAt(base + 4)], {
      voice: "pluck",
      gain: 0.9,
      pan,
      step: 0.09,
    });
  };

  const endPress = (shouldBurst: boolean) => {
    const ending = press;
    if (!ending) return;
    press = null;
    window.clearTimeout(ending.timer);
    if (!ending.isSpinning) return;
    ending.hum?.stop();
    unlockSelection();
    const heldMs = performance.now() - ending.startedAt;
    if (shouldBurst && heldMs >= BURST_MS) releaseCocoon(ending, heldMs);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    endPress(true);
    if (!(event.target instanceof Element) || event.target.closest(HAS_OWN_INTERACTION)) return;
    const now = performance.now();
    press = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: now,
      lastFrameAt: now,
      angle: 0,
      pitchedWind: 0,
      timer: window.setTimeout(beginSpin, HOLD_MS),
      isSpinning: false,
      hum: null,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.pointerId) return;
    // A release the page never heard (a context menu, a drag out of the window) ends the spin.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      endPress(false);
      return;
    }
    if (press.isSpinning) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRIFT_PX) endPress(false);
  };

  const onRelease = (event: PointerEvent) => {
    if (press && event.pointerId === press.pointerId) endPress(true);
  };

  const onBlur = () => endPress(true);
  const onContextMenu = () => endPress(false);

  window.addEventListener("pointerdown", onPointerDown, { capture: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  for (const type of RELEASE_EVENTS) window.addEventListener(type, onRelease, { capture: true });
  window.addEventListener("blur", onBlur);
  window.addEventListener("contextmenu", onContextMenu, { capture: true });

  return {
    advance: () => {
      const current = press;
      if (!current?.isSpinning) return null;
      const now = performance.now();
      const heldMs = now - current.startedAt;
      const wind = measureWind(heldMs);
      current.angle += ((now - current.lastFrameAt) / 1000) * spinRateFor(wind);
      current.lastFrameAt = now;
      if (Math.abs(wind - current.pitchedWind) > 0.004) {
        current.hum?.setPitch(pitchForWind(wind));
        current.pitchedWind = wind;
      }
      return { x: current.x, y: current.y, wind, angle: current.angle, heldMs };
    },
    dispose: () => {
      endPress(false);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove);
      for (const type of RELEASE_EVENTS) {
        window.removeEventListener(type, onRelease, { capture: true });
      }
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("contextmenu", onContextMenu, { capture: true });
    },
  };
}
