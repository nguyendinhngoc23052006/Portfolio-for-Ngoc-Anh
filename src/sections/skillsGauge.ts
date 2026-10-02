import { silkBurst } from "../lib/eggs";
import { gsap } from "../lib/motion";
import { buzz, chime, noteAt, panFor, rateLimit, tick } from "../lib/sound";

export const ARC_LENGTH = 100;
export const KNOB_RADIUS = 9;

const VIEWBOX_WIDTH = 300;
const ARC_CENTER = 150;
const ARC_RADIUS = 120;
const LANDING_DEGREE = 12;
const INTRO_SWEEP = { duration: 2, ease: "power3.out" } as const;
const REPLAY_SWEEP = { duration: 2.4, ease: "power2.out" } as const;
const SPRING = "cubic-bezier(0.3, 1.5, 0.5, 1)";
const MARK_FLASH: Keyframe[] = [
  { stroke: "#e8b04f", strokeWidth: "4px" },
  { stroke: "rgba(244, 238, 227, 0.4)", strokeWidth: "1.5px" },
];

/** Where the arc sits once `fraction` (0 to 1) of the sweep is done, in viewBox units. */
export function arcPoint(fraction: number) {
  const angle = Math.PI - fraction * Math.PI;
  return {
    x: ARC_CENTER + Math.cos(angle) * ARC_RADIUS,
    y: ARC_CENTER - Math.sin(angle) * ARC_RADIUS,
  };
}

function pulse(element: Element | null, frames: Keyframe[], duration: number, easing: string) {
  if (!element || typeof element.animate !== "function") return;
  element.animate(frames, { duration, easing });
}

function cancelPulses(elements: Array<Element | null>) {
  for (const element of elements) {
    for (const animation of element?.getAnimations?.() ?? []) animation.cancel();
  }
}

export interface GaugeSweep {
  hasPlayed: () => boolean;
  /** Parks the gauge at zero, ready to sweep. */
  reset: () => void;
  /** A replay is the visitor's own click: it ticks, chimes and throws silk. */
  play: (isReplay: boolean) => void;
  /** Cancels any sweep and parks the gauge at its real score. */
  stop: () => void;
}

/** The needle's sweep from 0 to the real score; one instance owns the gauge's moving parts. */
export function createGaugeSweep(root: HTMLElement, score: number, max: number): GaugeSweep {
  const svg = root.querySelector<SVGSVGElement>(".ielts svg");
  const arc = root.querySelector<SVGPathElement>(".ielts-fill");
  const knob = root.querySelector<SVGCircleElement>(".ielts-knob");
  const label = root.querySelector<HTMLElement>(".ielts-score");
  const marks = Array.from(root.querySelectorAll<SVGLineElement>(".ielts-tick"));
  const counter = { value: 0 };
  let sweep: gsap.core.Tween | null = null;
  let hasStarted = false;

  const draw = () => {
    const fraction = counter.value / max;
    const point = arcPoint(fraction);
    arc?.setAttribute("stroke-dasharray", `${fraction * ARC_LENGTH} ${ARC_LENGTH}`);
    knob?.setAttribute("cx", String(point.x));
    knob?.setAttribute("cy", String(point.y));
    if (label) label.textContent = counter.value.toFixed(1);
  };

  const panAt = (fraction: number) => {
    const box = svg?.getBoundingClientRect();
    if (!box) return 0;
    return panFor(box.left + (arcPoint(fraction).x / VIEWBOX_WIDTH) * box.width);
  };

  const passBand = (band: number, isReplay: boolean) => {
    pulse(marks[band] ?? null, MARK_FLASH, 800, "ease-out");
    if (!isReplay) return;
    tick({ gain: 0.4, pitch: 1500 + (band / max) * 2600, pan: panAt(band / max) });
  };

  const land = (isReplay: boolean) => {
    pulse(knob, [{ transform: "scale(1.9)" }, { transform: "scale(1)" }], 900, SPRING);
    pulse(label, [{ transform: "scale(1.14)" }, { transform: "scale(1)" }], 800, SPRING);
    if (!isReplay) return;
    chime(noteAt(LANDING_DEGREE), { gain: 0.85, pan: panAt(score / max) });
    buzz(12);
    const box = knob?.getBoundingClientRect();
    if (box) silkBurst(box.left + box.width / 2, box.top + box.height / 2, 0.6);
  };

  return {
    hasPlayed: () => hasStarted,
    reset: () => {
      counter.value = 0;
      draw();
    },
    play: (isReplay) => {
      hasStarted = true;
      sweep?.kill();
      cancelPulses([knob, label, ...marks]);
      counter.value = 0;
      draw();
      const lastBand = Math.floor(score);
      let band = 0;
      sweep = gsap.to(counter, {
        value: score,
        ...(isReplay ? REPLAY_SWEEP : INTRO_SWEEP),
        onUpdate: () => {
          draw();
          while (band < lastBand && counter.value >= band + 1) {
            band += 1;
            passBand(band, isReplay);
          }
        },
        onComplete: () => land(isReplay),
      });
    },
    stop: () => {
      sweep?.kill();
      sweep = null;
      cancelPulses([knob, label, ...marks]);
      counter.value = score;
      draw();
    },
  };
}

/** Clicking the gauge card replays the sweep; with reduced motion it only rings the landing chime. */
export function bindGauge(root: HTMLElement, getSweep: () => GaugeSweep | null): () => void {
  const card = root.querySelector<HTMLElement>(".ielts");
  if (!card) return () => {};
  const gate = rateLimit(350);
  const onClick = () => {
    if (!gate()) return;
    const sweep = getSweep();
    if (sweep) {
      sweep.play(true);
      return;
    }
    const box = card.getBoundingClientRect();
    chime(noteAt(LANDING_DEGREE), { gain: 0.85, pan: panFor(box.left + box.width / 2) });
    buzz(12);
  };
  card.addEventListener("click", onClick);
  return () => card.removeEventListener("click", onClick);
}
