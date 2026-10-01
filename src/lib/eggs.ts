import { useSyncExternalStore } from "react";

/** The hidden interactions. The counter's total is this list's length. */
export const EGG_IDS = ["pluck", "hatch", "secretWord", "dispatch", "replay"] as const;
export type EggId = (typeof EGG_IDS)[number];

export const SECRET_WORD = "ngocanh";

export interface EggSnapshot {
  found: ReadonlySet<EggId>;
  latest: EggId | null;
}

let snapshot: EggSnapshot = { found: new Set(), latest: null };
const listeners = new Set<() => void>();

/** Marks an egg found; repeats are ignored so each secret counts once. */
export function discover(id: EggId): void {
  if (snapshot.found.has(id)) return;
  snapshot = { found: new Set([...snapshot.found, id]), latest: id };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEggs(): EggSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}

/** Feeds keystrokes in; returns true on the key that completes `word`. */
export function createWordMatcher(word: string): (key: string) => boolean {
  let typed = "";
  return (key) => {
    if (!/^[a-z]$/i.test(key)) return false;
    typed = (typed + key.toLowerCase()).slice(-word.length);
    return typed === word;
  };
}

type BurstHandler = (x: number, y: number, power: number) => void;
let burstHandler: BurstHandler | null = null;

/** Silk streamers from a viewport point. Silent until SilkBurst has mounted. */
export function silkBurst(x: number, y: number, power = 1): void {
  burstHandler?.(x, y, power);
}

export function setBurstHandler(handler: BurstHandler | null): void {
  burstHandler = handler;
}
