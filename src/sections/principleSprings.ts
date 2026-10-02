import { gsap } from "../lib/motion";
import { noteAt, panFor, pluck, rateLimit, tick } from "../lib/sound";
import {
  attachDrag,
  clamp,
  createSlots,
  type GlyphPlay,
  type PlayContext,
  settle,
} from "./principleDrag";
import { CELL_SIZE, CELLS, LINKS, NODE_NOTE_INDEX, type Point, RING } from "./principleGlyphs";

const LIFT_SCALE = 1.14;
const SPRING = "elastic.out(1, 0.38)";
// How far past the glyph's edge a held piece may travel before the card's edge clips it.
const SLACK = 30;
const BOUNDS = { min: -SLACK, max: 280 + SLACK };

function readShift(part: Element): Point {
  return { x: Number(gsap.getProperty(part, "x")), y: Number(gsap.getProperty(part, "y")) };
}

// While a cell is carried, the cells near it part like water; the farther, the less.
const WAKE_REACH = 72;
const WAKE_PUSH = 36;
const WAKE_EASE = 0.28;

function createWake(cells: readonly Element[], slots: ReturnType<typeof createSlots>) {
  const offsets: Point[] = cells.map(() => ({ x: 0, y: 0 }));
  // Built once: the wake runs every frame while a cell is carried.
  const setters = cells.map((cell) => ({
    x: gsap.quickSetter(cell, "x", "px"),
    y: gsap.quickSetter(cell, "y", "px"),
  }));
  let carried = -1;

  const step = () => {
    const held = CELLS[carried];
    const heldCell = cells[carried];
    if (!held || !heldCell) return;
    const shift = readShift(heldCell);
    CELLS.forEach((other, i) => {
      const cell = cells[i];
      const offset = offsets[i];
      if (i === carried || !cell || !offset) return;
      const dx = other.x - held.x - shift.x;
      const dy = other.y - held.y - shift.y;
      const distance = Math.hypot(dx, dy) || 1;
      const push = Math.max(0, 1 - distance / WAKE_REACH) * WAKE_PUSH;
      const nextX = offset.x + ((dx / distance) * push - offset.x) * WAKE_EASE;
      const nextY = offset.y + ((dy / distance) * push - offset.y) * WAKE_EASE;
      const isStill = Math.abs(nextX - offset.x) < 0.005 && Math.abs(nextY - offset.y) < 0.005;
      offset.x = nextX;
      offset.y = nextY;
      if (!isStill) {
        setters[i]?.x(nextX);
        setters[i]?.y(nextY);
      }
    });
  };

  const halt = () => {
    if (carried < 0) return;
    gsap.ticker.remove(step);
    carried = -1;
  };

  return {
    begin(index: number) {
      halt();
      carried = index;
      cells.forEach((cell, i) => {
        // Stop any spring still in flight, but settle its scale: the wake only carries x and y.
        if (i !== index) slots.run(cell, { scale: 1, duration: 0.3, ease: "power2.out" });
        offsets[i] = readShift(cell);
      });
      gsap.ticker.add(step);
    },
    /** Lets go: everything that was pushed rebounds home. */
    release() {
      if (carried < 0) return;
      const held = carried;
      halt();
      for (const [i, cell] of cells.entries()) {
        if (i === held) continue;
        const { x, y } = readShift(cell);
        if (Math.abs(x) + Math.abs(y) < 0.05) continue;
        slots.run(cell, { x: 0, y: 0, duration: 1.1, ease: "elastic.out(1, 0.5)" });
      }
    },
    halt,
  };
}

/** Sixteen cells: pick one up, carry it, let go, and it springs back into its slot. */
export function attachCells(context: PlayContext): GlyphPlay {
  const { svg, entrance } = context;
  const cells = [...svg.querySelectorAll(".pg-cell")];
  const slots = createSlots();
  const wake = createWake(cells, slots);
  const canLift = rateLimit(80);
  const canDrop = rateLimit(80);
  let heldFrom: Point = { x: 0, y: 0 };

  const detach = attachDrag(context, cells, {
    grab: ({ part }) => {
      settle(entrance);
      heldFrom = readShift(part);
      slots.run(part, {
        scale: LIFT_SCALE,
        transformOrigin: "50% 50%",
        duration: 0.3,
        ease: "back.out(3)",
      });
    },
    lift: (session, event) => {
      wake.begin(session.index);
      const cell = CELLS[session.index];
      if (!cell || !canLift()) return;
      tick({ gain: 0.5, pitch: 2200 + cell.column * 260, pan: panFor(event.clientX) });
    },
    move: (session, point) => {
      const cell = CELLS[session.index];
      if (!cell) return;
      const centre = { x: cell.x + CELL_SIZE / 2, y: cell.y + CELL_SIZE / 2 };
      slots.run(session.part, {
        x: clamp(
          heldFrom.x + point.x - session.origin.x,
          BOUNDS.min - centre.x,
          BOUNDS.max - centre.x,
        ),
        y: clamp(
          heldFrom.y + point.y - session.origin.y,
          BOUNDS.min - centre.y,
          BOUNDS.max - centre.y,
        ),
        scale: LIFT_SCALE,
        duration: 0.22,
        ease: "power3.out",
      });
    },
    drop: (session, _point, event) => {
      wake.release();
      const cell = CELLS[session.index];
      if (!session.isLifted || !cell) {
        slots.run(session.part, { x: 0, y: 0, scale: 1, duration: 0.3, ease: "power3.out" });
        return;
      }
      slots.run(session.part, { x: 0, y: 0, scale: 1, duration: 1.3, ease: SPRING });
      if (!canDrop()) return;
      const pan = panFor(event.clientX);
      pluck(noteAt(5 + cell.column + cell.row), { gain: 0.8, pan, bend: 0.3 });
      tick({ gain: 0.6, pitch: 3100, pan, delay: 0.2 });
    },
  });

  const reset = () => {
    wake.halt();
    slots.stop();
    gsap.set(cells, { x: 0, y: 0, scale: 1 });
  };

  return {
    reset,
    dispose: () => {
      detach();
      reset();
    },
  };
}

