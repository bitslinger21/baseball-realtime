import { useState, useEffect } from 'react';

export type StatcastPitchRow = {
  code: string;
  name: string;
  pct: number;
  avgVelo: number | null;
  avgSpin: number | null;
  whiffPct: number | null;
  count: number;
};

export type StatcastCountTendency = {
  balls: number;
  strikes: number;
  pitches: { code: string; pct: number }[];
};

export type StatcastSummary = {
  mlbId: number;
  season: number;
  fetchedAt: string;
  pitchCount: number;
  sparse: boolean;
  pendingIngest?: boolean;
  pitchMix: StatcastPitchRow[];
  zoneSlg: (number | null)[];
  countTendencies: StatcastCountTendency[];
};

export function useStatcast(
  mlbId: number | null,
  season: number,
): { data: StatcastSummary | null; loading: boolean } {
  const [data, setData] = useState<StatcastSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mlbId == null) return;
    setLoading(true);
    fetch(`/api/statcast/${mlbId}?season=${season}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<StatcastSummary>; })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mlbId, season]);

  return { data, loading };
}
