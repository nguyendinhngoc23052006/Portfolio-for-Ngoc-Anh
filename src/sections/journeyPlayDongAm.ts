import { gsap } from "../lib/motion";
import { buzz, noteAt, panFor, pluck } from "../lib/sound";
import { type Play, SVG_NS, seconds, swell } from "./journeyPlayKit";

const CHORD = [5, 7, 9];
const CHORD_STEP = 0.08;
const SCATTER_RADIUS = 150;

/** Đông Ấm: a click sends warmth outward, and the snow near the core is blown aside and drifts home. */
export function playDongAm(play: Play): void {
  const svg = play.scope.querySelector("svg");
  const core = svg?.querySelector(".da-core");
  const heart = svg?.querySelector(".da-heart");
  const glow = svg?.querySelector(".da-glow");
  if (!svg || !core || !heart) return;
  const centre = { x: Number(core.getAttribute("cx")), y: Number(core.getAttribute("cy")) };
  const flakes = Array.from(svg.querySelectorAll(".da-snow"));
  const home = new Map(flakes.map((flake) => [flake, Number(flake.getAttribute("cx"))]));
  const scatters = new Map<Element, gsap.core.Timeline>();
  const rings = new Set<SVGCircleElement>();

  const scatter = (flake: Element) => {
    const base = home.get(flake) ?? 0;
    const dx = base + Number(gsap.getProperty(flake, "x")) - centre.x;
    const dy = Number(flake.getAttribute("cy")) - centre.y;
    const distance = Math.hypot(dx, dy);
    if (distance > SCATTER_RADIUS) return;
    const angle = distance < 1 ? -Math.PI / 2 : Math.atan2(dy, dx);
    const push = 30 + (1 - distance / SCATTER_RADIUS) * 90;
    scatters.get(flake)?.kill();
    scatters.set(
      flake,
      gsap
        .timeline({ onComplete: () => scatters.delete(flake) })
        .to(flake, {
          attr: { cx: base + Math.cos(angle) * push },
          y: Math.sin(angle) * push,
          duration: seconds(0.35),
          ease: "power3.out",
        })
        .to(flake, {
          attr: { cx: base },
          y: 0,
          duration: seconds(gsap.utils.random(1.4, 2.2)),
          ease: "power2.inOut",
        }),
    );
  };

  const sendRing = () => {
    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "da-ripple da-ripple--click");
    ring.setAttribute("aria-hidden", "true");
    ring.setAttribute("cx", String(centre.x));
    ring.setAttribute("cy", String(centre.y));
    ring.setAttribute("r", "36");
    heart.before(ring);
    rings.add(ring);
    gsap.fromTo(
      ring,
      { attr: { r: 36 }, opacity: 0.9 },
      {
        attr: { r: 170 },
        opacity: 0,
        duration: seconds(1.2),
        ease: "power2.out",
        onComplete: () => {
          rings.delete(ring);
          ring.remove();
        },
      },
    );
  };

  play.onHover(".da-core", (_, event) => {
    pluck(noteAt(CHORD[0] ?? 5), { gain: 0.3, pan: panFor(event.clientX) });
    play.tween(() => swell(heart, { to: 1.07, out: 0.15, back: 0.6 }));
  });

  play.listen<MouseEvent>(svg, "click", (event) => {
    const pan = panFor(event.clientX);
    CHORD.forEach((degree, i) => {
      pluck(noteAt(degree), {
        gain: 0.85,
        pan,
        delay: i * CHORD_STEP,
        bend: i === CHORD.length - 1 ? 0.3 : 0,
      });
    });
    buzz(10);
    play.tween(() => {
      swell(heart, { to: 1.3, out: 0.16, back: 0.9 });
      if (glow) {
        gsap.fromTo(
          glow,
          { opacity: 0.75, scale: 1 },
          {
            opacity: 0,
            scale: 2.4,
            duration: seconds(1.1),
            ease: "power2.out",
            transformOrigin: "50% 50%",
            overwrite: "auto",
          },
        );
      }
      sendRing();
      for (const flake of flakes) scatter(flake);
    });
  });

  play.onDispose(() => {
    for (const ring of rings) ring.remove();
    rings.clear();
    for (const flake of flakes) flake.setAttribute("cx", String(home.get(flake) ?? 0));
  });
}
