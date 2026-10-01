import { ThreadAnchor } from "../components/ThreadAnchor";
import { profile } from "../content/profile";
import type { Content } from "../content/types";
import { gsap, useScene } from "../lib/motion";
import "./skills.css";

const ARC_LENGTH = 100;

/** One tick per band score, 0 to max, around the gauge's half circle. */
function gaugeTicks(max: number) {
  return Array.from({ length: max + 1 }, (_, value) => {
    const angle = Math.PI - (value / max) * Math.PI;
    return {
      value,
      line: {
        x1: 150 + Math.cos(angle) * 104,
        y1: 150 - Math.sin(angle) * 104,
        x2: 150 + Math.cos(angle) * 96,
        y2: 150 - Math.sin(angle) * 96,
      },
    };
  });
}

/** "Microsoft Excel" → vendor "Microsoft", product "Excel". */
function splitTool(tool: string) {
  const [vendor = "", ...product] = tool.split(" ");
  return { vendor, product: product.join(" ") };
}

export function Skills({ text }: { text: Content["skills"] }) {
  const { score, max } = profile.ielts;
  const filled = (score / max) * ARC_LENGTH;
  const vendors = [...new Set(profile.tools.map((tool) => splitTool(tool).vendor))];

  const ref = useScene<HTMLElement>((root) => {
    gsap.from(".tool", {
      rotateX: -90,
      y: 40,
      opacity: 0,
      transformOrigin: "50% 100%",
      duration: 0.9,
      stagger: 0.08,
      ease: "back.out(1.6)",
      scrollTrigger: { trigger: ".tool-groups", start: "top 80%" },
    });

    const arc = root.querySelector<SVGPathElement>(".ielts-fill");
    const scoreLabel = root.querySelector(".ielts-score");
    const counter = { value: 0 };
    gsap.set(arc, { attr: { "stroke-dasharray": `0 ${ARC_LENGTH}` } });
    gsap.set(scoreLabel, { textContent: "0.0" });
    gsap.to(counter, {
      value: score,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: ".ielts", start: "top 75%" },
      onUpdate: () => {
        arc?.setAttribute(
          "stroke-dasharray",
          `${(counter.value / max) * ARC_LENGTH} ${ARC_LENGTH}`,
        );
        if (scoreLabel) scoreLabel.textContent = counter.value.toFixed(1);
      },
    });

    // Tilt each tile toward the pointer.
    const tiles = gsap.utils.toArray<HTMLElement>(".tool", root);
    const cleanups = tiles.map((tile) => {
      const onMove = (event: PointerEvent) => {
        const box = tile.getBoundingClientRect();
        gsap.to(tile, {
          rotateY: ((event.clientX - box.left) / box.width - 0.5) * 18,
          rotateX: -((event.clientY - box.top) / box.height - 0.5) * 18,
          duration: 0.4,
        });
      };
      const onLeave = () => gsap.to(tile, { rotateX: 0, rotateY: 0, duration: 0.6 });
      tile.addEventListener("pointermove", onMove);
      tile.addEventListener("pointerleave", onLeave);
      return () => {
        tile.removeEventListener("pointermove", onMove);
        tile.removeEventListener("pointerleave", onLeave);
      };
    });
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  return (
    <section
      ref={ref}
      id="skills"
      className="section skills"
      data-section-theme="silk"
      aria-labelledby="skills-heading"
    >
      <h2 id="skills-heading" className="kicker">
        {text.kicker}
      </h2>
      <div className="skills-grid">
        <div className="skills-tools">
          <h3 className="skills-subhead">{text.toolsHeading}</h3>
          <div className="tool-groups">
            {vendors.map((vendor) => (
              <ul key={vendor} className="tool-group" aria-label={vendor}>
                {profile.tools
                  .map(splitTool)
                  .filter((tool) => tool.vendor === vendor)
                  .map((tool) => (
                    <li key={tool.product} className="tool">
                      <span className="tool-vendor">{tool.vendor}</span>
                      <span className="tool-product">{tool.product}</span>
                    </li>
                  ))}
              </ul>
            ))}
          </div>
        </div>

        <div className="skills-language">
          <ThreadAnchor place="thread-anchor--skills" />
          <h3 className="skills-subhead">{text.languageHeading}</h3>
          <figure className="ielts">
            <svg viewBox="0 0 300 170" aria-hidden="true">
              <path
                className="ielts-track"
                d="M30 150 A120 120 0 0 1 270 150"
                pathLength={ARC_LENGTH}
              />
              <path
                className="ielts-fill"
                d="M30 150 A120 120 0 0 1 270 150"
                pathLength={ARC_LENGTH}
                strokeDasharray={`${filled} ${ARC_LENGTH}`}
              />
              {gaugeTicks(max).map((tick) => (
                <line key={`tick-${tick.value}`} className="ielts-tick" {...tick.line} />
              ))}
            </svg>
            <figcaption>
              <span className="ielts-reading">
                <span className="ielts-score">{score.toFixed(1)}</span>
                <span className="ielts-max">/ {max.toFixed(1)}</span>
              </span>
              <span className="ielts-name">
                {text.language} — <strong>IELTS {score.toFixed(1)}</strong>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
