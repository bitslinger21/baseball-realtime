export class PitchTypeSummaryDto {
  code!: string;
  name!: string;
  pct!: number;
  avgVelo!: number | null;
  avgSpin!: number | null;
  whiffPct!: number | null;
  count!: number;
}

export class CountPitchDto {
  code!: string;
  pct!: number;
}

export class CountTendencyDto {
  balls!: number;
  strikes!: number;
  pitches!: CountPitchDto[];
}

/** Player-season Statcast discipline + contact-quality metrics, with pre-computed league context. */
export class BatterMetricsDto {
  // ── Per-player values (null when below sample-size gate) ─────────────────
  pitchesSeen!: number;
  battedBalls!: number;
  // Plate discipline (gate: pitchesSeen >= 100)
  chasePct!: number | null;
  whiffPct!: number | null;
  contactPct!: number | null;
  swingPct!: number | null;
  // Contact quality (gate: battedBalls >= 25)
  exitVeloAvg!: number | null;
  exitVeloMax!: number | null;
  hardHitPct!: number | null;
  barrelPct!: number | null;
  launchAngleAvg!: number | null;

  // ── League averages (null when fewer than 30 qualified batters ingested) ─
  lgChasePct!: number | null;
  lgWhiffPct!: number | null;
  lgContactPct!: number | null;
  lgSwingPct!: number | null;
  lgExitVeloAvg!: number | null;
  lgHardHitPct!: number | null;
  lgBarrelPct!: number | null;
  lgLaunchAngleAvg!: number | null;

  // ── Percentile ranks 0–100 (higher = better for the metric's direction) ─
  // null when player value is null or < 30 peers to rank against
  pctChasePct!: number | null;
  pctWhiffPct!: number | null;
  pctContactPct!: number | null;
  pctSwingPct!: number | null;
  pctExitVeloAvg!: number | null;
  pctHardHitPct!: number | null;
  pctBarrelPct!: number | null;
  pctLaunchAngleAvg!: number | null;
}

export class StatcastSummaryDto {
  mlbId!: number;
  season!: number;
  fetchedAt!: string;
  pitchCount!: number;
  sparse!: boolean;
  pendingIngest?: boolean;
  pitchMix!: PitchTypeSummaryDto[];
  // 9 zones (0=low-left … 8=high-right), null where < 5 AB
  zoneSlg!: (number | null)[];
  countTendencies!: CountTendencyDto[];
  inZonePitchMix!: PitchTypeSummaryDto[];
  outZonePitchMix!: PitchTypeSummaryDto[];
  // Discipline + contact quality metrics; null when data not yet ingested
  batterMetrics!: BatterMetricsDto | null;
}
