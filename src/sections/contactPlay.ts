import { discover, silkBurst } from "../lib/eggs";
import { gsap, isFinePointer, prefersReducedMotion } from "../lib/motion";
import {
  buzz,
  chime,
  noteAt,
  noteForFraction,
  panFor,
  pluck,
  pop,
  rateLimit,
  thud,
  tick,
} from "../lib/sound";

const KNOT_CHORD = [7, 9, 12, 14];
const CHORD_STEP = 0.085;
const LAST_NOTE_BEND = 0.4;
// The thread's left end is 73% down the svg; squeezing about that height keeps it joined to the story.
const SQUEEZE_ORIGIN = "50% 73.3%";

/** The copy button's success: a bubble, then a bell. */
export function playCopied(clientX: number): void {
  const pan = panFor(clientX);
  pop({ gain: 0.7, pan });
  chime(noteAt(12), { gain: 0.8, pan, delay: 0.08 });
  buzz(10);
}

function playKnotChord(clientX: number): void {
  const pan = panFor(clientX);
  thud({ gain: 0.5, pan });
  KNOT_CHORD.forEach((note, i) => {
    const isLast = i === KNOT_CHORD.length - 1;
    pluck(noteAt(note), {
      gain: 0.85,
      pan,
      delay: i * CHORD_STEP,
      bend: isLast ? LAST_NOTE_BEND : 0,
    });
  });
}

/**
 * The finale's fidgets: tug the thread to tighten the knot, pluck it by sliding along it, and
 * hear the email and phone links. Works under reduced motion with the animation left out.
 * Returns a cleanup that removes every listener and tween.
 */
export function attachContactPlay(root: HTMLElement): () => void {
  const knot = root.querySelector<SVGSVGElement>(".contact-knot");
  const line = knot?.querySelector<SVGPathElement>(".knot-line");
  const glow = knot?.querySelector<SVGPathElement>(".knot-glow");
  const hit = knot?.querySelector<SVGPathElement>(".knot-hit");
  const email = root.querySelector<HTMLElement>(".channel-value--email");
  const phone = root.querySelector<HTMLElement>(".channel-value:not(.channel-value--email)");
  const stops: Array<() => void> = [];
  const allowStrum = rateLimit(170);
  const allowEmail = rateLimit(600);
  const allowPhone = rateLimit(160);
  let pull: gsap.core.Timeline | undefined;
  let flare: gsap.core.Tween | undefined;

  const listen = <K extends keyof HTMLElementEventMap>(
    target: Element | null | undefined,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
  ) => {
    if (!target) return;
    const listener = handler as EventListener;
    target.addEventListener(type, listener);
    stops.push(() => target.removeEventListener(type, listener));
  };

  const restore = () => {
    if (!knot || !line || !glow) return;
    gsap.set(knot, { clearProps: "transform,transformOrigin" });
    gsap.set([line, glow], { clearProps: "strokeWidth,opacity" });
  };

  const tighten = () => {
    if (!knot || !line || !glow || prefersReducedMotion()) return;
    pull?.kill();
    flare?.kill();
    pull = gsap
      .timeline({ onComplete: restore })
      .to(knot, {
        scaleY: 0.74,
        transformOrigin: SQUEEZE_ORIGIN,
        duration: 0.16,
        ease: "power3.out",
      })
      .to(line, { strokeWidth: 5, opacity: 1, duration: 0.16, ease: "power2.out" }, 0)
      .fromTo(
        glow,
        { opacity: 0.55, strokeWidth: 8 },
        { opacity: 0, strokeWidth: 38, duration: 1.1, ease: "power2.out" },
        0,
      )
      .to(knot, { scaleY: 1, duration: 1.3, ease: "elastic.out(1, 0.32)" }, 0.16)
      .to(line, { strokeWidth: 1.5, opacity: 0.55, duration: 1.2, ease: "power2.inOut" }, 0.3);
  };

  const strum = (clientX: number) => {
    pluck(noteForFraction(clientX / Math.max(window.innerWidth, 1)), {
      gain: 0.3,
      pan: panFor(clientX),
    });
    if (!glow || prefersReducedMotion() || pull?.isActive()) return;
    flare?.kill();
    flare = gsap.fromTo(
      glow,
      { opacity: 0.22, strokeWidth: 6 },
      {
        opacity: 0,
        strokeWidth: 20,
        duration: 0.7,
        ease: "power2.out",
        clearProps: "strokeWidth,opacity",
      },
    );
  };

  listen(hit, "click", (event) => {
    playKnotChord(event.clientX);
    buzz(14);
    silkBurst(event.clientX, event.clientY, 1.2);
    discover("knot");
    tighten();
  });
  listen(hit, "pointermove", (event) => {
    if (event.pointerType === "touch" || !isFinePointer() || !allowStrum()) return;
    strum(event.clientX);
  });
  listen(email, "pointerenter", (event) => {
    if (!isFinePointer() || !allowEmail()) return;
    pluck(noteAt(10), { gain: 0.35, pan: panFor(event.clientX) });
  });
  listen(phone, "pointerenter", (event) => {
    if (!isFinePointer() || !allowPhone()) return;
    tick({ gain: 0.4, pan: panFor(event.clientX), pitch: 3000 });
  });

  return () => {
    for (const stop of stops) stop();
    pull?.kill();
    flare?.kill();
    restore();
  };
}
