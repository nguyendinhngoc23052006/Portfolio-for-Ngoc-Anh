import { Rich } from "../components/Text";
import { ThreadAnchor } from "../components/ThreadAnchor";
import { formatPeriod, profile } from "../content/profile";
import type { Content } from "../content/types";
import { gsap, ScrollTrigger, useScene } from "../lib/motion";
import { setThreadTrack } from "../lib/thread";
import { animateMotif, JourneyMotif } from "./JourneyMotifs";
import "./journey.css";

interface Props {
  text: Content["journey"];
  present: string;
}

export function Journey({ text, present }: Props) {
  const ref = useScene<HTMLElement>((root, when) => {
    const track = root.querySelector<HTMLElement>(".journey-track");
    if (!track) return;
    const stations = profile.journey.flatMap((fact) => {
      const element = root.querySelector<HTMLElement>(`.station--${fact.id}`);
      const motif = element?.querySelector(".station-motif");
      return element && motif ? [{ element, entrance: animateMotif(fact.id, motif) }] : [];
    });

    gsap.from(".journey-intro > *", {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: root, start: "top 70%" },
    });

    if (!when.roomy) {
      for (const { element, entrance } of stations) {
        ScrollTrigger.create({
          trigger: element,
          start: "top 70%",
          onEnter: () => entrance.play(),
        });
        gsap.from(element.querySelectorAll(".station-text > *"), {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 80%" },
        });
      }
      return;
    }

    // Wide screens: pin the chapter and travel sideways along the route.
    root.classList.add("is-horizontal");
    const distance = () => track.scrollWidth - window.innerWidth;
    const travel = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        pin: true,
        start: "top top",
        end: () => `+=${distance()}`,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    travel.to(track, { x: () => -distance(), ease: "none" });
    setThreadTrack(travel);

    // `travel` is linear, so it can steer the per-station triggers below as
    // their containerAnimation.
    for (const { element, entrance } of stations) {
      ScrollTrigger.create({
        trigger: element,
        containerAnimation: travel,
        start: "left 70%",
        onEnter: () => entrance.play(),
        onLeaveBack: () => entrance.reverse(),
      });
      gsap.fromTo(
        element.querySelector(".station-period"),
        { x: 160 },
        {
          x: -160,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            containerAnimation: travel,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        },
      );
      gsap.from(element.querySelectorAll(".station-text > *"), {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: element, containerAnimation: travel, start: "left 75%" },
      });
    }

    return () => {
      // Class first: the rebuild reads which anchors are visible.
      root.classList.remove("is-horizontal");
      setThreadTrack(null);
    };
  });

  return (
    <section
      ref={ref}
      id="journey"
      className="journey"
      data-section-theme="ink"
      aria-labelledby="journey-heading"
    >
      <div className="journey-track">
        <div className="journey-intro">
          <p className="kicker">{text.kicker}</p>
          <h2 id="journey-heading" className="heading">
            {text.heading}
          </h2>
          <ol className="journey-legend">
            {profile.journey.map((fact) => (
              <li key={fact.id}>
                <span>{formatPeriod(fact.start, fact.end, present)}</span>
                {text.items[fact.id].role}
              </li>
            ))}
          </ol>
          <ThreadAnchor place="thread-anchor--journey" />
        </div>

        {profile.journey.map((fact, index) => {
          const item = text.items[fact.id];
          return (
            <article
              key={fact.id}
              className={`station station--${fact.id}`}
              data-id={fact.id}
              aria-labelledby={`station-${fact.id}`}
            >
              <ThreadAnchor place="thread-anchor--station" />
              <p className="station-period" aria-hidden="true">
                {formatPeriod(fact.start, fact.end, present)}
              </p>
              <div className="station-text">
                <p className="station-meta">
                  <span className="station-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>{formatPeriod(fact.start, fact.end, present)}</span>
                </p>
                <h3 id={`station-${fact.id}`} className="station-role">
                  {item.role}
                </h3>
                <p className="station-org">{item.org}</p>
                <div className="station-story">
                  {item.story.map((paragraph) => (
                    <p key={paragraph}>
                      <Rich text={paragraph} />
                    </p>
                  ))}
                </div>
                <ul className="tags">
                  {item.tags.map((tag) => (
                    <li key={tag} className="tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="station-motif">
                <JourneyMotif
                  id={fact.id}
                  silkStages={text.silkStages}
                  vmoTracks={text.vmoTracks}
                />
                {fact.stats.length > 0 ? (
                  <figcaption className="station-stats">
                    {fact.stats.map((value, statIndex) => (
                      <span key={value}>
                        <strong>{value}</strong>
                        {text.designStats[statIndex]}
                      </span>
                    ))}
                  </figcaption>
                ) : null}
              </figure>
              <span className="station-knot" aria-hidden="true" data-thread="track" />
            </article>
          );
        })}
        <div className="journey-route" aria-hidden="true" />
      </div>
    </section>
  );
}
