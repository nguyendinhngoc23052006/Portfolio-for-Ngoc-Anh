import type { CSSProperties } from "react";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { discover } from "../lib/eggs";
import { gsap, ScrollTrigger, seededRandom, useScene } from "../lib/motion";
import "./principles.css";

const random = seededRandom(11);
const CELLS = Array.from({ length: 16 }, (_, i) => ({
  id: `cell-${i}`,
  x: 40 + (i % 4) * 52,
  y: 40 + Math.floor(i / 4) * 52,
  scatterX: (random() - 0.5) * 220,
  scatterY: (random() - 0.5) * 220,
  spin: (random() - 0.5) * 180,
}));
const RING = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return { id: `node-${i}`, x: 140 + Math.cos(angle) * 96, y: 140 + Math.sin(angle) * 96 };
});
const LINKS = RING.flatMap((a, i) =>
  RING.slice(i + 1).map((b) => ({ id: `${a.id}-${b.id}`, a, b })),
);
const BARS = [58, 92, 74, 128, 112, 160];

function Glyph({ index }: { index: number }) {
  switch (index % 4) {
    case 0:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          {CELLS.map((cell) => (
            <rect
              key={cell.id}
              className="pg-cell"
              x={cell.x}
              y={cell.y}
              width="44"
              height="44"
              rx="6"
              data-x={cell.scatterX}
              data-y={cell.scatterY}
              data-spin={cell.spin}
            />
          ))}
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          {LINKS.map(({ id, a, b }) => (
            <line key={id} className="pg-link" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          {RING.map((node) => (
            <circle key={node.id} className="pg-node" cx={node.x} cy={node.y} r="12" />
          ))}
          <circle className="pg-core" cx="140" cy="140" r="22" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          <line className="pg-axis" x1="30" y1="240" x2="260" y2="240" />
          {BARS.map((height, i) => (
            <rect
              key={`bar-${height}`}
              className="pg-bar"
              x={40 + i * 36}
              y={240 - height}
              width="24"
              height={height}
              rx="4"
            />
          ))}
          <path className="pg-trend" d="M52 176 L88 140 L124 160 L160 104 L196 120 L232 66" />
          <g className="pg-lens">
            <circle cx="0" cy="0" r="26" />
            <line x1="18" y1="18" x2="36" y2="36" />
          </g>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          <path
            className="pg-blob"
            d="M60 190 C 40 120, 110 60, 170 80 S 260 170, 200 210 S 80 250, 60 190 Z"
          />
          <line className="pg-handle" x1="40" y1="200" x2="90" y2="70" />
          <line className="pg-handle" x1="150" y1="210" x2="250" y2="120" />
          <path className="pg-curve" d="M40 200 C 90 70, 250 120, 150 210" />
          {[
            [40, 200],
            [150, 210],
          ].map(([x, y]) => (
            <rect
              key={`anchor-${x}`}
              className="pg-anchor"
              x={(x ?? 0) - 6}
              y={(y ?? 0) - 6}
              width="12"
              height="12"
            />
          ))}
          {[
            [90, 70],
            [250, 120],
          ].map(([x, y]) => (
            <circle key={`grip-${x}`} className="pg-grip" cx={x} cy={y} r="5" />
          ))}
        </svg>
      );
  }
}

function playGlyph(index: number, glyph: Element): gsap.core.Timeline {
  const q = gsap.utils.selector(glyph);
  const tl = gsap.timeline({ paused: true });
  switch (index % 4) {
    case 0:
      tl.from(q(".pg-cell"), {
        x: (_: number, el: Element) => Number(el.getAttribute("data-x")),
        y: (_: number, el: Element) => Number(el.getAttribute("data-y")),
        rotate: (_: number, el: Element) => Number(el.getAttribute("data-spin")),
        opacity: 0,
        transformOrigin: "50% 50%",
        duration: 1.2,
        stagger: { each: 0.04, from: "random" },
        ease: "expo.out",
      });
      break;
    case 1:
      tl.from(q(".pg-node"), {
        scale: 0,
        transformOrigin: "50% 50%",
        duration: 0.5,
        stagger: 0.08,
        ease: "back.out(2)",
      })
        .from(
          q(".pg-link"),
          { drawSVG: "0%", duration: 0.8, stagger: 0.04, ease: "power2.out" },
          0.3,
        )
        .from(
          q(".pg-core"),
          { scale: 0, transformOrigin: "50% 50%", duration: 0.7, ease: "elastic.out(1, 0.5)" },
          0.9,
        );
      break;
    case 2:
      tl.from(q(".pg-bar"), {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.8,
        stagger: 0.08,
        ease: "expo.out",
      })
        .from(q(".pg-trend"), { drawSVG: "0%", duration: 1, ease: "power2.inOut" }, 0.4)
        .fromTo(
          q(".pg-lens"),
          { x: 40, y: 200 },
          { x: 232, y: 66, duration: 1.4, ease: "power2.inOut" },
          0.4,
        );
      break;
    default:
      tl.from(q(".pg-curve"), { drawSVG: "0%", duration: 1.2, ease: "power2.inOut" })
        .from(
          q(".pg-anchor, .pg-grip"),
          { scale: 0, transformOrigin: "50% 50%", duration: 0.4, stagger: 0.1 },
          0,
        )
        .from(q(".pg-handle"), { drawSVG: "50% 50%", duration: 0.6 }, 0.2)
        .from(
          q(".pg-blob"),
          {
            scale: 0.4,
            opacity: 0,
            transformOrigin: "50% 50%",
            duration: 1.2,
            ease: "elastic.out(1, 0.6)",
          },
          0.8,
        );
  }
  return tl;
}

interface Props {
  text: Content["principles"];
  replayLabel: string;
}

export function Principles({ text, replayLabel }: Props) {
  const ref = useScene<HTMLElement>((root) => {
    gsap.from(".principles-head > *", {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: root, start: "top 75%" },
    });
    const cards = gsap.utils.toArray<HTMLElement>(".principle", root);
    const cleanups: (() => void)[] = [];
    cards.forEach((card, index) => {
      const glyph = card.querySelector(".principle-glyph");
      if (glyph) {
        const entrance = playGlyph(index, glyph);
        ScrollTrigger.create({ trigger: card, start: "top 70%", onEnter: () => entrance.play() });
        // Easter egg: pressing the glyph shakes it apart and lets it rebuild itself.
        const replay = () => entrance.restart();
        glyph.addEventListener("click", replay);
        cleanups.push(() => glyph.removeEventListener("click", replay));
      }
      const next = cards[index + 1];
      if (!next) return;
      // The card underneath recedes as the next one slides over it.
      // fromTo: GSAP cannot interpolate from `filter: none` and passes through black.
      gsap.fromTo(
        card,
        { scale: 1, filter: "brightness(1)" },
        {
          scale: 0.94,
          filter: "brightness(0.8)",
          ease: "none",
          scrollTrigger: { trigger: next, start: "top 55%", end: "top 15%", scrub: true },
        },
      );
    });
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  return (
    <section
      ref={ref}
      id="principles"
      className="section principles"
      data-section-theme="silk"
      aria-labelledby="principles-heading"
    >
      <header className="principles-head">
        <p className="kicker">{text.kicker}</p>
        <h2 id="principles-heading" className="heading">
          {text.heading}
        </h2>
      </header>
      <ol className="principle-stack">
        {text.items.map((item, index) => (
          <li
            key={item.title}
            className={`principle principle--${index % 4}`}
            style={{ "--i": index } as CSSProperties}
          >
            <ThreadAnchor place="thread-anchor--edge" />
            <div className="principle-copy">
              <span className="principle-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="principle-title">{item.title}</h3>
              <p className="principle-body">{item.body}</p>
            </div>
            <button
              type="button"
              className="principle-glyph"
              aria-label={`${replayLabel}: ${item.title}`}
              onClick={() => discover("replay")}
            >
              <Glyph index={index} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
