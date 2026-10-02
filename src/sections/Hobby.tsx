import { Rich } from "../components/Text";
import type { Content } from "../content/types";
import { Guitar } from "../guitar/Guitar";
import { gsap, useScene } from "../lib/motion";
import "./hobby.css";

export function Hobby({ text }: { text: Content["hobby"] }) {
  const ref = useScene<HTMLElement>(() => {
    gsap.from(".hobby-intro > *", {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "expo.out",
      scrollTrigger: { trigger: ".hobby-intro", start: "top 78%" },
    });
    gsap.from(".guitar-stage", {
      y: 90,
      rotate: -2.5,
      opacity: 0,
      duration: 1.3,
      ease: "expo.out",
      scrollTrigger: { trigger: ".guitar", start: "top 85%" },
    });
    gsap.from(".guitar-chord-button, .guitar-string-button", {
      y: 18,
      opacity: 0,
      duration: 0.6,
      stagger: 0.025,
      ease: "back.out(1.8)",
      scrollTrigger: { trigger: ".guitar-controls", start: "top 92%" },
    });
  });

  return (
    <section
      ref={ref}
      id="hobby"
      className="section hobby"
      data-section-theme="ink"
      aria-labelledby="hobby-heading"
    >
      <div className="hobby-inner">
        <div className="hobby-intro">
          <p className="kicker">{text.kicker}</p>
          <h2 id="hobby-heading" className="heading">
            {text.heading}
          </h2>
          <p className="lead">
            <Rich text={text.lead} />
          </p>
        </div>
        <Guitar text={text.guitar} />
      </div>
    </section>
  );
}
