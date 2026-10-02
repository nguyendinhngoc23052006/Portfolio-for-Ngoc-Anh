import { gsap } from "../lib/motion";
import { chime, noteAt, panFor, pluck, rateLimit, tick } from "../lib/sound";
import {
  attachDrag,
  clamp,
  createSlots,
  type GlyphPlay,
  type PlayContext,
  settle,
} from "./principleDrag";
import {
  BAR_NOTE_INDEX,
  buildCurvePath,
  CURVE,
  GLYPH_UNITS,
  type Point,
  TREND,
} from "./principleGlyphs";

const TICK_EVERY = 24;

/** Six bars: brush across them and each rises and sings, while the lens glides to its data point. */
export function attachBars({ svg, entrance }: PlayContext): GlyphPlay {
  const bars = [...svg.querySelectorAll<SVGElement>(".pg-bar")];
  const lens = svg.querySelector(".pg-lens");
  const slots = createSlots();
  const canPlay = rateLimit(60);
  const stops: (() => void)[] = [];

  bars.forEach((bar, index) => {
    const enter = (event: PointerEvent) => {
      if (event.pointerType === "touch" || entrance.progress() < 1) return;
      bar.classList.add("is-lit");
      slots.run(bar, {
        scaleY: 1.12,
        transformOrigin: "50% 100%",
        duration: 0.5,
        ease: "elastic.out(1, 0.5)",
      });
      const spot = TREND[index];
      if (lens && spot) {
        slots.run(lens, { x: spot.x, y: spot.y, duration: 0.6, ease: "power3.out" });
      }
      if (!canPlay()) return;
      const note = noteAt(BAR_NOTE_INDEX[index] ?? 5);
      pluck(note, { gain: 0.4, pan: panFor(event.clientX), bend: 0.3 });
    };
    const leave = () => {
      bar.classList.remove("is-lit");
      if (entrance.progress() < 1) return;
      slots.run(bar, {
        scaleY: 1,
        transformOrigin: "50% 100%",
        duration: 0.6,
        ease: "elastic.out(1, 0.6)",
      });
    };
    bar.addEventListener("pointerenter", enter);
    bar.addEventListener("pointerleave", leave);
    stops.push(() => {
      bar.removeEventListener("pointerenter", enter);
      bar.removeEventListener("pointerleave", leave);
    });
  });

  const reset = () => {
    slots.stop();
    for (const bar of bars) bar.classList.remove("is-lit");
    gsap.set(bars, { scaleY: 1 });
  };

  return {
    reset,
    dispose: () => {
      for (const stop of stops) stop();
      reset();
    },
  };
}

/** A bezier curve with two grips: drag either and the shape follows, ticking, and stays. */
export function attachCurve(context: PlayContext): GlyphPlay {
  const { svg, entrance } = context;
  const grips = [...svg.querySelectorAll(".pg-grip")];
  const handles = [...svg.querySelectorAll<SVGLineElement>(".pg-handle")];
  const curve = svg.querySelector(".pg-curve");
  const blob = svg.querySelector(".pg-blob");
  const slots = createSlots();
  const canTick = rateLimit(30);
  const canChime = rateLimit(120);
  const original = CURVE.grips.map((grip) => ({ ...grip }));
  let points: Point[] = original.map((grip) => ({ ...grip }));
  let heldFrom: Point = { x: 0, y: 0 };
  let tickedAt = 0;

  const place = () => {
    const [first, second] = points;
    if (!first || !second) return;
    curve?.setAttribute("d", buildCurvePath(first, second));
    points.forEach((point, i) => {
      grips[i]?.setAttribute("cx", `${point.x}`);
      grips[i]?.setAttribute("cy", `${point.y}`);
      handles[i]?.setAttribute("x2", `${point.x}`);
      handles[i]?.setAttribute("y2", `${point.y}`);
    });
  };

  const detach = attachDrag(context, grips, {
    grab: ({ part, index }) => {
      settle(entrance);
      heldFrom = { ...(points[index] ?? { x: 0, y: 0 }) };
      tickedAt = 0;
      part.classList.add("is-held");
      // DrawSVG leaves a dash pattern sized to the old shape; a reshaped line needs none.
      for (const line of [curve, ...handles]) {
        if (line instanceof SVGElement) line.style.strokeDasharray = "none";
      }
    },
    lift: (_session, event) => {
      if (canTick()) tick({ gain: 0.4, pitch: 2400, pan: panFor(event.clientX) });
    },
    move: (session, point, event) => {
      const next = {
        x: clamp(heldFrom.x + point.x - session.origin.x, -10, GLYPH_UNITS + 10),
        y: clamp(heldFrom.y + point.y - session.origin.y, -10, GLYPH_UNITS + 10),
      };
      points = points.map((existing, i) => (i === session.index ? next : existing));
      place();
      if (session.travel < tickedAt + TICK_EVERY) return;
      tickedAt = session.travel;
      if (!canTick()) return;
      const height = 1 - clamp(next.y / GLYPH_UNITS, 0, 1);
      tick({ gain: 0.3, pitch: 1500 + height * 1800, pan: panFor(event.clientX) });
    },
    drop: (session, _point, event) => {
      session.part.classList.remove("is-held");
      if (!session.isLifted) return;
      if (blob) {
        gsap.set(blob, { scale: 1.07, transformOrigin: "50% 50%" });
        slots.run(blob, { scale: 1, duration: 1.2, ease: "elastic.out(1, 0.3)" });
      }
      if (!canChime()) return;
      const height = 1 - clamp((points[session.index]?.y ?? 0) / GLYPH_UNITS, 0, 1);
      chime(noteAt(7 + Math.round(height * 7)), { gain: 0.8, pan: panFor(event.clientX) });
    },
  });

  const reset = () => {
    slots.stop();
    points = original.map((grip) => ({ ...grip }));
    place();
    for (const grip of grips) grip.classList.remove("is-held");
    if (blob) gsap.set(blob, { scale: 1 });
  };

  return {
    reset,
    dispose: () => {
      detach();
      reset();
    },
  };
}
