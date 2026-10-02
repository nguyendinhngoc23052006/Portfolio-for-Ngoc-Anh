import { useEffect, useRef, useState } from "react";
import type { ChapterId } from "../content/types";
import { ScrollTrigger } from "../lib/motion";
import { noteAt, pluck } from "../lib/sound";

interface Props {
  chapters: Record<ChapterId, string>;
  label: string;
}

/**
 * Tracks which chapter is in view: themes the page from that section's
 * `data-section-theme`, and marks it on the rail. Chapters are read from the
 * rendered sections, so their order lives only in App.tsx.
 */
export function ChapterRail({ chapters, label }: Props) {
  const [list, setList] = useState<ChapterId[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const fillRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Not `main > section`: a pinned section sits inside GSAP's pin-spacer.
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]")).filter(
      (section) => section.id in chapters,
    );
    setList(sections.map((section) => section.id as ChapterId));
    let current = -1;
    const activate = (index: number) => {
      const section = sections[index];
      if (!section) return;
      // Each chapter sounds one soft note, rising as the story goes on.
      if (current !== -1 && index !== current) pluck(noteAt(3 + index), { gain: 0.16 });
      current = index;
      setActiveIndex(index);
      document.documentElement.dataset.theme = section.dataset.sectionTheme ?? "ink";
    };
    // The chapter in view is the last one whose top has crossed mid-screen. An
    // end-based range would go blank inside a pinned chapter, whose own trigger
    // does not stretch over its pin.
    const triggers = sections.map((section, index) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top 50%",
        end: "max",
        onEnter: () => activate(index),
        onLeaveBack: () => activate(Math.max(index - 1, 0)),
      }),
    );
    const progress = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (fillRef.current) fillRef.current.style.transform = `scaleY(${self.progress})`;
        if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
      },
    });
    return () => {
      for (const trigger of triggers) trigger.kill();
      progress.kill();
    };
  }, [chapters]);

  const active = list[activeIndex];

  return (
    <>
      <div ref={barRef} className="progress-bar" aria-hidden="true" />
      <nav className="rail" aria-label={label}>
        <span ref={fillRef} className="rail-fill" aria-hidden="true" />
        <ol className="rail-track">
          {list.map((id, index) => (
            <li key={id}>
              <a
                className="rail-knot"
                href={`#${id}`}
                aria-current={index === activeIndex ? "location" : undefined}
              >
                <span className="rail-knot-label">{chapters[id]}</span>
                <span className="rail-knot-dot" />
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {active ? (
        <p className="chapter-badge" aria-hidden="true">
          <span>
            {String(activeIndex + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
          </span>
          <strong>{chapters[active]}</strong>
        </p>
      ) : null}
    </>
  );
}
