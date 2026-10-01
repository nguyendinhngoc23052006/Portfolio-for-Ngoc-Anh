import { useEffect, useState } from "react";
import type { Content } from "../content/types";
import { createWordMatcher, discover, EGG_IDS, SECRET_WORD, silkBurst, useEggs } from "../lib/eggs";

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
      if (!matches(event.key)) return;
      discover("secretWord");
      silkBurst(window.innerWidth / 2, window.innerHeight / 2, 1.8);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!latest) return;
    setMessage(isComplete ? text.allFound : text.messages[latest]);
    if (isComplete) silkBurst(window.innerWidth / 2, window.innerHeight * 0.4, 2.4);
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
