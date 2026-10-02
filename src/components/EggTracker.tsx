import { useEffect, useState } from "react";
import type { Content } from "../content/types";
import { createWordMatcher, discover, EGG_IDS, SECRET_WORD, silkBurst, useEggs } from "../lib/eggs";
import { arpeggio, noteAt, pluck, SCALE } from "../lib/sound";

/** Listens for the typed secret, then announces every find with a toast and a running count. */
export function EggTracker({ text }: { text: Content["eggs"] }) {
  const { found, latest } = useEggs();
  const [message, setMessage] = useState<string | null>(null);
  const isComplete = found.size === EGG_IDS.length;

  useEffect(() => {
    const matches = createWordMatcher(SECRET_WORD);
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      const progress = matches(event.key);
      // Each letter of her name that lands in order plays the next note up.
      if (progress) pluck(noteAt(4 + progress), { gain: 0.7 });
      if (progress !== SECRET_WORD.length) return;
      discover("secretWord");
      arpeggio([noteAt(9), noteAt(11), noteAt(12), noteAt(14)], { voice: "pluck", step: 0.07 });
      silkBurst(window.innerWidth / 2, window.innerHeight / 2, 1.8);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!latest) return;
    setMessage(isComplete ? text.allFound : text.messages[latest]);
    if (isComplete) {
      silkBurst(window.innerWidth / 2, window.innerHeight * 0.4, 2.4);
      // Every note of the scale, up and back down.
      arpeggio([...SCALE, ...[...SCALE].reverse().slice(1)], { step: 0.06, gain: 0.6 });
    } else {
      arpeggio([noteAt(10), noteAt(12)], { step: 0.12, gain: 0.55 });
    }
    const timer = window.setTimeout(() => setMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [latest, isComplete, text]);

  return (
    <div className="egg-tracker" role="status">
      {message ? (
        <p key={message} className="egg-toast">
          <span aria-hidden="true">✦ </span>
          {message}
        </p>
      ) : null}
      {found.size > 0 ? (
        <p className={isComplete ? "egg-count is-complete" : "egg-count"}>
          {text.found} {found.size}/{EGG_IDS.length}
        </p>
      ) : null}
    </div>
  );
}
