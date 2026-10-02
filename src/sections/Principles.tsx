import type { CSSProperties } from "react";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { discover } from "../lib/eggs";
import { gsap, isFinePointer, ScrollTrigger, useScene } from "../lib/motion";
import { Glyph } from "./principleGlyphs";
import { attachGlyphPlay } from "./principlePlay";
import { playGlyph, playGlyphSound } from "./principleTimelines";
import "./principles.css";

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
      const glyph = card.querySelector<HTMLElement>(".principle-glyph");
      if (glyph) {
        const entrance = playGlyph(index, glyph);
        ScrollTrigger.create({ trigger: card, start: "top 70%", onEnter: () => entrance.play() });
        const play = isFinePointer() ? attachGlyphPlay(index, glyph, entrance) : null;
        // Easter egg: pressing the glyph shakes it apart and lets it rebuild itself.
        const replay = () => {
          play?.reset();
          entrance.restart();
        };
        glyph.addEventListener("click", replay);
        cleanups.push(() => {
          glyph.removeEventListener("click", replay);
          play?.dispose();
        });
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
              onClick={(event) => {
                discover("replay");
                playGlyphSound(index, event.currentTarget);
              }}
            >
              <Glyph index={index} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
