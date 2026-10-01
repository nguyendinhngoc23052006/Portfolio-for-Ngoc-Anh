interface Props {
  /** Placement class, e.g. "thread-anchor--hero"; the CSS decides where the thread passes. */
  place: string;
  /** Activates by horizontal progress through Journey's track instead of vertical scroll. */
  isOnTrack?: boolean;
  /** Leave the stretch arriving here undrawn, because the scene itself draws it. */
  isGap?: boolean;
}

/** An invisible point the story thread passes through. Order on the page = order in the story. */
export function ThreadAnchor({ place, isOnTrack = false, isGap = false }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`thread-anchor ${place}`}
      data-thread={isOnTrack ? "track" : "line"}
      data-thread-gap={isGap ? "" : undefined}
    />
  );
}
