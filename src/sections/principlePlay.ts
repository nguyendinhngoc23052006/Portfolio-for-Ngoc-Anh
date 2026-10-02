import type { GlyphPlay, PlayContext } from "./principleDrag";
import { attachBars, attachCurve } from "./principleShapes";
import { attachCells, attachNodes } from "./principleSprings";

/**
 * Lets a fine pointer fidget with a glyph once its entrance is over: drag the cells and
 * nodes, brush the bars, reshape the curve. Returns null when the glyph has no svg.
 */
export function attachGlyphPlay(
  index: number,
  glyph: HTMLElement,
  entrance: PlayContext["entrance"],
): GlyphPlay | null {
  const svg = glyph.querySelector("svg");
  if (!svg) return null;
  const context = { glyph, svg, entrance };
  const attach = [attachCells, attachNodes, attachBars, attachCurve][index % 4];
  const play = attach?.(context);
  if (!play) return null;
  glyph.classList.add("is-playful");
  return {
    reset: play.reset,
    dispose: () => {
      play.dispose();
      glyph.classList.remove("is-playful");
    },
  };
}
