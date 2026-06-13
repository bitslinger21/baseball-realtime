export interface FeedPosition {
  scrollTop: number;
  expandedIds: ReadonlyArray<number>;
}

// Session-only — survives in-app navigation, dies on hard refresh.
// Never written to localStorage; a live-game offset goes stale the moment you leave.
export const feedPositionCache = new Map<string, FeedPosition>();
