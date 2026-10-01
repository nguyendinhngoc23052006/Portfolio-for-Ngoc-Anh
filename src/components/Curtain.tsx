import { useEffect, useRef, useState } from "react";
import { gsap, INTRO_SECONDS, prefersReducedMotion } from "../lib/motion";
import { Chars } from "./Text";

/** Opening curtain: a silk thread pulls across, then the page is revealed. */
export function Curtain({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const curtain = ref.current;
    if (!curtain || prefersReducedMotion()) {
      setIsDone(true);
      return;
    }
    const counter = { value: 0 };
    const countLabel = curtain.querySelector(".curtain-count");
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setIsDone(true) });
      tl.from(".curtain-name .char", {
        yPercent: 110,
        opacity: 0,
        duration: 0.6,
        stagger: 0.025,
        ease: "power3.out",
      })
        .from(".curtain-thread", { scaleX: 0, duration: 0.9, ease: "power2.inOut" }, 0.1)
        .to(
          counter,
          {
            value: 100,
            duration: 0.9,
            ease: "power2.inOut",
            onUpdate: () => {
              if (countLabel)
                countLabel.textContent = String(Math.round(counter.value)).padStart(3, "0");
            },
          },
          0.1,
        )
        .to(
          curtain,
          { clipPath: "inset(0 0 100% 0)", duration: 0.75, ease: "power4.inOut" },
          INTRO_SECONDS - 0.6,
        );
    }, curtain);
    return () => ctx.revert();
  }, []);

  if (isDone) return null;

  return (
    <div ref={ref} className="curtain" aria-hidden="true" style={{ clipPath: "inset(0 0 0 0)" }}>
      <div className="curtain-inner">
        <p className="curtain-name mask">
          <Chars text={name} />
        </p>
        <div className="curtain-thread" />
        <p className="curtain-count">000</p>
      </div>
    </div>
  );
}
