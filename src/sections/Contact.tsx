import { type MouseEvent, useEffect, useRef, useState } from "react";
import { Chars } from "../components/Text";
import { ThreadAnchor } from "../components/ThreadAnchor";
import { profile, toTelHref } from "../content/profile";
import type { Content } from "../content/types";
import { silkBurst } from "../lib/eggs";
import { gsap, magnetize, useScene } from "../lib/motion";
import { attachContactPlay, playCopied } from "./contactPlay";
import "./contact.css";

const KNOT_PATH =
  "M-20 220 C 220 220, 300 60, 470 80 S 640 260, 560 250 S 470 120, 640 90 S 860 170, 1220 140";

export function Contact({ text }: { text: Content["contact"] }) {
  const emailRef = useRef<HTMLAnchorElement>(null);
  const [canCopy, setCanCopy] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setCanCopy(Boolean(navigator.clipboard));
    return emailRef.current ? magnetize(emailRef.current, 0.12) : undefined;
  }, []);

  useEffect(() => {
    if (!isCopied) return;
    const timer = window.setTimeout(() => setIsCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  const handleCopy = (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    navigator.clipboard.writeText(profile.email).then(
      () => {
        setIsCopied(true);
        silkBurst(box.left + box.width / 2, box.top + box.height / 2, 0.5);
        playCopied(box.left + box.width / 2);
      },
      () => setCanCopy(false),
    );
  };

  const ref = useScene<HTMLElement>((root) => {
    gsap
      .timeline({ scrollTrigger: { trigger: root, start: "top 65%" } })
      .from(".contact-kicker", { opacity: 0, y: 20, duration: 0.6 })
      .from(
        ".contact-heading .char",
        { yPercent: 115, duration: 1.1, stagger: 0.035, ease: "expo.out" },
        0.1,
      )
      .from(
        ".contact-body, .channel",
        { y: 40, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" },
        0.5,
      );
    gsap.from(".contact-knot path", {
      drawSVG: "0%",
      ease: "none",
      scrollTrigger: { trigger: root, start: "top 80%", end: "bottom bottom", scrub: 1 },
    });
  });

  // Works with or without motion: reduced motion keeps the sound and drops the animation.
  useEffect(() => (ref.current ? attachContactPlay(ref.current) : undefined), [ref]);

  return (
    <section
      ref={ref}
      id="contact"
      className="section contact"
      data-section-theme="ink"
      aria-labelledby="contact-heading"
    >
      <svg
        className="contact-knot"
        viewBox="0 0 1200 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="knot-glow" d={KNOT_PATH} />
        <path className="knot-line" d={KNOT_PATH} />
        <path className="knot-hit" d={KNOT_PATH} />
      </svg>
      <ThreadAnchor place="thread-anchor--contact" />
      <div className="contact-inner">
        <p className="kicker contact-kicker">{text.kicker}</p>
        <h2 id="contact-heading" className="heading contact-heading">
          <span className="mask">
            <Chars text={text.heading} />
          </span>
        </h2>
        <p className="lead contact-body">{text.body}</p>
        <div className="contact-channels">
          <div className="channel">
            <span className="channel-label">{text.emailLabel}</span>
            <a
              ref={emailRef}
              className="channel-value channel-value--email"
              href={`mailto:${profile.email}`}
            >
              {profile.email}
            </a>
            {canCopy ? (
              <button type="button" className="copy-button" onClick={handleCopy}>
                {isCopied ? text.copied : text.copy}
              </button>
            ) : null}
            <span className="sr-only" role="status">
              {isCopied ? text.copied : ""}
            </span>
          </div>
          <div className="channel">
            <span className="channel-label">{text.phoneLabel}</span>
            <a className="channel-value" href={toTelHref(profile.phone)}>
              {profile.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
