import type { JourneyId } from "../content/profile";
import { gsap, seededRandom } from "../lib/motion";

const random = seededRandom(7);
const SNOW = Array.from({ length: 26 }, (_, i) => ({
  id: `snow-${i}`,
  x: 12 + random() * 336,
  r: 1.2 + random() * 2.4,
  delay: random() * 4,
  duration: 3.5 + random() * 3,
}));
const GRID_X = Array.from({ length: 9 }, (_, i) => 20 + i * 40);
const GRID_Y = Array.from({ length: 6 }, (_, i) => 20 + i * 44);
const SWATCHES = ["#e8b04f", "#e0533a", "#121741", "#3f7d6b"];
const VMO_BARS = [
  { x: 96, width: 120 },
  { x: 150, width: 90 },
  { x: 200, width: 110 },
  { x: 250, width: 84 },
];

/** Brand identity: a construction grid, overlapping circles, and the mark they define. */
function DesignMotif() {
  return (
    <svg viewBox="0 0 360 300" aria-hidden="true">
      {GRID_X.map((x) => (
        <line key={`gx${x}`} className="dm-grid" x1={x} y1="10" x2={x} y2="240" />
      ))}
      {GRID_Y.map((y) => (
        <line key={`gy${y}`} className="dm-grid" x1="10" y1={y} x2="350" y2={y} />
      ))}
      <circle className="dm-circle" cx="150" cy="130" r="80" />
      <circle className="dm-circle" cx="210" cy="130" r="80" />
      <circle className="dm-circle dm-circle--inner" cx="180" cy="130" r="49" />
      <path className="dm-mark" d="M180 55.84 A80 80 0 0 1 180 204.16 A80 80 0 0 1 180 55.84 Z" />
      {SWATCHES.map((color, i) => (
        <rect
          key={color}
          className="dm-swatch"
          x={96 + i * 44}
          y="256"
          width="36"
          height="36"
          rx="8"
          fill={color}
        />
      ))}
    </svg>
  );
}

/** Online business: an order travelling through every stage, under a skein of silk. */
function SilkMotif({ stages }: { stages: string[] }) {
  const step = 300 / Math.max(stages.length - 1, 1);
  return (
    <svg viewBox="0 0 360 300" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={`silk${i}`}
          className="sm-silk"
          d={`M10 ${62 + i * 9} C 90 ${22 + i * 9}, 150 ${112 + i * 9}, 230 ${58 + i * 9} S 330 ${48 + i * 9}, 350 ${70 + i * 9}`}
        />
      ))}
      <line className="sm-line" x1="30" y1="190" x2="330" y2="190" />
      {stages.map((stage, i) => (
        <g key={stage} className="sm-node" style={{ transformOrigin: `${30 + i * step}px 190px` }}>
          <circle cx={30 + i * step} cy="190" r="13" />
          <text x={30 + i * step} y="232" textAnchor="middle">
            {stage}
          </text>
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <rect
          key={`parcel${i}`}
          className="sm-parcel"
          x="22"
          y="171"
          width="16"
          height="13"
          rx="3"
        />
      ))}
    </svg>
  );
}

/** Đông Ấm: snow falling while a warm signal spreads outward. */
function DongAmMotif() {
  return (
    <svg viewBox="0 0 360 300" aria-hidden="true">
      <defs>
        <radialGradient id="da-warm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd38a" />
          <stop offset="55%" stopColor="#e8b04f" />
          <stop offset="100%" stopColor="#e0533a" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <circle key={`ripple${i}`} className="da-ripple" cx="180" cy="150" r="36" />
      ))}
      <circle className="da-core" cx="180" cy="150" r="36" fill="url(#da-warm)" />
      {SNOW.map((flake) => (
        <circle
          key={flake.id}
          className="da-snow"
          cx={flake.x}
          cy="-10"
          r={flake.r}
          data-delay={flake.delay}
          data-duration={flake.duration}
        />
      ))}
      <path
        className="da-knit"
        d="M20 270 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12 l14 -12 l14 12"
      />
    </svg>
  );
}

/** VMO Group: a Gantt chart that fills in while the status line sweeps across. */
function VmoMotif({ tracks }: { tracks: string[] }) {
  return (
    <svg viewBox="0 0 360 300" aria-hidden="true">
      {[96, 146, 196, 246, 296].map((x) => (
        <line key={`col${x}`} className="vm-col" x1={x} y1="30" x2={x} y2="250" />
      ))}
      {tracks.map((track, i) => {
        const bar = VMO_BARS[i % VMO_BARS.length] ?? { x: 96, width: 100 };
        const y = 50 + i * 52;
        return (
          <g key={track}>
            <text className="vm-label" x="0" y={y + 15}>
              {track}
            </text>
            <rect className="vm-track" x="96" y={y} width="250" height="22" rx="11" />
            <rect
              className={`vm-bar vm-bar--${i}`}
              x={bar.x}
              y={y}
              width={bar.width}
              height="22"
              rx="11"
            />
          </g>
        );
      })}
      <path className="vm-milestone" d="M318 268 l10 -10 l10 10 l-10 10 Z" />
      <line className="vm-today" x1="96" y1="22" x2="96" y2="258" />
    </svg>
  );
}

