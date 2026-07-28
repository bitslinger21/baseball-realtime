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
}
