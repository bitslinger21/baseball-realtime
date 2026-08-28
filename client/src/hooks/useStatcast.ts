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

export type BatterMetrics = {
  pitchesSeen: number;
  battedBalls: number;
  chasePct: number | null;
  whiffPct: number | null;
  contactPct: number | null;
  swingPct: number | null;
  exitVeloAvg: number | null;
  exitVeloMax: number | null;
  hardHitPct: number | null;
  barrelPct: number | null;
  launchAngleAvg: number | null;
  lgChasePct: number | null;
  lgWhiffPct: number | null;
  lgContactPct: number | null;
  lgSwingPct: number | null;
  lgExitVeloAvg: number | null;
  lgHardHitPct: number | null;
  lgBarrelPct: number | null;
  lgLaunchAngleAvg: number | null;
  pctChasePct: number | null;
  pctWhiffPct: number | null;
  pctContactPct: number | null;
  pctSwingPct: number | null;
  pctExitVeloAvg: number | null;
  pctHardHitPct: number | null;
  pctBarrelPct: number | null;
  pctLaunchAngleAvg: number | null;
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
  inZonePitchMix: StatcastPitchRow[];
  outZonePitchMix: StatcastPitchRow[];
  batterMetrics: BatterMetrics | null;
};

const POLL_INTERVAL_MS = 6_000;
const MAX_POLLS = 4;

export function useStatcast(
  mlbId: number | null,
  season: number,
): { data: StatcastSummary | null; loading: boolean } {
  const [data, setData] = useState<StatcastSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mlbId == null) return;
    let cancelled = false;
    let polls = 0;

    const poll = () => {
      fetch(`/api/statcast/${mlbId}?season=${season}`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<StatcastSummary>; })
        .then(d => {
          if (cancelled) return;
          setData(d);
          // Re-poll silently (no loading flash) while backend is computing metrics
          if (d.pendingIngest && polls < MAX_POLLS) {
            polls++;
            setTimeout(poll, POLL_INTERVAL_MS);
          }
        })
        .catch(() => {});
    };

    setLoading(true);
    fetch(`/api/statcast/${mlbId}?season=${season}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<StatcastSummary>; })
      .then(d => {
        if (cancelled) return;
        setData(d);
        if (d.pendingIngest && polls < MAX_POLLS) {
          polls++;
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mlbId, season]);

  return { data, loading };
}
