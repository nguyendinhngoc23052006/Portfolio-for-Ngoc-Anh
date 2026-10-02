import { useEffect } from "react";
import { Rich, Words } from "../components/Text";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { gsap, ScrollTrigger, useScene } from "../lib/motion";
import { attachNetworkPlay } from "./directionPlay";
import "./direction.css";

type Point = readonly [number, number];

const HUBS = { people: [70, 90], process: [70, 220], coordination: [70, 350] } as const;
const RESULT: Point = [462, 220];
const MID_A: Point[] = [
  [210, 60],
  [220, 175],
  [205, 290],
  [225, 395],
];
const MID_B: Point[] = [
  [345, 120],
  [350, 240],
  [340, 345],
];

function pick(points: Point[], index: number): Point {
  return points[index] ?? RESULT;
}

/** Every route runs hub → first relay → second relay → result. */
const ROUTES: Point[][] = [
  [HUBS.people, pick(MID_A, 0), pick(MID_B, 0), RESULT],
  [HUBS.people, pick(MID_A, 1), pick(MID_B, 1), RESULT],
  [HUBS.process, pick(MID_A, 1), pick(MID_B, 0), RESULT],
  [HUBS.process, pick(MID_A, 2), pick(MID_B, 1), RESULT],
  [HUBS.coordination, pick(MID_A, 2), pick(MID_B, 2), RESULT],
  [HUBS.coordination, pick(MID_A, 3), pick(MID_B, 2), RESULT],
];

function toPath(route: Point[]): string {
  return route
    .map(([x, y], i) => {
      const previous = route[i - 1];
      if (!previous) return `M${x} ${y}`;
      const mid = (previous[0] + x) / 2;
      return `C${mid} ${previous[1]} ${mid} ${y} ${x} ${y}`;
    })
    .join(" ");
}

const PACKETS = Array.from({ length: 9 }, (_, i) => {
  const route = i % ROUTES.length;
  const [x, y] = ROUTES[route]?.[0] ?? RESULT;
  return { id: `packet-${i}`, route, x, y };
});

function routesFrom(hub: Point): number[] {
  return ROUTES.flatMap((route, index) => (route[0] === hub ? [index] : []));
}

function Network({ labels }: { labels: Content["direction"]["network"] }) {
  const hubs = [
    { key: "people", point: HUBS.people, label: labels.people },
    { key: "process", point: HUBS.process, label: labels.process },
    { key: "coordination", point: HUBS.coordination, label: labels.coordination },
  ];
  return (
    <svg viewBox="0 0 520 440" aria-hidden="true">
      {ROUTES.map((route, i) => (
        <path
          key={`route-${toPath(route)}`}
          id={`route-${i}`}
          className="dn-route"
          d={toPath(route)}
        />
      ))}
      {[...MID_A, ...MID_B].map(([x, y]) => (
        <circle key={`relay-${x}-${y}`} className="dn-relay" cx={x} cy={y} r="6" />
      ))}
      {PACKETS.map((packet) => (
        <circle
          key={packet.id}
          className="dn-packet"
          cx={packet.x}
          cy={packet.y}
          r="4.5"
          data-route={packet.route}
        />
      ))}
      {[0, 1, 2].map((ring) => (
        <circle key={`pulse-${ring}`} className="dn-pulse" cx={RESULT[0]} cy={RESULT[1]} r="28" />
      ))}
      <circle className="dn-result" cx={RESULT[0]} cy={RESULT[1]} r="28" />
      <text className="dn-label dn-label--result" x={RESULT[0]} y={RESULT[1] + 54}>
        {labels.result}
      </text>
      {hubs.map(({ key, point, label }) => (
        <g key={key} className="dn-hub" data-routes={routesFrom(point).join(" ")}>
          <circle className="dn-hit" cx={point[0]} cy={point[1]} r="34" />
          <circle cx={point[0]} cy={point[1]} r="17" />
          <text className="dn-label" x={point[0]} y={point[1] - 28}>
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Direction({ text }: { text: Content["direction"] }) {
  const ref = useScene<HTMLElement>((root) => {
    gsap.from(".direction-intro > *", {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: root, start: "top 70%" },
    });
    gsap.fromTo(
      ".direction-focus",
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        ease: "none",
        scrollTrigger: {
          trigger: ".direction-focus",
          start: "top 85%",
          end: "top 45%",
          scrub: true,
        },
      },
    );
    for (const paragraph of gsap.utils.toArray<HTMLElement>(".direction-paragraph", root)) {
      gsap.fromTo(
        paragraph.querySelectorAll(".w"),
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: paragraph, start: "top 88%", end: "bottom 60%", scrub: true },
        },
      );
    }

    const network = root.querySelector(".direction-network");
    if (!network) return;
    const flows = gsap.utils.toArray<SVGCircleElement>(".dn-packet", root).map((packet, i) =>
      gsap.to(packet, {
        motionPath: {
          path: `#route-${packet.dataset.route}`,
          align: `#route-${packet.dataset.route}`,
          alignOrigin: [0.5, 0.5],
        },
        duration: 3.4,
        delay: i * 0.45,
        ease: "none",
        repeat: -1,
        paused: true,
      }),
    );
    const pulse = gsap.fromTo(
      ".dn-pulse",
      { attr: { r: 28 }, opacity: 0.7 },
      {
        attr: { r: 70 },
        opacity: 0,
        duration: 2.4,
        paused: true,
        stagger: { each: 0.8, repeat: -1 },
      },
    );
    gsap
      .timeline({
        scrollTrigger: { trigger: network, start: "top 80%", end: "center 50%", scrub: 0.8 },
      })
      .from(".dn-hub", { scale: 0, transformOrigin: "50% 50%", stagger: 0.1, duration: 0.2 }, 0)
      .from(".dn-route", { drawSVG: "0%", stagger: 0.05, duration: 0.6 }, 0.1)
      .from(
        ".dn-relay",
        { scale: 0, transformOrigin: "50% 50%", stagger: 0.04, duration: 0.2 },
        0.3,
      )
      .from(
        ".dn-result, .dn-label--result",
        { scale: 0, transformOrigin: "50% 50%", duration: 0.3 },
        0.7,
      );
    ScrollTrigger.create({
      trigger: network,
      start: "center 60%",
      once: true,
      onEnter: () => {
        for (const flow of flows) flow.play();
        pulse.play();
      },
    });
  });

  // Works with or without motion: reduced motion keeps the sound and drops the animation.
  useEffect(() => {
    const network = ref.current?.querySelector<HTMLElement>(".direction-network");
    return network ? attachNetworkPlay(network) : undefined;
  }, [ref]);

  return (
    <section
      ref={ref}
      id="direction"
      className="section direction"
      data-section-theme="indigo"
      aria-labelledby="direction-heading"
    >
      <div className="direction-grid">
        <div className="direction-text">
          <div className="direction-intro">
            <p className="kicker">{text.kicker}</p>
            <h2 id="direction-heading" className="heading">
              {text.heading}
            </h2>
          </div>
          <p className="direction-focus">
            <Rich text={text.focus} />
          </p>
          <div className="direction-paragraphs">
            {text.paragraphs.map((paragraph) => (
              <p key={paragraph} className="direction-paragraph">
                <Words text={paragraph} />
              </p>
            ))}
          </div>
        </div>
        <figure className="direction-network">
          <div className="network-frame">
            <Network labels={text.network} />
            <ThreadAnchor place="thread-anchor--hub" />
            <ThreadAnchor place="thread-anchor--result" isGap />
          </div>
        </figure>
      </div>
    </section>
  );
}
