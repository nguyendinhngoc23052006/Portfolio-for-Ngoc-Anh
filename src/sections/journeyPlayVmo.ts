import { silkBurst } from "../lib/eggs";
import { gsap, prefersReducedMotion } from "../lib/motion";
import { arpeggio, buzz, noteAt, panFor, pluck, thud, tick } from "../lib/sound";
import { matchWithin, type Play, panForElement, SVG_NS, seconds, swell } from "./journeyPlayKit";

const TRACK_X = 96;
const TRACK_WIDTH = 250;
const FIRST_NOTE = 7;
const FINALE_NOTES = [10, 12, 13, 14];
const RESET_AFTER_MS = 6000;

function createCheck(bar: Element): SVGPathElement {
  const check = document.createElementNS(SVG_NS, "path");
  const y = Number(bar.getAttribute("y")) + 11;
  check.setAttribute("class", "vm-check");
  check.setAttribute("aria-hidden", "true");
  check.setAttribute("d", "M-4.5 0.5 L-1.5 3.5 L4.5 -3.5");
  check.setAttribute("transform", `translate(${TRACK_X + TRACK_WIDTH - 15} ${y})`);
  return check;
}

/** VMO Group: click a bar to finish it; finish them all and the milestone is reached. */
export function playVmo(play: Play): void {
  const { scope } = play;
  const rows = Array.from(scope.querySelectorAll(".vm-row"));
  const bars = Array.from(scope.querySelectorAll<SVGRectElement>(".vm-bar"));
  const milestone = scope.querySelector(".vm-milestone");
  const originals = new Map(
    bars.map((bar) => [
      bar,
      { x: Number(bar.getAttribute("x")), width: Number(bar.getAttribute("width")) },
    ]),
  );
  const done = new Set<SVGRectElement>();
  const checks = new Set<SVGPathElement>();
  let resetTimer: number | undefined;

  const reset = () => {
    done.clear();
    play.tween(() => {
      for (const bar of bars) {
        bar.classList.remove("is-done");
        const original = originals.get(bar);
        if (original) {
          gsap.to(bar, {
            attr: original,
            duration: seconds(0.8),
            ease: "power3.inOut",
            overwrite: "auto",
          });
        }
      }
      for (const check of [...checks]) {
        gsap.to(check, {
          opacity: 0,
          duration: seconds(0.3),
          onComplete: () => {
            checks.delete(check);
            check.remove();
          },
        });
      }
    });
  };

  const celebrate = (pan: number) => {
    if (!milestone) return;
    arpeggio(FINALE_NOTES.map(noteAt), { step: 0.1, voice: "chime", gain: 0.8, pan });
    buzz([12, 30, 12, 30, 24]);
    const resting = getComputedStyle(milestone).fill;
    play.tween(() => {
      gsap.fromTo(
        milestone,
        { rotation: 0 },
        {
          rotation: 360,
          duration: seconds(1),
          ease: "power3.inOut",
          transformOrigin: "50% 50%",
          overwrite: "auto",
          onComplete: () => {
            gsap.set(milestone, { rotation: 0 });
          },
        },
      );
      swell(milestone, { to: 1.7, out: 0.3, back: 0.9 });
      gsap.fromTo(
        milestone,
        { fill: "#fff1c9" },
        { fill: resting, duration: seconds(1.6), ease: "power1.out", clearProps: "fill" },
      );
    });
    if (!prefersReducedMotion()) {
      const box = milestone.getBoundingClientRect();
      silkBurst(box.left + box.width / 2, box.top + box.height / 2, 1.3);
    }
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(reset, RESET_AFTER_MS);
  };

  play.onHover(".vm-row", (row, event) => {
    tick({ gain: 0.28, pitch: 1700 + rows.indexOf(row) * 300, pan: panFor(event.clientX) });
  });

  play.listen<MouseEvent>(scope, "click", (event) => {
    const row = matchWithin(event.target, ".vm-row", scope);
    const bar = row?.querySelector<SVGRectElement>(".vm-bar");
    if (!row || !bar) return;
    const pan = panFor(event.clientX);
    if (done.has(bar)) {
      thud({ gain: 0.35, pan });
      return;
    }
    pluck(noteAt(FIRST_NOTE + done.size), { gain: 0.9, pan });
    buzz(6);
    done.add(bar);
    bar.classList.add("is-done");
    const check = createCheck(bar);
    row.append(check);
    checks.add(check);
    play.tween(() => {
      gsap.to(bar, {
        attr: { x: TRACK_X, width: TRACK_WIDTH },
        duration: seconds(0.7),
        ease: "back.out(1.3)",
        overwrite: "auto",
      });
      gsap.from(check, {
        drawSVG: "0%",
        duration: seconds(0.4),
        delay: seconds(0.35),
        ease: "power2.out",
      });
    });
    if (done.size === bars.length) celebrate(milestone ? panForElement(milestone) : pan);
  });

  play.onDispose(() => {
    window.clearTimeout(resetTimer);
    for (const check of checks) check.remove();
    checks.clear();
    for (const bar of bars) bar.classList.remove("is-done");
  });
}
