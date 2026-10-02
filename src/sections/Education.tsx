import { useEffect } from "react";
import { ThreadAnchor } from "../components/ThreadAnchor";
import { profile } from "../content/profile";
import type { Content } from "../content/types";
import { gsap, ScrollTrigger, useScene } from "../lib/motion";
import { curvePoint, PLOT } from "./educationCurve";
import { attachGlobeSpin, SPIN_HEADROOM } from "./educationGlobe";
import { attachPlotSong } from "./educationPlot";
import "./education.css";

const MERIDIANS = [0, 1, 2, 3, 4, 5];
const PARALLELS = [-60, -30, 0, 30, 60];

/** Foreign trade: a turning globe with a route and a ship crossing it. */
function Globe() {
  return (
    <svg className="eg-globe" viewBox="0 0 240 240" aria-hidden="true">
      <circle className="eg-sphere" cx="120" cy="120" r="96" />
      <circle className="eg-wake" cx="120" cy="120" r="96" opacity="0" />
      {PARALLELS.map((offset) => (
        <ellipse
          key={`par${offset}`}
          className="eg-line"
          cx="120"
          cy={120 + offset * 1.15}
          rx={Math.sqrt(96 * 96 - (offset * 1.15) ** 2)}
          ry={8}
        />
      ))}
      {MERIDIANS.map((i) => (
        <ellipse
          key={`mer${i}`}
          className="eg-line eg-meridian"
          cx="120"
          cy="120"
          rx="96"
          ry="96"
        />
      ))}
      <path id="trade-route" className="eg-route" d="M48 150 C 80 60, 170 50, 196 104" />
      <circle className="eg-port" cx="48" cy="150" r="5" />
      <circle className="eg-port" cx="196" cy="104" r="5" />
      <rect className="eg-ship" x="-7" y="-4" width="14" height="8" rx="2" />
    </svg>
  );
}

/** Specialised mathematics: a function plotting itself on a grid. */
function Plot() {
  const curve = Array.from({ length: 61 }, (_, i) => {
    const point = curvePoint(i / 60);
    return `${i === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(" ");
  const start = curvePoint(0);
  return (
    <svg className="eg-plot" viewBox="0 0 240 240" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={`v${i}`}
          className="eg-grid"
          x1={24 + i * 38.4}
          y1="30"
          x2={24 + i * 38.4}
          y2="210"
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`h${i}`}
          className="eg-grid"
          x1="24"
          y1={30 + i * 45}
          x2="216"
          y2={30 + i * 45}
        />
      ))}
      <path className="eg-axis" d="M24 210 V 24 M24 210 H 222" />
      <path className="eg-curve" d={curve} />
      <text className="eg-symbol" x="160" y="58">
        ∫
      </text>
      <text className="eg-symbol" x="190" y="196">
        π
      </text>
      <text className="eg-symbol" x="58" y="64">
        Σ
      </text>
      <line className="eg-guide" x1={start.x} y1={start.y} x2={start.x} y2={PLOT.axis} />
      <circle className="eg-tracer-halo" cx={start.x} cy={start.y} r="11" />
      <circle className="eg-tracer" cx={start.x} cy={start.y} r="4.5" />
    </svg>
  );
}

interface Props {
  text: Content["education"];
  present: string;
}

export function Education({ text, present }: Props) {
  const ref = useScene<HTMLElement>((root) => {
    for (const item of gsap.utils.toArray<HTMLElement>(".edu-item", root)) {
      const timeline = gsap
        .timeline({ scrollTrigger: { trigger: item, start: "top 78%" } })
        .from(item.querySelectorAll(".edu-years .mask > span"), {
          yPercent: 110,
          duration: 1,
          stagger: 0.08,
          ease: "expo.out",
        })
        .from(
          item.querySelectorAll(".edu-text > *"),
          { y: 30, opacity: 0, stagger: 0.1, duration: 0.8 },
          0.2,
        )
        .from(
          item.querySelectorAll(".eg-line, .eg-grid, .eg-axis"),
          { drawSVG: "0%", duration: 1, stagger: 0.03 },
          0.1,
        )
        .from(
          item.querySelectorAll(".eg-symbol, .eg-port"),
          {
            scale: 0,
            opacity: 0,
            transformOrigin: "50% 50%",
            stagger: 0.12,
            duration: 0.6,
            ease: "back.out(2)",
          },
          1,
        );
      // Each item draws only the art it has: the plot's curve or the globe's route.
      const curve = item.querySelector(".eg-curve");
      if (curve) timeline.from(curve, { drawSVG: "0%", duration: 1.6, ease: "power2.inOut" }, 0.5);
      const route = item.querySelector(".eg-route");
      if (route) timeline.from(route, { opacity: 0, duration: 1 }, 0.6);
    }

    // The globe turns: each meridian squeezes and widens out of phase.
    const meridians = gsap.utils
      .toArray<SVGEllipseElement>(".eg-meridian", root)
      .map((meridian, i) =>
        gsap
          .fromTo(
            meridian,
            { attr: { rx: 96 } },
            { attr: { rx: 0 }, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 },
          )
          .totalTime(SPIN_HEADROOM + i),
      );
    const ship = gsap
      .to(".eg-ship", {
        motionPath: {
          path: "#trade-route",
          align: "#trade-route",
          alignOrigin: [0.5, 0.5],
          autoRotate: true,
        },
        duration: 4,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      })
      .totalTime(SPIN_HEADROOM);
    gsap.to(".eg-symbol", {
      y: -8,
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      stagger: 0.4,
    });

    ScrollTrigger.create({
      trigger: ".edu-thread",
      start: "top 80%",
      end: "bottom 40%",
      scrub: true,
      animation: gsap.from(".edu-thread path", { drawSVG: "0%", ease: "none" }),
    });

    const globe = root.querySelector<SVGSVGElement>(".eg-globe");
    return globe ? attachGlobeSpin(globe, { meridians, ship }) : undefined;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const stops = Array.from(root.querySelectorAll<SVGSVGElement>(".eg-plot"), attachPlotSong);
    return () => {
      for (const stop of stops) stop();
    };
  }, [ref]);

  return (
    <section
      ref={ref}
      id="education"
      className="section education"
      data-section-theme="silk"
      aria-labelledby="education-heading"
    >
      <h2 id="education-heading" className="kicker">
        {text.kicker}
      </h2>
      <ol className="edu-list">
        {profile.education.map((fact, index) => {
          const item = text.items[fact.id];
          return (
            <li key={fact.id} className="edu-item">
              <p className="edu-years">
                <span className="mask">
                  <span>{fact.start}</span>
                </span>
                <span className="mask">
                  <span>— {fact.end ?? present}</span>
                </span>
              </p>
              <div className="edu-text">
                <h3 className="edu-school">{item.school}</h3>
                <p className="edu-major">{item.major}</p>
              </div>
              <figure className="edu-art">
                {fact.id === "ftu" ? <Globe /> : <Plot />}
                <ThreadAnchor place="thread-anchor--center" />
              </figure>
              {index === 0 ? (
                <svg className="edu-thread" viewBox="0 0 40 120" aria-hidden="true">
                  <path d="M20 0 C 0 30, 40 60, 20 90 S 20 120, 20 120" />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
