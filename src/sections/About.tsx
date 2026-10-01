import { type MouseEvent, useCallback, useRef, useState } from "react";
import { Moth } from "../components/Moth";
import { Chars, Words } from "../components/Text";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { discover, silkBurst } from "../lib/eggs";
import { gsap, prefersReducedMotion, useScene } from "../lib/motion";
import "./about.css";

const LOOPS = Array.from({ length: 22 }, (_, i) => ({
  id: `loop-${i}`,
  rx: 92 + ((i * 37) % 30),
  ry: 44 + ((i * 53) % 46),
  angle: (i * 180) / 22 + ((i * 13) % 9),
}));

/** A cocoon wound from silk loops, with one strand unspooling toward the text. */
function Cocoon() {
  return (
    <svg className="cocoon" viewBox="0 0 300 400" aria-hidden="true">
      <defs>
        <radialGradient id="cocoon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="140" fill="url(#cocoon-glow)" />
      <g className="cocoon-spin" style={{ transformOrigin: "150px 150px" }}>
        {LOOPS.map((loop, i) => (
          <ellipse
            key={loop.id}
            className={i % 2 ? "cocoon-loop cocoon-loop--b" : "cocoon-loop cocoon-loop--a"}
            cx="150"
            cy="150"
            rx={loop.rx}
            ry={loop.ry}
            transform={`rotate(${loop.angle} 150 150)`}
          />
        ))}
      </g>
      <path className="cocoon-strand" d="M150 238 C 150 300, 238 286, 250 336 S 210 392, 292 398" />
    </svg>
  );
}

const TAPS_TO_HATCH = 3;

interface Props {
  text: Content["about"];
  cocoonLabel: string;
}

export function About({ text, cocoonLabel }: Props) {
  const taps = useRef(0);
  const [flight, setFlight] = useState<{ x: number; y: number } | null>(null);
  const handleLanded = useCallback(() => setFlight(null), []);

  // Easter egg: tap the cocoon three times and a silk moth hatches.
  const handleCocoonTap = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const isStill = prefersReducedMotion();
    taps.current += 1;
    if (taps.current < TAPS_TO_HATCH) {
      if (!isStill) {
        gsap.to(button, {
          keyframes: { rotate: [0, -9, 8, -4, 0] },
          duration: 0.5,
          ease: "power1.inOut",
        });
      }
      return;
    }
    taps.current = 0;
    discover("hatch");
    if (isStill) return;
    const box = button.getBoundingClientRect();
    const center = { x: box.left + box.width / 2, y: box.top + box.height * 0.375 };
    silkBurst(center.x, center.y, 0.9);
    setFlight(center);
    gsap
      .timeline()
      .to(button.querySelector(".cocoon-spin"), {
        scale: 1.7,
        opacity: 0,
        svgOrigin: "150 150",
        duration: 0.6,
        ease: "power3.out",
      })
      .to(button.querySelector(".cocoon-spin"), {
        scale: 1,
        opacity: 1,
        duration: 1.4,
        delay: 2.4,
      });
  };

  const ref = useScene<HTMLElement>((root) => {
    gsap.from(".about-heading .char", {
      yPercent: 115,
      duration: 1,
      stagger: 0.03,
      ease: "expo.out",
      scrollTrigger: { trigger: ".about-heading", start: "top 85%" },
    });
    gsap.from(".cocoon-loop", {
      drawSVG: "0%",
      duration: 1.6,
      stagger: 0.04,
      ease: "power2.inOut",
      scrollTrigger: { trigger: ".cocoon", start: "top 85%" },
    });
    const scrub = { trigger: root, start: "top bottom", end: "bottom top", scrub: 1 };
    gsap.to(".cocoon-spin", { rotate: 160, ease: "none", scrollTrigger: scrub });
    gsap.to(".cocoon-loop--b", {
      rotate: "-=40",
      svgOrigin: "150 150",
      ease: "none",
      scrollTrigger: scrub,
    });
    gsap.from(".cocoon-strand", {
      drawSVG: "0%",
      ease: "none",
      scrollTrigger: { trigger: root, start: "top 40%", end: "bottom 60%", scrub: 1 },
    });

    for (const paragraph of gsap.utils.toArray<HTMLElement>(".about-paragraph", root)) {
      const words = paragraph.querySelectorAll(".w");
      gsap.fromTo(
        words,
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: paragraph, start: "top 88%", end: "bottom 62%", scrub: true },
        },
      );
      const marked = paragraph.querySelectorAll(".w.em");
      if (marked.length) {
        gsap.from(marked, {
          backgroundSize: "0% 0.14em",
          duration: 0.8,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: { trigger: paragraph, start: "top 60%" },
        });
      }
    }
  });

  return (
    <section
      ref={ref}
      id="about"
      className="section about"
      data-section-theme="silk"
      aria-labelledby="about-heading"
    >
      <div className="about-grid">
        <div className="about-aside">
          <p className="kicker">{text.kicker}</p>
          <h2 id="about-heading" className="heading about-heading">
            <span className="mask">
              <Chars text={text.heading} />
            </span>
          </h2>
          <button
            type="button"
            className="cocoon-button"
            aria-label={cocoonLabel}
            onClick={handleCocoonTap}
          >
            <Cocoon />
            <ThreadAnchor place="thread-anchor--cocoon" />
          </button>
          {flight ? <Moth from={flight} onLanded={handleLanded} /> : null}
        </div>
        <div className="about-body">
          {text.paragraphs.map((paragraph) => (
            <p key={paragraph} className="about-paragraph">
              <Words text={paragraph} />
            </p>
          ))}
        </div>
      </div>
      <ThreadAnchor place="thread-anchor--about-end" />
    </section>
  );
}
