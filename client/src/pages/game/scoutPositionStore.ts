// Session-scoped store for Scout mode play-head position, keyed by providerGameId.
// Survives React Router navigation (in-memory) but is lost on hard refresh.
// Extended from the PR-12 position-persistence design: the same record that
// would carry feed scroll + expanded PA also carries the Scout head.
interface ScoutPosition {
  headIdx: number;       // array index — used for immediate restore on mount
  atBatId: number | null; // stable at-bat identifier — the spec's preferred key
}

const _store = new Map<string, ScoutPosition>();

export const scoutPositionStore = {
  get(id: string): ScoutPosition | undefined {
    return _store.get(id);
  },
  save(id: string, pos: ScoutPosition): void {
    _store.set(id, pos);
  },
  clear(id: string): void {
    _store.delete(id);
  },
};
