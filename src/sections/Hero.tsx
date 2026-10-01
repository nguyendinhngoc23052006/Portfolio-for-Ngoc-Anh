import { useEffect, useRef } from "react";
import { SilkCanvas } from "../components/SilkCanvas";
import { Chars, Rich } from "../components/Text";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { gsap, INTRO_SECONDS, magnetize, useScene } from "../lib/motion";
import "./hero.css";

interface Props {
  name: string;
  text: Content["hero"];
}

/** Set once the entrance finishes, so a resize across a breakpoint does not blank the hero again. */
let hasRevealed = false;

export function Hero({ name, text }: Props) {
  const [familyName, ...givenNames] = name.split(" ");
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => (ctaRef.current ? magnetize(ctaRef.current, 0.25) : undefined), []);

  const ref = useScene<HTMLElement>((root) => {
    const reveal = gsap.timeline({
      delay: INTRO_SECONDS - 0.4,
      paused: hasRevealed,
      onComplete: () => {
        hasRevealed = true;
      },
    });
    reveal
      .from(".hero-name .char", {
        yPercent: 118,
        rotate: 8,
        duration: 1.1,
        stagger: 0.04,
        ease: "expo.out",
      })
      .from(
        [".hero-top", ".hero-intro p", ".hero-actions"],
        { y: 28, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" },
        0.45,
      )
      .from(".hero-scroll", { opacity: 0, duration: 0.6 }, 1);
    if (hasRevealed) reveal.progress(1);

    const words = gsap.utils.toArray<HTMLElement>(".hero-tagline span", root);
    const cycle = gsap.timeline({ repeat: -1, delay: INTRO_SECONDS + 1 });
    for (const word of words) {
      cycle.to(word, { color: "#e8b04f", duration: 0.4 }).to(word, {
        color: "rgb(244 238 227 / 0.64)",
        duration: 0.4,
        delay: 1.4,
      });
    }

    gsap
      .timeline({
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.6 },
      })
      .to(".hero-line--first", { xPercent: -14, ease: "none" }, 0)
      .to(".hero-line--second", { xPercent: 12, ease: "none" }, 0)
      .to(".hero-name", { opacity: 0.15, ease: "none" }, 0)
      .to(".hero-bottom", { y: -80, opacity: 0, ease: "none" }, 0);
  });

  return (
    <section
      ref={ref}
      id="hero"
      className="hero"
      data-section-theme="ink"
      aria-labelledby="hero-name"
    >
      <SilkCanvas />
      <div className="hero-inner">
        <div className="hero-top">
          <p className="kicker">{text.kicker}</p>
          <p className="hero-tagline">
            {text.tagline.map((word) => (
              <span key={word}>{word}</span>
            ))}
          </p>
        </div>

        <h1 id="hero-name" className="hero-name">
          <span className="mask hero-line hero-line--first">
            <Chars text={familyName ?? name} />
          </span>
          <span className="mask hero-line hero-line--second">
            <Chars text={givenNames.join(" ")} />
          </span>
        </h1>

        <div className="hero-bottom">
          <div className="hero-intro">
            {text.intro.map((paragraph) => (
              <p key={paragraph}>
                <Rich text={paragraph} />
              </p>
            ))}
          </div>
          <div className="hero-actions">
            <a ref={ctaRef} className="cta" href="#about">
              <span>{text.cta}</span>
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>
      </div>
      <ThreadAnchor place="thread-anchor--hero" />
      <div className="hero-scroll" aria-hidden="true">
        <span>{text.scrollHint}</span>
        <span className="hero-scroll-line" />
      </div>
    </section>
  );
}
