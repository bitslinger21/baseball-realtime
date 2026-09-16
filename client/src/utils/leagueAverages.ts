// Approximate MLB league-wide averages used for comparison displays (Stats tab
// League column, split deltas, matchup-splits deltas). No real league-average
// endpoint exists yet — hand-maintained, update yearly. Single source of truth
// so every consumer moves together instead of drifting independently.
export const LEAGUE_AVG = {
  avg: 0.248,
  obp: 0.319,
  slg: 0.412,
  ops: 0.731,
  bbPct: 8.4,
  kPct: 22.6,
} as const;
