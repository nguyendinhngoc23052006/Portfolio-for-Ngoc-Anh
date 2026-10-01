const NOISE = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="grain"
      style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE)}")` }}
    />
  );
}