/** Six nodes on a ring: pull one and every link touching it stretches; let go and all of it rebounds. */
export function attachNodes(context: PlayContext): GlyphPlay {
  const { svg, entrance } = context;
  const nodes = [...svg.querySelectorAll(".pg-node")];
  const lines = [...svg.querySelectorAll<SVGLineElement>(".pg-link")];
  const slots = createSlots();
  const canLift = rateLimit(80);
  const canDrop = rateLimit(80);
  // Nodes that are held or still springing home; their links are drawn taut.
  const awake = new Set<number>();
  let heldFrom: Point = { x: 0, y: 0 };

  const markLinks = () => {
    LINKS.forEach((link, i) => {
      const line = lines[i];
      if (!line) return;
      const isTaut = awake.has(link.from) || awake.has(link.to);
      line.classList.toggle("is-pulled", isTaut);
      if (isTaut) line.style.strokeDasharray = "none";
    });
  };

  const placeLinks = () => {
    LINKS.forEach((link, i) => {
      const line = lines[i];
      const first = nodes[link.from];
      const second = nodes[link.to];
      if (!line || !first || !second) return;
      if (!awake.has(link.from) && !awake.has(link.to)) return;
      const a = readShift(first);
      const b = readShift(second);
      line.setAttribute("x1", `${link.a.x + a.x}`);
      line.setAttribute("y1", `${link.a.y + a.y}`);
      line.setAttribute("x2", `${link.b.x + b.x}`);
      line.setAttribute("y2", `${link.b.y + b.y}`);
    });
  };

  const putLinksBack = () => {
    LINKS.forEach((link, i) => {
      lines[i]?.setAttribute("x1", `${link.a.x}`);
      lines[i]?.setAttribute("y1", `${link.a.y}`);
      lines[i]?.setAttribute("x2", `${link.b.x}`);
      lines[i]?.setAttribute("y2", `${link.b.y}`);
    });
  };

  const detach = attachDrag(context, nodes, {
    grab: ({ part, index }) => {
      settle(entrance);
      heldFrom = readShift(part);
      awake.add(index);
      markLinks();
      part.classList.add("is-held");
      slots.run(part, {
        scale: 1.2,
        transformOrigin: "50% 50%",
        duration: 0.3,
        ease: "back.out(3)",
        onUpdate: placeLinks,
      });
    },
    lift: (session, event) => {
      if (!canLift()) return;
      const note = noteAt(NODE_NOTE_INDEX[session.index] ?? 5);
      pluck(note, { gain: 0.8, pan: panFor(event.clientX) });
    },
    move: (session, point) => {
      const node = RING[session.index];
      if (!node) return;
      slots.run(session.part, {
        x: clamp(heldFrom.x + point.x - session.origin.x, 10 - node.x, 270 - node.x),
        y: clamp(heldFrom.y + point.y - session.origin.y, 10 - node.y, 270 - node.y),
        scale: 1.2,
        duration: 0.2,
        ease: "power3.out",
        onUpdate: placeLinks,
      });
    },
    drop: (session, _point, event) => {
      session.part.classList.remove("is-held");
      const rest = () => {
        awake.delete(session.index);
        markLinks();
      };
      if (!session.isLifted) {
        slots.run(session.part, { x: 0, y: 0, scale: 1, duration: 0.3, onComplete: rest });
        return;
      }
      slots.run(session.part, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.4,
        ease: "elastic.out(1, 0.35)",
        onUpdate: placeLinks,
        onComplete: rest,
      });
      if (!canDrop()) return;
      const note = noteAt(NODE_NOTE_INDEX[session.index] ?? 5);
      pluck(note, { gain: 0.55, pan: panFor(event.clientX), bend: 0.4, delay: 0.08 });
    },
  });

  const reset = () => {
    slots.stop();
    awake.clear();
    markLinks();
    putLinksBack();
    for (const node of nodes) node.classList.remove("is-held");
    gsap.set(nodes, { x: 0, y: 0, scale: 1 });
  };

  return {
    reset,
    dispose: () => {
      detach();
      reset();
    },
  };
}
