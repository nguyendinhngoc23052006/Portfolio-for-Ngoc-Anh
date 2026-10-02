import { discover, silkBurst } from "../lib/eggs";
import { gsap, isFinePointer, prefersReducedMotion } from "../lib/motion";
import { arpeggio, chime, noteAt, panFor, pluck, rateLimit, tick, whoosh } from "../lib/sound";

const SVG_NS = "http://www.w3.org/2000/svg";
const FIRST_ARRIVAL_NOTE = 9;
const NOTES_PER_ARRIVAL = 2;
const FINAL_NOTE = 14;
const REDUCED_CHORD = [9, 11, 14];
const RESULT_CHORD = [5, 7, 9, 12];
const RESULT_RADIUS = 28;
const GLOW_REST = "drop-shadow(0 0 18px rgba(224, 83, 58, 0.7))";

function glowAt(strength: number): string {
  return `drop-shadow(0 0 ${Math.round(22 + 32 * strength)}px rgba(255, 176, 110, 1))`;
}

type Spot = readonly [number, number];

function centreX(element: Element): number {
  const box = element.getBoundingClientRect();
  return box.left + box.width / 2;
}

function spotOf(circle: Element | null): Spot {
  return [Number(circle?.getAttribute("cx") ?? 0), Number(circle?.getAttribute("cy") ?? 0)];
}

/**
 * Everything you can do to the supply network: hover a hub to light its routes, press it to
 * dispatch parcels (with sound), click the result to make it ring. Works under reduced motion
 * with the animation left out. Returns a cleanup that removes every listener and tween.
 */
