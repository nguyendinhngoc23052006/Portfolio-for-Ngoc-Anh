import type { JourneyId } from "../content/profile";
import { playDesign } from "./journeyPlayDesign";
import { playDongAm } from "./journeyPlayDongAm";
import { createPlay } from "./journeyPlayKit";
import { playSilk } from "./journeyPlaySilk";
import { playVmo } from "./journeyPlayVmo";

/**
 * Wires the hands-on toy of one station motif. It listens on the motif's own
 * figure and reads the event target on every event, so it keeps working while
 * the pinned track moves under transforms. Returns the cleanup.
 */
export function attachMotifPlay(id: JourneyId, scope: Element): () => void {
  const play = createPlay(scope);
  switch (id) {
    case "design":
      playDesign(play);
      break;
    case "silk":
      playSilk(play);
      break;
    case "dongAm":
      playDongAm(play);
      break;
    case "vmo":
      playVmo(play);
      break;
  }
  return play.dispose;
}
