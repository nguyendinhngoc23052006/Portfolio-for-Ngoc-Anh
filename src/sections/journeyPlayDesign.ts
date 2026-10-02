import { gsap } from "../lib/motion";
import { buzz, chime, noteAt, panFor, tick } from "../lib/sound";
import { matchWithin, type Play, seconds, swell } from "./journeyPlayKit";

const FIRST_NOTE = 8;

/** Brand identity: pick a swatch and the mark is dyed that colour, the circles ringing like struck bells. */
export function playDesign(play: Play): void {
  const { scope } = play;
  const mark = scope.querySelector(".dm-mark");
  const circles = Array.from(scope.querySelectorAll(".dm-circle"));
  const swatches = Array.from(scope.querySelectorAll(".dm-swatch"));

  play.onHover(".dm-swatch", (swatch, event) => {
    const index = swatches.indexOf(swatch);
    tick({ gain: 0.32, pitch: 2000 + index * 450, pan: panFor(event.clientX) });
  });

  play.listen<MouseEvent>(scope, "click", (event) => {
    const swatch = matchWithin(event.target, ".dm-swatch", scope);
    if (!swatch || !mark) return;
    chime(noteAt(FIRST_NOTE + swatches.indexOf(swatch)), {
      gain: 0.9,
      pan: panFor(event.clientX),
    });
    buzz(6);
    for (const other of swatches) other.classList.toggle("is-picked", other === swatch);
    play.tween(() => {
      gsap.to(mark, {
        fill: swatch.getAttribute("fill") ?? undefined,
        duration: seconds(0.45),
        ease: "power2.out",
        overwrite: "auto",
      });
      // A half turn: the lens is symmetric, so it lands looking the way it started.
      gsap.fromTo(
        mark,
        { rotation: 0 },
        {
          rotation: 180,
          duration: seconds(0.7),
          ease: "back.out(1.6)",
          transformOrigin: "50% 50%",
          overwrite: "auto",
        },
      );
      gsap.fromTo(
        swatch,
        { scale: 0.8 },
        {
          scale: 1,
          duration: seconds(0.6),
          ease: "elastic.out(1, 0.4)",
          transformOrigin: "50% 50%",
          overwrite: "auto",
        },
      );
      swell(circles, { to: 1.07, stagger: 0.05 });
    });
  });

  play.onDispose(() => {
    for (const swatch of swatches) swatch.classList.remove("is-picked");
  });
}