export function attachNetworkPlay(network: HTMLElement): () => void {
  const svg = network.querySelector("svg");
  const result = network.querySelector<SVGCircleElement>(".dn-result");
  if (!svg || !result) return () => {};

  const hubs = Array.from(network.querySelectorAll<SVGGElement>(".dn-hub"));
  const lines = Array.from(svg.querySelectorAll<SVGPathElement>(".dn-route"));
  const discs = hubs.flatMap((hub) => {
    const disc = hub.querySelector("circle:not(.dn-hit)");
    return disc ? [disc] : [];
  });
  const resultSpot = spotOf(result);
  const allowTick = rateLimit(120);
  const stops: Array<() => void> = [];
  const decorations = new Set<Element>();
  let pulse: gsap.core.Timeline | undefined;

  const listen = <K extends keyof SVGElementEventMap>(
    target: SVGElement,
    type: K,
    handler: (event: SVGElementEventMap[K]) => void,
  ) => {
    target.addEventListener(type, handler);
    stops.push(() => target.removeEventListener(type, handler));
  };

  const addDecoration = (tag: string, className: string, [x, y]: Spot, radius: number) => {
    const node = document.createElementNS(SVG_NS, tag);
    node.setAttribute("class", className);
    node.setAttribute("cx", String(x));
    node.setAttribute("cy", String(y));
    node.setAttribute("r", String(radius));
    svg.insertBefore(node, result);
    decorations.add(node);
    return node;
  };

  const removeDecoration = (node: Element) => {
    decorations.delete(node);
    node.remove();
  };

  const spawnRing = (spot: Spot, from: number, to: number, delay = 0) => {
    if (prefersReducedMotion()) return;
    const ring = addDecoration("circle", "dn-ring", spot, from);
    gsap.fromTo(
      ring,
      { opacity: 0.85, attr: { r: from } },
      {
        opacity: 0,
        attr: { r: to },
        duration: 1,
        delay,
        ease: "power2.out",
        immediateRender: false,
        onComplete: () => removeDecoration(ring),
      },
    );
  };

  const pulseResult = (strength: number) => {
    pulse?.kill();
    if (prefersReducedMotion()) return;
    pulse = gsap
      .timeline({
        onComplete: () => {
          gsap.set(result, { clearProps: "filter" });
        },
      })
      .fromTo(
        result,
        { scale: 1 + 0.32 * strength },
        { scale: 1, transformOrigin: "50% 50%", duration: 0.9, ease: "elastic.out(1, 0.4)" },
        0,
      )
      .fromTo(
        result,
        { filter: glowAt(strength) },
        { filter: GLOW_REST, duration: 0.5 + 0.7 * strength, ease: "power2.out" },
        0,
      );
  };

  const squeeze = (disc: Element | null) => {
    if (!disc || prefersReducedMotion()) return;
    gsap.fromTo(
      disc,
      { scale: 0.7 },
      {
        scale: 1,
        transformOrigin: "50% 50%",
        duration: 0.9,
        ease: "elastic.out(1, 0.35)",
        overwrite: true,
      },
    );
  };

  const sendParcel = (routeIndex: string, from: Spot, order: number, onArrive: () => void) => {
    const parcel = addDecoration("circle", "dn-parcel", from, 7);
    gsap.to(parcel, {
      motionPath: {
        path: `#route-${routeIndex}`,
        align: `#route-${routeIndex}`,
        alignOrigin: [0.5, 0.5],
      },
      duration: 1.3,
      delay: order * 0.12,
      ease: "power2.in",
      onComplete: () => {
        removeDecoration(parcel);
        onArrive();
      },
    });
  };

  const dispatch = (hub: SVGGElement) => {
    discover("dispatch");
    const routes = hub.dataset.routes?.split(" ") ?? [];
    const pan = panFor(centreX(hub));
    if (prefersReducedMotion()) {
      for (const note of REDUCED_CHORD) chime(noteAt(note), { gain: 0.5, pan });
      return;
    }
    whoosh({ duration: 0.5, gain: 0.8, pan });
    const origin = spotOf(hub.querySelector(".dn-hit"));
    squeeze(hub.querySelector("circle:not(.dn-hit)"));
    spawnRing(origin, 17, 58);
    let arrivals = 0;
    for (const [order, routeIndex] of routes.entries()) {
      sendParcel(routeIndex, origin, order, () => {
        const resultPan = panFor(centreX(result));
        chime(noteAt(FIRST_ARRIVAL_NOTE + NOTES_PER_ARRIVAL * arrivals), {
          gain: 0.6,
          pan: resultPan,
        });
        arrivals += 1;
        if (arrivals === routes.length) {
          pluck(noteAt(FINAL_NOTE), { gain: 0.8, pan: resultPan, delay: 0.08 });
        }
        pulseResult(0.5);
        spawnRing(resultSpot, RESULT_RADIUS, 56);
      });
    }
  };

  const lightRoutes = (hub: SVGGElement, isLit: boolean) => {
    for (const index of hub.dataset.routes?.split(" ") ?? []) {
      svg.querySelector(`#route-${index}`)?.classList.toggle("is-lit", isLit);
    }
  };

  hubs.forEach((hub, index) => {
    listen(hub, "pointerdown", () => dispatch(hub));
    listen(hub, "pointerenter", () => {
      if (!isFinePointer()) return;
      lightRoutes(hub, true);
      if (allowTick()) tick({ gain: 0.35, pan: panFor(centreX(hub)), pitch: 2300 + index * 450 });
    });
    listen(hub, "pointerleave", () => lightRoutes(hub, false));
  });

  listen(result, "click", (event) => {
    arpeggio(
      RESULT_CHORD.map((note) => noteAt(note)),
      { voice: "pluck", gain: 0.9, pan: panFor(event.clientX) },
    );
    pulseResult(1);
    for (const ring of [0, 1, 2]) spawnRing(resultSpot, RESULT_RADIUS, 100, ring * 0.14);
    if (!prefersReducedMotion()) silkBurst(event.clientX, event.clientY, 0.7);
  });

  return () => {
    for (const stop of stops) stop();
    for (const node of decorations) {
      gsap.killTweensOf(node);
      node.remove();
    }
    decorations.clear();
    for (const disc of discs) gsap.killTweensOf(disc);
    pulse?.kill();
    gsap.set(result, { clearProps: "filter" });
    for (const line of lines) line.classList.remove("is-lit");
  };
}
