import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';

export type PitchTypeSummaryRow = {
  code: string;
  name: string;
  pct: number;
  avgVelo: number | null;
  avgSpin: number | null;
  whiffPct: number | null;
  count: number;
};

export type CountTendencyRow = {
  balls: number;
  strikes: number;
  pitches: { code: string; pct: number }[];
};

@Entity('statcast_batter_summary')
@Unique(['mlbId', 'season'])
export class StatcastBatterSummary {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'int' })
  mlbId!: number;

  @Column({ type: 'int' })
  season!: number;

  @Column({ type: 'datetime' })
  fetchedAt!: Date;

  @Column({ type: 'int', default: 0 })
  pitchCount!: number;

  @Column({ type: 'json', nullable: true })
  pitchMix!: PitchTypeSummaryRow[] | null;

  // 9-element array (indices 0–8), null where < 5 PA in zone
  @Column({ type: 'json', nullable: true })
  zoneSlg!: (number | null)[] | null;

  @Column({ type: 'json', nullable: true })
  countTendencies!: CountTendencyRow[] | null;

  @Column({ type: 'json', nullable: true })
  inZonePitchMix!: PitchTypeSummaryRow[] | null;

  @Column({ type: 'json', nullable: true })
  outZonePitchMix!: PitchTypeSummaryRow[] | null;

  // Pitch-discipline metrics (null when pitchesSeen < 100)
  @Column({ type: 'int', default: 0 })
  pitchesSeen!: number;

  @Column({ type: 'float', nullable: true })
  chasePct!: number | null;

  @Column({ type: 'float', nullable: true })
  whiffPct!: number | null;

  @Column({ type: 'float', nullable: true })
  contactPct!: number | null;

  @Column({ type: 'float', nullable: true })
  swingPct!: number | null;

  // Contact-quality metrics (null when battedBalls < 25)
  @Column({ type: 'int', default: 0 })
  battedBalls!: number;

  @Column({ type: 'float', nullable: true })
  exitVeloAvg!: number | null;

  @Column({ type: 'float', nullable: true })
  exitVeloMax!: number | null;

  @Column({ type: 'float', nullable: true })
  hardHitPct!: number | null;

  @Column({ type: 'float', nullable: true })
  barrelPct!: number | null;

  @Column({ type: 'float', nullable: true })
  launchAngleAvg!: number | null;
}
