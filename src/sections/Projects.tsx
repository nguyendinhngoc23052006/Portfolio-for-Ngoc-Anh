import { useEffect, useRef, useState } from "react";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { gsap, isFinePointer, useScene } from "../lib/motion";
import "./projects.css";

/** One small emblem per discipline, shown in the lens that trails the pointer. */
const EMBLEMS = [
  <g key="identity">
    <circle cx="44" cy="50" r="26" />
    <circle cx="76" cy="50" r="26" />
    <circle cx="60" cy="78" r="26" />
  </g>,
  <g key="communications">
    <path d="M30 60 L62 40 L62 80 Z" />
    <path d="M72 46 Q84 60 72 74" />
    <path d="M80 36 Q100 60 80 84" />
  </g>,
  <g key="operations">
    <rect x="28" y="34" width="28" height="24" rx="3" />
    <rect x="64" y="34" width="28" height="24" rx="3" />
    <rect x="46" y="64" width="28" height="24" rx="3" />
  </g>,
  <g key="management">
    <rect x="26" y="34" width="44" height="10" rx="5" />
    <rect x="44" y="54" width="50" height="10" rx="5" />
    <rect x="34" y="74" width="36" height="10" rx="5" />
  </g>,
];

export function Projects({ text }: { text: Content["projects"] }) {
  const lensRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(0);

  useEffect(() => {
    const lens = lensRef.current;
    const list = listRef.current;
    if (!lens || !list || !isFinePointer()) return;
    const toX = gsap.quickTo(lens, "x", { duration: 0.5, ease: "power3" });
    const toY = gsap.quickTo(lens, "y", { duration: 0.5, ease: "power3" });
    const onMove = (event: PointerEvent) => {
      const box = list.getBoundingClientRect();
      toX(event.clientX - box.left);
      toY(event.clientY - box.top);
    };
    const show = () => gsap.to(lens, { scale: 1, duration: 0.4, ease: "back.out(2)" });
    const hide = () => gsap.to(lens, { scale: 0, duration: 0.3 });
    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerenter", show);
    list.addEventListener("pointerleave", hide);
    return () => {
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerenter", show);
      list.removeEventListener("pointerleave", hide);
    };
  }, []);

  const ref = useScene<HTMLElement>(() => {
    gsap.from(".projects-head > *", {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: ".projects-head", start: "top 80%" },
    });
    gsap.from(".project-row", {
      clipPath: "inset(0 0 100% 0)",
      y: 60,
      duration: 1,
      stagger: 0.12,
      ease: "expo.out",
      scrollTrigger: { trigger: ".project-list", start: "top 80%" },
    });
  });

  return (
    <section
      ref={ref}
      id="projects"
      className="section projects"
      data-section-theme="ink"
      aria-labelledby="projects-heading"
    >
      <header className="projects-head">
        <p className="kicker">{text.kicker}</p>
        <h2 id="projects-heading" className="heading">
          {text.heading}
        </h2>
        <p className="lead">{text.lead}</p>
      </header>
      <div ref={listRef} className="project-index">
        <ol className="project-list">
          {text.items.map((item, index) => (
            <li key={item.title} className="project-row" onPointerEnter={() => setHovered(index)}>
              <ThreadAnchor place="thread-anchor--row" />
              <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="project-title">{item.title}</h3>
              <p className="project-body">{item.body}</p>
            </li>
          ))}
        </ol>
        <div ref={lensRef} className="project-lens" aria-hidden="true">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            {EMBLEMS[hovered % EMBLEMS.length]}
          </svg>
        </div>
      </div>
    </section>
  );
}
