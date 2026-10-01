/**
 * The story thread's one cross-section dependency: Journey's sideways travel.
 * Anchors inside that track activate by horizontal progress, so the thread
 * needs the animation that moves it. Journey publishes it; StoryThread listens.
 */
let track: gsap.core.Animation | null = null;
const listeners = new Set<() => void>();

export function setThreadTrack(animation: gsap.core.Animation | null): void {
  track = animation;
  for (const listener of listeners) listener();
}

export function getThreadTrack(): gsap.core.Animation | null {
  return track;
}

export function onThreadTrackChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
