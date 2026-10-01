import { Fragment } from "react";
import { gsap, ScrollTrigger, useScene } from "../lib/motion";

/** Decorative band; its words repeat the tagline, so it is hidden from screen readers. */
export function Marquee({ words }: { words: string[] }) {
  const ref = useScene<HTMLDivElement>((root) => {
    const track = root.querySelector(".marquee-track");
    if (!track) return;
    const loop = gsap.to(track, { xPercent: -50, ease: "none", duration: 38, repeat: -1 });
    const setSkew = gsap.quickSetter(track, "skewX", "deg");
    const lean = { skew: 0 };
    ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const speed = Math.abs(self.getVelocity());
        // Spin up with the scroll, then coast back to cruising speed.
        gsap.to(loop, { timeScale: 1 + Math.min(speed / 300, 5), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: 1, duration: 1.4, delay: 0.2, ease: "power2.out" });
        const skew = gsap.utils.clamp(-10, 10, self.getVelocity() / -250);
        if (Math.abs(skew) > Math.abs(lean.skew)) {
          lean.skew = skew;
          gsap.to(lean, {
            skew: 0,
            duration: 0.9,
            ease: "power3",
            overwrite: true,
            onUpdate: () => setSkew(lean.skew),
          });
        }
      },
    });
  });

  const group = (
    <>
      {words.map((word) => (
        <Fragment key={word}>
          <span>{word}</span>
          <span className="marquee-star">✦</span>
        </Fragment>
      ))}
    </>
  );

  return (
    <div ref={ref} className="marquee" aria-hidden="true">
      <div className="marquee-track">
        <div className="marquee-group">{group}</div>
        <div className="marquee-group">{group}</div>
      </div>
    </div>
  );
}