export function JourneyMotif({
  id,
  silkStages,
  vmoTracks,
}: {
  id: JourneyId;
  silkStages: string[];
  vmoTracks: string[];
}) {
  switch (id) {
    case "design":
      return <DesignMotif />;
    case "silk":
      return <SilkMotif stages={silkStages} />;
    case "dongAm":
      return <DongAmMotif />;
    case "vmo":
      return <VmoMotif tracks={vmoTracks} />;
  }
}

/**
 * Entrance timeline (paused) for one motif. Its ambient loops are created here,
 * paused, so they belong to the caller's gsap context and are reverted with it;
 * the entrance starts them.
 */
export function animateMotif(id: JourneyId, scope: Element): gsap.core.Timeline {
  const q = gsap.utils.selector(scope);
  const tl = gsap.timeline({ paused: true });
  const loops: gsap.core.Tween[] = [];
  const startLoops = () => {
    for (const loop of loops) loop.play();
  };
  switch (id) {
    case "design":
      tl.from(q(".dm-grid"), { drawSVG: "0%", duration: 0.8, stagger: 0.03, ease: "power2.out" })
        .from(
          q(".dm-circle"),
          { drawSVG: "0%", duration: 1.1, stagger: 0.15, ease: "power2.inOut" },
          0.3,
        )
        .from(
          q(".dm-mark"),
          { scale: 0, transformOrigin: "50% 50%", duration: 0.9, ease: "back.out(1.8)" },
          1.1,
        )
        .from(
          q(".dm-swatch"),
          { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: "back.out(2)" },
          1.3,
        );
      break;
    case "silk":
      loops.push(
        gsap.to(q(".sm-parcel"), {
          x: 300,
          duration: 4.2,
          ease: "none",
          paused: true,
          stagger: { each: 1.4, repeat: -1 },
        }),
        gsap.to(q(".sm-silk"), {
          y: "+=6",
          duration: 2.4,
          ease: "sine.inOut",
          paused: true,
          stagger: { each: 0.2, repeat: -1, yoyo: true },
        }),
      );
      tl.from(q(".sm-silk"), { drawSVG: "0%", duration: 1.2, stagger: 0.08, ease: "power2.inOut" })
        .from(q(".sm-line"), { drawSVG: "0%", duration: 0.9, ease: "power2.inOut" }, 0.2)
        .from(
          q(".sm-node"),
          { scale: 0, opacity: 0, duration: 0.5, stagger: 0.12, ease: "back.out(2.2)" },
          0.5,
        )
        .add(startLoops, 1.2);
      break;
    case "dongAm":
      loops.push(
        gsap.fromTo(
          q(".da-ripple"),
          { attr: { r: 36 }, opacity: 0.8 },
          {
            attr: { r: 150 },
            opacity: 0,
            duration: 3.2,
            ease: "power1.out",
            paused: true,
            stagger: { each: 0.8, repeat: -1 },
          },
        ),
        ...q(".da-snow").map((flake) =>
          gsap.to(flake, {
            attr: { cy: 312 },
            x: "random(-18, 18)",
            duration: Number(flake.getAttribute("data-duration")),
            delay: Number(flake.getAttribute("data-delay")),
            ease: "none",
            repeat: -1,
            paused: true,
          }),
        ),
      );
      tl.from(q(".da-core"), {
        scale: 0,
        transformOrigin: "50% 50%",
        duration: 1,
        ease: "elastic.out(1, 0.5)",
      })
        .from(q(".da-knit"), { drawSVG: "0%", duration: 1.4, ease: "power1.inOut" }, 0.2)
        .add(startLoops, 0.4);
      break;
    case "vmo":
      loops.push(
        gsap.fromTo(
          q(".vm-today"),
          { x: 0 },
          { x: 250, duration: 5, ease: "none", repeat: -1, paused: true },
        ),
      );
      tl.from(q(".vm-col"), { drawSVG: "0%", duration: 0.6, stagger: 0.05 })
        .from(q(".vm-label"), { x: -16, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.1)
        .from(
          q(".vm-bar"),
          { scaleX: 0, transformOrigin: "0% 50%", duration: 0.9, stagger: 0.14, ease: "expo.out" },
          0.3,
        )
        .from(
          q(".vm-milestone"),
          { scale: 0, rotate: 90, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(2)" },
          1,
        )
        .add(startLoops, 1);
      break;
  }
  return tl;
}
