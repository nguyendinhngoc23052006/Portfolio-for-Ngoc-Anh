import { seededRandom } from "../lib/motion";

export interface Point {
  x: number;
  y: number;
}

/** Every glyph is drawn on a square canvas this many units wide. */
export const GLYPH_UNITS = 280;

const random = seededRandom(11);

export const CELL_SIZE = 44;
export const CELLS = Array.from({ length: 16 }, (_, i) => ({
  id: `cell-${i}`,
  column: i % 4,
  row: Math.floor(i / 4),
  isGold: i % 3 === 2,
  x: 40 + (i % 4) * 52,
  y: 40 + Math.floor(i / 4) * 52,
  scatterX: (random() - 0.5) * 220,
  scatterY: (random() - 0.5) * 220,
  spin: (random() - 0.5) * 180,
}));

/** The order the cells snap home in: shuffled once, so the picture and its sound agree. */
export const SNAP_RANK = shuffleRanks(CELLS.length);

function shuffleRanks(count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => ({ index, key: random() })).sort(
    (a, b) => a.key - b.key,
  );
  const ranks = new Array<number>(count).fill(0);
  order.forEach(({ index }, rank) => {
    ranks[index] = rank;
  });
  return ranks;
}

export const RING = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
  return { id: `node-${i}`, x: 140 + Math.cos(angle) * 96, y: 140 + Math.sin(angle) * 96 };
});
export const LINKS = RING.flatMap((a, from) =>
  RING.slice(from + 1).map((b, offset) => ({
    id: `${a.id}-${b.id}`,
    a,
    b,
    from,
    to: from + 1 + offset,
  })),
);

export const BARS = [58, 92, 74, 128, 112, 160];
const ascending = [...BARS].sort((a, b) => a - b);
export const BAR_RANK = BARS.map((height) => ascending.indexOf(height));
export const TREND: readonly Point[] = [
  { x: 52, y: 176 },
  { x: 88, y: 140 },
  { x: 124, y: 160 },
  { x: 160, y: 104 },
  { x: 196, y: 120 },
  { x: 232, y: 66 },
];
const TREND_PATH = `M${TREND.map(({ x, y }) => `${x} ${y}`).join(" L")}`;

/** Indexes into the sound SCALE: nodes rise round the ring, taller bars sing higher. */
export const NODE_NOTE_INDEX = [5, 6, 7, 8, 9, 10];
export const BAR_NOTE_INDEX = BAR_RANK.map((rank) => 3 + rank * 2);

export const CURVE = {
  start: { x: 40, y: 200 },
  end: { x: 150, y: 210 },
  grips: [
    { x: 90, y: 70 },
    { x: 250, y: 120 },
  ],
} satisfies { start: Point; end: Point; grips: Point[] };

export function buildCurvePath(first: Point, second: Point): string {
  const { start, end } = CURVE;
  return `M${start.x} ${start.y} C ${first.x} ${first.y}, ${second.x} ${second.y}, ${end.x} ${end.y}`;
}

export function Glyph({ index }: { index: number }) {
  switch (index % 4) {
    case 0:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          {CELLS.map((cell) => (
            <rect
              key={cell.id}
              className={cell.isGold ? "pg-cell pg-cell--gold" : "pg-cell"}
              x={cell.x}
              y={cell.y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx="6"
            />
          ))}
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          {LINKS.map(({ id, a, b }) => (
            <line key={id} className="pg-link" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          {RING.map((node) => (
            <circle key={node.id} className="pg-node" cx={node.x} cy={node.y} r="12" />
          ))}
          <circle className="pg-core" cx="140" cy="140" r="22" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          <line className="pg-axis" x1="30" y1="240" x2="260" y2="240" />
          {BARS.map((height, i) => (
            <rect
              key={`bar-${height}`}
              className="pg-bar"
              x={40 + i * 36}
              y={240 - height}
              width="24"
              height={height}
              rx="4"
            />
          ))}
          <path className="pg-trend" d={TREND_PATH} />
          <g className="pg-lens">
            <circle cx="0" cy="0" r="26" />
            <line x1="18" y1="18" x2="36" y2="36" />
          </g>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 280 280" aria-hidden="true">
          <path
            className="pg-blob"
            d="M60 190 C 40 120, 110 60, 170 80 S 260 170, 200 210 S 80 250, 60 190 Z"
          />
          {CURVE.grips.map((grip, i) => {
            const anchor = i === 0 ? CURVE.start : CURVE.end;
            return (
              <line
                key={`handle-${anchor.x}`}
                className="pg-handle"
                x1={anchor.x}
                y1={anchor.y}
                x2={grip.x}
                y2={grip.y}
              />
            );
          })}
          <path
            className="pg-curve"
            d={buildCurvePath(CURVE.grips[0] ?? CURVE.start, CURVE.grips[1] ?? CURVE.end)}
          />
          {[CURVE.start, CURVE.end].map(({ x, y }) => (
            <rect
              key={`anchor-${x}`}
              className="pg-anchor"
              x={x - 6}
              y={y - 6}
              width="12"
              height="12"
            />
          ))}
          {CURVE.grips.map(({ x, y }) => (
            <circle key={`grip-${x}`} className="pg-grip" cx={x} cy={y} r="5" />
          ))}
        </svg>
      );
  }
}
