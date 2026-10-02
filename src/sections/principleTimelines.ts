import { gsap } from "../lib/motion";
import { chime, noteAt, panFor, pluck, rateLimit, tick, whoosh } from "../lib/sound";
import {
  BAR_NOTE_INDEX,
  BARS,
  CELL_SIZE,
  CELLS,
  GLYPH_UNITS,
  NODE_NOTE_INDEX,
  RING,
  SNAP_RANK,
  TREND,
} from "./principleGlyphs";

// The picture and its sound read the same beats, so they cannot drift apart.
const CELL_STEP = 0.04;
const NODE_STEP = 0.08;
const BAR_STEP = 0.08;
const CORE_AT = 0.9;
const BLOB_AT = 0.8;

export function playGlyph(index: number, glyph: Element): gsap.core.Timeline {
  const q = gsap.utils.selector(glyph);
  const tl = gsap.timeline({ paused: true });
  switch (index % 4) {
    case 0:
      q(".pg-cell").forEach((cell, i) => {
        const spec = CELLS[i];
        if (!spec) return;
        tl.from(
          cell,
          {
            x: spec.scatterX,
            y: spec.scatterY,
            rotate: spec.spin,
            opacity: 0,
            transformOrigin: "50% 50%",
            duration: 1.2,
            ease: "expo.out",
          },
          (SNAP_RANK[i] ?? i) * CELL_STEP,
        );
      });
      break;
    case 1:
      tl.from(q(".pg-node"), {
        scale: 0,
        transformOrigin: "50% 50%",
        duration: 0.5,
        stagger: NODE_STEP,
        ease: "back.out(2)",
      })
        .from(
          q(".pg-link"),
          { drawSVG: "0%", duration: 0.8, stagger: 0.04, ease: "power2.out" },
          0.3,
        )
        .from(
          q(".pg-core"),
          { scale: 0, transformOrigin: "50% 50%", duration: 0.7, ease: "elastic.out(1, 0.5)" },
          CORE_AT,
        );
      break;
    case 2:
      tl.from(q(".pg-bar"), {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.8,
        stagger: BAR_STEP,
        ease: "expo.out",
      })
        .from(q(".pg-trend"), { drawSVG: "0%", duration: 1, ease: "power2.inOut" }, 0.4)
        .fromTo(
          q(".pg-lens"),
          { x: 40, y: 200 },
          { x: 232, y: 66, duration: 1.4, ease: "power2.inOut" },
          0.4,
        );
      break;
    default:
      tl.from(q(".pg-curve"), { drawSVG: "0%", duration: 1.2, ease: "power2.inOut" })
        .from(
          q(".pg-anchor, .pg-grip"),
          { scale: 0, transformOrigin: "50% 50%", duration: 0.4, stagger: 0.1 },
          0,
        )
        .from(q(".pg-handle"), { drawSVG: "50% 50%", duration: 0.6 }, 0.2)
        .from(
          q(".pg-blob"),
          {
            scale: 0.4,
            opacity: 0,
            transformOrigin: "50% 50%",
            duration: 1.2,
            ease: "elastic.out(1, 0.6)",
          },
          BLOB_AT,
        );
  }
  return tl;
}

const canReplay = rateLimit(300);

/** The replay's score: one voice per beat of the entrance, panned to where it happens. */
export function playGlyphSound(index: number, glyph: Element): void {
  if (!canReplay()) return;
  const box = glyph.getBoundingClientRect();
  const panAt = (x: number) => panFor(box.left + (x / GLYPH_UNITS) * box.width);
  const centre = panAt(GLYPH_UNITS / 2);
  switch (index % 4) {
    case 0:
      for (const [i, cell] of CELLS.entries()) {
        const rank = SNAP_RANK[i] ?? i;
        tick({
          delay: rank * CELL_STEP + 0.1,
          pitch: 1700 + rank * 105,
          pan: panAt(cell.x + CELL_SIZE / 2),
          gain: 0.5,
        });
      }
      break;
    case 1:
      for (const [i, node] of RING.entries()) {
        pluck(noteAt(NODE_NOTE_INDEX[i] ?? 5), {
          delay: i * NODE_STEP + 0.12,
          gain: 0.7,
          pan: panAt(node.x),
        });
      }
      chime(noteAt(12), { delay: CORE_AT + 0.05, gain: 0.7, pan: centre });
      break;
    case 2:
      BARS.forEach((_, i) => {
        pluck(noteAt(BAR_NOTE_INDEX[i] ?? 5), {
          delay: i * BAR_STEP + 0.06,
          gain: 0.7,
          pan: panAt(TREND[i]?.x ?? GLYPH_UNITS / 2),
        });
      });
      break;
    default:
      whoosh({ duration: 0.9, gain: 0.7, pan: centre });
      chime(noteAt(11), { delay: BLOB_AT + 0.1, gain: 0.7, pan: centre });
  }
}
