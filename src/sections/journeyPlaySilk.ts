import { gsap } from "../lib/motion";
import { buzz, chime, noteAt, panFor, pluck, pop } from "../lib/sound";
import { matchWithin, type Play, panForElement, SVG_NS, seconds } from "./journeyPlayKit";

const FIRST_NODE_NOTE = 5;
const ARRIVAL_NOTE = 12;
const PARCEL_WIDTH = 16;
const MAX_PARCELS_IN_FLIGHT = 16;

function centreOf(node: Element): number {
  return Number(node.querySelector("circle")?.getAttribute("cx") ?? 0);
}

/** A stage's ring springs back from `from` times its size, like a string let go. */
function springRing(node: Element, from: number, length: number): void {
  const ring = node.querySelector("circle");
  if (!ring) return;
  gsap.fromTo(
    ring,
    { scale: from },
    {
      scale: 1,
      duration: seconds(length),
      ease: "elastic.out(1, 0.35)",
      transformOrigin: "50% 50%",
      overwrite: "auto",
    },
  );
}

function createParcel(from: number): SVGRectElement {
  const parcel = document.createElementNS(SVG_NS, "rect");
  parcel.setAttribute("class", "sm-parcel sm-parcel--sent");
  parcel.setAttribute("aria-hidden", "true");
  parcel.setAttribute("x", String(from - PARCEL_WIDTH / 2));
  parcel.setAttribute("y", "171");
  parcel.setAttribute("width", String(PARCEL_WIDTH));
  parcel.setAttribute("height", "13");
  parcel.setAttribute("rx", "3");
  return parcel;
}

/** Online business: hover a stage to pluck its string; click one to post a parcel down the line. */
export function playSilk(play: Play): void {
  const { scope } = play;
  const nodes = Array.from(scope.querySelectorAll(".sm-node"));
  const svg = scope.querySelector("svg");
  const parcels = new Set<SVGRectElement>();

  play.onHover(".sm-node", (node, event) => {
    pluck(noteAt(FIRST_NODE_NOTE + nodes.indexOf(node)), {
      gain: 0.42,
      pan: panFor(event.clientX),
    });
    play.tween(() => springRing(node, 1.3, 0.7));
  });

  play.listen<MouseEvent>(scope, "click", (event) => {
    const node = matchWithin(event.target, ".sm-node", scope);
    const last = nodes.at(-1);
    if (!node || !last || !svg || parcels.size >= MAX_PARCELS_IN_FLIGHT) return;
    const from = centreOf(node);
    const distance = centreOf(last) - from;
    const parcel = createParcel(from);
    svg.append(parcel);
    parcels.add(parcel);
    pop({ gain: 0.8, pan: panFor(event.clientX) });
    buzz(6);

    const arrive = () => {
      parcels.delete(parcel);
      parcel.remove();
      chime(noteAt(ARRIVAL_NOTE), { gain: 0.8, pan: panForElement(last) });
      play.tween(() => springRing(last, 1.5, 0.8));
    };

    play.tween(() => {
      springRing(node, 0.75, 0.6);
      gsap
        .timeline({ onComplete: arrive })
        .fromTo(
          parcel,
          { scale: 0 },
          { scale: 1, duration: seconds(0.2), ease: "back.out(2.4)", transformOrigin: "50% 50%" },
        )
        .to(parcel, {
          x: distance,
          duration: seconds(0.45 + (Math.abs(distance) / 300) * 0.9),
          ease: "power1.inOut",
        });
    });
  });

  play.onDispose(() => {
    for (const parcel of parcels) parcel.remove();
    parcels.clear();
  });
}
